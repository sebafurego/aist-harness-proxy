// Anthropic Messages API facade over the AiST Agent API.
// Clients (DeepSeek Harness, Claude Code, any anthropic-messages speaker) talk to
// POST /v1/messages; we translate each step into AiST tasks + client tools.

import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

// ---- env -----------------------------------------------------------------
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const {
  AIST_TOKEN,
  AIST_ASSISTANT_ID = '87',
  AIST_BASE_URL = 'https://agent.aist-ai.com',
  PORT = '3091',
  POLL_INTERVAL_MS = '1000',
  STEP_TIMEOUT_S = '1800',
  CANCEL_INTERRUPTED_ON_START = 'true',
  LOG_LEVEL = 'info',
} = process.env;
if (!AIST_TOKEN) { console.error('AIST_TOKEN is required (.env)'); process.exit(1); }

const log = (...a) => LOG_LEVEL !== 'silent' && console.log(new Date().toISOString(), ...a);
const debug = (...a) => LOG_LEVEL === 'debug' && console.log(new Date().toISOString(), ...a);

// ---- AiST client ---------------------------------------------------------
async function aist(method, path, body) {
  const res = await fetch(AIST_BASE_URL + path, {
    method,
    headers: {
      Authorization: `Bearer ${AIST_TOKEN}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`AiST ${method} ${path} -> ${res.status}: ${json.message || json.error || text.slice(0, 500)}`);
    err.status = res.status; err.body = json; throw err;
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForTask(uuid) {
  const deadline = Date.now() + Number(STEP_TIMEOUT_S) * 1000;
  while (Date.now() < deadline) {
    const t = await aist('GET', `/api/tasks/${uuid}`);
    if (t.status === 'interrupted' || t.status === 'completed' || t.status === 'failed' || t.status === 'canceled') return t;
    await sleep(Number(POLL_INTERVAL_MS));
  }
  throw Object.assign(new Error(`Timed out waiting for task ${uuid}`), { status: 504 });
}

// ---- state ---------------------------------------------------------------
// conversation key -> array of completed AiST turns (passed back as `turns`)
const convTurns = new Map();
// tool_use id -> { uuid, convKey }
const pendingByToolId = new Map();
// uuid -> set of pending tool ids
const pendingByTask = new Map();

// ---- helpers: anthropic -> text -----------------------------------------
function blocksToText(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  return content.map((b) => {
    if (b.type === 'text') return b.text;
    if (b.type === 'image') return '[image omitted]';
    if (b.type === 'document') return '[document omitted]';
    if (b.type === 'tool_use') return `[tool_use ${b.name} ${JSON.stringify(b.input)}]`;
    if (b.type === 'tool_result') return `[tool_result ${b.tool_use_id}] ${blocksToText(b.content)}`;
    return '';
  }).filter(Boolean).join('\n');
}

function systemToText(system) {
  if (!system) return '';
  if (typeof system === 'string') return system;
  return system.map((b) => b.text ?? '').join('\n');
}

function conversationKey(system, messages) {
  const first = messages.find((m) => m.role === 'user');
  return createHash('sha1').update(systemToText(system).slice(0, 4000)).update('\u0000').update(blocksToText(first?.content).slice(0, 4000)).digest('hex');
}

function toClientTools(tools = []) {
  return tools
    .filter((t) => t.name && !t.type?.startsWith('computer') && !t.type?.startsWith('text_editor') && !t.type?.startsWith('bash'))
    .map((t) => ({
      name: t.name,
      description: t.description || t.name,
      ...(t.input_schema ? { input_schema: t.input_schema } : {}),
    }));
}

// ---- helpers: aist -> anthropic -----------------------------------------
function turnToContentBlocks(turn) {
  const out = [];
  for (const item of turn?.output ?? []) {
    if (item.type === 'text' && item.text) out.push({ type: 'text', text: item.text });
    else if (item.type === 'file' && item.file) out.push({ type: 'text', text: `[file] ${item.file.name}: ${item.file.provider_data?.path ?? ''}` });
    else if (item.type === 'search' && item.search?.results?.length) {
      out.push({ type: 'text', text: item.search.results.map((r) => `- ${r.title ?? ''} ${r.url ?? ''}`).join('\n') });
    }
  }
  if (!out.length) out.push({ type: 'text', text: '' });
  return out;
}

function pendingToToolUse(pending) {
  return pending.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.arguments ?? {} }));
}

function estimateTokens(obj) { return Math.ceil(JSON.stringify(obj).length / 4); }

// ---- core: one anthropic request -> one AiST step -----------------------
async function handleMessages(body) {
  const { system, messages = [], tools = [] } = body;
  const last = messages[messages.length - 1];
  const convKey = conversationKey(system, messages);
  const toolResults = Array.isArray(last?.content) ? last.content.filter((b) => b.type === 'tool_result') : [];

  let task;
  if (last?.role === 'user' && toolResults.length) {
    // ---- continuation of an interrupted task
    const hit = toolResults.map((r) => pendingByToolId.get(r.tool_use_id)).find(Boolean);
    if (!hit) throw Object.assign(new Error('tool_result references unknown tool_use id (proxy restarted?). Start a new chat.'), { status: 400 });
    const { uuid } = hit;
    const expected = pendingByTask.get(uuid) ?? new Set();
    const results = [];
    for (const r of toolResults) {
      if (!expected.has(r.tool_use_id)) continue;
      results.push(r.is_error
        ? { id: r.tool_use_id, error: blocksToText(r.content).slice(0, 20000) || 'Tool error', reason: 'tool_error' }
        : { id: r.tool_use_id, content: blocksToText(r.content) || '(empty)' });
    }
    for (const id of expected) if (!results.find((x) => x.id === id)) results.push({ id, error: 'No result returned by client', reason: 'missing' });
    for (const id of expected) pendingByToolId.delete(id);
    pendingByTask.delete(uuid);
    log(`→ tool-results ${uuid} (${results.length})`);
    await aist('POST', `/api/tasks/${uuid}/tool-results`, { tool_results: results });
    task = await waitForTask(uuid);
  } else {
    // ---- new task
    const input = [];
    const sys = systemToText(system);
    if (sys) input.push({ type: 'text', text: `<system>\n${sys}\n</system>` });
    const turns = convTurns.get(convKey) ?? [];
    const userMsgs = messages.filter((m) => m.role === 'user');
    if (!turns.length && messages.length > 1) {
      // No stored turns for this conversation: replay history as transcript.
      const transcript = messages.slice(0, -1).map((m) => `${m.role.toUpperCase()}: ${blocksToText(m.content)}`).join('\n\n');
      input.push({ type: 'text', text: `<previous_conversation>\n${transcript}\n</previous_conversation>` });
    }
    input.push({ type: 'text', text: blocksToText(last?.content) || '(empty message)' });
    const payload = { assistant_id: Number(AIST_ASSISTANT_ID), input };
    if (turns.length) payload.turns = turns.slice(-20);
    const clientTools = toClientTools(tools);
    if (clientTools.length) payload.client_tools = clientTools;
    debug('create payload', JSON.stringify(payload).slice(0, 2000));
    const created = await aist('POST', '/api/tasks', payload);
    log(`→ task ${created.uuid} created (user msg #${userMsgs.length}, tools ${clientTools.length})`);
    task = await waitForTask(created.uuid);
  }

  // ---- translate the step result
  if (task.status === 'interrupted') {
    const ids = new Set(task.pending_tool_calls.map((c) => c.id));
    pendingByTask.set(task.uuid, ids);
    for (const id of ids) pendingByToolId.set(id, { uuid: task.uuid, convKey });
    log(`← ${task.uuid} interrupted: ${task.pending_tool_calls.map((c) => c.name).join(', ')}`);
    return { content: pendingToToolUse(task.pending_tool_calls), stop_reason: 'tool_use', model: 'aist' };
  }
  if (task.status === 'completed') {
    const turns = convTurns.get(convKey) ?? [];
    turns.push(task.turn);
    convTurns.set(convKey, turns);
    log(`← ${task.uuid} completed (model ${task.turn?.metadata?.model ?? '?'}, cost ${task.turn?.metadata?.cost?.total ?? '?'})`);
    return { content: turnToContentBlocks(task.turn), stop_reason: 'end_turn', model: task.turn?.metadata?.model ?? 'aist' };
  }
  throw Object.assign(new Error(`AiST task ${task.status}: ${task.error ?? 'unknown error'}`), { status: 502 });
}

// ---- anthropic wire format -----------------------------------------------
function anthropicMessage(reqModel, result, usage) {
  return {
    id: `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    type: 'message',
    role: 'assistant',
    model: reqModel,
    content: result.content,
    stop_reason: result.stop_reason,
    stop_sequence: null,
    usage,
  };
}

function writeSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function streamMessage(res, msg) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  writeSSE(res, 'message_start', { type: 'message_start', message: { ...msg, content: [], stop_reason: null, usage: { input_tokens: msg.usage.input_tokens, output_tokens: 0 } } });
  msg.content.forEach((block, i) => {
    if (block.type === 'text') {
      writeSSE(res, 'content_block_start', { type: 'content_block_start', index: i, content_block: { type: 'text', text: '' } });
      for (let p = 0; p < block.text.length; p += 800) writeSSE(res, 'content_block_delta', { type: 'content_block_delta', index: i, delta: { type: 'text_delta', text: block.text.slice(p, p + 800) } });
    } else if (block.type === 'tool_use') {
      writeSSE(res, 'content_block_start', { type: 'content_block_start', index: i, content_block: { type: 'tool_use', id: block.id, name: block.name, input: {} } });
      writeSSE(res, 'content_block_delta', { type: 'content_block_delta', index: i, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } });
    }
    writeSSE(res, 'content_block_stop', { type: 'content_block_stop', index: i });
  });
  writeSSE(res, 'message_delta', { type: 'message_delta', delta: { stop_reason: msg.stop_reason, stop_sequence: null }, usage: { output_tokens: msg.usage.output_tokens } });
  writeSSE(res, 'message_stop', { type: 'message_stop' });
  res.end();
}

function sendError(res, status, type, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ type: 'error', error: { type, message } }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// ---- http server ---------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, assistant_id: Number(AIST_ASSISTANT_ID), conversations: convTurns.size, pending_tasks: pendingByTask.size }));
    }
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ data: [{ id: `aist-${AIST_ASSISTANT_ID}`, type: 'model', display_name: `AiST assistant ${AIST_ASSISTANT_ID}`, created_at: '2026-01-01T00:00:00Z' }], has_more: false }));
    }
    if (req.method === 'POST' && url.pathname === '/v1/messages/count_tokens') {
      const body = await readBody(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ input_tokens: estimateTokens(body.messages ?? []) + estimateTokens(body.system ?? '') + estimateTokens(body.tools ?? []) }));
    }
    if (req.method === 'POST' && url.pathname === '/v1/messages') {
      const body = await readBody(req);
      const inputTokens = estimateTokens(body.messages ?? []) + estimateTokens(body.system ?? '');
      const result = await handleMessages(body);
      const msg = anthropicMessage(body.model ?? 'aist', result, { input_tokens: inputTokens, output_tokens: estimateTokens(result.content) });
      if (body.stream) return streamMessage(res, msg);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(msg));
    }
    sendError(res, 404, 'not_found_error', `No route ${req.method} ${url.pathname}`);
  } catch (e) {
    log('ERROR', e.message);
    const status = e.status === 429 ? 429 : e.status === 401 || e.status === 403 ? 401 : e.status >= 400 && e.status < 500 ? 400 : 500;
    const type = status === 429 ? 'rate_limit_error' : status === 401 ? 'authentication_error' : status === 400 ? 'invalid_request_error' : 'api_error';
    sendError(res, status, type, e.message);
  }
});

(async () => {
  if (CANCEL_INTERRUPTED_ON_START === 'true') {
    try { const r = await aist('POST', '/api/tasks/cancel-interrupted', { reason: 'aist-harness-proxy start' }); if (r.canceled) log(`cancelled ${r.canceled} stale interrupted task(s)`); }
    catch (e) { log('cancel-interrupted failed:', e.message); }
  }
  server.listen(Number(PORT), () => log(`aist-harness-proxy listening on http://localhost:${PORT}/v1 (assistant ${AIST_ASSISTANT_ID})`));
})();

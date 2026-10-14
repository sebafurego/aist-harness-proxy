// Static extraction: find locale.register(NS, { zh, en }) / register(NS, "en", X) and resolve the referenced object literals.
const fs = require('fs'), path = require('path');
const root = '/tmp/npm-cache-calc/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai';
const out = {};
function objAt(src, idx) { // idx points at '{'
  let depth = 0, i = idx, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return src.slice(idx, i + 1); }
  }
  return null;
}
function resolveVar(src, name) {
  const re = new RegExp(`(?:const|let|var)\\s+${name.replace(/\$/g, '\\$')}\\s*=\\s*\\{`, 'g');
  const m = re.exec(src); if (!m) return null;
  const lit = objAt(src, m.index + m[0].length - 1);
  try { return new Function(`return (${lit})`)(); } catch (e) { return null; }
}
function resolveExpr(src, expr) {
  expr = expr.trim();
  if (expr.startsWith('{')) { try { return new Function(`return (${expr})`)(); } catch { return null; } }
  return resolveVar(src, expr);
}
for (const d of fs.readdirSync(root)) {
  const f = path.join(root, d, 'lib', 'client.js'); if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const re = /locale\.register\(\s*([^,]+?)\s*,\s*/g; let m;
  while ((m = re.exec(src))) {
    let nsExpr = m[1].trim(); let ns;
    if (/^["'`]/.test(nsExpr)) ns = nsExpr.slice(1, -1);
    else { const vm = new RegExp(`(?:const|let|var)\\s+${nsExpr.replace(/\$/g,'\\$')}\\s*=\\s*["'\`]([^"'\`]+)["'\`]`).exec(src); ns = vm ? vm[1] : nsExpr; }
    const rest = src.slice(m.index + m[0].length);
    let dict = {};
    if (rest.startsWith('{')) {
      const lit = objAt(rest, 0);
      const inner = lit.slice(1, -1);
      // forms: "zh, en" | "zh: zhX, en: enX" | "en: {...}"
      const parts = []; let depth = 0, cur = '';
      for (const c of inner) { if (c === '{' || c === '[') depth++; if (c === '}' || c === ']') depth--; if (c === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += c; }
      if (cur.trim()) parts.push(cur);
      for (const p of parts) {
        const kv = p.split(/:(.*)/s); const key = kv[0].trim(); const val = kv[1] !== undefined ? kv[1] : key;
        if (key === 'en' || key === 'zh') dict[key] = resolveExpr(src, val);
      }
    } else {
      const lm = /^["'`](\w+)["'`]\s*,\s*/.exec(rest);
      if (lm) { const after = rest.slice(lm[0].length); const expr = after.startsWith('{') ? objAt(after, 0) : /^[\w$.]+/.exec(after)[0]; dict[lm[1]] = resolveExpr(src, expr); }
    }
    out[ns] = out[ns] || { pkg: d };
    for (const k of ['en', 'zh']) if (dict[k]) out[ns][k] = Object.assign(out[ns][k] || {}, dict[k]);
    if (!dict.en) console.error('unresolved', d, ns, rest.slice(0, 60).replace(/\n/g, ' '));
  }
}
fs.writeFileSync('en2.json', JSON.stringify(out, null, 2));
let keys = 0; for (const n in out) keys += Object.keys(out[n].en || {}).length;
console.log('namespaces', Object.keys(out).length, 'keys', keys);

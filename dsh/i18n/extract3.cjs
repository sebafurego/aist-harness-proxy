const fs = require('fs');
const u = JSON.parse(fs.readFileSync('en_all.json', 'utf8'));
function objAt(src, idx) { let depth = 0, inStr = null, esc = false; for (let i = idx; i < src.length; i++) { const c = src[i]; if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === inStr) inStr = null; continue; } if (c === '"' || c === "'" || c === '`') { inStr = c; continue; } if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) return src.slice(idx, i + 1); } } return null; }
function evalLit(src, lit) {
  const scope = new Proxy({}, { has: () => true, get: (_, name) => {
    if (typeof name !== 'string') return undefined;
    const m = new RegExp(`(?:const|let|var)\\s+${name.replace(/\$/g, '\\$')}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`[^\`]*\`)`).exec(src);
    if (m) { try { return new Function(`return (${m[1]})`)(); } catch { return `<<${name}>>`; } }
    const mo = new RegExp(`(?:const|let|var)\\s+${name.replace(/\$/g, '\\$')}\\s*=\\s*\\{`).exec(src);
    if (mo) { const l = objAt(src, mo.index + mo[0].length - 1); try { return evalLit(src, l); } catch { return undefined; } }
    return `<<${name}>>`;
  } });
  return new Function('scope', `with(scope){return (${lit})}`)(scope);
}
const root = '/tmp/npm-cache-calc/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai';
let added = 0;
for (const [ns, pkg] of [['conversation', 'dsh-client-ui-conversation']]) {
  const src = fs.readFileSync(`${root}/${pkg}/lib/client.js`, 'utf8');
  const m = /\n\t\tconst en = \{/.exec(src);
  const lit = objAt(src, m.index + m[0].length - 1);
  const en = evalLit(src, lit);
  u[ns] = { pkg, en };
  added += Object.keys(en).length;
  const unresolved = Object.entries(en).filter(([k, v]) => typeof v !== 'string' || v.includes('<<'));
  console.log(ns, Object.keys(en).length, 'unresolved', unresolved.slice(0, 5));
}
fs.writeFileSync('en_all.json', JSON.stringify(u, null, 1));
let total = 0; for (const n in u) total += Object.keys(u[n].en).length; console.log('total keys', total);

export const SYSTEM_PROMPT = `You are a senior full-stack engineer. Generate a COMPLETE, runnable chatbot application for the user's requirement.

Stack: React (Vite) frontend in client/, Node.js + Express (ES modules) backend in server/, Anthropic Claude API via @anthropic-ai/sdk (model from env MODEL, default claude-sonnet-4-6). If the domain truly needs knowledge retrieval, include a simple RAG module: documents in server/knowledge/*.md, chunked and ranked by keyword/TF-IDF overlap (no external vector DB required), top chunks injected into the prompt.

Required files: package.json (root, with install:all, dev, start scripts and concurrently), server/package.json, server/index.js, client/package.json, client/index.html, client/vite.config.js (proxy /api to the server), client/src/main.jsx, client/src/App.jsx, client/src/styles.css, .env.example, .gitignore (must ignore .env and node_modules), README.md (setup, run, deploy, GitHub push steps).

Rules:
- The UI must be specific to the domain (own name, theme, suggested questions, domain features such as a plan builder or calculators), with message bubbles, history kept in the browser, typing indicator, loading and error states.
- Backend: POST /api/chat with input validation, conversation context trimming, error handling, and the domain system prompt kept in server code.
- Every import must resolve; every dependency used must be listed in the right package.json. No placeholders, no TODOs, no real secrets.

OUTPUT FORMAT (exactly, no markdown fences, no commentary):
=== META ===
{"name":"<App Name>","systemPrompt":"<the chatbot's system prompt, same as used in server code>","features":["..."]}
=== FILE: path/relative/to/project/root ===
<full file content>
=== FILE: next/path ===
<full file content>`;

export function parseGeneration(raw) {
  const metaMatch = raw.match(/=== META ===\s*([\s\S]*?)\s*(?==== FILE:)/);
  if (!metaMatch) throw new Error('Model output had no META block. Try again.');
  let meta;
  try { meta = JSON.parse(metaMatch[1]); } catch { throw new Error('Model output had invalid META JSON. Try again.'); }
  const files = [];
  const re = /=== FILE: (.+?) ===\n([\s\S]*?)(?=\n=== FILE: |\s*$)/g;
  let m;
  while ((m = re.exec(raw))) {
    const p = m[1].trim();
    if (p.includes('..') || p.startsWith('/')) continue;
    files.push({ path: p, content: m[2].replace(/\n+$/, '') + '\n' });
  }
  if (!files.length) throw new Error('Model output contained no files. Try again.');
  return { name: String(meta.name || 'Chatbot'), systemPrompt: String(meta.systemPrompt || ''), features: Array.isArray(meta.features) ? meta.features : [], files };
}

const REQUIRED = ['package.json', 'server/package.json', 'server/index.js', 'client/package.json', 'client/index.html', 'client/src/main.jsx', 'client/src/App.jsx', '.env.example', '.gitignore', 'README.md'];
const BUILTINS = new Set(['fs', 'path', 'os', 'url', 'crypto', 'http', 'https', 'util', 'stream', 'events', 'child_process', 'zlib']);

// Static checks only. Nothing is installed, built or executed here.
export function validateProject(files) {
  const issues = [];
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  for (const r of REQUIRED) if (!byPath.has(r)) issues.push(`Missing required file: ${r}`);
  const pkgs = {};
  for (const p of ['package.json', 'server/package.json', 'client/package.json']) {
    if (!byPath.has(p)) continue;
    try {
      const j = JSON.parse(byPath.get(p));
      pkgs[p === 'package.json' ? 'root' : p.split('/')[0]] = { ...j.dependencies, ...j.devDependencies };
    } catch { issues.push(`${p} is not valid JSON`); }
  }
  if (!/^\.env\s*$/m.test(byPath.get('.gitignore') || '')) issues.push('.gitignore does not ignore .env');
  for (const f of files) {
    if (/sk-ant-[A-Za-z0-9_-]{10,}/.test(f.content)) issues.push(`Possible real API key in ${f.path}`);
    if (!/\.(jsx?|mjs)$/.test(f.path)) continue;
    const area = f.path.startsWith('client/') ? 'client' : 'server';
    const re = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(f.content))) {
      const spec = m[1];
      if (spec.startsWith('.')) {
        const dir = f.path.split('/').slice(0, -1);
        const out = [];
        for (const s of [...dir, ...spec.split('/')]) { if (s === '.') continue; if (s === '..') out.pop(); else out.push(s); }
        const t = out.join('/');
        if (![t, t + '.js', t + '.jsx', t + '/index.js', t + '/index.jsx'].some((c) => byPath.has(c))) issues.push(`${f.path}: unresolved import ${spec}`);
      } else if (!spec.startsWith('node:')) {
        const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
        if (!BUILTINS.has(name) && pkgs[area] && !(name in pkgs[area])) issues.push(`${f.path}: "${name}" not listed in ${area}/package.json`);
      }
    }
  }
  return { ok: issues.length === 0, checkedAt: new Date().toISOString(), kind: 'static checks (imports, dependencies, required files, secrets); the project is not built or run', issues };
}

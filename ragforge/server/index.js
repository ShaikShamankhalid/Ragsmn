import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import archiver from 'archiver';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { registerInfo } from './info.js';
import { SYSTEM_PROMPT, parseGeneration, validateProject } from './generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const MODEL = process.env.MODEL || 'claude-sonnet-4-6';
const PORT = process.env.PORT || 4000;

if (!process.env.ANTHROPIC_API_KEY) console.warn('WARNING: ANTHROPIC_API_KEY is not set. Generation and preview will fail.');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'missing' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const file = (id) => path.join(DATA, `${id}.json`);
const load = (id) => (/^[a-f0-9]{12}$/.test(id) && fs.existsSync(file(id)) ? JSON.parse(fs.readFileSync(file(id), 'utf8')) : null);
const save = (p) => fs.writeFileSync(file(p.id), JSON.stringify(p, null, 2));
const summary = ({ id, name, requirement, createdAt, updatedAt, validation }) => ({ id, name, requirement, createdAt, updatedAt, ok: validation?.ok });
const strip = ({ raw, ...rest }) => rest;

async function generate(requirement, previous) {
  const messages = previous
    ? [
        { role: 'user', content: `Original requirement: ${previous.requirement}` },
        { role: 'assistant', content: previous.raw },
        { role: 'user', content: `Modify the project: ${requirement}\nReturn the COMPLETE updated project in the same format.` },
      ]
    : [{ role: 'user', content: requirement }];
  const res = await client.messages.create({ model: MODEL, max_tokens: 16000, system: SYSTEM_PROMPT, messages });
  const raw = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const parsed = parseGeneration(raw);
  return { raw, ...parsed, validation: validateProject(parsed.files) };
}

app.get('/api/health', (_, res) => res.json({ ok: true, model: MODEL, hasKey: !!process.env.ANTHROPIC_API_KEY }));

app.get('/api/projects', (_, res) => {
  const list = fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).map((f) => summary(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))));
  res.json(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
});

app.get('/api/projects/:id', (req, res) => {
  const p = load(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  res.json(strip(p));
});

app.post('/api/projects', async (req, res) => {
  const requirement = String(req.body?.requirement || '').trim();
  if (requirement.length < 10 || requirement.length > 4000) return res.status(400).json({ error: 'Describe the chatbot in 10 to 4000 characters.' });
  try {
    const g = await generate(requirement);
    const now = new Date().toISOString();
    const p = { id: crypto.randomBytes(6).toString('hex'), requirement, createdAt: now, updatedAt: now, ...g };
    save(p);
    res.json(strip(p));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Generation failed' });
  }
});

app.post('/api/projects/:id/regenerate', async (req, res) => {
  const p = load(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const change = String(req.body?.change || '').trim();
  if (change.length < 5) return res.status(400).json({ error: 'Describe the change you want.' });
  try {
    const g = await generate(change, p);
    const updated = { ...p, ...g, updatedAt: new Date().toISOString() };
    save(updated);
    res.json(strip(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Regeneration failed' });
  }
});

// Live preview: Claude with the generated chatbot's own system prompt.
app.post('/api/projects/:id/chat', async (req, res) => {
  const p = load(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const messages = (req.body?.messages || []).slice(-20).filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim());
  if (!messages.length || messages[0].role !== 'user') return res.status(400).json({ error: 'messages must start with a user message' });
  try {
    const r = await client.messages.create({ model: MODEL, max_tokens: 1000, system: p.systemPrompt, messages });
    res.json({ reply: r.content.map((b) => (b.type === 'text' ? b.text : '')).join('') });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Chat failed' });
  }
});

app.get('/api/projects/:id/zip', (req, res) => {
  const p = load(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chatbot';
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}.zip"`);
  const zip = archiver('zip');
  zip.on('error', (e) => res.destroy(e));
  zip.pipe(res);
  for (const f of p.files) zip.append(f.content, { name: `${slug}/${f.path}` });
  zip.finalize();
});

app.delete('/api/projects/:id', (req, res) => {
  if (!load(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  fs.unlinkSync(file(req.params.id));
  res.json({ ok: true });
});

registerInfo(app, DATA);

const dist = path.join(__dirname, '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`RAGForge API on http://localhost:${PORT}`));

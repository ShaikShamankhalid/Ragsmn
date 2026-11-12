import { useEffect, useRef, useState } from 'react';

const readB64 = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.onerror = () => no(new Error('Could not read ' + file.name)); r.readAsDataURL(file); });
const MAX = 15 * 1024 * 1024;

export default function Info() {
  const [convos, setConvos] = useState([]);
  const [id, setId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [models, setModels] = useState({ models: [], configured: true });
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [usage, setUsage] = useState(null);
  const ctrl = useRef(); const end = useRef();

  const refresh = () => fetch('/api/info/conversations').then((r) => r.json()).then(setConvos).catch(() => {});
  useEffect(() => { refresh(); fetch('/api/info/models').then((r) => r.json()).then((m) => { setModels(m); setModel(m.models[0] || ''); }).catch(() => setErr('Cannot reach the RAGForge server.')); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const openConvo = async (cid) => { const c = await (await fetch('/api/info/conversations/' + cid)).json(); setId(cid); setMsgs(c.messages); setUsage(c.usage); setErr(''); };
  const del = async (cid) => { await fetch('/api/info/conversations/' + cid, { method: 'DELETE' }); if (cid === id) newChat(); refresh(); };
  const newChat = () => { setId(null); setMsgs([]); setUsage(null); setErr(''); setFiles([]); };

  const pick = (list) => {
    const ok = [...list].filter((f) => (f.size <= MAX) || (setErr(`${f.name} is larger than 15 MB.`), false));
    setFiles((p) => [...p, ...ok].slice(0, 8));
  };

  const send = async () => {
    if (busy || (!text.trim() && !files.length)) return;
    setErr(''); setBusy(true);
    let atts;
    try { atts = await Promise.all(files.map(async (f) => ({ name: f.name, mime: f.type || 'text/plain', data: await readB64(f) }))); }
    catch (e) { setErr(e.message); setBusy(false); return; }
    const sent = text;
    setMsgs((m) => [...m, { role: 'user', text: sent, attachments: atts.map(({ name, mime }) => ({ name, mime })) }, { role: 'assistant', text: '' }]);
    setText(''); setFiles([]);
    ctrl.current = new AbortController();
    try {
      const r = await fetch('/api/info/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.current.signal, body: JSON.stringify({ conversationId: id, text: sent, attachments: atts, model }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Request failed (${r.status})`);
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n'); buf = parts.pop();
        for (const p of parts) {
          const ev = JSON.parse(p.replace(/^data: /, ''));
          if (ev.type === 'meta') setId(ev.id);
          else if (ev.type === 'text') setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: c[c.length - 1].text + ev.t }; return c; });
          else if (ev.type === 'error') setErr(ev.error);
          else if (ev.type === 'done') setUsage((u) => ({ input: (u?.input || 0) + ev.usage.input, output: (u?.output || 0) + ev.usage.output }));
        }
      }
    } catch (e) { if (e.name !== 'AbortError') { setErr(e.message); setMsgs((m) => (m.at(-1)?.text === '' ? m.slice(0, -1) : m)); } }
    setBusy(false); refresh();
  };

  return (
    <div className="shell info">
      <aside>
        <h1>RAGForge</h1>
        <button className="primary" onClick={newChat}>New chat</button>
        <h2>History</h2>
        {convos.length === 0 && <p className="muted">No conversations yet.</p>}
        <ul>{convos.map((c) => (
          <li key={c.id} className="row"><button className={c.id === id ? 'active' : ''} onClick={() => openConvo(c.id)}>{c.title}</button><button aria-label={`Delete ${c.title}`} onClick={() => del(c.id)}>×</button></li>
        ))}</ul>
      </aside>
      <main onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}>
        {!models.configured && <div className="error">GEMINI_API_KEY is not set on the server. Add it to server/.env and restart.</div>}
        {err && <div className="error" role="alert">{err}</div>}
        <div className="chat tall">
          {msgs.length === 0 && <p className="muted">Ask anything, or attach images, PDFs, text, audio or video. Drop files anywhere on this panel.</p>}
          {msgs.map((m, i) => (
            <div key={i} className={'bubble ' + m.role}>
              {m.attachments?.map((a) => <span key={a.name} className="chip">{a.name}</span>)}
              {m.text || (busy && i === msgs.length - 1 ? '…' : '')}
            </div>
          ))}
          <div ref={end} />
        </div>
        {files.length > 0 && <div className="chips">{files.map((f, i) => <span key={i} className="chip">{f.name}<button aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button></span>)}</div>}
        <form onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="btn">Attach<input type="file" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ''; }} /></label>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message RAGForge" aria-label="Message" />
          <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">{models.models.map((m) => <option key={m}>{m}</option>)}</select>
          {busy ? <button type="button" onClick={() => ctrl.current?.abort()}>Stop</button> : <button className="primary" disabled={!text.trim() && !files.length}>Send</button>}
        </form>
        {usage && <p className="muted">Tokens in this conversation: {usage.input} in, {usage.output} out (as reported by Gemini).</p>}
      </main>
    </div>
  );
}

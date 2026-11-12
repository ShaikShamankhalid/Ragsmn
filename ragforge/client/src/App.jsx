import { useEffect, useRef, useState } from 'react';

const api = async (url, opts) => {
  const init = opts && { method: opts.method, headers: { 'Content-Type': 'application/json' }, body: opts.body && JSON.stringify(opts.body) };
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
};

export function Work() {
  const [list, setList] = useState([]);
  const [project, setProject] = useState(null);
  const [requirement, setRequirement] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('preview');

  const refresh = () => api('/api/projects').then(setList).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);

  const open = async (id) => { setError(''); try { setProject(await api(`/api/projects/${id}`)); setTab('preview'); } catch (e) { setError(e.message); } };

  const create = async () => {
    setError(''); setBusy('Generating files. This can take a minute or two.');
    try { const p = await api('/api/projects', { method: 'POST', body: { requirement } }); setProject(p); setTab('preview'); setRequirement(''); refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const regenerate = async (change) => {
    setError(''); setBusy('Applying your changes. This can take a minute or two.');
    try { setProject(await api(`/api/projects/${project.id}/regenerate`, { method: 'POST', body: { change } })); refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const remove = async () => { await api(`/api/projects/${project.id}`, { method: 'DELETE' }); setProject(null); refresh(); };

  return (
    <div className="shell">
      <aside>
        <h1>RAGForge</h1>
        <button className="primary" onClick={() => setProject(null)}>New chatbot</button>
        <h2>Your chatbots</h2>
        {list.length === 0 && <p className="muted">Nothing here yet. Describe a chatbot to create your first.</p>}
        <ul>{list.map((p) => (
          <li key={p.id}><button className={project?.id === p.id ? 'active' : ''} onClick={() => open(p.id)}>{p.name}<small>{new Date(p.updatedAt).toLocaleDateString()}</small></button></li>
        ))}</ul>
      </aside>
      <main>
        {error && <div className="error" role="alert">{error}</div>}
        {busy && <div className="progress"><span className="bar" />{busy}</div>}
        {!project ? (
          <section className="create">
            <h2>What chatbot do you want?</h2>
            <p className="muted">Describe who it is for and what it should do. RAGForge writes the app: React interface, Express backend and Claude integration.</p>
            <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={6} placeholder="Create a Gym Trainer chatbot that builds weekly workout plans, explains exercises and tracks goals." />
            <button className="primary" disabled={!!busy || requirement.trim().length < 10} onClick={create}>Generate chatbot</button>
          </section>
        ) : (
          <Workspace key={project.id + project.updatedAt} project={project} tab={tab} setTab={setTab} busy={!!busy} onRegenerate={regenerate} onDelete={remove} />
        )}
      </main>
    </div>
  );
}

function Workspace({ project, tab, setTab, busy, onRegenerate, onDelete }) {
  const [change, setChange] = useState('');
  const v = project.validation;
  const dir = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <section>
      <header className="wh">
        <div><h2>{project.name}</h2><p className="muted">{project.requirement}</p></div>
        <div className="actions">
          <a className="btn" href={`/api/projects/${project.id}/zip`}>Download ZIP</a>
          <button onClick={onDelete}>Delete</button>
        </div>
      </header>
      <div className={'check ' + (v.ok ? 'ok' : 'warn')}>
        {v.ok ? 'Static checks passed.' : `${v.issues.length} issue(s) found by static checks.`} These are {v.kind}. Run <code>npm run install:all</code> and <code>npm run dev</code> in the downloaded project to confirm it works.
        {!v.ok && <ul>{v.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      </div>
      <nav className="tabs">{['preview', 'source', 'github'].map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{{ preview: 'Test the chatbot', source: 'Source code', github: 'Publish to GitHub' }[t]}</button>)}</nav>
      {tab === 'preview' && <Preview project={project} />}
      {tab === 'source' && <Source files={project.files} />}
      {tab === 'github' && <pre className="code">{`cd ${dir}\ngit init\ngit add .\ngit commit -m "Initial chatbot application"\ngit branch -M main\ngit remote add origin YOUR_GITHUB_REPOSITORY_URL\ngit push -u origin main`}</pre>}
      <div className="modify">
        <label htmlFor="chg">Change this chatbot</label>
        <textarea id="chg" rows={2} value={change} onChange={(e) => setChange(e.target.value)} placeholder="Add a nutrition calculator and a darker theme." />
        <button disabled={busy || change.trim().length < 5} onClick={() => onRegenerate(change)}>Regenerate with changes</button>
      </div>
    </section>
  );
}

function Preview({ project }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const send = async (content) => {
    if (!content.trim() || loading) return;
    const next = [...msgs, { role: 'user', content }];
    setMsgs(next); setText(''); setErr(''); setLoading(true);
    try { const { reply } = await api(`/api/projects/${project.id}/chat`, { method: 'POST', body: { messages: next } }); setMsgs([...next, { role: 'assistant', content: reply }]); }
    catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="preview">
      <p className="muted">This tests the generated chatbot's system prompt through the RAGForge server. It shows the chatbot's behavior; it is not the generated app running on its own.</p>
      {project.features.length > 0 && <ul className="feat">{project.features.map((f) => <li key={f}>{f}</li>)}</ul>}
      <div className="chat">
        {msgs.length === 0 && <p className="muted">Send a message to start.</p>}
        {msgs.map((m, i) => <div key={i} className={'bubble ' + m.role}>{m.content}</div>)}
        {loading && <div className="bubble assistant typing"><i /><i /><i /></div>}
        {err && <div className="error">{err}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the chatbot" aria-label="Message" />
        <button className="primary" disabled={loading || !text.trim()}>Send</button>
      </form>
    </div>
  );
}

function Source({ files }) {
  const [sel, setSel] = useState(files[0]?.path);
  const f = files.find((x) => x.path === sel);
  return (
    <div className="source">
      <ul>{files.map((x) => <li key={x.path}><button className={x.path === sel ? 'active' : ''} onClick={() => setSel(x.path)}>{x.path}</button></li>)}</ul>
      <pre className="code">{f?.content}</pre>
    </div>
  );
}

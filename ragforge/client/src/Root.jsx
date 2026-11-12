import { useState } from 'react';
import { Work } from './App.jsx';
import Info from './Info.jsx';

export default function Root() {
  const [mode, setMode] = useState('info');
  return (
    <>
      <div className="modebar" role="tablist" aria-label="Mode">
        {['info', 'work'].map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>{m.toUpperCase()}</button>
        ))}
      </div>
      {mode === 'info' ? <Info /> : <Work />}
    </>
  );
}

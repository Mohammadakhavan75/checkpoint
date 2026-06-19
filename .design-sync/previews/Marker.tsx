import { Marker } from '@checkpoint/ds';
import type { ItemState } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12 };

export function AllStates() {
  const states: ItemState[] = ['active', 'done', 'blocked', 'waiting', 'deferred', 'scout', 'idea', 'killed'];
  return (
    <div style={{ ...frame, display: 'flex', gap: 16, alignItems: 'center' }}>
      {states.map(s => (
        <span key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Marker state={s} />
          <span style={{ color: 'var(--faint)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>{s}</span>
        </span>
      ))}
    </div>
  );
}

export function CustomSymbol() {
  return (
    <div style={{ ...frame, display: 'flex', gap: 16, alignItems: 'center' }}>
      <Marker state="active" symbol="▦" color="var(--violet)" />
      <Marker state="active" />
      <Marker state="done" />
      <Marker state="blocked" />
    </div>
  );
}

import { Chip } from '@checkpoint/ds';
import type { ItemState } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12 };

export function AllStates() {
  const states: ItemState[] = ['active', 'done', 'blocked', 'waiting', 'deferred', 'scout', 'needsdef', 'idea', 'killed'];
  return (
    <div style={{ ...frame, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {states.map(s => <Chip key={s} state={s} />)}
    </div>
  );
}

export function KeyStates() {
  return (
    <div style={{ ...frame, display: 'flex', gap: 8 }}>
      <Chip state="active" />
      <Chip state="done" />
      <Chip state="blocked" />
    </div>
  );
}

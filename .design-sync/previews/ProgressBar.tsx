import { ProgressBar } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12, maxWidth: 300 };
const mono = { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--dim)' };

export function Stages() {
  const stages = [
    { value: 0, label: '0/4 phases' },
    { value: 25, label: '1/4 phases' },
    { value: 50, label: '2/4 phases' },
    { value: 75, label: '3/4 phases' },
    { value: 100, label: '4/4 ✓' },
  ];
  return (
    <div style={{ ...frame, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {stages.map(({ value, label }) => (
        <div key={value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProgressBar value={value} />
          <span style={{ ...mono, color: value === 100 ? 'var(--green)' : 'var(--dim)' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

import { Button } from '@checkpoint/ds';

const row = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const };
const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12 };

export function AllVariants() {
  return (
    <div style={frame}>
      <div style={row}>
        <Button>Secondary</Button>
        <Button variant="amber">▸ Start</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </div>
    </div>
  );
}

export function Amber() {
  return (
    <div style={frame}>
      <div style={row}>
        <Button variant="amber">▸ Start</Button>
        <Button variant="amber">⟲ Resume</Button>
        <Button variant="amber">→ Today</Button>
      </div>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={frame}>
      <div style={row}>
        <Button disabled>Secondary</Button>
        <Button variant="amber" disabled>▸ Start</Button>
        <Button variant="danger" disabled>Delete</Button>
      </div>
    </div>
  );
}

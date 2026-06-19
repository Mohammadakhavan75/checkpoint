import { ModeChip } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12 };

export function AllModes() {
  return (
    <div style={{ ...frame, display: 'flex', gap: 8, alignItems: 'center' }}>
      <ModeChip mode="Do" />
      <ModeChip mode="Scout" />
      <ModeChip mode="Plan" />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ ...frame, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--text)', fontSize: 14 }}>Write auth middleware</span>
        <ModeChip mode="Do" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--text)', fontSize: 14 }}>Map the payments API surface</span>
        <ModeChip mode="Scout" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--text)', fontSize: 14 }}>Redesign the onboarding flow</span>
        <ModeChip mode="Plan" />
      </div>
    </div>
  );
}

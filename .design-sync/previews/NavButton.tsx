import { NavButton } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: '14px 0', borderRadius: 12, width: 240 };

export function NavItems() {
  return (
    <div style={frame}>
      <div className="sect">
        <h4>Views</h4>
        <NavButton active count={3}>Today</NavButton>
        <NavButton count={12}>Ready to Go</NavButton>
        <NavButton>Reservoir</NavButton>
        <NavButton>Trash</NavButton>
      </div>
    </div>
  );
}

export function Domains() {
  return (
    <div style={frame}>
      <div className="sect">
        <h4>Domains</h4>
        <NavButton active count={5}>Engineering</NavButton>
        <NavButton count={2}>Product</NavButton>
        <NavButton count={1}>Design</NavButton>
        <NavButton>Personal</NavButton>
      </div>
    </div>
  );
}

export function States() {
  return (
    <div style={frame}>
      <NavButton active>Active item</NavButton>
      <NavButton count={7}>With count</NavButton>
      <NavButton>Default</NavButton>
    </div>
  );
}

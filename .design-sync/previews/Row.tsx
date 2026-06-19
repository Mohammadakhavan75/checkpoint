import { Row, Marker, Chip, ModeChip, Button } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12, maxWidth: 620, display: 'flex', flexDirection: 'column' as const, gap: 10 };

export function ActiveTask() {
  return (
    <div style={frame}>
      <Row state="active">
        <Marker state="active" />
        <div className="ttl">
          <div className="name">Write API schema for /items endpoint</div>
          <div className="meta">
            <span>Engineering</span>
            <ModeChip mode="Do" />
            <Chip state="active" />
          </div>
        </div>
        <div className="acts">
          <Button variant="amber">▸ Start</Button>
          <Button>Edit</Button>
        </div>
      </Row>
    </div>
  );
}

export function ResumableTask() {
  return (
    <div style={frame}>
      <Row state="active" resumable>
        <Marker state="active" />
        <div className="ttl">
          <div className="name">Refactor auth middleware</div>
          <div className="meta">
            <span>Engineering</span>
            <ModeChip mode="Do" />
            <Chip state="active" />
          </div>
        </div>
        <div className="acts">
          <Button variant="amber">⟲ Resume</Button>
          <Button>Edit</Button>
        </div>
      </Row>
    </div>
  );
}

export function MixedStates() {
  return (
    <div style={frame}>
      <Row state="active">
        <Marker state="active" />
        <div className="ttl">
          <div className="name">Design the checkpoint form</div>
          <div className="meta"><span>Product</span><ModeChip mode="Plan" /><Chip state="active" /></div>
        </div>
        <div className="acts"><Button variant="amber">▸ Start</Button><Button>Edit</Button></div>
      </Row>
      <Row state="blocked">
        <Marker state="blocked" />
        <div className="ttl">
          <div className="name">Ship the mobile build</div>
          <div className="meta"><span>Engineering</span><ModeChip mode="Do" /><Chip state="blocked" /></div>
        </div>
        <div className="acts"><Button>Edit</Button></div>
      </Row>
      <Row state="done">
        <Marker state="done" />
        <div className="ttl" style={{ opacity: 0.7 }}>
          <div className="name">Set up CI pipeline</div>
          <div className="meta"><span>DevOps</span><Chip state="done" /></div>
        </div>
        <div className="acts"><Button>Edit</Button></div>
      </Row>
    </div>
  );
}

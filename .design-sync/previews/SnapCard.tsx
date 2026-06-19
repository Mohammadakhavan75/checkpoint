import { SnapCard } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12, maxWidth: 500 };

export function WithNote() {
  return (
    <div style={frame}>
      <SnapCard title="2:34 PM" onEdit={() => {}} onDelete={() => {}}>
        <p>Realized the token refresh endpoint needs rate limiting — add that before shipping.</p>
        <p>Talked to Sarah about the UX — she wants the error state to be more explicit.</p>
      </SnapCard>
    </div>
  );
}

export function WithMarkdown() {
  return (
    <div style={frame}>
      <SnapCard title="Architecture note" onEdit={() => {}}>
        <p><strong>Decision:</strong> Use sliding window for token refresh, not fixed intervals.</p>
        <ul>
          <li>Simpler to reason about</li>
          <li>Already tested in the Go service</li>
        </ul>
      </SnapCard>
    </div>
  );
}

export function Editing() {
  return (
    <div style={frame}>
      <SnapCard title="3:12 PM" editing onEdit={() => {}} onDelete={() => {}}>
        <p>Quick win: the login redirect was broken because of the case-insensitive email comparison.</p>
      </SnapCard>
    </div>
  );
}

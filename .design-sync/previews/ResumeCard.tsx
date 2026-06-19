import { ResumeCard } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12, maxWidth: 600 };

const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

export function WithResume() {
  return (
    <div style={frame}>
      <ResumeCard
        title="Refactor auth middleware"
        checkpoint={{
          outcome: 'active',
          last_state: 'Working through the token refresh logic — got the middleware skeleton done',
          resume_from: 'src/auth/refresh.ts line 47 — the conditional expiry check',
          next_action: 'Add the sliding window logic and write the unit test',
          do_not_redo: 'Do not touch the existing token generation — it works correctly',
          created_at: twoHoursAgo,
        }}
        onResume={() => {}}
        onDismiss={() => {}}
      />
    </div>
  );
}

export function DoneCheckpoint() {
  return (
    <div style={frame}>
      <ResumeCard
        title="Write API schema for /items endpoint"
        checkpoint={{
          outcome: 'done',
          last_state: 'Schema complete — all fields documented and validated with the team',
          do_not_redo: 'Do not add optional fields without a design review first',
          created_at: yesterday,
        }}
      />
    </div>
  );
}

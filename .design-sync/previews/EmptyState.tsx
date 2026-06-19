import { EmptyState, Button } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: 20, borderRadius: 12, maxWidth: 480 };

export function WithCapture() {
  return (
    <div style={frame}>
      <EmptyState
        question="What needs to happen today?"
        hint="Add tasks from your reservoir, or capture a new one here."
      >
        <div className="empty-cap">
          <input placeholder="Quick add a task…" />
          <Button variant="amber">Add</Button>
        </div>
      </EmptyState>
    </div>
  );
}

export function Simple() {
  return (
    <div style={frame}>
      <EmptyState hint="Completed tasks and archived items will appear here." />
    </div>
  );
}

export function WithQuestion() {
  return (
    <div style={frame}>
      <EmptyState
        question="Nothing in the Trash"
        hint="Killed tasks move here. You can restore or permanently delete them."
      />
    </div>
  );
}

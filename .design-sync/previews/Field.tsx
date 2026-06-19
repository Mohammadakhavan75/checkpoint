import { Field } from '@checkpoint/ds';

const frame = { background: 'var(--panel)', padding: 20, borderRadius: 12, maxWidth: 400 };

export function TextInput() {
  return (
    <div style={frame}>
      <Field label="First action">
        <input placeholder="What will you do first?" />
      </Field>
    </div>
  );
}

export function RequiredWithHint() {
  return (
    <div style={frame}>
      <Field label="Task title" required hint="Be specific — what exactly will be done?">
        <input placeholder="e.g. Draft the API schema for /items endpoint" />
      </Field>
    </div>
  );
}

export function Textarea() {
  return (
    <div style={frame}>
      <Field label="Description" hint="What does done look like?">
        <textarea rows={3} placeholder="What's the goal? What does done look like?" />
      </Field>
    </div>
  );
}

export function MultipleFields() {
  return (
    <div style={frame}>
      <Field label="Title" required>
        <input defaultValue="Refactor auth middleware" />
      </Field>
      <Field label="Domain">
        <input defaultValue="Engineering" />
      </Field>
      <Field label="Description">
        <textarea rows={2} defaultValue="Token refresh logic is fragile — needs better error handling and tests." />
      </Field>
    </div>
  );
}

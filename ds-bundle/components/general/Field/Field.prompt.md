Field from @checkpoint/ds. Use via `window.CheckpointDS.Field` (bundle loaded from the root `_ds_bundle.js`).

Form field wrapper with label and optional hint. Wraps the `.field` class.

## Props

```ts
interface FieldProps {
  /** Field label shown above the control */
  label: string;
  /** Marks the field required with an orange asterisk */
  required?: boolean;
  /** Hint text shown below the control */
  hint?: string;
  /** The form control — input, textarea, or select */
  children: React.ReactNode;
}
```

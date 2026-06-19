import React from "react";

export interface FieldProps {
  /** Field label shown above the control */
  label: string;
  /** Marks the field required with an orange asterisk */
  required?: boolean;
  /** Hint text shown below the control */
  hint?: string;
  /** The form control — input, textarea, or select */
  children: React.ReactNode;
}

/** Form field wrapper with label and optional hint. Wraps the `.field` class. */
export function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

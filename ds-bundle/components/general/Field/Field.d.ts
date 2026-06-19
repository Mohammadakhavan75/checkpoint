import * as React from 'react';

/**
 * Field — from @checkpoint/ds@1.0.0.
 */
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

export declare const Field: React.ComponentType<FieldProps>;

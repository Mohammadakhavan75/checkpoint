import type { ReactNode } from "react";

type QuietFieldProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  accent?: boolean;
};

export function QuietField({ icon, label, children, accent = false }: QuietFieldProps) {
  return (
    <div className={`quiet-field ${accent ? "accent" : ""}`}>
      <div className="field-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="field-label">{label}</div>
      <div className="field-value">{children}</div>
    </div>
  );
}

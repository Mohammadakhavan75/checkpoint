import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: "default" | "amber" | "ghost" | "danger";
}

/** Primary action surface. Uses the `.btn` class family with an optional variant. */
export function Button({ variant = "default", className, children, ...props }: ButtonProps) {
  const variantClass = variant !== "default" ? variant : "";
  const cls = ["btn", variantClass, className].filter(Boolean).join(" ");
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

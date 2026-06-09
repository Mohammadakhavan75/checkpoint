import { useEffect } from "react";
import type { ReactNode } from "react";

// Wraps the sidebar so it behaves as a static grid column on tablet/desktop
// (the wrapper is `display:contents`, see app.css) and as a slide-in drawer on
// phones. Open/close state is owned by the parent.
export function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`nav-scrim${open ? " on" : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />
      <div className={`nav-drawer${open ? " on" : ""}`}>{children}</div>
    </>
  );
}

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Minimal dialog behavior for the data-entry modals (REDESIGN_V1 §WS-7):
 *  focus lands inside on mount, Tab cycles within the dialog, Escape calls
 *  `onClose`. Focusables are queried live from the ref at event time, so a
 *  modal that swaps its subtree (e.g. checkpoint form → placement choice)
 *  keeps working; `onClose` is read through a ref so the handler always sees
 *  the caller's latest state. */
export function useModalA11y(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  // Modals that first render a loading shell (no focusables) pass their
  // ready flag here so initial focus lands once the real form exists.
  active = true,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    // Land on the first form field (the work), not the header ✕.
    const field = el.querySelector<HTMLElement>("input,textarea,select");
    (field ?? el.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = ref.current;
      if (!el) return;
      // No stopPropagation: stacked layers (confirm dialogs) run their own
      // Escape handlers; callers guard against closing while one is on top.
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const active = document.activeElement as HTMLElement | null;
      // Focus already inside a stacked dialog (e.g. a confirm on top of this
      // modal) — that layer owns Tab; don't yank focus back down here.
      if (active && active !== document.body && !el.contains(active)) return;
      const nodes = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (active === first || active === document.body || !active)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // Mount-once by design: focusables and onClose are both read live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

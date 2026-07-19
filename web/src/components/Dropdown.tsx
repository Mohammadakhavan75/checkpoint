import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A Checkpoint-styled select. Native <select> can't style its option popup, so
// it always broke the app's dark/mono language; this renders its own trigger
// and listbox instead. Controlled by `value`; `onChange` reports the chosen
// option's value (the caller decides what to do — set state, run an action…).
export interface DropdownOption {
  value: string;
  label: string;
  color?: string; // optional accent (e.g. a state colour) for value + option
}

const GAP = 4; // breathing room between trigger and menu
const EDGE = 12; // keep the menu off the viewport edge

type MenuPos = { left: number; width: number; maxHeight: number; top?: number; bottom?: number };

export function Dropdown({
  value,
  options,
  onChange,
  className = "",
  title,
  ariaLabel,
  placeholder = "",
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0); // keyboard-highlighted option
  const [pos, setPos] = useState<MenuPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIdx = options.findIndex((o) => o.value === value);
  const current = selectedIdx >= 0 ? options[selectedIdx] : undefined;

  // The menu is portalled to <body>, so measure the trigger and pin the popup
  // to it in viewport coords. (Absolute positioning inside the row put the menu
  // underneath every card that painted after it, and clipped it in modals.)
  const place = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const below = vh - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    // Drop up only when below is genuinely cramped and above is roomier.
    const flip = below < 160 && above > below;
    const left = Math.max(EDGE, Math.min(r.left, Math.max(EDGE, vw - EDGE - r.width)));
    setPos({
      left,
      width: r.width,
      maxHeight: Math.max(120, Math.min(264, flip ? above : below)),
      ...(flip ? { bottom: vh - r.top + GAP } : { top: r.bottom + GAP }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // Any scroll (capture: the app scrolls in an inner container, not window)
    // or resize moves the trigger — follow it rather than leaving a stray popup.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Close when a click (or focus) lands outside the widget. The menu lives
  // outside rootRef in the portal, so it has to be checked separately.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  function openMenu() {
    setActive(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }

  function choose(i: number) {
    const opt = options[i];
    if (opt) onChange(opt.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(a + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div className={`dd ${className}`} ref={rootRef}>
      <button
        type="button"
        className="dd-trigger"
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={current?.color ? { color: current.color } : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="dd-value">{current ? current.label : placeholder}</span>
        <span className="dd-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open &&
        createPortal(
          <ul
            ref={menuRef}
            className="dd-menu"
            role="listbox"
            id={listId}
            aria-label={ariaLabel}
            style={{
              left: pos?.left ?? 0,
              top: pos?.top,
              bottom: pos?.bottom,
              minWidth: pos?.width ?? 0,
              maxHeight: pos?.maxHeight,
              // Hidden for the one frame before `place()` has measured, so the
              // menu never flashes in the top-left corner.
              visibility: pos ? undefined : "hidden",
            }}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`dd-option${i === active ? " active" : ""}${
                  o.value === value ? " sel" : ""
                }`}
                style={o.color ? { color: o.color } : undefined}
                onMouseEnter={() => setActive(i)}
                // mousedown (before the document close handler / button blur) so
                // the pick registers instead of just closing the menu.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(i);
                }}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

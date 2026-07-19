import { useEffect, useId, useRef, useState } from "react";

// A Checkpoint-styled select. Native <select> can't style its option popup, so
// it always broke the app's dark/mono language; this renders its own trigger
// and listbox instead. Controlled by `value`; `onChange` reports the chosen
// option's value (the caller decides what to do — set state, run an action…).
export interface DropdownOption {
  value: string;
  label: string;
  color?: string; // optional accent (e.g. a state colour) for value + option
}

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
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIdx = options.findIndex((o) => o.value === value);
  const current = selectedIdx >= 0 ? options[selectedIdx] : undefined;

  // Close when a click (or focus) lands outside the widget.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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
      {open && (
        <ul className="dd-menu" role="listbox" id={listId} aria-label={ariaLabel}>
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
        </ul>
      )}
    </div>
  );
}

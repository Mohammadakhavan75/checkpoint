import { useRef, useState } from "react";

import { useDomains } from "../api/hooks";
import { Dropdown } from "./Dropdown";
import { UserMenu } from "./UserMenu";

// Sentinel for the default "park in the reservoir" capture target.
const RESERVOIR = "";

const FLASH_MS = 1600;

export function Header({
  onCapture,
  onMenuToggle,
}: {
  onCapture: (text: string, domain?: string) => Promise<void>;
  onMenuToggle: () => void;
}) {
  const [text, setText] = useState("");
  const [target, setTarget] = useState(RESERVOIR);
  // Inline confirmation in the CAP> slot — capture no longer navigates, so
  // the bar itself says where the thought landed.
  const [flash, setFlash] = useState<{ txt: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const flashTimer = useRef<number | undefined>(undefined);
  const domains = useDomains();

  function showFlash(txt: string, err = false) {
    window.clearTimeout(flashTimer.current);
    setFlash({ txt, err });
    flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS);
  }

  async function submit() {
    const t = text.trim();
    if (!t || busy) return;
    const dest = target === RESERVOIR ? "Reservoir" : target;
    setBusy(true);
    try {
      await onCapture(t, target === RESERVOIR ? undefined : target);
      setText("");
      // Snap the target back to the reservoir so the next fast capture defaults
      // there rather than sticking on the domain you just captured into.
      setTarget(RESERVOIR);
      showFlash(`✓ → ${dest}`);
    } catch {
      showFlash("⚠ failed", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <header>
      <button className="hamburger" aria-label="Open navigation" onClick={onMenuToggle}>
        ☰
      </button>
      <span className="led" />
      <span className="brand">
        CHECK<b>//</b>POINT
      </span>
      {/* Flexible gap where the RULE ticker used to live — the header's widest
          slot now spends itself on nothing (REDESIGN_V1 §WS-1). */}
      <div className="headgap" />
      <div className="cap">
        <span aria-live="polite" className={flash ? (flash.err ? "capflash err" : "capflash") : ""}>
          {flash ? flash.txt : "CAP>"}
        </span>
        <input
          value={text}
          placeholder="capture a thought, idea, task fragment…"
          autoComplete="off"
          enterKeyHint="done"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <Dropdown
          className="cap"
          title="Where this lands — the reservoir, or straight into a domain"
          ariaLabel="Capture target"
          value={target}
          onChange={setTarget}
          options={[
            { value: RESERVOIR, label: "~ Reservoir" },
            ...(domains.data ?? []).map((d) => ({ value: d.name, label: `→ ${d.name}` })),
          ]}
        />
        <kbd onClick={submit}>↵</kbd>
      </div>
      <UserMenu />
    </header>
  );
}

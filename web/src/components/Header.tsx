import { useEffect, useState } from "react";

import { useDomains } from "../api/hooks";
import { RULES } from "../constants";
import { UserMenu } from "./UserMenu";

// Sentinel for the default "park in the reservoir" capture target.
const RESERVOIR = "";

export function Header({
  onCapture,
  onMenuToggle,
}: {
  onCapture: (text: string, domain?: string) => void;
  onMenuToggle: () => void;
}) {
  const [text, setText] = useState("");
  const [target, setTarget] = useState(RESERVOIR);
  const [ruleIdx, setRuleIdx] = useState(0);
  const domains = useDomains();

  useEffect(() => {
    const id = setInterval(() => setRuleIdx((i) => (i + 1) % RULES.length), 6000);
    return () => clearInterval(id);
  }, []);

  function submit() {
    if (!text.trim()) return;
    onCapture(text.trim(), target === RESERVOIR ? undefined : target);
    setText("");
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
      <div className="ticker mono">
        <b>RULE</b> · {RULES[ruleIdx]}
      </div>
      <div className="cap">
        <span>CAP&gt;</span>
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
        <select
          className="cap-target"
          title="Where this lands — the reservoir, or straight into a domain"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value={RESERVOIR}>~ Reservoir</option>
          {(domains.data ?? []).map((d) => (
            <option key={d.name} value={d.name}>
              → {d.name}
            </option>
          ))}
        </select>
        <kbd onClick={submit}>↵</kbd>
      </div>
      <UserMenu />
    </header>
  );
}

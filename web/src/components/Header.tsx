import { useEffect, useState } from "react";

import { RULES } from "../constants";
import { UserMenu } from "./UserMenu";

export function Header({ onCapture }: { onCapture: (text: string) => void }) {
  const [text, setText] = useState("");
  const [ruleIdx, setRuleIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setRuleIdx((i) => (i + 1) % RULES.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <header>
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
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              onCapture(text.trim());
              setText("");
            }
          }}
        />
        <kbd>↵</kbd>
      </div>
      <UserMenu />
    </header>
  );
}

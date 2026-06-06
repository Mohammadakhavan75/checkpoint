import { useEffect, useMemo, useState } from "react";

import { BLOCKS, type Block } from "../constants";
import type { Item } from "../types";

function defaultBlock(mode?: string | null): Block {
  const id = mode === "Scout" ? "scout" : mode === "Do" ? "exec" : mode === "Plan" ? "ignition" : "deep";
  return BLOCKS.find((b) => b.id === id) ?? BLOCKS[2];
}

export function SessionOverlay({
  item,
  onAbandon,
  onCheckpoint,
}: {
  item: Item;
  onAbandon: () => void;
  onCheckpoint: () => void;
}) {
  const initial = useMemo(() => defaultBlock(item.mode), [item.mode]);
  const [block, setBlock] = useState<Block>(initial);
  const [remaining, setRemaining] = useState(initial.min * 60);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  function pick(b: Block) {
    setBlock(b);
    setRemaining(b.min * 60);
  }

  const f = item.fields;
  const C = 2 * Math.PI * 88;
  const frac = remaining / (block.min * 60);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="session">
      <div className="top">
        <span className="lab">SESSION //</span>
        <h2>{item.title}</h2>
        {item.mode && <span className="mode-chip">{item.mode}</span>}
        <button className="close" onClick={onAbandon}>
          ⨯ abandon
        </button>
      </div>
      <div className="stage">
        <div className="clockwrap">
          <div className="ring">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="var(--line)" strokeWidth="6" />
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="var(--amber)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - frac)}
                style={{ filter: "drop-shadow(0 0 6px var(--amber))" }}
              />
            </svg>
            <div className="time">
              <div className="t">
                {mm}:{ss}
              </div>
              <div className="bt">{block.name}</div>
            </div>
          </div>
          <div className="clockbtns">
            <button className="btn" onClick={() => setRunning((r) => !r)}>
              {running ? "❚❚ Pause" : "▸ Resume"}
            </button>
          </div>
          <div className="blockpick">
            {BLOCKS.map((b) => (
              <button key={b.id} className={block.id === b.id ? "on" : ""} onClick={() => pick(b)}>
                <span>{b.name}</span>
                <span>{b.min}m</span>
              </button>
            ))}
          </div>
        </div>
        <div className="work">
          <div className="focus">First action — start here, nothing else</div>
          <div className="fa">{f.firstAction || "—"}</div>
          <div className="swrow">
            <div className="scard">
              <div className="k">Description</div>
              <div className="v">{f.description || "—"}</div>
            </div>
            {f.risk && (
              <div className="scard">
                <div className="k" style={{ color: "var(--orange)" }}>
                  ! Risk
                </div>
                <div className="v">{f.risk}</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 26, display: "flex", gap: 10 }}>
            <button className="btn amber" style={{ padding: "11px 18px" }} onClick={onCheckpoint}>
              ⊟ Close session → write checkpoint
            </button>
          </div>
          <p className="lead" style={{ marginTop: 18, color: "var(--faint)", fontSize: 12 }}>
            A session is finished when the checkpoint exists — not when the task is done. You can't
            close cleanly without it.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";

import type { Item } from "../types";
import { SnapshotModal } from "./SnapshotModal";

const DEFAULT_MIN = 25;
const MIN_MIN = 1;
const MAX_MIN = 180;

function clampMin(m: number): number {
  if (Number.isNaN(m)) return DEFAULT_MIN;
  return Math.min(MAX_MIN, Math.max(MIN_MIN, Math.round(m)));
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
  const [minutes, setMinutes] = useState(DEFAULT_MIN);
  const [remaining, setRemaining] = useState(DEFAULT_MIN * 60);
  const [running, setRunning] = useState(true);
  const [snapOpen, setSnapOpen] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  function applyMinutes(m: number) {
    const clamped = clampMin(m);
    setMinutes(clamped);
    setRemaining(clamped * 60);
    setRunning(true);
  }

  function reset() {
    setRemaining(minutes * 60);
    setRunning(true);
  }

  const f = item.fields;
  const C = 2 * Math.PI * 88;
  const total = minutes * 60;
  const frac = total > 0 ? remaining / total : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const done = remaining === 0;

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
              <div className="bt">{done ? "TIME'S UP" : "POMODORO"}</div>
            </div>
          </div>

          <div className="pomo">
            <span className="pomolab">Length</span>
            <div className="pomostep">
              <button onClick={() => applyMinutes(minutes - 5)} aria-label="decrease">
                −
              </button>
              <input
                type="number"
                min={MIN_MIN}
                max={MAX_MIN}
                value={minutes}
                onChange={(e) => applyMinutes(Number(e.target.value))}
              />
              <button onClick={() => applyMinutes(minutes + 5)} aria-label="increase">
                +
              </button>
            </div>
            <span className="pomolab">min</span>
          </div>

          <div className="clockbtns">
            <button className="btn" onClick={() => setRunning((r) => !r)} disabled={done}>
              {running ? "❚❚ Pause" : "▸ Resume"}
            </button>
            <button className="btn ghost" onClick={reset}>
              ↺ Reset
            </button>
          </div>
        </div>
        <div className="work">
          <div className="focus">First action — start here, nothing else</div>
          <div className="fa">{f.firstAction || item.title}</div>
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
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn" style={{ padding: "11px 18px" }} onClick={() => setSnapOpen(true)}>
              ⊞ Snapshot — add notes &amp; links
            </button>
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

      {snapOpen && <SnapshotModal id={item.id} onClose={() => setSnapOpen(false)} />}
    </div>
  );
}

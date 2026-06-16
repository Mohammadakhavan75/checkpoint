import { useEffect, useRef, useState } from "react";

import type { Item } from "../types";
import { useSnapshots } from "../api/hooks";
import { SnapshotLog } from "./SnapshotLog";

const DEFAULT_MIN = 25;
const MIN_MIN = 1;
const MAX_MIN = 180;
const MAX_DOTS = 8;

function clampMin(m: number): number {
  if (Number.isNaN(m)) return DEFAULT_MIN;
  return Math.min(MAX_MIN, Math.max(MIN_MIN, Math.round(m)));
}

function fmtFocused(sec: number): string {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function SessionOverlay({
  item,
  onAbandon,
  onCheckpoint,
  onBridge,
}: {
  item: Item;
  onAbandon: () => void;
  onCheckpoint: () => void;
  // Tutorial bridge: hands the one-question answer to the app, which captures
  // it, compiles it, and swaps this session onto the user's real item.
  onBridge?: (text: string) => Promise<void>;
}) {
  const [minutes, setMinutes] = useState(DEFAULT_MIN);
  const [remaining, setRemaining] = useState(DEFAULT_MIN * 60);
  const [running, setRunning] = useState(true);
  const [bridgeText, setBridgeText] = useState("");
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  // Session vitals — the timer is the heartbeat, so the rail reports on it.
  const [startedAt] = useState(() => Date.now());
  const [focusedSec, setFocusedSec] = useState(0);
  const [pomosDone, setPomosDone] = useState(0);
  const pomoCounted = useRef(false);

  const tutorial = !!(item.is_tutorial && onBridge);
  const { data: snapshots = [] } = useSnapshots(item.id);

  async function submitBridge() {
    const text = bridgeText.trim();
    if (!text || bridgeBusy || !onBridge) return;
    setBridgeBusy(true);
    try {
      await onBridge(text);
    } finally {
      setBridgeBusy(false);
    }
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
      setFocusedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // A finished pomodoro stops the clock and ticks the rail's "done" count once.
  useEffect(() => {
    if (remaining === 0 && !pomoCounted.current) {
      pomoCounted.current = true;
      setRunning(false);
      setPomosDone((p) => p + 1);
    }
    if (remaining > 0) pomoCounted.current = false;
  }, [remaining]);

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
  const hasDetails = !!(f.description || f.risk);

  return (
    <div className="session">
      <div className="top">
        <span className="lab">SESSION //</span>
        <h2>{item.title}</h2>
        {item.mode && <span className="mode-chip">{item.mode}</span>}
        <div className="top-acts">
          {!tutorial && (
            <button className="ckpt" onClick={onCheckpoint}>
              ⊟ Close → checkpoint
            </button>
          )}
          <button className="close" onClick={onAbandon}>
            ⨯ abandon
          </button>
        </div>
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

          <div className="pulse">
            {Array.from({ length: Math.min(pomosDone, MAX_DOTS) }).map((_, i) => (
              <span key={i} className="dot on" />
            ))}
            {!done && <span className="dot" />}
            <span className="pulselab">{pomosDone} done</span>
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

          <div className="vitals">
            <div className="vital">
              <span className="vk">Focused</span>
              <span className="vv">{fmtFocused(focusedSec)}</span>
            </div>
            <div className="vital">
              <span className="vk">Notes</span>
              <span className="vv amber">{snapshots.length}</span>
            </div>
            <div className="vital">
              <span className="vk">Started</span>
              <span className="vv dim">{fmtClock(startedAt)}</span>
            </div>
          </div>
        </div>

        {tutorial ? (
          <div className="work">
            <div className="focus">One question — this is the whole tutorial</div>
            <div className="fa">What were you working on before you opened this?</div>
            <div className="bridge">
              <input
                autoFocus
                value={bridgeText}
                placeholder="one line is enough"
                onChange={(e) => setBridgeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitBridge();
                }}
              />
              <button
                className="btn amber"
                disabled={bridgeBusy || !bridgeText.trim()}
                onClick={submitBridge}
              >
                {bridgeBusy ? "…" : "→ make it resumable"}
              </button>
            </div>
            <p className="lead" style={{ marginTop: 18, color: "var(--faint)", fontSize: 12 }}>
              This session becomes a session on <i>that</i>. Work as long as you like — closing
              writes a checkpoint, and your next visit starts from that receipt instead of a
              blank page.
            </p>
          </div>
        ) : (
          <div className="work">
            <div className="ctxstrip">
              <span className="ctxlab">First action</span>
              <span className="ctxfa">{f.firstAction || item.title}</span>
              {hasDetails && (
                <button className="ctxmore" onClick={() => setDescOpen((v) => !v)}>
                  {descOpen ? "hide ⌃" : "details ⌄"}
                </button>
              )}
            </div>
            {descOpen && hasDetails && (
              <div className="ctxdesc">
                {f.description && (
                  <div className="ctxdesc-row">
                    <span className="k">Description</span>
                    <span className="v">{f.description}</span>
                  </div>
                )}
                {f.risk && (
                  <div className="ctxdesc-row">
                    <span className="k risk">! Risk</span>
                    <span className="v">{f.risk}</span>
                  </div>
                )}
              </div>
            )}

            <SnapshotLog id={item.id} />
          </div>
        )}
      </div>
    </div>
  );
}

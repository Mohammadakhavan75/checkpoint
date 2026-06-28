import type { Checkpoint, ItemState } from "../types";
import { Chip } from "./atoms";

function timeAgo(iso: string): string {
  // Postgres datetimes carry an offset; SQLite (dev) emits naive UTC — treat a
  // missing offset as UTC, not local time.
  const hasTz = /(?:Z|[+-]\d\d:?\d\d)$/i.test(iso);
  const then = new Date(hasTz ? iso : iso + "Z").getTime();
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return "moments ago";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

// The receipt that opens every return visit: latest checkpoint + one-click
// resume. Also reused (without buttons) by the first-checkpoint reveal.
//
// `letter` mode reframes the same data as a note from past-you to future-you —
// a warm greeting, a no-pressure line, and softer labels — for the Today return
// screen. The plain card (no greeting, terse labels) stays for the reveal.
export function ResumeCard({
  title,
  checkpoint,
  onResume,
  onDismiss,
  letter,
  userName,
}: {
  title: string;
  checkpoint: Checkpoint;
  onResume?: () => void;
  onDismiss?: () => void;
  letter?: boolean;
  // Only used in letter mode; null/blank (password-only accounts) falls back to
  // "Dear future you,".
  userName?: string | null;
}) {
  const cp = checkpoint;
  const greetName = userName?.trim() || "you";
  return (
    <div className="resumecard fade-in s1">
      {letter && (
        <div className="rc-letter">
          <div className="rc-greet">Dear future {greetName},</div>
          <div className="rc-note">
            Here&apos;s what I left for you to pick up — only if you feel up to it.
          </div>
        </div>
      )}
      <div className="rc-top">
        {/* In letter mode the greeting carries the framing; the cold label would
            fight it, so drop it and keep only the neutral timestamp + chip. */}
        {!letter && <span className="rc-lab">⟲ RESUME FROM</span>}
        <span className="rc-when">{timeAgo(cp.created_at)}</span>
        <Chip state={cp.outcome as ItemState} />
      </div>
      <div className="rc-title">{title}</div>
      <div className="rc-state">{cp.last_state}</div>
      <div className="rc-grid">
        {/* "done" checkpoints carry no resume fields — finished work has no next step */}
        {cp.resume_from && (
          <div>
            <div className="k">{letter ? "Pick up from" : "Resume from"}</div>
            <div className="v">{cp.resume_from}</div>
          </div>
        )}
        {cp.next_action && (
          <div>
            <div className="k">{letter ? "First move" : "Next action"}</div>
            <div className="v">{cp.next_action}</div>
          </div>
        )}
        {cp.do_not_redo && (
          <div>
            <div className="k">Do not redo</div>
            <div className="v">{cp.do_not_redo}</div>
          </div>
        )}
      </div>
      {(onResume || onDismiss) && (
        <div className="rc-acts">
          {onResume && (
            <button className="btn amber rc-resume" onClick={onResume}>
              {letter ? "⟲ Pick it up" : "⟲ RESUME"}
            </button>
          )}
          {onDismiss && (
            <button className="rc-dismiss" onClick={onDismiss}>
              just exploring →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

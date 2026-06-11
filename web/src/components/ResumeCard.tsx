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
export function ResumeCard({
  title,
  checkpoint,
  onResume,
  onDismiss,
}: {
  title: string;
  checkpoint: Checkpoint;
  onResume?: () => void;
  onDismiss?: () => void;
}) {
  const cp = checkpoint;
  return (
    <div className="resumecard fade-in s1">
      <div className="rc-top">
        <span className="rc-lab">⟲ RESUME FROM</span>
        <span className="rc-when">{timeAgo(cp.created_at)}</span>
        <Chip state={cp.outcome as ItemState} />
      </div>
      <div className="rc-title">{title}</div>
      <div className="rc-state">{cp.last_state}</div>
      <div className="rc-grid">
        <div>
          <div className="k">Resume from</div>
          <div className="v">{cp.resume_from}</div>
        </div>
        <div>
          <div className="k">Next action</div>
          <div className="v">{cp.next_action}</div>
        </div>
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
              ⟲ RESUME
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

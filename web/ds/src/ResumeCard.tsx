import { Chip } from "./Chip";
import type { ItemState, ResumeCheckpoint } from "./types";

function timeAgo(iso: string): string {
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

export interface ResumeCardProps {
  /** Task title */
  title: string;
  /** Checkpoint data to display */
  checkpoint: ResumeCheckpoint;
  /** Called when the "RESUME" button is clicked */
  onResume?: () => void;
  /** Called when the "just exploring" dismiss link is clicked */
  onDismiss?: () => void;
}

/** Checkpoint receipt shown at the top of every return visit. Green-glowing card. */
export function ResumeCard({ title, checkpoint, onResume, onDismiss }: ResumeCardProps) {
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
        {cp.resume_from && (
          <div>
            <div className="k">Resume from</div>
            <div className="v">{cp.resume_from}</div>
          </div>
        )}
        {cp.next_action && (
          <div>
            <div className="k">Next action</div>
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

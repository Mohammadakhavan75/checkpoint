import type { Checkpoint } from "../types";
import { ResumeCard } from "./ResumeCard";

// Shown exactly once, right after the user's first self-authored checkpoint
// saves (the server flags it; the seeded tutorial receipt never triggers it):
// their own receipt, styled as the resume card that will greet their return.
export function FirstCheckpointReveal({
  title,
  checkpoint,
  onClose,
}: {
  title: string;
  checkpoint: Checkpoint;
  onClose: () => void;
}) {
  return (
    <div className="scrim">
      <div className="modal">
        <header>
          <span className="ic">⟲</span>
          <h3>Saved. This is your receipt</h3>
        </header>
        <div className="pad">
          <ResumeCard title={title} checkpoint={checkpoint} />
          <div className="note" style={{ margin: "16px 0 0" }}>
            This is what greets you when you come back. Nothing to reconstruct.
          </div>
        </div>
        <footer>
          <button className="btn amber" onClick={onClose}>
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}

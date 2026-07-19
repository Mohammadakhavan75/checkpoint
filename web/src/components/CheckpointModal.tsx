import { useRef, useState } from "react";

import { useSaveCheckpoint, useSetDaily } from "../api/hooks";
import type { CheckpointSaved, Outcome } from "../types";
import { useModalA11y } from "./useModalA11y";

export function CheckpointModal({
  id,
  onBack,
  onSaved,
  trimmed = false,
}: {
  id: string;
  onBack: () => void;
  onSaved: (cp: CheckpointSaved) => void;
  // First-run (tutorial bridge) sessions: only the three core fields,
  // everything else behind a "more" disclosure.
  trimmed?: boolean;
}) {
  const save = useSaveCheckpoint();
  const daily = useSetDaily();
  // After a non-done checkpoint we ask where the (still-resumable) task should
  // live; this holds the saved receipt while that choice is on screen.
  const [saved, setSaved] = useState<CheckpointSaved | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("active");
  const [lastState, setLastState] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [problems, setProblems] = useState("");
  const [resumeFrom, setResumeFrom] = useState("");
  const [doNotRedo, setDoNotRedo] = useState("");
  const [more, setMore] = useState(false);
  const full = !trimmed || more;

  const modalRef = useRef<HTMLDivElement>(null);
  // Escape = Back while the form is open. Once the receipt is saved (the
  // placement choice), Escape does nothing — the task needs a home.
  useModalA11y(modalRef, () => {
    if (!saved) onBack();
  });

  // Done means finished — there is no next step, so the resume fields
  // (resume from / do-not-redo) don't apply.
  const isDone = outcome === "done";

  // No gate: on the human web flow every field is optional, so a receipt can
  // always be saved (the agent surface is the one that enforces the fields).
  async function submit() {
    const cp = await save.mutateAsync({
      id,
      payload: {
        outcome,
        last_state: lastState,
        what_changed: whatChanged || undefined,
        problems: problems || undefined,
        resume_from: isDone ? undefined : resumeFrom,
        do_not_redo: isDone ? undefined : doNotRedo || undefined,
      },
    });
    // Done is finished — nothing to resume, so don't ask where it goes. The
    // first-run (trimmed) session keeps its onboarding flow uninterrupted.
    if (isDone || trimmed) {
      onSaved(cp);
      return;
    }
    setSaved(cp);
  }

  // Place the just-closed task: onto Today to pick up soon, or back into
  // Ready to GO! to clear it off Today until it's pulled in again.
  async function place(toDaily: boolean) {
    if (!saved) return;
    await daily.mutateAsync({ id, daily: toDaily });
    onSaved(saved);
  }

  if (saved) {
    // "Continue later" (active) parks the task on the Resumable shelf; every
    // other still-open outcome (deferred / blocked) clears back to Ready to GO!.
    const toResumable = saved.outcome === "active";
    const dest = toResumable ? "Resumable" : "Ready to GO!";
    return (
      <div className="scrim above-session">
        <div
          className="modal"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ckpt-placement-title"
        >
          <header>
            <span className="ic">⊟</span>
            <h3 id="ckpt-placement-title">Checkpoint saved / where to next?</h3>
          </header>
          <div className="pad">
            <div className="note">
              Receipt saved — where should this task wait?
            </div>
            <div className="placement">
              <button className="btn amber" disabled={daily.isPending} onClick={() => place(false)}>
                {toResumable ? "⟲ Move to Resumable" : "→ Move to Ready to GO!"}
              </button>
              <button className="btn" disabled={daily.isPending} onClick={() => place(true)}>
                ⊙ Keep on Today
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scrim above-session">
      <div
        className="modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ckpt-title"
      >
        <header>
          <span className="ic">⊟</span>
          <h3 id="ckpt-title">Checkpoint / receipt</h3>
        </header>
        <div className="pad">
          <div className="note">
            {isDone
              ? "Record how it ended — this receipt is the proof."
              : "Write where you stopped — future-you starts here."}
          </div>
          {full && (
            <div className="field">
              <label>Outcome</label>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
                <option value="active">↻ Continue later (still active)</option>
                <option value="deferred">→ Deferred</option>
                <option value="blocked">! Blocked</option>
                <option value="done">✓ Done</option>
              </select>
            </div>
          )}
          <div className="field">
            <label>Last state</label>
            <input
              value={lastState}
              placeholder="where things stand right now"
              onChange={(e) => setLastState(e.target.value)}
            />
          </div>
          {full && (
            <div className="field">
              <label>What changed / what I tried</label>
              <textarea
                rows={2}
                placeholder="evidence, commands, what happened"
                value={whatChanged}
                onChange={(e) => setWhatChanged(e.target.value)}
              />
            </div>
          )}
          {full ? (
            isDone ? (
              <>
                <div className="field">
                  <label>Problems found</label>
                  <input value={problems} onChange={(e) => setProblems(e.target.value)} />
                </div>
                <div className="note">
                  ✓ Done — no next action or resume point needed; this receipt is the record.
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label>Problems found</label>
                  <input value={problems} onChange={(e) => setProblems(e.target.value)} />
                </div>
                <div className="grid2">
                  <div className="field">
                    <label>Resume from</label>
                    <input value={resumeFrom} onChange={(e) => setResumeFrom(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Do not redo</label>
                    <input value={doNotRedo} onChange={(e) => setDoNotRedo(e.target.value)} />
                  </div>
                </div>
              </>
            )
          ) : (
            <>
              <div className="field">
                <label>Resume from</label>
                <input value={resumeFrom} onChange={(e) => setResumeFrom(e.target.value)} />
              </div>
              <button className="morebtn" type="button" onClick={() => setMore(true)}>
                + more — outcome · what changed · problems · do-not-redo
              </button>
            </>
          )}
        </div>
        <footer>
          <span className="gate">
            {isDone
              ? "Record how it ended — or just save the receipt."
              : "Note where you stopped — every field is optional."}
          </span>
          <button className="btn" onClick={onBack}>
            Back
          </button>
          <button className="btn amber" onClick={submit} disabled={save.isPending}>
            Save &amp; close
          </button>
        </footer>
      </div>
    </div>
  );
}

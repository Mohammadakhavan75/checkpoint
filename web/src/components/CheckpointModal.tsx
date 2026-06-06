import { useState } from "react";

import { useSaveCheckpoint } from "../api/hooks";
import type { Outcome } from "../types";

export function CheckpointModal({
  id,
  onBack,
  onSaved,
}: {
  id: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const save = useSaveCheckpoint();
  const [outcome, setOutcome] = useState<Outcome>("active");
  const [lastState, setLastState] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [problems, setProblems] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [resumeFrom, setResumeFrom] = useState("");
  const [doNotRedo, setDoNotRedo] = useState("");
  const [err, setErr] = useState("");

  const ok = !!(lastState.trim() && nextAction.trim() && resumeFrom.trim());

  async function submit() {
    if (!ok) {
      setErr("⚠ fill last state · next action · resume from");
      return;
    }
    await save.mutateAsync({
      id,
      payload: {
        outcome,
        last_state: lastState,
        what_changed: whatChanged || undefined,
        problems: problems || undefined,
        next_action: nextAction,
        resume_from: resumeFrom,
        do_not_redo: doNotRedo || undefined,
      },
    });
    onSaved();
  }

  return (
    <div className="scrim">
      <div className="modal">
        <header>
          <span className="ic">⊟</span>
          <h3>Checkpoint / receipt</h3>
        </header>
        <div className="pad">
          <div className="note">
            Externalize the state so future-you resumes without rebuilding context. This is
            mandatory to close.
          </div>
          <div className="field">
            <label>Outcome</label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
              <option value="active">↻ Continue later (still active)</option>
              <option value="deferred">→ Deferred</option>
              <option value="blocked">! Blocked</option>
              <option value="done">✓ Done</option>
            </select>
          </div>
          <div className="field">
            <label>
              Last state <span className="req">*</span>
            </label>
            <input
              value={lastState}
              placeholder="where things stand right now"
              onChange={(e) => setLastState(e.target.value)}
            />
          </div>
          <div className="field">
            <label>What changed / what I tried</label>
            <textarea
              rows={2}
              placeholder="evidence, commands, what happened"
              value={whatChanged}
              onChange={(e) => setWhatChanged(e.target.value)}
            />
          </div>
          <div className="grid2">
            <div className="field">
              <label>Problems found</label>
              <input value={problems} onChange={(e) => setProblems(e.target.value)} />
            </div>
            <div className="field">
              <label>
                Next action <span className="req">*</span>
              </label>
              <input value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label>
                Resume from <span className="req">*</span>
              </label>
              <input value={resumeFrom} onChange={(e) => setResumeFrom(e.target.value)} />
            </div>
            <div className="field">
              <label>Do not redo</label>
              <input value={doNotRedo} onChange={(e) => setDoNotRedo(e.target.value)} />
            </div>
          </div>
        </div>
        <footer>
          <span className="gate" style={{ color: err ? "var(--red)" : undefined }}>
            {err || "⚠ last state · next action · resume from are required"}
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

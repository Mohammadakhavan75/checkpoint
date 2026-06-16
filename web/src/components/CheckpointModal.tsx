import { useState } from "react";

import { useSaveCheckpoint } from "../api/hooks";
import type { CheckpointSaved, Outcome } from "../types";

export function CheckpointModal({
  id,
  onBack,
  onSaved,
  trimmed = false,
}: {
  id: string;
  onBack: () => void;
  onSaved: (cp: CheckpointSaved) => void;
  // First-run (tutorial bridge) sessions: only the three required fields,
  // everything else behind a "more" disclosure.
  trimmed?: boolean;
}) {
  const save = useSaveCheckpoint();
  const [outcome, setOutcome] = useState<Outcome>("active");
  const [lastState, setLastState] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [problems, setProblems] = useState("");
  const [resumeFrom, setResumeFrom] = useState("");
  const [doNotRedo, setDoNotRedo] = useState("");
  const [err, setErr] = useState("");
  const [more, setMore] = useState(false);
  const full = !trimmed || more;

  // Done means finished — there is no next step, so the resume fields
  // (resume from / do-not-redo) don't apply.
  const isDone = outcome === "done";
  const ok = !!(lastState.trim() && (isDone || resumeFrom.trim()));

  async function submit() {
    if (!ok) {
      setErr(isDone ? "⚠ fill last state" : "⚠ fill last state · resume from");
      return;
    }
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
    onSaved(cp);
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
            {isDone
              ? "Record how it ended so future-you trusts it's finished. This is mandatory to close."
              : "Externalize the state so future-you resumes without rebuilding context. This is mandatory to close."}
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
            <label>
              Last state <span className="req">*</span>
            </label>
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
              </>
            )
          ) : (
            <>
              <div className="field">
                <label>
                  Resume from <span className="req">*</span>
                </label>
                <input value={resumeFrom} onChange={(e) => setResumeFrom(e.target.value)} />
              </div>
              <button className="morebtn" type="button" onClick={() => setMore(true)}>
                + more — outcome · what changed · problems · do-not-redo
              </button>
            </>
          )}
        </div>
        <footer>
          <span className="gate" style={{ color: err ? "var(--red)" : undefined }}>
            {err ||
              (isDone
                ? "⚠ last state is required"
                : "⚠ last state · resume from are required")}
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

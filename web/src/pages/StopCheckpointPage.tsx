import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, api } from "../lib/api";
import type { TodayPayload } from "../lib/types";

export function StopCheckpointPage() {
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [changed, setChanged] = useState("");
  const [decision, setDecision] = useState("");
  const [whereStopped, setWhereStopped] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [doNotRethink, setDoNotRethink] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void api.today().then((payload) => {
      setToday(payload);
      setNextAction(payload.primary_mission?.next_action ?? "");
      setDoNotRethink(payload.primary_mission?.do_not_rethink ?? "");
    });
  }, []);

  const mission = today?.primary_mission;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mission) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.createCheckpoint(mission.id, {
        changed,
        decision,
        where_stopped: whereStopped,
        next_action: nextAction,
        do_not_rethink: doNotRethink,
      });
      navigate("/today");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save checkpoint");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mission) {
    return (
      <div className="page-shell">
        <Link className="back-link" to="/today">
          <ArrowLeft size={18} /> Today
        </Link>
        <section className="ritual-panel empty-panel">
          <h2>No active mission</h2>
          <p className="muted">Create or activate one mission before leaving a checkpoint.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell checkpoint-page">
      <Link className="back-link" to="/today">
        <ArrowLeft size={18} /> Today
      </Link>
      <section className="page-heading">
        <div>
          <h1>Stop ritual</h1>
          <p>Save your place. Keep it short.</p>
        </div>
      </section>
      <form className="ritual-panel checkpoint-form" onSubmit={handleSubmit}>
        <div className="mission-title-block">
          <p>Primary mission</p>
          <h2>{mission.title}</h2>
        </div>
        <label>
          What changed?
          <textarea value={changed} onChange={(event) => setChanged(event.target.value)} rows={3} />
        </label>
        <label>
          What did you decide?
          <textarea value={decision} onChange={(event) => setDecision(event.target.value)} rows={3} />
        </label>
        <label>
          Where did you stop?
          <textarea value={whereStopped} onChange={(event) => setWhereStopped(event.target.value)} rows={3} />
        </label>
        <label>
          Next physical action
          <textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} rows={2} required />
        </label>
        <label>
          What should you not rethink?
          <textarea value={doNotRethink} onChange={(event) => setDoNotRethink(event.target.value)} rows={2} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={submitting}>
          <Check size={20} />
          {submitting ? "Saving" : "Save checkpoint"}
        </button>
      </form>
    </div>
  );
}

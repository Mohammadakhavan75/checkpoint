import { Archive, ArrowRight, Clock3, ListPlus, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { MissionCreateForm } from "../components/MissionCreateForm";
import { QuietField } from "../components/QuietField";
import { RitualSteps } from "../components/RitualSteps";
import { ApiError, api } from "../lib/api";
import type { TodayPayload } from "../lib/types";

export function TodayPage() {
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [resumeStep, setResumeStep] = useState<1 | 2>(1);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api
      .today()
      .then((payload) => {
        if (alive) {
          setToday(payload);
        }
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof ApiError ? err.message : "Could not load Today");
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="page-shell">Loading Today</div>;
  }

  if (error) {
    return <div className="page-shell status-message">{error}</div>;
  }

  const mission = today?.primary_mission;

  if (!mission) {
    return <EmptyToday />;
  }

  const lastCheckpointText =
    today.last_checkpoint?.where_stopped ||
    today.last_checkpoint?.changed ||
    mission.reentry_note ||
    mission.current_state ||
    "No checkpoint yet. Leave one after this session.";
  const nextAction = mission.next_action || today.last_checkpoint?.next_action || "Choose the next physical action.";
  const doNotRethink = mission.do_not_rethink || today.last_checkpoint?.do_not_rethink || "Keep the decision small today.";

  return (
    <div className="page-shell today-page">
      <section className="page-heading">
        <div>
          <h1>Start ritual</h1>
          <p>You are here.</p>
        </div>
      </section>

      <RitualSteps current={resumeStep} />

      <section className="ritual-panel" aria-label="Start ritual">
        <div className="mission-title-block">
          <p>Primary mission</p>
          <h2>
            <Link className="mission-title-link" to={`/missions/${mission.id}`}>{mission.title}</Link>
          </h2>
        </div>

        <QuietField icon={<Clock3 size={22} />} label="Last checkpoint">
          {lastCheckpointText}
        </QuietField>
        <QuietField icon={<ArrowRight size={24} />} label="Next physical action" accent>
          {nextAction}
        </QuietField>
        <QuietField icon={<ShieldCheck size={23} />} label="Do not rethink">
          {doNotRethink}
        </QuietField>

        {resumeStep === 2 && <p className="quiet-status">Do the action. When you stop, leave a checkpoint.</p>}

        <div className="ritual-actions">
          <button className="primary-button" type="button" onClick={() => setResumeStep(2)}>
            <ArrowRight size={22} />
            Resume
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate("/life-index")}>
            <RotateCcw size={21} />
            Change mission
          </button>
          <Link className="text-link" to="/today/checkpoint">
            Leave checkpoint instead
          </Link>
        </div>
      </section>

      <div className="below-ritual">
        <Link className="parking-pill" to="/parking">
          <Archive size={18} />
          {today?.parking_count ?? 0} parked, safe for later
          <ArrowRight size={18} />
        </Link>
        <button className="show-more-button" type="button" onClick={() => setShowMore((value) => !value)}>
          <ListPlus size={18} />
          {showMore ? "Show less" : "Show more"}
        </button>
      </div>

      {showMore && (
        <section className="more-panel" aria-label="Mission snapshot">
          <h3>Mission snapshot</h3>
          <dl>
            <div>
              <dt>Why this matters</dt>
              <dd>{mission.why_matters || "Not set yet."}</dd>
            </div>
            <div>
              <dt>Success condition</dt>
              <dd>{mission.success_condition || "Not set yet."}</dd>
            </div>
            <div>
              <dt>Last decision</dt>
              <dd>{mission.last_decision || today.last_checkpoint?.decision || "Not set yet."}</dd>
            </div>
            <div>
              <dt>Blockers</dt>
              <dd>{mission.blockers || "No blockers recorded."}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}

function EmptyToday() {
  const navigate = useNavigate();

  return (
    <div className="page-shell today-page">
      <section className="page-heading">
        <div>
          <h1>Start ritual</h1>
          <p>You are here.</p>
        </div>
      </section>
      <section className="ritual-panel empty-panel">
        <h2>Create one primary mission</h2>
        <p className="muted">Checkpoint works best when Today has one clear place to return.</p>
        <MissionCreateForm defaultStatus="active" onSuccess={() => window.location.reload()} />
        <button className="text-button" type="button" onClick={() => navigate("/parking")}>
          Park an idea instead
        </button>
      </section>
    </div>
  );
}

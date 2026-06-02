import { Archive, ArrowRight, CheckCircle2, Clock3, ListPlus, Minimize2, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { MissionCreateForm } from "../components/MissionCreateForm";
import { QuietField } from "../components/QuietField";
import { RitualSteps } from "../components/RitualSteps";
import { ApiError, api } from "../lib/api";
import type { DirectorState, RewardEvent, TodayPayload } from "../lib/types";

const STATE_OPTIONS: { value: DirectorState; note: string }[] = [
  { value: "Avoiding", note: "The task feels radioactive." },
  { value: "Overwhelmed", note: "Too many pieces are loud." },
  { value: "Warming up", note: "You can touch the edge." },
  { value: "Locked in", note: "You are ready for context." },
  { value: "Recovering", note: "You are coming back after a gap." },
];

function isLowState(state: DirectorState): boolean {
  return state === "Avoiding" || state === "Overwhelmed" || state === "Recovering";
}

export function TodayPage() {
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [resumeStep, setResumeStep] = useState<1 | 2>(1);
  const [selectedState, setSelectedState] = useState<DirectorState | null>(null);
  const [stateSubmitting, setStateSubmitting] = useState<DirectorState | null>(null);
  const [starting, setStarting] = useState(false);
  const [reward, setReward] = useState<RewardEvent | null>(null);
  const [entryOverride, setEntryOverride] = useState("");
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

  const director = today?.director ?? null;
  const lastCheckpointText =
    today.last_checkpoint?.where_stopped ||
    today.last_checkpoint?.changed ||
    mission.reentry_note ||
    mission.current_state ||
    "No checkpoint yet. Leave one after this session.";
  const nextAction = mission.next_action || today.last_checkpoint?.next_action || "Choose the next physical action.";
  const entryMove = entryOverride || director?.entry_move || nextAction;
  const fallbackMove = director?.fallback_move || "Make it smaller: open the work surface and touch only the first visible step.";
  const doNotRethink = mission.do_not_rethink || today.last_checkpoint?.do_not_rethink || "Keep the decision small today.";

  async function chooseState(state: DirectorState) {
    setError("");
    setStateSubmitting(state);
    try {
      await api.setTodayState(state);
      setSelectedState(state);
      setShowMore(false);
      setReward(null);
      setEntryOverride("");
      setResumeStep(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save state");
    } finally {
      setStateSubmitting(null);
    }
  }

  async function startMove() {
    if (!selectedState || !mission) {
      return;
    }
    setError("");
    setStarting(true);
    try {
      const event = await api.startToday({
        mission_id: mission.id,
        state: selectedState,
        action_text: entryMove,
      });
      setReward(event);
      setResumeStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start");
    } finally {
      setStarting(false);
    }
  }

  if (!selectedState) {
    return (
      <div className="page-shell today-page">
        <section className="page-heading">
          <div>
            <h1>{director?.recovery_due ? "Return mode" : "State first"}</h1>
            <p>{director?.recovery_due ? "Coming back is the move." : "Pick the state before facing the mission."}</p>
          </div>
        </section>

        <section className="ritual-panel state-checkin-panel" aria-label="State check-in">
          <div className="state-checkin-intro">
            <h2>What state are you in?</h2>
            <p>{director?.recovery_due ? "A gap is detected, so Recovering is ready." : "Today will shrink itself around this."}</p>
          </div>
          <div className="state-options">
            {STATE_OPTIONS.map((option) => (
              <button
                className={`state-option ${option.value === "Recovering" && director?.recovery_due ? "state-option-recovery" : ""}`}
                type="button"
                key={option.value}
                disabled={stateSubmitting !== null}
                onClick={() => void chooseState(option.value)}
              >
                <span>{stateSubmitting === option.value ? "Saving" : option.value}</span>
                <small>{option.note}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (isLowState(selectedState)) {
    return (
      <div className="page-shell today-page">
        <section className="page-heading">
          <div>
            <h1>{selectedState === "Recovering" || director?.recovery_due ? "Recovery move" : "One tiny move"}</h1>
            <p>{selectedState}</p>
          </div>
          <button className="secondary-button state-reset-button" type="button" onClick={() => setSelectedState(null)}>
            Change state
          </button>
        </section>

        <section className="ritual-panel director-panel" aria-label="Director today">
          <div className="entry-move-block">
            <p>2-minute entry move</p>
            <h2>{entryMove}</h2>
          </div>

          {reward && (
            <p className="reward-moment" role="status">
              <CheckCircle2 size={20} />
              {reward.message}
            </p>
          )}

          <div className="director-actions">
            <button className="primary-button" type="button" disabled={starting} onClick={() => void startMove()}>
              <ArrowRight size={22} />
              {starting ? "Starting" : "Start this move"}
            </button>
            <button className="secondary-button" type="button" onClick={() => setEntryOverride(fallbackMove)}>
              <Minimize2 size={20} />
              Make it smaller
            </button>
            <Link className="parking-pill director-parking" to="/parking">
              <Archive size={18} />
              Park an escape
            </Link>
          </div>

          <button className="show-more-button context-toggle" type="button" onClick={() => setShowMore((value) => !value)}>
            <ListPlus size={18} />
            {showMore ? "Hide mission context" : "Show mission context"}
          </button>

          {showMore && (
            <div className="director-context">
              <div className="mission-title-block">
                <p>Primary mission</p>
                <h2>
                  <Link className="mission-title-link" to={`/missions/${mission.id}`}>{mission.title}</Link>
                </h2>
              </div>
              <QuietField icon={<Clock3 size={22} />} label="Last checkpoint">
                {lastCheckpointText}
              </QuietField>
              <QuietField icon={<ShieldCheck size={23} />} label="Do not rethink">
                {doNotRethink}
              </QuietField>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (selectedState === "Warming up") {
    return (
      <div className="page-shell today-page">
        <section className="page-heading">
          <div>
            <h1>Warm start</h1>
            <p>Touch the edge before the whole mission.</p>
          </div>
          <button className="secondary-button state-reset-button" type="button" onClick={() => setSelectedState(null)}>
            Change state
          </button>
        </section>

        <section className="ritual-panel director-panel" aria-label="Warm start">
          <div className="entry-move-block">
            <p>First move</p>
            <h2>{entryMove}</h2>
          </div>
          {reward && (
            <p className="reward-moment" role="status">
              <CheckCircle2 size={20} />
              {reward.message}
            </p>
          )}
          <div className="director-actions director-actions-two">
            <button className="primary-button" type="button" disabled={starting} onClick={() => void startMove()}>
              <ArrowRight size={22} />
              {starting ? "Starting" : "Start"}
            </button>
            <button className="secondary-button" type="button" onClick={() => setEntryOverride(fallbackMove)}>
              <Minimize2 size={20} />
              Make it smaller
            </button>
          </div>
          <div className="director-context director-context-visible">
            <div className="mission-title-block">
              <p>Primary mission</p>
              <h2>
                <Link className="mission-title-link" to={`/missions/${mission.id}`}>{mission.title}</Link>
              </h2>
            </div>
            <QuietField icon={<Clock3 size={22} />} label="Last checkpoint">
              {lastCheckpointText}
            </QuietField>
            <QuietField icon={<ShieldCheck size={23} />} label="Do not rethink">
              {doNotRethink}
            </QuietField>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell today-page">
      <section className="page-heading">
        <div>
          <h1>Start ritual</h1>
          <p>Locked in.</p>
        </div>
        <button className="secondary-button state-reset-button" type="button" onClick={() => setSelectedState(null)}>
          Change state
        </button>
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
          {entryMove}
        </QuietField>
        <QuietField icon={<ShieldCheck size={23} />} label="Do not rethink">
          {doNotRethink}
        </QuietField>

        {reward && (
          <p className="reward-moment" role="status">
            <CheckCircle2 size={20} />
            {reward.message}
          </p>
        )}
        {resumeStep === 2 && <p className="quiet-status">Do the action. When you stop, leave a checkpoint.</p>}

        <div className="ritual-actions">
          <button className="primary-button" type="button" disabled={starting} onClick={() => void startMove()}>
            <ArrowRight size={22} />
            {starting ? "Starting" : "Resume"}
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

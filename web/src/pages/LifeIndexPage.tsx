import { Archive, CheckCircle2, Circle, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { ApiError, api } from "../lib/api";
import type { Mission } from "../lib/types";

export function LifeIndexPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [title, setTitle] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setMissions(await api.missions());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const active = useMemo(() => missions.filter((mission) => mission.status === "active"), [missions]);
  const parked = useMemo(() => missions.filter((mission) => mission.status === "parked"), [missions]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.createMission({
        title,
        next_action: nextAction,
        status: "parked",
      });
      setTitle("");
      setNextAction("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create mission");
    }
  }

  async function activate(id: string) {
    setError("");
    try {
      await api.activateMission(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not activate mission");
    }
  }

  async function park(id: string) {
    setError("");
    try {
      await api.parkMission(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not park mission");
    }
  }

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <h1>Life Index</h1>
          <p>Choose what is active. Park the rest.</p>
        </div>
      </section>

      <section className="index-grid">
        <div className="simple-panel">
          <h2>Active</h2>
          {loading ? <p className="muted">Loading</p> : null}
          <div className="quiet-list">
            {active.length === 0 && <p className="muted">No active missions.</p>}
            {active.map((mission) => (
              <MissionRow key={mission.id} mission={mission} actionLabel="Park" icon={<Archive size={18} />} onAction={() => park(mission.id)} />
            ))}
          </div>
        </div>

        <div className="simple-panel">
          <h2>Parked missions</h2>
          <div className="quiet-list">
            {parked.length === 0 && <p className="muted">Nothing parked yet.</p>}
            {parked.map((mission) => (
              <MissionRow key={mission.id} mission={mission} actionLabel="Activate" icon={<CheckCircle2 size={18} />} onAction={() => activate(mission.id)} />
            ))}
          </div>
        </div>
      </section>

      <section className="simple-panel create-panel">
        <h2>Create mission</h2>
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Mission
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Prepare leadership roadmap" required />
          </label>
          <label>
            Next physical action
            <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Open roadmap.md and write the first section" />
          </label>
          <button className="secondary-button" type="submit">
            <Plus size={18} />
            Create parked
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>
    </div>
  );
}

function MissionRow({
  mission,
  actionLabel,
  icon,
  onAction,
}: {
  mission: Mission;
  actionLabel: string;
  icon: ReactNode;
  onAction: () => void;
}) {
  return (
    <div className="quiet-row">
      <Circle size={10} className={mission.status === "active" ? "active-dot" : "parked-dot"} />
      <div>
        <strong>{mission.title}</strong>
        <p>{mission.next_action || mission.current_state || "No next action yet."}</p>
      </div>
      <button className="small-button" type="button" onClick={onAction}>
        {icon}
        {actionLabel}
      </button>
    </div>
  );
}

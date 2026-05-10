import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { ApiError, api } from "../lib/api";
import type { Mission, ParkingItem } from "../lib/types";

export function ParkingPage() {
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [parkedMissions, setParkedMissions] = useState<Mission[]>([]);
  const [title, setTitle] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [loadedItems, loadedMissions] = await Promise.all([api.parkingItems(), api.missions("parked")]);
    setItems(loadedItems);
    setParkedMissions(loadedMissions);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handlePark(event: React.MouseEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Mission is required");
      return;
    }
    try {
      await api.createMission({ title, next_action: nextAction, status: "parked" });
      setTitle("");
      setNextAction("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not park mission");
    }
  }

  async function handleActivate(event: React.MouseEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Mission is required");
      return;
    }
    try {
      await api.createMission({ title, next_action: nextAction, status: "active" });
      setTitle("");
      setNextAction("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create and activate mission");
    }
  }

  async function remove(id: string) {
    await api.deleteParkingItem(id);
    await load();
  }

  async function removeMission(id: string) {
    await api.deleteMission(id);
    await load();
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

  const hasParking = items.length > 0 || parkedMissions.length > 0;

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <h1>Parking</h1>
          <p>Parked, not forgotten.</p>
        </div>
      </section>

      <section className="simple-panel create-panel">
        <h2>Park something</h2>
        <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
          <label>
            Mission
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Compare note tools later" required />
          </label>
          <label>
            Action
            <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Not today. Markdown is enough." />
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="secondary-button" type="button" onClick={handlePark}>
              <Plus size={18} />
              Park
            </button>
            <button className="secondary-button" type="button" onClick={handleActivate}>
              <CheckCircle2 size={18} />
              Activate
            </button>
          </div>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="simple-panel">
        <h2>Safe for later</h2>
        <div className="quiet-list">
          {!hasParking && <p className="muted">Nothing parked yet.</p>}
          {parkedMissions.map((mission) => (
            <div className="quiet-row" key={mission.id}>
              <Circle size={10} className="parked-dot" />
              <div>
                <strong>{mission.title}</strong>
                <p>{mission.next_action || mission.current_state || "No next action yet."}</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="small-button" type="button" onClick={() => activate(mission.id)}>
                  <CheckCircle2 size={18} />
                  Activate
                </button>
                <button className="icon-button" type="button" onClick={() => removeMission(mission.id)} aria-label={`Delete ${mission.title}`}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {items.map((item) => (
            <div className="quiet-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.note || "No note."}</p>
              </div>
              <button className="icon-button" type="button" onClick={() => remove(item.id)} aria-label={`Delete ${item.title}`}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

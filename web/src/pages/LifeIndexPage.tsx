import { Archive, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { MissionCreateForm } from "../components/MissionCreateForm";
import { ApiError, api } from "../lib/api";
import type { Domain, Mission, ParkingItem } from "../lib/types";

const ACTIVE_SET_FULL = "You already have three active missions. Park one before activating another.";

export function LifeIndexPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [parkingItems, setParkingItems] = useState<ParkingItem[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const domainMap = useMemo(() => new Map(domains.map((d) => [d.id, d.name])), [domains]);

  async function load() {
    setLoading(true);
    try {
      const [loadedMissions, loadedParkingItems, loadedDomains] = await Promise.all([api.missions(), api.parkingItems(), api.domains()]);
      setMissions(loadedMissions);
      setParkingItems(loadedParkingItems);
      setDomains(loadedDomains);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const topLevelMissions = useMemo(() => missions.filter((m) => m.parent_id === null), [missions]);
  const primary = useMemo(() => topLevelMissions.find((m) => m.status === "active" && m.active_rank === 1) ?? null, [topLevelMissions]);
  const secondary = useMemo(
    () =>
      topLevelMissions
        .filter((m) => m.status === "active" && m.active_rank !== 1)
        .sort((a, b) => (a.active_rank ?? 99) - (b.active_rank ?? 99)),
    [topLevelMissions],
  );
  const parked = useMemo(() => topLevelMissions.filter((m) => m.status === "parked"), [topLevelMissions]);
  const parkingCount = parked.length + parkingItems.length;

  // Group secondary by domain for M5 layout
  const secondaryByDomain = useMemo(() => {
    const groups = new Map<string, Mission[]>();
    for (const m of secondary) {
      const key = m.domain_id ? domainMap.get(m.domain_id) ?? "Unsorted" : "Unsorted";
      const group = groups.get(key) ?? [];
      group.push(m);
      groups.set(key, group);
    }
    return groups;
  }, [secondary, domainMap]);

  // Domains overview: each domain + its active mission count
  const domainStats = useMemo(() => {
    const active = topLevelMissions.filter((m) => m.status === "active");
    return domains
      .map((d) => ({ domain: d, count: active.filter((m) => m.domain_id === d.id).length }))
      .filter((s) => s.count > 0);
  }, [domains, topLevelMissions]);

  async function activate(id: string) {
    setError("");
    try {
      await api.activateMission(id);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(ACTIVE_SET_FULL);
      } else {
        setError(err instanceof ApiError ? err.message : "Could not activate mission");
      }
    }
  }

  async function promote(id: string) {
    setError("");
    try {
      await api.promoteMission(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not promote mission");
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

  async function removeMission(id: string) {
    setError("");
    try {
      await api.deleteMission(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete mission");
    }
  }

  function openModal() {
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  return (
    <div className="page-shell life-index-page">
      <section className="page-heading">
        <div>
          <h1>Life Index</h1>
          <p>One primary. Two secondary. Park the rest.</p>
        </div>
        <button className="secondary-button life-index-add-btn" type="button" onClick={openModal}>
          <Plus size={18} />
          New mission
        </button>
      </section>

      {error && <p className="form-error index-error">{error}</p>}
      {loading && <p className="muted">Loading</p>}

      {/* Primary */}
      {!loading && (
        <section className="life-index-section">
          <h2 className="life-index-section-label life-index-primary-label">Primary</h2>
          {!primary ? (
            <p className="muted life-index-empty">
              {secondary.length > 0 ? "No primary set — promote a secondary." : "Nothing active yet."}
            </p>
          ) : (
            <div className="simple-panel primary-card">
              {primary.domain_id && domainMap.get(primary.domain_id) && (
                <span className="mission-domain-label">{domainMap.get(primary.domain_id)}</span>
              )}
              <h3 className="primary-card-title">
                <Link className="mission-title-link" to={`/missions/${primary.id}`}>
                  {primary.title}
                </Link>
              </h3>
              {(primary.next_action || primary.current_state) && (
                <p className="primary-card-action">{primary.next_action || primary.current_state}</p>
              )}
              <div className="tier-row-actions">
                <button className="small-button" type="button" onClick={() => park(primary.id)}>
                  <Archive size={15} /> Park
                </button>
                <button className="icon-button" type="button" onClick={() => removeMission(primary.id)} aria-label={`Delete ${primary.title}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Secondary */}
      {!loading && secondary.length > 0 && (
        <section className="life-index-section">
          <h2 className="life-index-section-label">Secondary</h2>
          <div className="simple-panel">
            {Array.from(secondaryByDomain.entries()).map(([groupName, missions]) => (
              <div key={groupName} className="secondary-domain-group">
                {secondaryByDomain.size > 1 && <p className="secondary-group-label">{groupName}</p>}
                {missions.map((m) => (
                  <div key={m.id} className="tier-row tier-row-secondary">
                    <div className="tier-row-body">
                      {m.domain_id && domainMap.get(m.domain_id) && secondaryByDomain.size === 1 && (
                        <span className="mission-domain-label">{domainMap.get(m.domain_id)}</span>
                      )}
                      <strong>
                        <Link className="mission-title-link" to={`/missions/${m.id}`}>{m.title}</Link>
                      </strong>
                      <p>{m.next_action || m.current_state || "No next action yet."}</p>
                    </div>
                    <div className="tier-row-actions">
                      <button className="small-button" type="button" onClick={() => promote(m.id)} title="Make primary">
                        <Star size={15} /> Make primary
                      </button>
                      <button className="small-button" type="button" onClick={() => park(m.id)}>
                        <Archive size={15} /> Park
                      </button>
                      <button className="icon-button" type="button" onClick={() => removeMission(m.id)} aria-label={`Delete ${m.title}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Domains overview */}
      {!loading && domainStats.length > 0 && (
        <section className="life-index-section">
          <h2 className="life-index-section-label">Domains</h2>
          <div className="domain-chips">
            {domainStats.map(({ domain, count }) => (
              <span key={domain.id} className="domain-chip">
                {domain.name}
                <span className="domain-chip-count">{count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Parking summary */}
      {!loading && (
        <section className="life-index-section">
          <h2 className="life-index-section-label">Parking</h2>
          {parkingCount === 0 ? (
            <p className="muted life-index-empty">Nothing parked yet, and that is fine.</p>
          ) : (
            <Link className="parking-pill" to="/parking">
              <Archive size={18} />
              {parkingCount} parked, safe for later
            </Link>
          )}
        </section>
      )}

      {/* New mission modal */}
      <dialog ref={dialogRef} className="mission-modal" onClick={(e) => { if (e.target === dialogRef.current) closeModal(); }}>
        <div className="mission-modal-inner">
          <div className="mission-modal-header">
            <h2>New mission</h2>
            <button className="icon-button" type="button" onClick={closeModal} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <MissionCreateForm
            defaultStatus="parked"
            onSuccess={() => {
              closeModal();
              void load();
            }}
          />
        </div>
      </dialog>
    </div>
  );
}

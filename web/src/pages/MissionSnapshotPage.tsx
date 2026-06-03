import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, api } from "../lib/api";
import type { Checkpoint, Domain, Mission } from "../lib/types";

type StringMissionKey = {
  [K in keyof Mission]: Mission[K] extends string ? K : never;
}[keyof Mission];

const SNAPSHOT_FIELDS: { key: StringMissionKey; label: string; placeholder: string }[] = [
  { key: "why_matters", label: "Why this matters", placeholder: "What breaks if this never gets done?" },
  { key: "success_condition", label: "Success condition", placeholder: "What does done look like, concretely?" },
  { key: "current_state", label: "Current state", placeholder: "Where things stand right now." },
  { key: "last_decision", label: "Last decision", placeholder: "The last call you made on this." },
  { key: "blockers", label: "Blockers", placeholder: "What is in the way?" },
  { key: "next_action", label: "Next physical action", placeholder: "Open roadmap.md and write the first section." },
  { key: "files_links", label: "Files / links", placeholder: "Paths, URLs, or references." },
  { key: "reentry_note", label: "Re-entry note", placeholder: "What to read first when returning." },
  { key: "do_not_rethink", label: "Do not rethink", placeholder: "What decision is already made?" },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function InlineField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  onSave: (val: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  async function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      void save();
    }
  }

  return (
    <div className="snapshot-field">
      <div className="snapshot-field-label">{label}</div>
      {editing ? (
        <textarea
          ref={textareaRef}
          className="snapshot-field-textarea"
          aria-label={label}
          value={draft}
          rows={3}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button
          type="button"
          className={`snapshot-field-value ${value ? "" : "snapshot-field-empty"}`}
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          {value || placeholder}
        </button>
      )}
    </div>
  );
}

function CheckpointRow({ checkpoint }: { checkpoint: Checkpoint }) {
  const [expanded, setExpanded] = useState(false);
  const details = [
    { label: "Changed", value: checkpoint.changed },
    { label: "Decision", value: checkpoint.decision },
    { label: "Next action", value: checkpoint.next_action },
    { label: "Do not rethink", value: checkpoint.do_not_rethink },
  ].filter((d) => d.value);

  return (
    <div className="checkpoint-history-row">
      <div className="checkpoint-history-header">
        <time className="checkpoint-history-time">{relativeTime(checkpoint.created_at)}</time>
        <p className="checkpoint-history-headline">{checkpoint.where_stopped || "No location recorded."}</p>
        {details.length > 0 && (
          <button type="button" className="checkpoint-toggle" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? "Less" : "Details"}
          </button>
        )}
      </div>
      {expanded && (
        <dl className="checkpoint-history-details">
          {details.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function MissionSnapshotPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [microMissions, setMicroMissions] = useState<Mission[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tinyTitle, setTinyTitle] = useState("");
  const [tinyAction, setTinyAction] = useState("");
  const [tinyError, setTinyError] = useState("");
  const [creatingTiny, setCreatingTiny] = useState(false);

  useEffect(() => {
    if (!missionId) return;
    setLoading(true);
    Promise.all([api.mission(missionId), api.microMissions(missionId), api.checkpoints(missionId), api.domains()])
      .then(([m, tiny, cp, d]) => {
        setMission(m);
        setMicroMissions(tiny);
        setCheckpoints([...cp].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setDomains(d);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load mission"))
      .finally(() => setLoading(false));
  }, [missionId]);

  async function saveField(key: StringMissionKey, value: string) {
    if (!missionId) return;
    const updated = await api.updateMission(missionId, { [key]: value });
    setMission(updated);
  }

  async function createTinyMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!missionId || !tinyTitle.trim()) return;
    setTinyError("");
    setCreatingTiny(true);
    try {
      const created = await api.createMicroMission(missionId, {
        title: tinyTitle,
        next_action: tinyAction,
        activation_energy: "low",
        cognitive_load: "low",
        emotional_resistance: "low",
        est_minutes: 2,
        reward_type: "momentum",
      });
      setMicroMissions((items) => [created, ...items]);
      setTinyTitle("");
      setTinyAction("");
    } catch (err) {
      setTinyError(err instanceof ApiError ? err.message : "Could not create tiny move");
    } finally {
      setCreatingTiny(false);
    }
  }

  async function completeTinyMove(microMission: Mission) {
    setTinyError("");
    try {
      await api.completeMission(microMission.id, "Tiny move completed");
      setMicroMissions((items) => items.map((item) => (item.id === microMission.id ? { ...item, status: "completed" } : item)));
    } catch (err) {
      setTinyError(err instanceof ApiError ? err.message : "Could not complete tiny move");
    }
  }

  if (loading) return <div className="page-shell">Loading</div>;
  if (error || !mission) return <div className="page-shell status-message">{error || "Mission not found."}</div>;

  return (
    <div className="page-shell snapshot-page">
      <Link className="back-link" to="/life-index">
        <ArrowLeft size={18} /> Life Index
      </Link>

      <section className="page-heading">
        <div>
          <p className="snapshot-status-label">{mission.status === "active" ? "Active mission" : "Parked mission"}</p>
          <h1>{mission.title}</h1>
          {domains.length > 0 && (
            <div className="snapshot-domain-row">
              <label className="snapshot-domain-label" htmlFor="snapshot-domain">
                Domain
              </label>
              <select
                id="snapshot-domain"
                className="snapshot-domain-select"
                value={mission.domain_id ?? ""}
                onChange={async (e) => {
                  const updated = await api.updateMission(mission.id, { domain_id: e.target.value || null });
                  setMission(updated);
                }}
              >
                <option value="">No domain</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      <section className="simple-panel snapshot-fields-panel">
        <h2>Snapshot</h2>
        <p className="muted snapshot-hint">Click any field to edit. Blur or Ctrl+Enter to save.</p>
        <div className="snapshot-fields">
          {SNAPSHOT_FIELDS.map(({ key, label, placeholder }) => (
            <InlineField key={key} label={label} value={mission[key] as string} placeholder={placeholder} onSave={(val) => saveField(key, val)} />
          ))}
        </div>
      </section>

      {mission.parent_id === null && (
        <section className="simple-panel tiny-moves-panel">
          <h2>Tiny moves</h2>
          <form className="tiny-move-form" onSubmit={createTinyMove}>
            <label>
              Tiny move
              <input value={tinyTitle} onChange={(event) => setTinyTitle(event.target.value)} placeholder="Open notes.md for two minutes" required />
            </label>
            <label>
              Action
              <input value={tinyAction} onChange={(event) => setTinyAction(event.target.value)} placeholder="Touch only the first visible step" />
            </label>
            <button className="secondary-button" type="submit" disabled={creatingTiny}>
              <Plus size={18} />
              {creatingTiny ? "Creating" : "Create tiny move"}
            </button>
          </form>
          {tinyError && <p className="form-error">{tinyError}</p>}
          <div className="tiny-move-list">
            {microMissions.length === 0 && <p className="muted">No tiny moves yet.</p>}
            {microMissions.map((microMission) => (
              <div className={`tiny-move-row ${microMission.status === "completed" ? "tiny-move-row-completed" : ""}`} key={microMission.id}>
                <div>
                  <strong>{microMission.title}</strong>
                  <p>
                    {microMission.next_action || "No action set."} · {microMission.est_minutes} min
                  </p>
                </div>
                {microMission.status === "completed" ? (
                  <span className="tiny-complete-label">Complete</span>
                ) : (
                  <button className="small-button" type="button" onClick={() => void completeTinyMove(microMission)}>
                    <CheckCircle2 size={16} />
                    Complete
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="simple-panel snapshot-history-panel">
        <h2>Checkpoint history</h2>
        {checkpoints.length === 0 ? (
          <p className="muted">Nothing yet, and that is fine. Leave one after this session.</p>
        ) : (
          <div className="checkpoint-history-list">
            {checkpoints.map((cp) => (
              <CheckpointRow key={cp.id} checkpoint={cp} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

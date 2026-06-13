import { useEffect, useState } from "react";

import { useCompile, useDeleteItem, useItem } from "../api/hooks";
import { CLASS_MODE, QUAD } from "../constants";
import type { CompilePayload, PhaseInput, Procedure, Scope } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

export function CompileModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: item, isLoading } = useItem(id);
  const compile = useCompile();
  const del = useDeleteItem();

  const [procedure, setProcedure] = useState<Procedure | "">("");
  const [scope, setScope] = useState<Scope | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [firstAction, setFirstAction] = useState("");
  const [risk, setRisk] = useState("");
  const [phases, setPhases] = useState<PhaseInput[]>([]);
  const [subtasks, setSubtasks] = useState(false);
  const [ready, setReady] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!item || ready) return;
    setProcedure((item.procedure as Procedure | null) ?? "");
    setScope((item.scope as Scope | null) ?? "");
    setTitle(item.title);
    setDescription(item.fields.description ?? "");
    setFirstAction(item.fields.firstAction ?? "");
    setRisk(item.fields.risk ?? "");
    const existing: PhaseInput[] = (item.children ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      firstAction: c.fields.firstAction ?? "",
    }));
    const isChild = !!item.parent_id;
    const isTrap = item.procedure === "known" && item.scope === "unbounded";
    const wantSubs = !isChild && (existing.length > 0 || isTrap);
    setSubtasks(wantSubs);
    setPhases(existing.length ? existing : wantSubs ? [{ title: "", firstAction: "" }] : []);
    setReady(true);
  }, [item, ready]);

  if (isLoading || !item || !ready) {
    return (
      <div className="scrim">
        <div className="modal">
          <div className="pad">
            <div className="loading">loading…</div>
          </div>
        </div>
      </div>
    );
  }

  const isChild = !!item.parent_id;
  const mode = procedure && scope ? CLASS_MODE[`${procedure}|${scope}`] : "";
  const isTrap = procedure === "known" && scope === "unbounded";
  const cont = !isChild && subtasks;
  const quad = procedure && scope ? QUAD[`${procedure}|${scope}`] : null;
  const paralysis = procedure === "unknown" && scope === "unbounded";
  const nSubs = phases.filter((p) => p.title.trim()).length;

  const gateOk = (() => {
    if (!mode || !description.trim()) return false;
    if (cont) return phases.some((p) => p.title.trim());
    return !!firstAction.trim();
  })();

  let gateTxt: string;
  let gateCls = "";
  if (gateOk) {
    gateTxt = cont ? `✓ valid container · ${nSubs} phase${nSubs > 1 ? "s" : ""}` : "✓ valid resumable unit";
    gateCls = "ok";
  } else if (paralysis) {
    gateTxt = "⚠ unknown + unbounded — to be defined together (TBD)";
  } else if (!mode) {
    gateTxt = "⚠ classify the task above to set its mode";
  } else if (cont) {
    gateTxt = "⚠ add at least one phase (needs a title)";
  } else {
    gateTxt = "⚠ fill the required (*) fields";
  }

  function pickClass(p: Procedure, s: Scope) {
    setProcedure(p);
    setScope(s);
    if (!isChild && p === "known" && s === "unbounded") {
      setSubtasks(true);
      setPhases((prev) => (prev.length ? prev : [{ title: "", firstAction: "" }]));
    }
  }

  function setPhase(k: number, field: "title" | "firstAction", val: string) {
    setPhases((prev) => prev.map((x, i) => (i === k ? { ...x, [field]: val } : x)));
  }

  function toggleSubtasks() {
    setSubtasks((s) => {
      const next = !s;
      if (next) setPhases((p) => (p.length ? p : [{ title: "", firstAction: "" }]));
      return next;
    });
  }

  async function save() {
    if (!gateOk) return;
    const payload: CompilePayload = {
      title,
      description,
      risk,
      procedure: procedure || undefined,
      scope: scope || undefined,
      mode: mode || undefined,
    };
    if (cont) payload.phases = phases.filter((p) => p.title.trim());
    else payload.firstAction = firstAction;
    await compile.mutateAsync({ id, payload });
    onClose();
  }

  async function handleDelete() {
    await del.mutateAsync(id);
    onClose();
  }

  const Cell = ({ p, s }: { p: Procedure; s: Scope }) => {
    const q = QUAD[`${p}|${s}`];
    const sel = procedure === p && scope === s;
    return (
      <div
        className={`cell ${sel ? "sel" : ""}`}
        style={{ color: q.c, padding: 10 }}
        onClick={() => pickClass(p, s)}
      >
        <span className="tag" style={{ fontSize: 9 }}>
          {q.t}
        </span>
        <h5 style={{ color: "var(--text)", fontSize: 12 }}>{q.n}</h5>
      </div>
    );
  };

  return (
    <>
    {/* No backdrop-click close: compiling is data entry, and an accidental
        click outside the box shouldn't discard the work. Use ✕ or Cancel. */}
    <div className="scrim">
      <div className="modal">
        <header>
          <span className="ic">⚙</span>
          <h3>Compile task</h3>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="pad">
          <div className="note">
            Classify the task — that sets its <b>mode</b>. A{" "}
            <b style={{ color: "var(--orange)" }}>Time trap</b> is broken into phases; everything
            else gets a single first action.
          </div>

          <div className="field">
            <label>Task</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label>
              Classify — procedure × scope (sets the mode) <span className="req">*</span>
            </label>
            <div className="matrix" style={{ gridTemplateColumns: "70px 1fr 1fr", gap: 6 }}>
              <div />
              <div className="hd" style={{ fontSize: 9 }}>
                bounded
              </div>
              <div className="hd" style={{ fontSize: 9 }}>
                unbounded
              </div>
              <div className="hd" style={{ fontSize: 9 }}>
                known
              </div>
              <Cell p="known" s="bounded" />
              <Cell p="known" s="unbounded" />
              <div className="hd" style={{ fontSize: 9 }}>
                unknown
              </div>
              <Cell p="unknown" s="bounded" />
              <Cell p="unknown" s="unbounded" />
            </div>
            {quad && (
              <div className="hint" style={{ color: quad.c }}>
                ▶ {quad.n}
                {mode ? (
                  <>
                    {" "}
                    → mode: <b>{mode}</b>
                  </>
                ) : null}{" "}
                · {quad.d}
              </div>
            )}
          </div>

          <div className="field">
            <label>
              Description <span className="req">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="what is this task, in your own words"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {cont ? (
            <div className="field">
              <label>
                Phases <span className="req">*</span> — a container is worked through its phases, not
                directly
              </label>
              <div className="subs">
                {phases.length ? (
                  phases.map((p, k) => (
                    <div className="subrow" key={k}>
                      <span className="phase-no">{k + 1}</span>
                      <input
                        className="sub-title"
                        placeholder="phase title"
                        value={p.title}
                        onChange={(e) => setPhase(k, "title", e.target.value)}
                      />
                      <input
                        className="sub-fa"
                        placeholder="first action (optional)"
                        value={p.firstAction}
                        onChange={(e) => setPhase(k, "firstAction", e.target.value)}
                      />
                      <button
                        className="btn ghost"
                        title="remove"
                        onClick={() => setPhases((prev) => prev.filter((_, i) => i !== k))}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="hint">no phases yet</div>
                )}
              </div>
              <button
                className="btn"
                style={{ marginTop: 9 }}
                onClick={() => setPhases((p) => [...p, { title: "", firstAction: "" }])}
              >
                ＋ Add phase
              </button>
              <div className="hint">
                Each phase becomes its own startable unit. A phase with a first action goes straight
                to Ready to GO.
              </div>
            </div>
          ) : (
            <div className="field">
              <label>
                First action <span className="req">*</span>
              </label>
              <input
                value={firstAction}
                placeholder="the exact first thing to open / run / read / write"
                onChange={(e) => setFirstAction(e.target.value)}
              />
              <div className="hint">
                If you can't name it, the task is unknown — scout it first.
              </div>
            </div>
          )}

          <div className="field" style={{ marginTop: -4 }}>
            {isChild ? (
              <div className="hint">A phase can't be split again — subtasks are one level deep.</div>
            ) : isTrap ? (
              <div className="hint" style={{ color: "var(--orange)" }}>
                Time trap → breaking into phases is required.
              </div>
            ) : (
              <button className="btn ghost" onClick={toggleSubtasks}>
                {cont ? "↩ back to a single first action" : "⑂ break into phases instead"}
              </button>
            )}
          </div>

          <div className="field">
            <label>Risk (likely expansion points)</label>
            <input
              value={risk}
              placeholder="known unknowns — optional"
              onChange={(e) => setRisk(e.target.value)}
            />
          </div>
        </div>
        <footer>
          <span className={`gate ${gateCls}`}>{gateTxt}</span>
          <button className="btn danger" onClick={() => setConfirmDelete(true)} disabled={del.isPending}>
            Delete
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn amber" onClick={save} disabled={!gateOk || compile.isPending}>
            Compile
          </button>
        </footer>
      </div>
    </div>
    {confirmDelete && (
      <ConfirmDialog
        title="Delete task"
        message={`Delete ${
          cont ? "this container and all its phases" : `"${item.title}"`
        }? This can't be undone.`}
        confirmLabel="Delete"
        busy={del.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    )}
    </>
  );
}

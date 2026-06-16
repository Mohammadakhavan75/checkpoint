import type { Item } from "../types";
import { Chip, Marker, ModeChip } from "./atoms";

export function UnitRow({
  item,
  idx,
  ctx,
  onStart,
  onToDaily,
  onEdit,
}: {
  item: Item;
  idx: number;
  ctx: "today" | "ready";
  onStart: (id: string) => void;
  onToDaily: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const f = item.fields;
  const cp = item.latest_checkpoint;
  // A task with a checkpoint can be resumed rather than freshly started — give
  // it the green glow and a Resume button (same size / slot as Start).
  const resumable = ctx === "today" && !!cp && item.state !== "done";
  return (
    <div className={`row fade-in s${(idx % 4) + 1} ${item.state} ${resumable ? "resumable" : ""}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="rowhead">
          <Marker state={item.state} />
          <div className="ttl">
            <div className="name">{item.title}</div>
            <div className="meta">
              <span>{item.domain}</span>
              {item.parent_id && <span style={{ color: "var(--violet)" }}>↳ phase</span>}
              <ModeChip mode={item.mode} />
              <Chip state={item.state} />
            </div>
          </div>
          <div className="acts">
            {ctx === "today" ? (
              <button className="btn amber" onClick={() => onStart(item.id)}>
                {resumable ? "⟲ Resume" : "▸ Start"}
              </button>
            ) : (
              <button className="btn amber" onClick={() => onToDaily(item.id)}>
                → Today
              </button>
            )}
            <button className="btn" onClick={() => onEdit(item.id)}>
              Edit
            </button>
          </div>
        </div>
        <div className="exec">
          <div>
            <div className="k">First action</div>
            <div className="v">{f.firstAction || "—"}</div>
          </div>
          <div>
            <div className="k">Description</div>
            <div className="v">{f.description || "—"}</div>
          </div>
        </div>
        {cp && (
          <div className="resume">
            ⟲ RESUME FROM <b>{cp.resume_from || f.resumeFrom}</b> · do not redo:{" "}
            {cp.do_not_redo || "—"}
          </div>
        )}
      </div>
    </div>
  );
}

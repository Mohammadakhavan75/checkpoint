import type { Item } from "../types";
import { Chip, Marker, ModeChip } from "./atoms";

// A container (parent task) as it appears in Ready to GO and Today: the whole
// thing moves as one unit, with its phases nested underneath. In Ready it can
// be pulled into Today; in Today you start its phases (the next one is flagged).
export function ContainerCard({
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
  const children = item.children;
  const total = children.length;
  const done = children.filter((c) => c.state === "done").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const nextId = children.find((c) => c.state !== "done" && c.state !== "killed")?.id;
  // Completed phases sink to the bottom so the still-open work stays up top.
  // Each phase keeps its original number (its place in the plan) rather than
  // being renumbered as it completes; sort() is stable so the rest hold order.
  const ordered = children
    .map((c, k) => ({ c, no: k + 1 }))
    .sort((a, b) => Number(a.c.state === "done") - Number(b.c.state === "done"));

  return (
    <div className={`fade-in s${(idx % 4) + 1}`}>
      <div className={`row parent ${item.state}`}>
        <span className="marker" style={{ color: "var(--violet)" }}>
          ▦
        </span>
        <div className="ttl">
          <div className="name">{item.title}</div>
          <div className="meta">
            <span>{item.domain}</span>
            <ModeChip mode="Plan" />
            <Chip state={item.state} />
            <span className="prog">
              <span className="bar" style={{ width: `${pct}%` }} />
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--dim)" }}>
              {done}/{total} phases
            </span>
          </div>
        </div>
        <div className="acts">
          {ctx === "ready" ? (
            <button
              className="btn amber"
              title="Move the whole container — every phase — into Today"
              onClick={() => onToDaily(item.id)}
            >
              → Today
            </button>
          ) : null}
          <button className="btn" onClick={() => onEdit(item.id)}>
            Edit phases
          </button>
        </div>
      </div>
      {ordered.map(({ c, no }) => {
        const startable = c.state !== "done" && c.state !== "killed";
        return (
          <div key={c.id} className={`row child ${c.state} ${c.id === nextId ? "next" : ""}`}>
            <span className="phase-no">{no}</span>
            <Marker state={c.state} />
            <div className="ttl">
              <div className="name">{c.title}</div>
              <div className="meta">
                <ModeChip mode={c.mode || "Do"} />
                <Chip state={c.state} />
                {c.fields.firstAction ? (
                  <span>▸ {c.fields.firstAction}</span>
                ) : (
                  <span style={{ color: "var(--orange)" }}>no first action</span>
                )}
                {c.id === nextId && <span style={{ color: "var(--amber)" }}>next</span>}
              </div>
            </div>
            <div className="acts">
              {ctx === "today" && startable && (
                <button
                  className={`btn ${c.id === nextId ? "amber" : ""}`}
                  onClick={() => onStart(c.id)}
                >
                  ▸ Start
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

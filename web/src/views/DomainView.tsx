import { useItems, useSetState } from "../api/hooks";
import { Chip, Loading, Marker, ModeChip, StateSelect } from "../components/atoms";
import type { Item, ItemState } from "../types";

function BacklogRow({
  item,
  idx,
  onState,
  onCompile,
  onFastExecute,
}: {
  item: Item;
  idx: number;
  onState: (id: string, state: ItemState) => void;
  onCompile: (id: string) => void;
  onFastExecute: (id: string, compiled: boolean) => void;
}) {
  return (
    <div className={`row fade-in s${(idx % 4) + 1} ${item.state}`}>
      <Marker state={item.state} />
      <div className="ttl">
        <div className="name">{item.title}</div>
        <div className="meta">
          {item.compiled ? (
            <span style={{ color: "var(--green)" }}>compiled</span>
          ) : (
            <span style={{ color: "var(--orange)" }}>not compiled</span>
          )}
          <ModeChip mode={item.mode} />
          {item.daily ? (
            <span style={{ color: "var(--amber)" }}>on today</span>
          ) : item.compiled ? (
            <span style={{ color: "var(--cyan)" }}>ready to go</span>
          ) : null}
        </div>
      </div>
      <div className="acts">
        <StateSelect item={item} onChange={(s) => onState(item.id, s)} />
        <button
          className="btn"
          title="Start a session now — skip compiling"
          onClick={() => onFastExecute(item.id, item.compiled)}
        >
          ⚡ Go
        </button>
        <button className="btn amber" onClick={() => onCompile(item.id)}>
          {item.compiled ? "Recompile" : "Compile"}
        </button>
      </div>
    </div>
  );
}

function ContainerGroup({
  item,
  idx,
  open,
  onToggle,
  onState,
  onCompile,
}: {
  item: Item;
  idx: number;
  open: boolean;
  onToggle: (id: string) => void;
  onState: (id: string, state: ItemState) => void;
  onCompile: (id: string) => void;
}) {
  const children = item.children;
  const total = children.length;
  const done = children.filter((c) => c.state === "done").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const nextId = children.find((c) => c.state !== "done" && c.state !== "killed")?.id;

  return (
    <div className={`fade-in s${(idx % 4) + 1}`}>
      <div className={`row parent ${item.state}`}>
        <button className="caret" onClick={() => onToggle(item.id)}>
          {open ? "▾" : "▸"}
        </button>
        <span className="marker" style={{ color: "var(--violet)" }}>
          ▦
        </span>
        <div className="ttl">
          <div className="name">{item.title}</div>
          <div className="meta">
            <span style={{ color: "var(--violet)" }}>container</span>
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
          <StateSelect item={item} onChange={(s) => onState(item.id, s)} />
          <button className="btn amber" onClick={() => onCompile(item.id)}>
            Edit phases
          </button>
        </div>
      </div>
      {open &&
        children.map((c, k) => (
          <div
            key={c.id}
            className={`row child ${c.state} ${c.id === nextId ? "next" : ""}`}
            style={{ marginLeft: 26 }}
          >
            <span className="phase-no">{k + 1}</span>
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
              <StateSelect item={c} onChange={(s) => onState(c.id, s)} />
              <button className="btn" onClick={() => onCompile(c.id)}>
                Edit
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

export function DomainView({
  domain,
  collapsed,
  onToggle,
  onCompile,
  onFastExecute,
}: {
  domain: string;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onCompile: (id: string) => void;
  onFastExecute: (id: string, compiled: boolean) => void;
}) {
  const { data, isLoading } = useItems("domain", domain);
  const setState = useSetState();
  if (isLoading) return <Loading />;
  const list = data ?? [];

  const onState = (id: string, state: ItemState) => setState.mutate({ id, state });

  return (
    <>
      <div className="viewhead">
        <h1>{domain}</h1>
        <span className="sub">// domain backlog</span>
      </div>
      <p className="lead">
        An inventory of possible work states — not a todo list. Set each item's state. The
        dangerous state is <b style={{ color: "var(--yellow)" }}>important-but-undefined</b>:
        compile it, defer it, or kill it.
      </p>
      <div className="rows">
        {list.length ? (
          list.map((item, idx) =>
            item.is_parent ? (
              <ContainerGroup
                key={item.id}
                item={item}
                idx={idx}
                open={!collapsed.has(item.id)}
                onToggle={onToggle}
                onState={onState}
                onCompile={onCompile}
              />
            ) : (
              <BacklogRow
                key={item.id}
                item={item}
                idx={idx}
                onState={onState}
                onCompile={onCompile}
                onFastExecute={onFastExecute}
              />
            ),
          )
        ) : (
          <div className="empty">No items in {domain} yet.</div>
        )}
      </div>
    </>
  );
}

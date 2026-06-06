import { useDeleteItem, useItems, usePromote } from "../api/hooks";
import { Loading } from "../components/atoms";
import { DOMAINS } from "../constants";
import type { Tab } from "../types";

export function ReservoirView({ onNav }: { onNav: (tab: Tab, domain?: string) => void }) {
  const { data, isLoading } = useItems("reservoir");
  const promote = usePromote();
  const del = useDeleteItem();
  if (isLoading) return <Loading />;
  const list = data ?? [];

  return (
    <>
      <div className="viewhead">
        <h1>BRAIN ROTS</h1>
        <span className="sub">// curiosity reservoir</span>
      </div>
      <p className="lead">
        Attractive ideas live here <em>before</em> they become commitments. They never reach{" "}
        <b>Today</b> until promoted into a domain and compiled into a concrete artifact.
      </p>
      <div className="rows">
        {list.length ? (
          list.map((item, idx) => (
            <div key={item.id} className={`row fade-in s${(idx % 4) + 1}`}>
              <span className="marker" style={{ color: "var(--faint)" }}>
                ~
              </span>
              <div className="ttl">
                <div className="name">{item.title}</div>
                <div className="meta">
                  <span>parked idea</span>
                  <span>not a daily task</span>
                </div>
              </div>
              <div className="acts">
                <select
                  className="btn"
                  value=""
                  onChange={(e) => {
                    const d = e.target.value;
                    if (d) promote.mutate({ id: item.id, domain: d }, { onSuccess: () => onNav("domain", d) });
                  }}
                >
                  <option value="">→ Promote to…</option>
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button className="btn ghost" onClick={() => del.mutate(item.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">Reservoir empty. Capture something above ↑</div>
        )}
      </div>
    </>
  );
}

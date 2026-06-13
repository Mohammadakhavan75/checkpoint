import { useMemo, useState } from "react";

import { useDeleteItem, useItems, useSetDaily } from "../api/hooks";
import { Loading } from "../components/atoms";
import { ContainerCard } from "../components/ContainerCard";
import { UnitRow } from "../components/UnitRow";

export function ReadyView({ onEdit }: { onEdit: (id: string) => void }) {
  const { data, isLoading } = useItems("ready");
  const setDaily = useSetDaily();
  const del = useDeleteItem();
  const [category, setCategory] = useState("all");
  const categories = useMemo(
    () => Array.from(new Set((data ?? []).map((i) => i.domain))).sort(),
    [data],
  );
  if (isLoading) return <Loading />;
  const items = data ?? [];
  const list = category === "all" ? items : items.filter((i) => i.domain === category);
  return (
    <>
      <div className="viewhead">
        <h1>READY TO GO!</h1>
        <span className="sub">// compiled · waiting to be activated</span>
      </div>
      {categories.length > 1 && (
        <div className="domain-tools" aria-label="Ready filters">
          <label className="domain-filter">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="lead">
        Every task here is already a resumable unit. When you're ready to work one, pull it into{" "}
        <b>Today</b>.
      </p>
      <div className="rows">
        {list.length ? (
          list.map((item, idx) => {
            const onDelete = (id: string) => {
              if (window.confirm(`Delete "${item.title}"? This can't be undone.`))
                del.mutate(id);
            };
            return item.is_parent ? (
              <ContainerCard
                key={item.id}
                item={item}
                idx={idx}
                ctx="ready"
                onStart={() => undefined}
                onToDaily={(id) => setDaily.mutate({ id, daily: true })}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ) : (
              <UnitRow
                key={item.id}
                item={item}
                idx={idx}
                ctx="ready"
                onStart={() => undefined}
                onToDaily={(id) => setDaily.mutate({ id, daily: true })}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })
        ) : category !== "all" ? (
          <div className="empty">No compiled tasks in {category}.</div>
        ) : (
          <div className="empty">
            No compiled tasks waiting.
            <br />
            Compile a backlog task and it lands here, ready to activate.
          </div>
        )}
      </div>
    </>
  );
}

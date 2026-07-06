import { useMemo, useState } from "react";

import { useItems, useSetDaily } from "../api/hooks";
import { Loading } from "../components/atoms";
import { ContainerCard } from "../components/ContainerCard";
import { UnitRow } from "../components/UnitRow";
import { ViewHead } from "../components/ViewHead";

export function ReadyView({ onEdit }: { onEdit: (id: string) => void }) {
  const { data, isLoading } = useItems("ready");
  const setDaily = useSetDaily();
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
      <ViewHead
        title="READY TO GO!"
        sub="// compiled · waiting"
        why={
          <>
            Every task here is already a resumable unit. When you&apos;re ready to work one, pull
            it into <b>Today</b>.
          </>
        }
      />
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
      <div className="rows">
        {list.length ? (
          list.map((item, idx) =>
            item.is_parent ? (
              <ContainerCard
                key={item.id}
                item={item}
                idx={idx}
                ctx="ready"
                onStart={() => undefined}
                onToDaily={(id) => setDaily.mutate({ id, daily: true })}
                onEdit={onEdit}
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
              />
            ),
          )
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

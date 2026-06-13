import { useDeleteItem, useItems, useSetDaily } from "../api/hooks";
import { Loading } from "../components/atoms";
import { UnitRow } from "../components/UnitRow";

export function ReadyView({ onEdit }: { onEdit: (id: string) => void }) {
  const { data, isLoading } = useItems("ready");
  const setDaily = useSetDaily();
  const del = useDeleteItem();
  if (isLoading) return <Loading />;
  const list = data ?? [];
  return (
    <>
      <div className="viewhead">
        <h1>READY TO GO!</h1>
        <span className="sub">// compiled · waiting to be activated</span>
      </div>
      <p className="lead">
        Every task here is already a resumable unit. When you're ready to work one, pull it into{" "}
        <b>Today</b>.
      </p>
      <div className="rows">
        {list.length ? (
          list.map((item, idx) => (
            <UnitRow
              key={item.id}
              item={item}
              idx={idx}
              ctx="ready"
              onStart={() => undefined}
              onToDaily={(id) => setDaily.mutate({ id, daily: true })}
              onEdit={onEdit}
              onDelete={(id) => {
                if (window.confirm(`Delete "${item.title}"? This can't be undone.`))
                  del.mutate(id);
              }}
            />
          ))
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

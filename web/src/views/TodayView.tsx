import { useItems } from "../api/hooks";
import { Loading } from "../components/atoms";
import { UnitRow } from "../components/UnitRow";

export function TodayView({
  onStart,
  onEdit,
}: {
  onStart: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const { data, isLoading } = useItems("today");
  if (isLoading) return <Loading />;
  const list = data ?? [];
  return (
    <>
      <div className="viewhead">
        <h1>TODAY</h1>
        <span className="sub">// executable units only</span>
      </div>
      <p className="lead">
        Nothing vague is allowed to compete here. Every row has already been compiled into a
        resumable unit with a concrete first action — so starting is safe, not dangerous.
      </p>
      <div className="rows">
        {list.length ? (
          list.map((item, idx) => (
            <UnitRow
              key={item.id}
              item={item}
              idx={idx}
              ctx="today"
              onStart={onStart}
              onToDaily={() => undefined}
              onEdit={onEdit}
            />
          ))
        ) : (
          <div className="empty">
            Nothing on today's list yet.
            <br />
            Pull a compiled task in from <b>Ready to GO!</b>
          </div>
        )}
      </div>
    </>
  );
}

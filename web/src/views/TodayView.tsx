import { useState, type FormEvent } from "react";

import { useDeleteItem, useItems } from "../api/hooks";
import { Loading } from "../components/atoms";
import { ContainerCard } from "../components/ContainerCard";
import { ResumeCard } from "../components/ResumeCard";
import { UnitRow } from "../components/UnitRow";

export function TodayView({
  onStart,
  onEdit,
  onBridgeCapture,
}: {
  onStart: (id: string) => void;
  onEdit: (id: string) => void;
  onBridgeCapture: (text: string) => Promise<void>;
}) {
  const { data, isLoading } = useItems("today");
  const del = useDeleteItem();
  const [captureText, setCaptureText] = useState("");
  const [captureBusy, setCaptureBusy] = useState(false);

  if (isLoading) return <Loading />;
  const all = data ?? [];

  // The big receipt card is reserved for onboarding now: only the seeded
  // tutorial keeps it. Every real resumable task renders inline as a glowing
  // row with a standard Resume button, so the affordance is consistent.
  const card = all.find((i) => i.is_tutorial && i.latest_checkpoint && i.state !== "done") ?? null;
  const list = all.filter((i) => !i.is_tutorial);

  async function submitCapture(e: FormEvent) {
    e.preventDefault();
    const text = captureText.trim();
    if (!text || captureBusy) return;
    setCaptureBusy(true);
    try {
      await onBridgeCapture(text);
      setCaptureText("");
    } finally {
      setCaptureBusy(false);
    }
  }

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
      {card && (
        <ResumeCard
          title={card.title}
          checkpoint={card.latest_checkpoint!}
          onResume={() => onStart(card.id)}
          onDismiss={() => del.mutate(card.id)}
        />
      )}
      <div className="rows">
        {list.length ? (
          list.map((item, idx) =>
            item.is_parent ? (
              <ContainerCard
                key={item.id}
                item={item}
                idx={idx}
                ctx="today"
                onStart={onStart}
                onToDaily={() => undefined}
                onEdit={onEdit}
              />
            ) : (
              <UnitRow
                key={item.id}
                item={item}
                idx={idx}
                ctx="today"
                onStart={onStart}
                onToDaily={() => undefined}
                onEdit={onEdit}
              />
            ),
          )
        ) : !card ? (
          <div className="empty">
            <div className="empty-q">What were you working on before you opened this?</div>
            <form className="empty-cap" onSubmit={submitCapture}>
              <input
                value={captureText}
                placeholder="one line is enough"
                onChange={(e) => setCaptureText(e.target.value)}
              />
              <button
                className="btn amber"
                type="submit"
                disabled={captureBusy || !captureText.trim()}
              >
                → resume it
              </button>
            </form>
            <div className="empty-hint">
              It becomes a session; closing the session writes the checkpoint your next visit
              starts from. Or pull a compiled task in from <b>Ready to GO!</b>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

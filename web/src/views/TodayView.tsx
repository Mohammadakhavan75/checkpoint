import { useState, type FormEvent } from "react";

import { useItems } from "../api/hooks";
import { useAuth } from "../auth";
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
  const { user } = useAuth();
  const [captureText, setCaptureText] = useState("");
  const [captureBusy, setCaptureBusy] = useState(false);
  // "just exploring →" hides the letter for this visit only — it never writes or
  // deletes anything, so the item (and its checkpoint) survive a refresh.
  const [letterDismissed, setLetterDismissed] = useState(false);

  if (isLoading) return <Loading />;
  const all = data ?? [];

  // The return screen leads with one warm "letter to future you" card, built
  // from the freshest checkpoint the user left behind. Pick the most recently
  // checkpointed non-done item (real items naturally win over the seeded
  // tutorial once they exist). Exactly one card; the rest renders below.
  const card =
    all
      .filter((i) => i.latest_checkpoint && i.state !== "done")
      .sort((a, b) =>
        b.latest_checkpoint!.created_at.localeCompare(a.latest_checkpoint!.created_at),
      )[0] ?? null;
  const showCard = card && !letterDismissed;
  const list = all.filter((i) => !i.is_tutorial && i.id !== card?.id);

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
      {showCard && (
        <ResumeCard
          letter
          userName={user?.name}
          title={card.title}
          checkpoint={card.latest_checkpoint!}
          onResume={() => onStart(card.id)}
          onDismiss={() => setLetterDismissed(true)}
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
        ) : !showCard ? (
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

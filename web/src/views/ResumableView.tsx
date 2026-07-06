import { useItems } from "../api/hooks";
import { Loading } from "../components/atoms";
import { ResumeCard } from "../components/ResumeCard";
import { ViewHead } from "../components/ViewHead";

// The shelf of everything past-you left mid-flight: every task whose last
// checkpoint said "continue", off Today. Plain receipt cards — the letter
// greeting stays unique to the Today return moment (REDESIGN_V1 §WS-2).
export function ResumableView({ onStart }: { onStart: (id: string) => void }) {
  const { data, isLoading } = useItems("resumable");

  if (isLoading) return <Loading />;
  const list = (data ?? []).filter((i) => i.latest_checkpoint);

  return (
    <>
      <ViewHead
        title="RESUMABLE"
        sub="// pick up whichever pulls you"
        why="Each card is a running start past-you left for future-you. No order to work them, no
        penalty for leaving them — pick up whichever pulls you."
      />
      <div className="rows">
        {list.length ? (
          list.map((item) => (
            <ResumeCard
              key={item.id}
              title={item.title}
              checkpoint={item.latest_checkpoint!}
              onResume={() => onStart(item.id)}
            />
          ))
        ) : (
          <div className="empty">
            Nothing paused right now.
            <br />
            Close a session with <b>↻ Continue later</b> and it waits for you here.
          </div>
        )}
      </div>
    </>
  );
}

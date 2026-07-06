import { useItems } from "../api/hooks";
import { useAuth } from "../auth";
import { Loading } from "../components/atoms";
import { ResumeCard } from "../components/ResumeCard";
import { ViewHead } from "../components/ViewHead";

// The shelf of everything past-you left mid-flight: every task whose last
// checkpoint said "continue", off Today. Each one is a "Dear future you" letter
// card — the same warm return framing as the Today welcome, but for the whole
// set instead of just the freshest.
export function ResumableView({ onStart }: { onStart: (id: string) => void }) {
  const { data, isLoading } = useItems("resumable");
  const { user } = useAuth();

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
              letter
              userName={user?.name}
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

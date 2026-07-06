import { useState, type ReactNode } from "react";

// Unified view header: title, // subtitle, and an optional "?" disclosure for
// the view's philosophy paragraph. The teaching text is reachable, not
// resident (REDESIGN_V1 §WS-1) — a returning user gets the title and their
// rows; the why is one tap away.
export function ViewHead({
  title,
  sub,
  why,
}: {
  title: ReactNode;
  sub: string;
  why?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="viewhead">
        <h1>{title}</h1>
        <span className="sub">{sub}</span>
        {why && (
          <button
            className="whybtn"
            aria-expanded={open}
            aria-label="Why this view"
            title="Why this view"
            onClick={() => setOpen((v) => !v)}
          >
            ?
          </button>
        )}
      </div>
      {why && open && <p className="lead">{why}</p>}
    </>
  );
}

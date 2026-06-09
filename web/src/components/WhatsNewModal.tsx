import { useEffect, useRef, useState } from "react";

import * as api from "../api/client";
import { CURRENT_VERSION, cmpVersion, unseenReleases, type Release } from "../changelog";
import type { User } from "../types";

// Shows release notes to a returning user who has been away across one or more
// shipped versions. New registrations and pre-feature accounts (last_seen_version
// == null) are baselined silently so they never see a retroactive changelog.
export function WhatsNew({ user }: { user: User }) {
  const handled = useRef(false);
  const [releases, setReleases] = useState<Release[] | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const last = user.last_seen_version ?? null;

    // Never shown before → baseline to current, no popup.
    if (last == null) {
      api.markSeenVersion(CURRENT_VERSION).catch(() => undefined);
      return;
    }
    // Already current (or somehow ahead) → nothing to show.
    if (cmpVersion(last, CURRENT_VERSION) >= 0) return;

    const unseen = unseenReleases(last);
    if (unseen.length === 0) {
      api.markSeenVersion(CURRENT_VERSION).catch(() => undefined);
      return;
    }
    setReleases(unseen);
  }, [user]);

  function dismiss() {
    setReleases(null);
    api.markSeenVersion(CURRENT_VERSION).catch(() => undefined);
  }

  if (!releases) return null;

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="modal whatsnew">
        <header>
          <span className="ic">✦</span>
          <h3>What&apos;s new</h3>
          <button className="x" onClick={dismiss}>
            ×
          </button>
        </header>
        <div className="pad">
          <div className="note">
            Welcome back — here&apos;s what changed while you were away.
          </div>
          {releases.map((r) => (
            <div className="rel" key={r.version}>
              <div className="rel-head">
                <span className="rel-ver">v{r.version}</span>
                <span className="rel-title">{r.title}</span>
                <span className="rel-date">{r.date}</span>
              </div>
              <ul className="rel-notes">
                {r.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <footer>
          <span className="gate ok">
            {releases.length} update{releases.length > 1 ? "s" : ""} since you were last here
          </span>
          <button className="btn amber" onClick={dismiss}>
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}

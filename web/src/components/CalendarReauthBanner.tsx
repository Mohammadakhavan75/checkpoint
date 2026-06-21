import { useState } from "react";

import { ApiError } from "../api/client";
import { requestCalendarAuthCode } from "../api/googleCalendar";
import { useCalendarStatus, useConnectCalendar, useProviders } from "../api/hooks";

/** A thin top bar prompting reconnect when Google has revoked our access.
 *  Renders nothing unless a connected calendar is in the reauth_required state. */
export function CalendarReauthBanner() {
  const providers = useProviders();
  const enabled = !!providers.data?.calendar;
  const status = useCalendarStatus(enabled);
  const connect = useConnectCalendar();
  const [err, setErr] = useState("");

  if (!enabled || status.data?.status !== "reauth_required") return null;

  async function reconnect() {
    setErr("");
    try {
      await connect.mutateAsync(await requestCalendarAuthCode());
    } catch (e) {
      setErr(e instanceof ApiError || e instanceof Error ? e.message : "Could not reconnect");
    }
  }

  return (
    <div className="cal-banner" role="alert">
      <span>
        Google Calendar lost access — your events have stopped syncing.
        {err && <span className="cal-banner-err"> {err}</span>}
      </span>
      <button className="btn" onClick={reconnect} disabled={connect.isPending}>
        {connect.isPending ? "Reconnecting…" : "Reconnect"}
      </button>
    </div>
  );
}

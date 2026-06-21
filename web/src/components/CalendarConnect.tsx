import { useState } from "react";

import { ApiError } from "../api/client";
import { requestCalendarAuthCode } from "../api/googleCalendar";
import {
  useCalendarStatus,
  useConnectCalendar,
  useDisconnectCalendar,
  useProviders,
  useSyncCalendar,
} from "../api/hooks";

function fmtAgo(iso?: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "never";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Connect / sync / disconnect a Google Calendar, shown in the account menu.
 *  Renders nothing unless the server has the calendar integration configured. */
export function CalendarConnect() {
  const providers = useProviders();
  const enabled = !!providers.data?.calendar;
  const status = useCalendarStatus(enabled);
  const connect = useConnectCalendar();
  const sync = useSyncCalendar();
  const disconnect = useDisconnectCalendar();
  const [err, setErr] = useState("");

  if (!enabled) return null;

  const conn = status.data;
  const reauth = conn?.status === "reauth_required";

  async function onConnect() {
    setErr("");
    try {
      const code = await requestCalendarAuthCode();
      await connect.mutateAsync(code);
    } catch (e) {
      setErr(
        e instanceof ApiError || e instanceof Error ? e.message : "Could not connect",
      );
    }
  }

  return (
    <div className="cal-connect userpanel-section">
      <div className="cal-head">
        <span>Google Calendar</span>
        {conn?.connected && !reauth && <span className="cal-dot ok" title="connected" />}
      </div>

      {!conn?.connected ? (
        <>
          <p className="cal-note">
            Bring your events into Today and Ready to GO. Read-only — nothing is written
            back to Google.
          </p>
          <button className="btn" onClick={onConnect} disabled={connect.isPending}>
            {connect.isPending ? "Connecting…" : "Connect calendar"}
          </button>
        </>
      ) : (
        <>
          <div className="cal-row">
            <span className="cal-email">{conn.email || "connected"}</span>
            <span className="cal-synced">synced {fmtAgo(conn.last_synced_at)}</span>
          </div>
          {reauth && (
            <div className="cal-reauth">
              Google access expired — reconnect to keep events in sync.
              <button className="btn" onClick={onConnect} disabled={connect.isPending}>
                Reconnect
              </button>
            </div>
          )}
          <div className="cal-actions">
            <button
              className="btn"
              onClick={() => sync.mutate()}
              disabled={sync.isPending || reauth}
            >
              {sync.isPending ? "Syncing…" : "Sync now"}
            </button>
            <button
              className="btn ghost"
              onClick={() => disconnect.mutate(true)}
              disabled={disconnect.isPending}
            >
              Disconnect
            </button>
          </div>
        </>
      )}
      {err && <div className="err">{err}</div>}
    </div>
  );
}

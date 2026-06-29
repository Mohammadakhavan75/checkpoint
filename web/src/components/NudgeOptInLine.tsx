import { useState } from "react";

import { useProviders, useSettings, useUpdateSettings } from "../api/hooks";
import { permissionState, pushSupport, subscribeToPush } from "../push";

/** Quiet, single-line opt-in for the resume nudge, shown in the empty-Today
 *  state (design Pattern 3). Hides once push is granted + the nudge is on, and
 *  whenever the server has no reminders configured / the browser can't push. */
export function NudgeOptInLine() {
  const providers = useProviders();
  const available = !!providers.data?.reminders;
  const settings = useSettings(available);
  const updateSettings = useUpdateSettings();
  const [busy, setBusy] = useState(false);

  if (!available || pushSupport() !== "ok") return null;

  const granted = permissionState() === "granted";
  const on = granted && (settings.data?.nudge_opt_in ?? false);
  if (on) return null;

  async function turnOn() {
    setBusy(true);
    try {
      const result = await subscribeToPush();
      if (result === "subscribed") {
        await updateSettings.mutateAsync({ reminders_enabled: true, nudge_opt_in: true });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nudge-optin">
      ⟲ want a gentle nudge when something&apos;s waiting?{" "}
      <button className="nudge-optin-btn" onClick={turnOn} disabled={busy}>
        {busy ? "…" : "turn on"}
      </button>
    </div>
  );
}

import { useState } from "react";

import {
  useDeletePushDevice,
  useProviders,
  usePushDevices,
  useSettings,
  useUpdateSettings,
} from "../api/hooks";
import { permissionState, pushSupport, subscribeToPush, unsubscribeFromPush } from "../push";

function deviceLabel(ua?: string | null): string {
  if (!ua) return "this device";
  if (/iphone|ipad/i.test(ua)) return "iPhone / iPad";
  if (/android/i.test(ua)) return "Android";
  if (/mac/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  return "browser";
}

/** Reminders grant moment (design Pattern 1). Lead with the gift; never
 *  auto-fire the native dialog. Renders nothing if the server has no VAPID. */
export function PushPermissionPanel() {
  const providers = useProviders();
  const available = !!providers.data?.reminders;
  const settings = useSettings(available);
  const updateSettings = useUpdateSettings();
  const devices = usePushDevices(available);
  const deleteDevice = useDeletePushDevice();
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState(() => permissionState());

  if (!available) return null;

  const support = pushSupport();
  const granted = perm === "granted" && (settings.data?.reminders_enabled ?? false);

  async function turnOn() {
    setBusy(true);
    try {
      const result = await subscribeToPush();
      setPerm(permissionState());
      if (result === "subscribed") {
        await updateSettings.mutateAsync({ reminders_enabled: true });
        devices.refetch();
      }
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      for (const d of devices.data ?? []) await deleteDevice.mutateAsync(d.id);
      await updateSettings.mutateAsync({ reminders_enabled: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rmnd userpanel-section" role="region" aria-label="Reminders">
      <div className="rmnd-head">
        <span className="rmnd-title">⟲ Reminders</span>
        <span className={`rmnd-state ${granted ? "on" : ""}`}>{granted ? "on" : "off"}</span>
      </div>

      {support === "unsupported" ? (
        <p className="rmnd-note slate">
          Add Checkpoint to your Home Screen to enable reminders on this device.
        </p>
      ) : perm === "denied" ? (
        <p className="rmnd-note caution">
          Your browser is blocking notifications — re-enable them for this site in your
          browser settings, then reload.
        </p>
      ) : !granted ? (
        <>
          <p className="rmnd-note">
            A nudge can reach you with the tab closed — and it carries the actual resume line,
            not just “come back”. One a day, at most.
          </p>
          <div className="rmnd-actions">
            <button className="btn amber" onClick={turnOn} disabled={busy}>
              {busy ? "…" : "Turn on reminders"}
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="rmnd-toggle">
            <input
              type="checkbox"
              checked={settings.data?.nudge_opt_in ?? false}
              disabled={updateSettings.isPending}
              onChange={(e) =>
                updateSettings.mutate({ nudge_opt_in: e.target.checked })
              }
            />
            <span>
              Gentle resume nudge when Today is empty
              <span className="rmnd-sub">low-frequency, backs off if ignored</span>
            </span>
          </label>

          <div className="rmnd-devices">
            {(devices.data ?? []).map((d) => (
              <div className="rmnd-device" key={d.id}>
                <span>{deviceLabel(d.user_agent)}</span>
                <button
                  className="rmnd-revoke"
                  onClick={() => deleteDevice.mutate(d.id)}
                  title="Remove this device"
                >
                  remove ✕
                </button>
              </div>
            ))}
          </div>

          <div className="rmnd-actions">
            <button className="btn ghost" onClick={turnOff} disabled={busy}>
              {busy ? "…" : "Turn off"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

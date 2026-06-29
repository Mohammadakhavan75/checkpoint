import { useEffect, useRef, useState } from "react";

import {
  useCreateReminder,
  useDeleteReminder,
  useProviders,
  useReminders,
  useSettings,
} from "../api/hooks";
import { permissionState } from "../push";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "scheduled";
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Relative shortcuts -> absolute ISO. Times are humane (sane hours), never "now".
function atHour(daysAhead: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function inHours(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
}
function thisEveningOrTomorrow(): string {
  const d = new Date();
  if (d.getHours() < 18) {
    d.setHours(18, 0, 0, 0);
    return d.toISOString();
  }
  return atHour(1, 18);
}

/** Set / clear a one-shot reminder on an item (design Pattern 2). Self-contained:
 *  fetches the item's reminders and shows the pending one as a slate chip. */
export function ReminderControl({
  itemId,
  startAt,
  deadline,
}: {
  itemId: string;
  startAt?: string | null;
  deadline?: string | null;
}) {
  const providers = useProviders();
  const available = !!providers.data?.reminders;
  const reminders = useReminders(available ? itemId : null);
  const settings = useSettings(available);
  const create = useCreateReminder();
  const del = useDeleteReminder();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!available) return null;

  // The soonest still-pending reminder represents "set".
  const pending = (reminders.data ?? [])
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.fire_at.localeCompare(b.fire_at))[0];

  function set(iso: string) {
    create.mutate({ itemId, fireAt: iso });
    setOpen(false);
  }
  function setCustom() {
    if (!date) return;
    const iso = new Date(`${date}T${time || "09:00"}`).toISOString();
    set(iso);
  }

  if (pending) {
    return (
      <span className="rmc-set" title="reminder set — click ✕ to clear">
        ⟲ remind · {fmtWhen(pending.fire_at)}
        <button
          className="rmc-clear"
          aria-label="clear reminder"
          onClick={() => del.mutate({ id: pending.id, itemId })}
        >
          ✕
        </button>
      </span>
    );
  }

  const pushOff =
    !(settings.data?.reminders_enabled ?? false) || permissionState() !== "granted";

  return (
    <span className="rmc-wrap" ref={ref}>
      <button className="rmc-trigger" onClick={() => setOpen((o) => !o)}>
        remind me…
      </button>
      {open && (
        <div className="rmc-pop" role="dialog" aria-modal="false" aria-label="Set a reminder">
          <div className="rmc-chips">
            <button className="rmc-chip" onClick={() => set(inHours(1))}>
              in 1h
            </button>
            <button className="rmc-chip" onClick={() => set(thisEveningOrTomorrow())}>
              this evening
            </button>
            <button className="rmc-chip" onClick={() => set(atHour(1, 9))}>
              tomorrow 9am
            </button>
            {startAt && (
              <button className="rmc-chip" onClick={() => set(new Date(startAt).toISOString())}>
                at start
              </button>
            )}
            {deadline && (
              <button
                className="rmc-chip"
                onClick={() => set(new Date(new Date(deadline).getTime() - 3600_000).toISOString())}
              >
                before deadline
              </button>
            )}
          </div>
          <div className="rmc-custom">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <button className="btn amber" disabled={!date || create.isPending} onClick={setCustom}>
              set
            </button>
          </div>
          {pushOff && (
            <div className="rmc-hint caution">
              turn on reminders in your account menu to get this off-app
            </div>
          )}
        </div>
      )}
    </span>
  );
}

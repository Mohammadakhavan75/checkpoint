import { Save } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export function SettingsPage() {
  const { preferences, setPreferences } = useAuth();
  const [activeLimit, setActiveLimit] = useState(preferences?.active_limit ?? 1);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated = await api.updatePreferences({ active_limit: activeLimit });
    setPreferences(updated);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Keep the system lighter than the life it manages.</p>
        </div>
      </section>

      <section className="simple-panel settings-panel">
        <h2>Focus boundary</h2>
        <form className="form-stack compact-form" onSubmit={handleSubmit}>
          <label>
            Active mission limit
            <input
              type="number"
              min={1}
              max={5}
              value={activeLimit}
              onChange={(event) => setActiveLimit(Number(event.target.value))}
            />
          </label>
          <p className="muted">Default is 1. Raise it only if a wider active set genuinely helps.</p>
          <button className="primary-button" type="submit">
            <Save size={18} />
            Save
          </button>
          {saved && <p className="quiet-status">Saved.</p>}
        </form>
      </section>
    </div>
  );
}

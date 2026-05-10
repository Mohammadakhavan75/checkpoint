import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { ApiError, api } from "../lib/api";
import type { ParkingItem } from "../lib/types";

export function ParkingPage() {
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setItems(await api.parkingItems());
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.createParkingItem(title, note);
      setTitle("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not park item");
    }
  }

  async function remove(id: string) {
    await api.deleteParkingItem(id);
    await load();
  }

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <h1>Parking</h1>
          <p>Parked, not forgotten.</p>
        </div>
      </section>

      <section className="simple-panel create-panel">
        <h2>Park something</h2>
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Compare note tools later" required />
          </label>
          <label>
            Note
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Not today. Markdown is enough." />
          </label>
          <button className="secondary-button" type="submit">
            <Plus size={18} />
            Park
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="simple-panel">
        <h2>Safe for later</h2>
        <div className="quiet-list">
          {items.length === 0 && <p className="muted">Nothing parked yet.</p>}
          {items.map((item) => (
            <div className="quiet-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.note || "No note."}</p>
              </div>
              <button className="icon-button" type="button" onClick={() => remove(item.id)} aria-label={`Delete ${item.title}`}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { ApiError, api } from "../lib/api";
import type { Domain } from "../lib/types";

export function SettingsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadDomains() {
    const list = await api.domains();
    setDomains(list);
  }

  useEffect(() => {
    void loadDomains();
  }, []);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddError("");
    setAdding(true);
    try {
      await api.createDomain(newName.trim());
      setNewName("");
      await loadDomains();
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Could not create domain");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteDomain(id);
      await loadDomains();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        alert("This domain is still used by one or more missions. Reassign them first.");
      }
    }
  }

  async function handleRename(id: string, name: string) {
    await api.updateDomain(id, name);
    await loadDomains();
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
        <h2>Domains</h2>
        <p className="muted settings-hint">Domains are areas of life. Missions belong to one domain. Keep the list short.</p>

        {domains.length > 0 && (
          <ul className="domain-list">
            {domains.map((d) => (
              <DomainRow key={d.id} domain={d} onRename={(name) => handleRename(d.id, name)} onDelete={() => handleDelete(d.id)} />
            ))}
          </ul>
        )}

        <form className="domain-add-form" onSubmit={handleAdd}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Work, Health, Creative…"
          />
          <button className="secondary-button" type="submit" disabled={adding}>
            <Plus size={16} />
            Add
          </button>
        </form>
        {addError && <p className="form-error">{addError}</p>}
      </section>
    </div>
  );
}

function DomainRow({ domain, onRename, onDelete }: { domain: Domain; onRename: (name: string) => Promise<void>; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(domain.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === domain.name) {
      setDraft(domain.name);
      setEditing(false);
      return;
    }
    await onRename(trimmed);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void save();
    if (e.key === "Escape") {
      setDraft(domain.name);
      setEditing(false);
    }
  }

  return (
    <li className="domain-row">
      {editing ? (
        <>
          <input ref={inputRef} className="domain-rename-input" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => void save()} onKeyDown={handleKeyDown} />
          <button className="icon-button" type="button" onClick={() => void save()} aria-label="Save rename">
            <Check size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              setDraft(domain.name);
              setEditing(false);
            }}
            aria-label="Cancel rename"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <span className="domain-name">{domain.name}</span>
          <button className="icon-button" type="button" onClick={() => setEditing(true)} aria-label={`Rename ${domain.name}`}>
            <Pencil size={15} />
          </button>
          <button className="icon-button" type="button" onClick={onDelete} aria-label={`Delete ${domain.name}`}>
            <Trash2 size={15} />
          </button>
        </>
      )}
    </li>
  );
}

import { useState } from "react";

import { useDeleteSnapshot, useSaveSnapshot, useSnapshots } from "../api/hooks";

export function SnapshotModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: snapshots = [], isLoading } = useSnapshots(id);
  const save = useSaveSnapshot();
  const del = useDeleteSnapshot();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");

  const ok = !!(note.trim() || url.trim());

  async function add() {
    if (!ok) {
      setErr("⚠ add a note or a link");
      return;
    }
    setErr("");
    await save.mutateAsync({
      id,
      payload: {
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        url: url.trim() || undefined,
      },
    });
    setTitle("");
    setNote("");
    setUrl("");
  }

  return (
    <div className="scrim">
      <div className="modal">
        <header>
          <span className="ic">⊞</span>
          <h3>Snapshots</h3>
        </header>
        <div className="pad">
          <div className="note">
            Keep notes and links with this task for yourself. They persist across sessions and
            stay attached to the task. (File uploads coming later.)
          </div>

          <div className="field">
            <label>Title</label>
            <input
              value={title}
              placeholder="optional label"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Note</label>
            <textarea
              rows={2}
              placeholder="a thought, a snippet, a reminder"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Link</label>
            <input
              value={url}
              placeholder="https://…"
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn amber" onClick={add} disabled={save.isPending}>
              + Add snapshot
            </button>
          </div>

          <div className="snaplist">
            {isLoading && <div className="snapempty">Loading…</div>}
            {!isLoading && snapshots.length === 0 && (
              <div className="snapempty">No snapshots yet.</div>
            )}
            {snapshots.map((s) => (
              <div className="snapcard" key={s.id}>
                <div className="snapmain">
                  {s.title && <div className="snaptitle">{s.title}</div>}
                  {s.note && <div className="snapnote">{s.note}</div>}
                  {s.url && (
                    <a className="snaplink" href={s.url} target="_blank" rel="noreferrer">
                      {s.url}
                    </a>
                  )}
                </div>
                <button
                  className="snapdel"
                  title="Delete snapshot"
                  onClick={() => del.mutate({ id, snapshotId: s.id })}
                  disabled={del.isPending}
                >
                  ⨯
                </button>
              </div>
            ))}
          </div>
        </div>
        <footer>
          <span className="gate" style={{ color: err ? "var(--red)" : undefined }}>
            {err || `${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"} attached`}
          </span>
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

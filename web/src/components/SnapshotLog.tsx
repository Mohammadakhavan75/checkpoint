import { useState } from "react";

import {
  useDeleteSnapshot,
  useSaveSnapshot,
  useSnapshots,
  useUpdateSnapshot,
} from "../api/hooks";
import { Snapshot } from "../types";
import { renderMarkdown } from "../security/markdown";
import { ConfirmDialog } from "./ConfirmDialog";

// Quick Markdown reference shown as an in-app help/lookup while editing notes.
const MARKDOWN_HELP: ReadonlyArray<readonly [string, string]> = [
  ["# Heading", "Headings (## smaller, ### smaller)"],
  ["**bold**  *italic*", "Emphasis"],
  ["- item", "Bullet list"],
  ["1. item", "Numbered list"],
  ["- [ ] todo   - [x] done", "Task list (interactive here)"],
  ["[label](https://…)", "Link"],
  ["`code`", "Inline code"],
  ["``` … ```", "Fenced code block (on its own lines)"],
  ["> quote", "Blockquote"],
  ["| a | b |", "Table (header row, then |---|---|)"],
  ["---", "Horizontal divider"],
];

function MarkdownHelp() {
  return (
    <div className="cheatsheet">
      <h4>Markdown cheat sheet</h4>
      <table>
        <tbody>
          {MARKDOWN_HELP.map(([syntax, desc]) => (
            <tr key={syntax}>
              <td className="syn">
                <code>{syntax}</code>
              </td>
              <td className="desc">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Relative "12m ago" stamp. Recomputed on render — the session overlay ticks
// every second, so these stay fresh without their own timer.
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

// The session's running log: an always-open composer over a stream of notes,
// newest first. Lifted out of the old SnapshotModal so it can live inline in
// the session workspace instead of behind a button.
export function SnapshotLog({ id }: { id: string }) {
  const { data: snapshots = [], isLoading } = useSnapshots(id);
  const save = useSaveSnapshot();
  const del = useDeleteSnapshot();
  const update = useUpdateSnapshot();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  // Edit state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");

  // Markdown cheat sheet help
  const [showHelp, setShowHelp] = useState(false);

  const ok = !!note.trim();

  async function add() {
    if (!ok) {
      setErr("⚠ write something first");
      return;
    }
    setErr("");
    await save.mutateAsync({
      id,
      payload: {
        title: title.trim() || undefined,
        note: note.trim() || undefined,
      },
    });
    setTitle("");
    setNote("");
  }

  async function handleSaveEdit(snapshotId: string) {
    if (!editNote.trim()) {
      setErr("⚠ note cannot be empty");
      return;
    }
    setErr("");
    await update.mutateAsync({
      id,
      snapshotId,
      payload: {
        title: editTitle.trim() || undefined,
        note: editNote.trim() || undefined,
      },
    });
    setEditingId(null);
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    await del.mutateAsync({ id, snapshotId: confirmDeleteId });
    setConfirmDeleteId(null);
  }

  const handleCheckboxClick = (e: React.MouseEvent<HTMLDivElement>, s: Snapshot) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      const checkbox = target as HTMLInputElement;
      const isChecked = checkbox.checked;

      const container = e.currentTarget;
      const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
      const clickedIndex = checkboxes.indexOf(checkbox);

      if (clickedIndex !== -1) {
        const noteText = s.note || "";
        let currentIndex = 0;

        const checkboxRegex = /^(\s*([-*+]|\d+\.)\s+\[)([ xX])(\])/gm;
        const updatedNote = noteText.replace(
          checkboxRegex,
          (match, prefix, _marker, _char, suffix) => {
            if (currentIndex === clickedIndex) {
              currentIndex++;
              return `${prefix}${isChecked ? "x" : " "}${suffix}`;
            }
            currentIndex++;
            return match;
          }
        );

        update.mutate({
          id,
          snapshotId: s.id,
          payload: { note: updatedNote },
        });
      }
    }
  };

  return (
    <>
      <div className="composer">
        <div className="composer-head">
          <label>Capture a note</label>
          <div className="notebar">
            <button
              type="button"
              className={`linkbtn${showHelp ? " on" : ""}`}
              aria-pressed={showHelp}
              onClick={() => setShowHelp((v) => !v)}
            >
              ? Markdown
            </button>
          </div>
        </div>
        {showHelp && <MarkdownHelp />}
        <textarea
          className="composer-note"
          rows={2}
          placeholder="What just happened? A blocker, a fix, a snippet, a link… (⌘↵ to capture)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              add();
            }
          }}
        />
        <div className="composer-actions">
          <input
            className="composer-title"
            value={title}
            placeholder="optional title"
            onChange={(e) => setTitle(e.target.value)}
          />
          {err && <span className="composer-err">{err}</span>}
          <button className="btn amber" onClick={add} disabled={save.isPending || !ok}>
            ⊞ Capture
          </button>
        </div>
      </div>

      <div className="logdiv">
        <span>This session</span>
        <i />
        <span>
          {snapshots.length} note{snapshots.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="logstream">
        {isLoading && <div className="logempty">Loading…</div>}
        {!isLoading && snapshots.length === 0 && (
          <div className="logempty">No notes yet — capture the first thing worth remembering.</div>
        )}
        {snapshots.map((s) => {
          const isEditing = editingId === s.id;
          if (isEditing) {
            return (
              <div className="logentry" key={s.id}>
                <div className="logwhen">{relTime(s.created_at)}</div>
                <div className="snapcard editing" style={{ flexDirection: "column", gap: 10 }}>
                  <div className="snapmain" style={{ width: "100%" }}>
                    <div className="field" style={{ marginBottom: 8 }}>
                      <label>Title</label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="optional label"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 8 }}>
                      <label>Note</label>
                      <textarea
                        rows={3}
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="note content"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="btn amber btn-sm"
                        onClick={() => handleSaveEdit(s.id)}
                        disabled={update.isPending}
                      >
                        Save
                      </button>
                      <button className="btn btn-sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="logentry" key={s.id}>
              <div className="logwhen">{relTime(s.created_at)}</div>
              <div className="snapcard">
                <div className="snapmain">
                  {s.title && <div className="snaptitle">{s.title}</div>}
                  <div
                    className="snapnote"
                    dangerouslySetInnerHTML={renderMarkdown(s.note || "")}
                    onClick={(e) => handleCheckboxClick(e, s)}
                  />
                </div>
                <div className="snapactions">
                  <button
                    className="snapedit"
                    title="Edit note"
                    onClick={() => {
                      setEditingId(s.id);
                      setEditTitle(s.title || "");
                      setEditNote(s.note || "");
                    }}
                    disabled={update.isPending || del.isPending}
                  >
                    ✎
                  </button>
                  <button
                    className="snapdel"
                    title="Delete note"
                    onClick={() => setConfirmDeleteId(s.id)}
                    disabled={del.isPending || update.isPending}
                  >
                    ⨯
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete note"
          message="Delete this note? This can't be undone."
          confirmLabel="Delete"
          busy={del.isPending}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

import { useState, useRef, useEffect } from "react";
import { marked } from "marked";
import Stackedit from "stackedit-js";
import { createPortal } from "react-dom";

import {
  useDeleteSnapshot,
  useSaveSnapshot,
  useSnapshots,
  useUpdateSnapshot,
} from "../api/hooks";
import { Snapshot } from "../types";

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

export function SnapshotModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: snapshots = [], isLoading } = useSnapshots(id);
  const save = useSaveSnapshot();
  const del = useDeleteSnapshot();
  const update = useUpdateSnapshot();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");

  // Markdown cheat sheet help
  const [showHelp, setShowHelp] = useState(false);

  // StackEdit state & refs
  const [isStackeditOpen, setIsStackeditOpen] = useState(false);
  const stackeditInstanceRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<any>(null);
  const currentEditNoteRef = useRef("");
  const currentEditIdRef = useRef<string | null>(null);
  const hasChangesRef = useRef(false);

  // Sync refs to state changes
  useEffect(() => {
    currentEditNoteRef.current = note;
  }, [note]);

  useEffect(() => {
    currentEditNoteRef.current = editNote;
  }, [editNote]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (stackeditInstanceRef.current) {
        stackeditInstanceRef.current.close();
      }
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  const ok = !!note.trim();

  async function add() {
    if (!ok) {
      setErr("⚠ add a note");
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

  async function handleDelete(snapshotId: string) {
    if (window.confirm("Are you sure you want to delete this snapshot?")) {
      await del.mutateAsync({ id, snapshotId });
    }
  }

  const saveExistingSnapshot = async (snapshotId: string, text: string) => {
    try {
      await update.mutateAsync({
        id,
        snapshotId,
        payload: {
          note: text.trim(),
        },
      });
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  const openStackeditEditor = (initialText: string, snapshotId: string | null) => {
    if (stackeditInstanceRef.current) {
      stackeditInstanceRef.current.close();
    }
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const stackedit = new Stackedit({ url: '/stackedit/app' });
    stackeditInstanceRef.current = stackedit;
    currentEditNoteRef.current = initialText;
    currentEditIdRef.current = snapshotId;
    hasChangesRef.current = false;
    setIsStackeditOpen(true);

    stackedit.openFile({
      name: snapshotId ? "Edit Snapshot Note" : "New Snapshot Note",
      content: {
        text: initialText,
      },
    });

    // Fix pointer-events: the stackedit-container covers the full screen (z-index 9999),
    // but our Save & Close button needs to be clickable on top of it.
    // Setting pointer-events:none on the outer container lets click events reach our button,
    // while the inner iframe-container retains pointer-events:auto for normal iframe use.
    const fixPointerEvents = () => {
      const container = document.querySelector('.stackedit-container') as HTMLElement | null;
      if (container) {
        container.style.pointerEvents = 'none';
        const iframeContainer = container.querySelector('.stackedit-iframe-container') as HTMLElement | null;
        if (iframeContainer) {
          iframeContainer.style.pointerEvents = 'auto';
        }
      } else {
        // Retry until container is mounted by stackedit-js
        setTimeout(fixPointerEvents, 50);
      }
    };
    setTimeout(fixPointerEvents, 50);

    stackedit.on("fileChange", (file: any) => {
      const newText = file.content.text;
      if (newText !== currentEditNoteRef.current) {
        currentEditNoteRef.current = newText;
        hasChangesRef.current = true;
        if (!snapshotId) {
          setNote(newText);
        } else {
          setEditNote(newText);
        }
      }
    });

    // Auto-save existing snapshots every 10 seconds if modified
    if (snapshotId) {
      autoSaveTimerRef.current = setInterval(() => {
        if (hasChangesRef.current) {
          saveExistingSnapshot(snapshotId, currentEditNoteRef.current);
          hasChangesRef.current = false;
        }
      }, 10000);
    }

    stackedit.on("close", () => {
      setIsStackeditOpen(false);
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      // Save final edits if dirty
      if (snapshotId && hasChangesRef.current) {
        saveExistingSnapshot(snapshotId, currentEditNoteRef.current);
        hasChangesRef.current = false;
      }
      stackeditInstanceRef.current = null;
    });
  };

  const handleCloseStackedit = () => {
    if (stackeditInstanceRef.current) {
      stackeditInstanceRef.current.close();
    }
  };

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
          (match, prefix, marker, char, suffix) => {
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

  const renderMarkdown = (text: string) => {
    try {
      const rawHtml = marked.parse(text, { gfm: true, breaks: true }) as string;
      const enabledHtml = rawHtml.replace(/<input([^>]*?)disabled([^>]*?)>/g, "<input$1$2>");
      return { __html: enabledHtml };
    } catch (err) {
      console.error("Markdown parse error", err);
      return { __html: text };
    }
  };

  return (
    <>
      {isStackeditOpen && createPortal(
        <button className="stackedit-close-btn" onClick={handleCloseStackedit}>
          Save & Close ✕
        </button>,
        document.body
      )}
      <div className="scrim">
        <div className="modal">
          <header>
            <span className="ic">⊞</span>
            <h3>Snapshots</h3>
          </header>
          <div className="pad">
            <div className="note">
              Keep notes with this task. They support Markdown, persist across sessions,
              and stay attached to the task. (Checklists inside Markdown are interactive!)
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <label style={{ margin: 0 }}>Note (Markdown compatible)</label>
                <div className="notebar">
                  <button
                    type="button"
                    className={`linkbtn${showHelp ? " on" : ""}`}
                    aria-pressed={showHelp}
                    onClick={() => setShowHelp((v) => !v)}
                  >
                    ? Markdown help
                  </button>
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() => openStackeditEditor(note, null)}
                  >
                    ✎ Edit in StackEdit
                  </button>
                </div>
              </div>
              {showHelp && <MarkdownHelp />}
              <textarea
                rows={3}
                placeholder="a thought, a code snippet, a task list (- [ ] item)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
              {snapshots.map((s) => {
                const isEditing = editingId === s.id;
                if (isEditing) {
                  return (
                    <div className="snapcard editing" key={s.id} style={{ flexDirection: "column", gap: 10 }}>
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
                  );
                }

                return (
                  <div className="snapcard" key={s.id}>
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
                        className="snapedit-stack"
                        title="Edit in StackEdit"
                        onClick={() => openStackeditEditor(s.note || "", s.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--cyan)",
                          cursor: "pointer",
                          fontSize: "12px",
                          marginRight: "6px",
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: "2px 4px"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cyan)")}
                      >
                        StackEdit
                      </button>
                      <button
                        className="snapedit"
                        title="Edit snapshot"
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
                        title="Delete snapshot"
                        onClick={() => handleDelete(s.id)}
                        disabled={del.isPending || update.isPending}
                      >
                        ⨯
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <footer>
            <span className="gate" style={{ color: err ? "var(--red)" : undefined, display: "flex", gap: 12, alignItems: "center" }}>
              <span>{err || `${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"} attached`}</span>
              {!err && (
                <span style={{ fontSize: "11px", color: "var(--faint)", fontFamily: "'JetBrains Mono', monospace" }}>
                  • editor by <span style={{ color: "var(--cyan)" }}>StackEdit</span>
                </span>
              )}
            </span>
            <button className="btn" onClick={onClose}>
              Done
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}

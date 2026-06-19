import React from "react";

export interface SnapCardProps {
  /** Optional title shown in amber above the note content */
  title?: string;
  /** Snapshot body — plain text or rendered markdown HTML */
  children: React.ReactNode;
  /** Called when the edit button is clicked */
  onEdit?: () => void;
  /** Called when the delete button is clicked */
  onDelete?: () => void;
  /** True while the card is being edited */
  editing?: boolean;
}

/** Snapshot note card. Wraps the `.snapcard` class. */
export function SnapCard({ title, children, onEdit, onDelete, editing }: SnapCardProps) {
  return (
    <div className={`snapcard${editing ? " editing" : ""}`}>
      <div className="snapmain">
        {title && <div className="snaptitle">{title}</div>}
        <div className="snapnote">{children}</div>
      </div>
      {(onEdit || onDelete) && (
        <div className="snapactions">
          {onEdit && (
            <button className="snapedit" onClick={onEdit} aria-label="Edit">
              ✎
            </button>
          )}
          {onDelete && (
            <button className="snapdel" onClick={onDelete} aria-label="Delete">
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}

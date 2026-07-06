import { useState } from "react";

import { useEmptyTrash, useItems, usePermanentlyDeleteItem, useRestoreItem } from "../api/hooks";
import { Loading } from "../components/atoms";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ViewHead } from "../components/ViewHead";

const TTL_DAYS = 30;

// Days until a trashed item is purged, from its deleted_at timestamp.
function daysLeft(deletedAt?: string | null): number | null {
  if (!deletedAt) return null;
  const elapsedDays = (Date.now() - new Date(deletedAt).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(TTL_DAYS - elapsedDays));
}

export function TrashView() {
  const { data, isLoading } = useItems("trash");
  const restore = useRestoreItem();
  const purge = usePermanentlyDeleteItem();
  const emptyTrash = useEmptyTrash();
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [emptyAll, setEmptyAll] = useState(false);

  if (isLoading) return <Loading />;
  const list = data ?? [];
  const purgeTarget = list.find((i) => i.id === purgeId);

  return (
    <>
      <ViewHead
        title="TRASH"
        sub="// deleted · auto-cleared after 30 days"
        why={
          <>
            Deleted tasks rest here for <b>30 days</b> — restore one to where it was, or remove it
            for good. After 30 days it&apos;s deleted automatically.
          </>
        }
      />
      {list.length > 0 && (
        <div className="domain-tools" aria-label="Trash actions">
          <button className="btn danger" onClick={() => setEmptyAll(true)} disabled={emptyTrash.isPending}>
            Empty Trash
          </button>
        </div>
      )}
      <div className="rows">
        {list.length ? (
          list.map((item, idx) => {
            const left = daysLeft(item.deleted_at);
            return (
              <div key={item.id} className={`row fade-in s${(idx % 4) + 1} killed`}>
                <span className="marker" style={{ color: "var(--red)" }}>
                  ✕
                </span>
                <div className="ttl">
                  <div className="name">{item.title}</div>
                  <div className="meta">
                    <span>{item.domain}</span>
                    {item.is_parent && <span style={{ color: "var(--violet)" }}>container</span>}
                    <span style={{ color: left !== null && left <= 3 ? "var(--red)" : "var(--faint)" }}>
                      {left === null
                        ? "—"
                        : left === 0
                          ? "deletes today"
                          : `${left} day${left === 1 ? "" : "s"} left`}
                    </span>
                  </div>
                </div>
                <div className="acts">
                  <button
                    className="btn amber"
                    onClick={() => restore.mutate(item.id)}
                    disabled={restore.isPending}
                  >
                    ↩ Restore
                  </button>
                  <button
                    className="btn danger"
                    title="Delete permanently"
                    onClick={() => setPurgeId(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">Trash is empty.</div>
        )}
      </div>

      {purgeTarget && (
        <ConfirmDialog
          title="Delete permanently"
          message={`Permanently delete "${purgeTarget.title}"? This can't be undone.`}
          confirmLabel="Delete"
          busy={purge.isPending}
          onCancel={() => setPurgeId(null)}
          onConfirm={async () => {
            await purge.mutateAsync(purgeTarget.id);
            setPurgeId(null);
          }}
        />
      )}
      {emptyAll && (
        <ConfirmDialog
          title="Empty Trash"
          message={`Permanently delete all ${list.length} item${
            list.length === 1 ? "" : "s"
          } in the Trash? This can't be undone.`}
          confirmLabel="Empty Trash"
          busy={emptyTrash.isPending}
          onCancel={() => setEmptyAll(false)}
          onConfirm={async () => {
            await emptyTrash.mutateAsync();
            setEmptyAll(false);
          }}
        />
      )}
    </>
  );
}

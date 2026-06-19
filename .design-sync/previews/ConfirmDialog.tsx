import { ConfirmDialog } from '@checkpoint/ds';

export function Default() {
  return (
    <ConfirmDialog
      message="Are you sure you want to archive this task? You can restore it from Trash."
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );
}

export function Danger() {
  return (
    <ConfirmDialog
      message="Delete all tasks in the Trash? This permanently removes them and cannot be undone."
      onConfirm={() => {}}
      onCancel={() => {}}
      confirmLabel="Delete all"
      cancelLabel="Keep them"
      variant="danger"
    />
  );
}

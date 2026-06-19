import { Modal, Button, Field } from '@checkpoint/ds';

export function NewTask() {
  return (
    <Modal
      title="New task"
      icon="+"
      footer={
        <>
          <Button variant="ghost">Cancel</Button>
          <Button variant="amber">Create task</Button>
        </>
      }
    >
      <p className="note">Add a task to your reservoir — move it to Today when you're ready to start.</p>
      <Field label="Title" required>
        <input defaultValue="Refactor auth middleware" />
      </Field>
      <Field label="First action" hint="The first concrete step to unstick this task">
        <input defaultValue="Open auth.ts and read the existing token refresh logic" />
      </Field>
    </Modal>
  );
}

export function EditTask() {
  return (
    <Modal
      title="Edit task"
      icon="✎"
      footer={
        <>
          <Button variant="ghost">Cancel</Button>
          <Button variant="amber">Save changes</Button>
        </>
      }
    >
      <Field label="Title" required>
        <input defaultValue="Write API schema for /items endpoint" />
      </Field>
      <Field label="Description">
        <textarea rows={2} defaultValue="Define all fields, types, and validation rules for the items resource." />
      </Field>
    </Modal>
  );
}

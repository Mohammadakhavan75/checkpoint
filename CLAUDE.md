## Checkpoint agent ledger (MCP)

This repo IS the Checkpoint app, and it dogfoods its own agent ledger via the
`checkpoint` MCP server (tools: orient, get_item, save_checkpoint, capture).

- At the start of a session that continues tracked work, call `orient` first.
- Work one phase at a time. After each finished phase: `save_checkpoint` on
  that phase, outcome=done, with what_changed filled in.
- Item with no phases: `save_checkpoint` outcome=active at natural seams
  (implementation compiles, tests pass) — an interrupted session must still
  leave a trail.
- A done receipt records what happened: what_changed is required (the API
  rejects a bare done), do_not_redo when relevant.
- Stopping mid-work (or told to stop): `save_checkpoint` outcome=active/
  blocked/deferred with a concrete resume_from (paths/commands/ids) and
  next_action before ending.
- Stray ideas the user mentions: `capture` (no domain unless certain).
- Never compile, promote, or reorganize items — that is the human's job.

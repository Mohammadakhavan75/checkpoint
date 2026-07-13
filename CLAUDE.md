## Checkpoint agent ledger (MCP)

This repo IS the Checkpoint app, and it dogfoods its own agent ledger via the
`checkpoint` MCP server (tools: orient, get_item, save_checkpoint, capture).

- At the start of a session that continues tracked work, call `orient` first.
- Work one phase at a time. After each finished phase: `save_checkpoint` on
  that phase, outcome=done, with a concrete resume_from (paths/commands/ids).
- Stopping mid-work (or told to stop): `save_checkpoint` outcome=active/
  blocked/deferred with next_action before ending.
- Stray ideas the user mentions: `capture` (no domain unless certain).
- Never compile, promote, or reorganize items — that is the human's job.

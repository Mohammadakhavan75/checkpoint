# Google Calendar integration — system design

> Feature: connect a Google Calendar so calendar **events** and time-bound **tasks**
> surface in **Today** and **Ready to GO!**. Adds `deadline` to tasks and `start`/`end`
> times to tasks/events.
>
> Status: design. Implements within the project's "stay minimal" constraints
> (no queue, no Redis, no worker, no second database — see `FINAL_ARCHITECTURE.md` §2).

## 0. Locked decisions

These were chosen deliberately (see the trade-offs section for what each rules out):

| Decision | Choice | Consequence |
|----------|--------|-------------|
| Sync direction | **Read-only mirror** (Google → Checkpoint) | Only a read scope + refresh token. Nothing is ever written back to Google. |
| Event identity | **Events are first-class `items`** | A mirrored event can be pulled to Today, compiled, and checkpointed like any task. |
| Surfacing | **Auto-surface by date** | Today/Ready queries gain a time window. Manual "pull into Today" (`daily`) still works on top. |

The load-bearing rule that falls out of "read-only + first-class": a mirrored event is
**co-owned**. Google owns the *facts* (title, start, end); the user owns the *work*
(checkpoints, compile, `daily`, domain). Re-sync refreshes Google's half and must never
touch the user's half.

## 1. Requirements

### Functional
- Connect/disconnect a Google account's calendar from the account menu. Show status + last-synced.
- Pull events (read-only) from the user's primary calendar into the `items` table as mirrored items.
- New time fields on items: `start_at`, `end_at` (events + tasks), `deadline` (tasks), `all_day`.
- **Today** shows: items happening/due today, overdue items, and manually-pulled `daily` items.
- **Ready to GO!** shows: upcoming time-bound items (next N days) + the existing compiled-and-waiting tasks.
- Re-sync reconciles changes/cancellations from Google without losing user-authored data.

### Non-functional
- Scale: a handful of users, primary calendar, hundreds of events in the active window. Trivial.
- No new infra: no Celery/queue/Redis/worker/webhook receiver (consistent with the build spec).
- Latency: list endpoints stay fast (≤ existing). Sync is off the hot path (stale-while-revalidate).
- Security: a refresh token is a long-lived secret → encrypted at rest; minimal scope; revocable.

### Constraints / context already in the repo
- Backend FastAPI + SQLAlchemy async + Alembic; SQLite in tests, Postgres in prod.
- Google **sign-in already exists** but is ID-token only (`services/google_auth.py`): no
  authorization-code flow, no refresh token, no Calendar scope. This feature adds that.
- `items` already carries `daily` (Today flag), `compiled`, `state`, JSON `fields`. Views render
  `ItemOut` via `ContainerCard`/`UnitRow`. `Today` = `daily=true`; `Ready` = `compiled & !daily`.

> Terminology note: Google **Calendar** carries *events* (start/end), not *tasks* with
> due dates — those live in the separate Google **Tasks** API. So "tasks" here = Checkpoint's
> own tasks gaining `deadline`/`start_at`; "events" = mirrored Google Calendar events. Google
> Tasks is a possible future source (see §10), not part of v1.

## 2. Data model

### 2.1 `items` — new columns (migration `0010_item_time_fields`)

```
start_at      timestamptz null   -- event start; optional planned start for a task
end_at        timestamptz null   -- event end
deadline      timestamptz null   -- task due date/time (events leave this null)
all_day       boolean not null default false
source        text not null default 'local'   -- 'local' | 'gcal'
external_id   text null          -- google event id (stable across recurring instances + recurringEventId suffix)
external_etag text null          -- google etag, for change detection
external_updated_at timestamptz null  -- google 'updated' timestamp
```

Indexes:
```
ix_items_owner_start    (owner_id, start_at)
ix_items_owner_deadline (owner_id, deadline)
uq_items_owner_external (owner_id, source, external_id)  unique, partial where source='gcal'
```

`fields` (JSON, no migration) gains for `source='gcal'` items: `htmlLink` (open-in-Google),
`location`, `calendarId`, `googleStatus` (`confirmed`/`cancelled`).

**Ownership split for `source='gcal'` items** — the contract the reconciler enforces:

| Google-owned (overwritten every sync) | User-owned (never touched by sync) |
|---|---|
| `title`, `start_at`, `end_at`, `all_day`, `external_etag`, `external_updated_at`, `fields.htmlLink`, `fields.location` | `daily`, `compiled`, `domain`, `mode`, `procedure`, `scope`, user keys in `fields`, all `checkpoints`/`snapshots`, `state` (except cancellation, see §5) |

A `source='local'` item is fully user-owned (today's behavior, unchanged).

### 2.2 `calendar_connections` — new table (same migration)

One row per connected Google account per user (v1: at most one).

```
id                 uuid pk
owner_id           uuid not null fk users(id) on delete cascade
google_sub         text not null         -- which Google account this calendar belongs to
google_email       text null             -- for display ("Connected as a@b.com")
refresh_token_enc  text not null         -- Fernet/AES-GCM ciphertext, never plaintext
access_token_enc   text null             -- cached short-lived token (optional)
access_expires_at  timestamptz null
scope              text not null         -- granted scopes (audit/debug)
calendar_id        text not null default 'primary'
time_zone          text null             -- from calendars.get; used to compute "today"
sync_token         text null             -- Google nextSyncToken for incremental sync
status             text not null default 'active'  -- 'active' | 'reauth_required' | 'disabled'
last_synced_at     timestamptz null
last_error         text null
created_at         timestamptz not null default now()
updated_at         timestamptz not null default now()
unique (owner_id)                        -- one connection per user in v1
```

Token encryption: symmetric key from a new env var `TOKEN_ENCRYPTION_KEY` (32-byte urlsafe
base64). Use `cryptography.Fernet`. Missing key ⇒ the connect endpoint 503s rather than storing
a plaintext secret. The JWT secret is *not* reused (different blast radius).

## 3. OAuth: getting a refresh token (the "connect" flow)

Sign-in stays as-is (GIS ID token). Calendar access is a **separate, incremental
authorization** using the **authorization-code flow**, so the refresh token lands on the
**server** and never enters the browser.

```
Browser (SPA)                         Checkpoint API                    Google
─────────────                         ──────────────                    ──────
useGoogleLogin({                                                          
  flow: 'auth-code',                                                      
  scope: calendar.readonly,                                               
  access_type:'offline',  ── consent popup ───────────────────────────▶  (user grants)
  prompt:'consent' })                                                     
        │  { code }                                                       
        └── POST /integrations/google-calendar/connect {code} ──▶         
                                       exchange code (id+secret+         
                                       redirect_uri=postmessage) ──────▶  token endpoint
                                       ◀── refresh_token, access_token ──┘
                                       calendars.get(primary) → time_zone
                                       encrypt + store calendar_connections
                                       kick first sync (§5)
        ◀────────── 200 {status, email, calendar, lastSyncedAt} ─────────
```

- **Scope**: `https://www.googleapis.com/auth/calendar.readonly` (read calendars + events;
  lets us read `time_zone` and later offer multi-calendar). If we hard-commit to primary-only,
  `calendar.events.readonly` is narrower — recommend `calendar.readonly` for headroom. Both are
  Google **"sensitive"** scopes → the OAuth consent screen needs verification for public use;
  for a friends app, stay in **Testing** mode (≤100 named test users) — no verification needed.
- **New config**: `GOOGLE_CLIENT_SECRET` (server, required for code exchange — today only the
  client *id* is set), plus reuse of existing `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID`.
- The connected account may differ from the sign-in account; store its `google_sub`/`google_email`
  and show it. Warn (don't block) on mismatch.

## 4. Token lifecycle

- Access tokens are short-lived (~1h). Refresh on demand: if `access_expires_at` is past (or
  near), use the refresh token at the token endpoint, re-encrypt and cache the new access token.
- `invalid_grant` on refresh (user revoked access, or token expired from disuse) ⇒ set
  `status='reauth_required'`, stop syncing, surface a "Reconnect Google Calendar" banner. Mirrored
  items are **kept** (last-known), shown with a "stale" hint — not deleted.
- **Disconnect**: POST revoke to `https://oauth2.googleapis.com/revoke`, delete the connection
  row. Mirrored event-items: prompt the user — keep as plain local items (drop `source`/external
  ids, so they freeze in place) or delete those with no user work. Default: keep ones with
  checkpoints/compile; delete untouched ones.
- All Google HTTP calls run in a threadpool (`run_in_threadpool`), matching the existing
  `google_auth.py` pattern — keeps the async event loop unblocked without adding `httpx`.

## 5. Sync engine (pull-through cache, no worker)

The "no queue/worker" constraint means sync is **triggered by reads**, not a scheduler.

**Trigger** — stale-while-revalidate:
1. `GET /items?tab=today|ready` checks the connection's `last_synced_at`.
2. If fresher than `SYNC_TTL` (default 5 min) or no connection → serve from DB immediately.
3. If stale → serve current DB rows **now**, and fire a non-blocking `asyncio` refresh task
   (its own DB session) guarded by a per-user in-process lock to prevent stampede. Next load is fresh.
4. Explicit `POST /integrations/google-calendar/sync` runs a **synchronous** sync (the "Sync now"
   button and the post-connect first sync), returning fresh counts.

> Single-process uvicorn (the compose setup) makes the in-process lock + `asyncio` task safe and
> sufficient. If the API is ever scaled to multiple workers, replace the lock with a DB advisory
> lock (`pg_advisory_xact_lock`) — noted in §10. This is the one place we lean on a background
> coroutine; it adds **no external infra**, so it stays within the build spec.

**Algorithm** (`services/calendar_sync.py`):
```
sync(connection):
  creds = refresh_access_token(connection)            # may raise → reauth_required
  params = { singleEvents: true, showDeleted: true, maxResults: 250 }
  if connection.sync_token:
      params.syncToken = connection.sync_token         # incremental
  else:
      params.timeMin = now - 1d; params.timeMax = now + HORIZON_DAYS   # bounded first sync
  events, nextSyncToken = list_all_pages(calendar_id, params)   # 410 Gone → clear sync_token, full resync
  for ev in events: reconcile(ev, connection.owner_id)
  connection.sync_token = nextSyncToken
  connection.last_synced_at = now; connection.status='active'; connection.last_error=null
```

`reconcile(ev, owner)` — upsert keyed by `(owner, source='gcal', external_id)`:
- **cancelled** (`status='cancelled'`): if the item has user work (checkpoints/compiled) → move to
  trash (`state='killed'`, preserving history per existing trash rules) and stamp
  `fields.googleStatus='cancelled'`; else hard-delete the row.
- **new**: insert with `source='gcal'`, `domain=CALENDAR` (a reserved domain like `reservoir`),
  `state='needsdef'`, Google-owned fields set, `daily=false`, `compiled=false`.
- **existing**: skip if `external_etag` unchanged. Otherwise overwrite **only Google-owned
  fields**; leave every user-owned field exactly as-is (the ownership split, §2.1).

Details:
- `singleEvents=true` expands recurring events into instances; the per-instance id is the stable
  `external_id`. No RRULE handling on our side.
- `timeMin`/`timeMax` and `syncToken` are mutually exclusive — first sync is window-bounded, then
  token-based incremental (Google returns *all* changes since the token; we still only keep ones
  within the rolling horizon and drop instances that age out the back).
- All-day events: Google returns `start.date` (no time) → `all_day=true`, `start_at` = local
  midnight in `connection.time_zone`.
- Timezone: day-window math (§6) uses `connection.time_zone` (falling back to a request-supplied
  IANA tz, then UTC).

## 6. Surfacing rules (the view query changes)

Let `[day0, day1)` = the user's local "today" in `connection.time_zone`; `horizon = now + READY_HORIZON_DAYS` (default 7).

**Today** = union of:
- `daily = true` (manual pull — unchanged), **plus**
- `start_at ∈ [day0, day1)` (happening today — events and timed tasks), **plus**
- `end_at ∈ [day0, day1)` (ending today — covers tasks scheduled with only an end time), **plus**
- `deadline < day1 and state ∉ (done, killed)` (due today **or overdue**).

**Ready to GO!** = union of:
- existing: `compiled = true and daily = false and state ∉ (killed, done)`, **plus**
- `start_at ∈ [day1, horizon)` or `end_at ∈ [day1, horizon)` or `deadline ∈ [day1, horizon)` (on deck, not yet today),

minus anything already in Today. All excluding `state='killed'`. Top-level/container nesting and
the leaf-checkpoint behavior in `_serialize_top_level` are preserved. Mirrored events are leaves
(never containers).

**Ordering**: timed rows by `coalesce(start_at, deadline)` ascending; untimed compiled tasks
after, by existing order. Overdue rows flagged for the client to style.

Constants (`constants.py`): `CALENDAR = "calendar"`, `READY_HORIZON_DAYS = 7`, `SYNC_TTL_SECONDS = 300`.

## 7. API surface

New router `api/integrations.py` mounted at `/api/integrations`:

| Method | Path | Body / result |
|---|---|---|
| `GET`  | `/google-calendar` | `{connected, email, calendarId, status, lastSyncedAt}` |
| `POST` | `/google-calendar/connect` | `{code}` → exchange, store, first sync → connection summary |
| `POST` | `/google-calendar/sync` | synchronous sync → `{added, updated, removed, lastSyncedAt}` |
| `DELETE` | `/google-calendar` | revoke + delete (query `?keepEvents=true\|false`) |

Changes to existing endpoints:
- `ItemOut` + serializer gain `start_at`, `end_at`, `deadline`, `all_day`, `source`, `is_event`
  (= `source=='gcal'`), and `fields.htmlLink` already flows through `fields`.
- `CompileRequest` / `ItemUpdate` accept `start_at`, `end_at`, `deadline`, `all_day` for
  **local** items.
- `PATCH /items/{id}` on a `source='gcal'` item: reject edits to Google-owned fields
  (`title`/`start_at`/`end_at`/`all_day`) with `409`; allow user-owned fields (`daily`, `domain`,
  state transitions, compile, checkpoints, snapshots). This is the ownership split at the edge.
- `GET /items?tab=today|ready` implements §6 and the stale-while-revalidate trigger (§5).

## 8. Frontend

- Add `@react-oauth/google`'s `useGoogleLogin({flow:'auth-code'})` (the lib is presumably already
  present for sign-in; if sign-in uses raw GIS, add it). "Connect Google Calendar" lives in
  `UserMenu`/account settings with status, last-synced, "Sync now", and "Disconnect".
- `types.ts` `Item` gains `start_at`/`end_at`/`deadline`/`all_day`/`source`/`is_event`.
- Row rendering: when `is_event`, `UnitRow` renders an **event variant** — clock glyph, time range
  (or "all day"), "Open in Google Calendar" (`fields.htmlLink`), no "compile required" nag, and a
  Resume/Start path only after the user compiles it. Overdue tasks get a red deadline chip.
- `CompileModal` / edit modal: add start/end and deadline inputs for local tasks (datetime-local).
- A "Reconnect Google Calendar" banner when `status='reauth_required'`.
- React Query: connection status is its own query key; sync invalidates `['items','today']`,
  `['items','ready']`.

## 9. Reliability, security, errors

- **Token at rest**: encrypted (Fernet). Disconnect revokes upstream. Minimal read-only scope.
- **Refresh failure** (`invalid_grant`) → `reauth_required`, keep mirrored data, banner. No data loss.
- **Google 5xx / rate limit (403 userRateLimitExceeded)** → exponential backoff inside the sync
  call; on give-up, keep `last_error`, serve cached. A failed background refresh never breaks a list.
- **`syncToken` 410 Gone** → clear token, full window resync (idempotent via the unique key).
- **Idempotency**: every sync is an upsert keyed by `(owner, source, external_id)`; safe to retry.
- **Privacy**: store only `title`, `start/end`, `location`, `htmlLink`, `calendarId` — not full
  event bodies/attendees. Document this in the connect consent copy.
- **Tests** (SQLite, monkeypatch Google like `google_auth` tests do): reconcile new/update/cancel,
  ownership-split preservation, all-day + tz windowing, `syncToken` expiry resync, surfacing
  windows (today/overdue/horizon), and the `gcal`-item PATCH rejection.

## 10. Trade-offs & what to revisit as it grows

| Choice | Buys | Costs / revisit when |
|---|---|---|
| Pull-through cache vs Google push (watch channels) | zero infra, no public webhook | up to `SYNC_TTL` staleness; events don't appear instantly. Add `events.watch` + a `/webhooks/google` receiver when "instant" matters. |
| Events as first-class items | reuse compile/checkpoint/Today machinery | blurs "not a calendar"; a co-ownership rule the reconciler must honor forever. |
| Read-only | tiny scope, no conflict logic | can't create events from Checkpoint. Two-way is a separate project (write scope, dedupe, delete-propagation). |
| In-process `asyncio` refresh + lock | no Celery/queue | single-worker assumption. Multi-worker → Postgres advisory lock or a real scheduler. |
| Primary calendar only | one `events.list` loop | multi-calendar needs calendar selection UI + per-calendar sync tokens. |
| Google **Calendar** only | one integration | true due-dated *tasks* would pull from Google **Tasks** API as a second read-only source feeding the same `deadline` field. |

## 11. Phased delivery

1. **Schema + fields**: migration `0010` (time columns, `calendar_connections`), serializer/types,
   compile/edit inputs, surfacing query (§6). Ships task `deadline`/`start`/`end` with **no Google
   dependency** — independently useful and de-risks the data model first.
2. **Connect + manual sync**: OAuth code flow, token storage/encryption, `services/calendar_sync.py`,
   `/integrations` endpoints, "Connect" + "Sync now" UI. Read-only mirror working end to end.
3. **Auto-refresh + polish**: stale-while-revalidate trigger, event-row UI variant, reauth banner,
   disconnect/revoke, overdue styling, tests.

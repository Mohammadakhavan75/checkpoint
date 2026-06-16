# Backup & restore

Checkpoint's data lives in one Postgres database (the `pgdata` volume). These
two scripts give you a disaster-recovery net:

| Script | Does |
|--------|------|
| [`ops/backup-checkpoint.sh`](../../ops/backup-checkpoint.sh) | `pg_dump` the database to a timestamped file and upload a copy to Google Drive (rclone). Prunes old local + remote copies. |
| [`ops/restore-checkpoint.sh`](../../ops/restore-checkpoint.sh) | Restore the database from a local dump or one pulled back from Drive. **Overwrites the live database.** |

The dump runs *inside* the postgres container, so the host needs no Postgres
client — only `docker` (and `rclone`, if uploading to Drive).

Dumps use the custom format (`pg_dump -Fc`): compressed and restorable with
`pg_restore`. A full dump contains schema **and** data, so a restore brings the
database to exactly the dumped state — no separate migration step needed.

---

## 1. Configure

Copy the config template and edit it:

```bash
cp ops/backup.env.example ops/backup.env
$EDITOR ops/backup.env
```

The defaults match the production compose stack (`checkpoint-postgres`,
`checkpoint-api`, `/home/mohammad/home-projects/docker-compose.yaml`). For a
plain local checkout (`docker compose` from the repo) set:

```ini
COMPOSE_FILE=./docker-compose.yml
POSTGRES_SERVICE=postgres
API_SERVICE=api
```

Everything is also overridable as an environment variable, e.g.
`SKIP_UPLOAD=true ./ops/backup-checkpoint.sh` for a quick local-only dump.

> `ops/backup.env` is gitignored — it may hold a DB password and points at your
> rclone remote. Keep it off version control.

---

## 2. Set up Google Drive (rclone + service account)

A **service account** lets the server upload unattended — no browser OAuth, no
token refresh.

### a. Create the service account

1. In the [Google Cloud Console](https://console.cloud.google.com/), pick (or
   create) a project.
2. **APIs & Services → Library →** enable **Google Drive API**.
3. **IAM & Admin → Service Accounts → Create service account**. Give it a name
   (e.g. `checkpoint-backup`). No roles needed.
4. Open the account → **Keys → Add key → JSON**. Download it to the server, e.g.
   `/home/mohammad/home-projects/secrets/checkpoint-backup-sa.json` (keep it
   `chmod 600`, off git).

### b. Give it somewhere to write

> ⚠️ A service account has **no storage quota of its own** on personal "My
> Drive". Uploads there fail with `storageQuotaExceeded`. Use a **Shared Drive**
> (Google Workspace) — or, on a personal account, share a normal Drive folder
> with the service account's email and upload into it; a Shared Drive is the
> reliable path.

- **Shared Drive:** create one, then add the service account's email
  (`...@...iam.gserviceaccount.com`) as a **Content manager**. Note the Shared
  Drive ID from its URL.
- **Shared folder (personal):** create a folder, share it with the service
  account email (Editor), and note the folder ID from its URL.

### c. Configure the rclone remote

Install rclone (`sudo apt install rclone` or from rclone.org), then either run
`rclone config` (remote type **drive**, set *service_account_file*, and either
*team_drive* = Shared Drive ID or *root_folder_id* = folder ID), or write the
config directly:

```ini
# ~/.config/rclone/rclone.conf
[gdrive-checkpoint]
type = drive
service_account_file = /home/mohammad/home-projects/secrets/checkpoint-backup-sa.json
team_drive = 0AbCdEfGhIjKlUk9PVA          # Shared Drive ID …
# root_folder_id = 1AbC...                # … or a shared folder ID instead
```

Verify access (should list without error):

```bash
rclone lsd gdrive-checkpoint:
```

Then in `ops/backup.env` set the remote + destination path (rclone creates the
sub-folder on first upload):

```ini
RCLONE_REMOTE=gdrive-checkpoint:checkpoint-backups
```

---

## 3. Run a backup

```bash
./ops/backup-checkpoint.sh
```

What it does: dump → validate (`pg_restore -l`) → upload to Drive → prune local
dumps beyond `KEEP_LOCAL` → prune remote dumps older than `KEEP_REMOTE_DAYS`.
Any failure exits non-zero and leaves no half-written `.dump`.

Local-only (skip Drive):

```bash
SKIP_UPLOAD=true ./ops/backup-checkpoint.sh
```

### Nightly cron

Run at 03:30 every night and log the output. Edit `crontab -e`:

```cron
30 3 * * * /home/mohammad/home-projects/checkpoint/ops/backup-checkpoint.sh >> /var/log/checkpoint-backup.log 2>&1
```

(`cron` has a minimal environment, which is why all config lives in
`ops/backup.env` rather than your shell.)

---

## 4. Restore (disaster recovery)

> **Destructive:** this overwrites the current `checkpoint` database. The script
> stops the API first, restores, then restarts it, and asks you to type the
> database name to confirm (skip with `--yes`).

List what's available, locally and on Drive:

```bash
./ops/restore-checkpoint.sh --list
```

Restore the newest **local** dump:

```bash
./ops/restore-checkpoint.sh --latest
```

Restore a specific local file:

```bash
./ops/restore-checkpoint.sh --file /home/mohammad/home-projects/backups/checkpoint-20260616-033000.dump
```

Pull a dump back **from Drive** and restore it (e.g. the box was rebuilt):

```bash
./ops/restore-checkpoint.sh --from-drive checkpoint-20260616-033000.dump
```

### Restoring onto a fresh machine

1. Bring up the stack so the empty database + role exist:
   `docker compose -f <compose> up -d postgres api`
2. Put your `ops/backup.env` and rclone config/service-account JSON in place.
3. `./ops/restore-checkpoint.sh --from-drive <name>`

The dump recreates all tables and data, so the restored database already
includes every migration that had been applied when the backup was taken.

---

## Notes & limits

- **Test your restore.** A backup you've never restored is a hope, not a backup.
  Periodically run `--latest` against a throwaway stack and confirm the app comes
  up with your data.
- These scripts back up the **database only** — the source of truth. They do not
  capture `.env`, secrets, or the rclone service-account JSON; store those
  separately (a password manager / secrets vault).
- Dumps can contain personal data. The Drive folder and the local `backups/`
  directory should be access-controlled accordingly.

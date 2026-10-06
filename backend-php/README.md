# Nobatyar / Moradipsy — PHP 8.1 backend

A dependency-free PHP 8.1 + MySQL rewrite of the original Flask backend, designed to run
**on the same cheap shared host as the React frontend** (same origin, under `/api` and `/seminar`).
No Composer, no framework — just PHP's standard library (PDO, cURL, mbstring).

It reproduces the old API **endpoint-for-endpoint** (same paths, same JSON, same Persian
messages), so the existing frontend works with a single config change.

## Requirements (shared host)
- PHP **8.1+** with extensions: `pdo_mysql`, `curl`, `mbstring`, `fileinfo`, `json`.
- MySQL / MariaDB.
- Apache/LiteSpeed with `mod_rewrite` (standard on LiteSpeed shared hosting).
- For the data migration only: `pdo_sqlite` (can be run from any machine, not necessarily the host).

## Layout on the host (document root = `public_html`)
Copy the contents of `backend-php/` into the web root, alongside the built SPA:
```
public_html/
├── index.html            ← SPA (from frontend `dist/`)
├── assets/               ← SPA (from frontend `dist/assets/`)
├── .htaccess             ← from backend-php/.htaccess  (replaces the SPA-only one)
├── api/        index.php
├── seminar/    index.php, register.html
├── src/        (PHP classes — denied to the web)
├── scripts/    migrate_sqlite_to_mysql.php, send_reminders.php, seed.php
├── sql/        schema.sql
├── uploads/    (user images; the API reads/writes here)
└── config.php            ← your real secrets (NOT in git)
```
URLs are virtual: `/api/uploads/x.jpg` is served by `api/index.php` from the `uploads/` dir,
so the physical location of `uploads/` is decoupled from the URL (set `UPLOAD_DIR` in config).

## Deploy — step by step

1. **Create the database** in cPanel → MySQL Databases. Note the DB name, user, password
   (shared hosts usually prefix them, e.g. `cpuser_moradipsy`).

2. **Create the schema**: in phpMyAdmin, select the DB → Import → `sql/schema.sql`.

3. **Configure**: copy `config.example.php` → `config.php` and fill in:
   - `DB_*` (from step 1)
   - `JWT_SECRET` — a long random string (e.g. `openssl rand -hex 32`). Keep it stable.
   - `SMS_IR_API_KEY`, `SMS_IR_USERNAME`, `SMS_IR_LINE` and the template IDs.
   - `TIMEZONE` (default `Asia/Tehran`), `UPLOAD_DIR` (absolute path to `uploads/`).

4. **Upload** the files (FTP/File Manager) into `public_html` as shown above.
   Merge the provided `.htaccess` into the web root (it does both API routing **and** the SPA
   fallback — it replaces the old SPA-only `.htaccess`).
   Make `uploads/` writable by PHP (usually `755`/`775`).

5. **Migrate the data** from the old SQLite DB (preserves ids):
   ```
   php scripts/migrate_sqlite_to_mysql.php /path/to/moradipsy.db
   ```
   Run it where both `pdo_sqlite` is available and the MySQL host is reachable. If the tables
   already contain rows, re-run with `--force` to truncate and reload.
   *(For a fresh/test DB instead of a migration, run `php scripts/seed.php`.)*

6. **Rebuild & upload the frontend** pointing at the same-origin API:
   ```
   cd frontend
   cp .env.production.example .env.production      # VITE_API_URL=/api
   npm ci && npm run build
   ```
   Upload `dist/index.html` and `dist/assets/*` to the web root.

7. **Reminder cron** (cPanel → Cron Jobs), every minute, 24h ahead:
   ```
   * * * * * /usr/bin/php /home/USER/public_html/scripts/send_reminders.php 1440 >> /home/USER/reminders.log 2>&1
   ```

8. **Verify**: staff login (`/login`), booking flow (OTP → book → SMS), blog + comments,
   survey, seminar (`/seminar/register`), settings, dashboards.

## Notes
- **Password hashes** migrate as-is: PHP `password_verify()` reads the old bcrypt (`$2b$`) hashes,
  so existing staff logins keep working. (Issued JWTs do not carry over — staff just log in again.)
- **Short OTPs** for comments / feedback / seminar used in-memory dicts in Flask (impossible in
  per-request PHP); they now live in the `otp_sessions` table — a correctness fix, no API change.
- **Timezone**: "today / upcoming" date logic uses `TIMEZONE` (Asia/Tehran). `created_at` stays UTC
  to match migrated rows.
- **SMS** is sent synchronously (Flask used background threads). Failures are logged and never break
  the request.

### Known-open items carried over from the old backend (deferred by the owner)
These behaviors are **preserved** for a faithful migration; tighten them when ready:
- `POST /api/otp/debug-send` exists but is **disabled by default** here (`ENABLE_OTP_DEBUG=false`).
  The legacy backend had it always on.
- `POST /api/otp/send` returns `otp_code` in its JSON body, and OTP has no real expiry (`expires_at` far future).
- Seminar + feedback list/delete endpoints have **no auth** (as in the original). Consider requiring
  a staff JWT if the admin UI is updated to send one.
- **Rotate the sms.ir API key** — it was exposed in old git history.

## Rollback
The old Python `backend/` stays in the repo. To roll back, repoint the frontend
(`VITE_API_URL`) at the old Flask API and rebuild.

# CLAUDE.md — Nobatyar / Moradipsy

Guide for making changes safely. Keep this short; put transient details in the session, not here.

## What this is
Clinic appointment system for **moradipsy.ir** (Dr. حسین مرادی, روانشناس). Persian, RTL.
- `frontend/` — React 18 + Vite SPA (Tailwind, react-router). Built and hosted on a **LiteSpeed shared host** (SPA via `.htaccess`).
- `backend/` — Flask + SQLAlchemy + **SQLite**, on a VPS. Serves `https://api.moradipsy.ir/api`.
- Features: appointment booking (OTP → book → confirm → visit), blog + comments, survey, seminar registration, site settings, simple chatbot.

## Where it runs / deploy
- **Backend** (migrated 2026-07-30): host `chatbot`, user `kut`, dir `/home/kut/moradipsy-backend`, systemd unit `moradipsy-backend` (Flask on `0.0.0.0:5055`).
  **Only port 5000 is open externally**, so nginx terminates SSL on **:5000** and proxies → `127.0.0.1:5055`. Public API base is therefore **`https://api.viracoai.net:5000/api`** (note the port).
  ⚠️ nginx config is **inline in `/etc/nginx/nginx.conf`** (the `VIRACOAI BACKEND SERVER ROUTING` block) — `nginx.conf` does **not** include `sites-enabled/`, so editing files there has no effect.
  Deploy = edit files on the server, then `sudo systemctl restart moradipsy-backend`. **Backend edits happen ON THE SERVER**, so after any change **sync the files back into this repo** (repo can drift — verify with a checksum diff).
  Previous host was `109.122.250.39` (`/var/www/moradipsy.ir/backend`) — now stopped/disabled, files + a final DB snapshot kept there for rollback.
- **Frontend**: `cd frontend && npm run build` (uses `.env.production` → `VITE_API_URL=https://api.viracoai.net:5000/api`), then FTP the `dist/` files (`index.html`, hashed `assets/*.js|css`) to the LiteSpeed host root + `/assets/`. Frontend hosting did **not** move.
- SSH/FTP credentials are **not** stored in the repo — they come from the session/operator.

## Secrets
- `backend/config.py` is **gitignored** (holds SMS API key + JWT secret). Use `backend/config.example.py` as the template. The server has the real `config.py`; don't commit it.
- Don't put credentials in tracked files. Prefer env vars in production.

## SMS (sms.ir) — the important rule
Two send paths in `backend/sms_utils.py`:
- **VERIFY** (`send_verify_sms` / the `send_*_sms` helpers) → POST `/v1/send/verify` with a `templateId` + params. **Use this for every OTP and every notification.**
- **URL** (`send_url_sms`) → GET `/v1/send` raw text, no template. Only used for the blog comment-reply notice (free link text). Don't use it for OTP.
- In short-lived scripts (e.g. the reminder cron) call the **synchronous** `send_verify_sms` directly — the async `send_*_sms` helpers spawn daemon threads that die when the script exits.
- Template IDs live in `config.py` (`SMS_IR_TEMPLATE_*`). OTP=815351, BOOKING=619902, DOCTOR=580012, SEMINAR=814118, REMINDER=970621, CANCEL=800451, RESCHEDULE=726063, APPROVE=786713.

## Testing changes (never touch prod data or send real SMS)
Run E2E against a **copy** of the prod DB with SMS mocked:
1. `shutil.copy('instance/moradipsy.db', '/tmp/x.db')`; set `Config.SQLALCHEMY_DATABASE_URI = 'sqlite:////tmp/x.db'` **before** `create_app()`.
2. Monkeypatch `sms_utils.send_sms_async` and `sms_utils.send_url_sms` to record calls.
3. Drive routes via Flask `app.test_client()`. Reset a test doctor/secretary password on the copy to test auth.

## Gotchas
- Backend runs the Flask **dev server as root on `0.0.0.0:5001`** with no firewall — directly reachable from the internet (known; leave unless asked).
- Jalali date conversion is **hand-rolled** in `backend/routes/appointments.py::gregorian_to_jalali` (verified correct for the near future). Patient SMS dates use it.
- The reminder cron now lives at `/home/kut/moradipsy-backend/send_reminders.py` (per-minute crontab of user `kut`, arg `1440` = 24h ahead). It IS in the app dir now, but the crontab entry itself is server-side state.
- `routes/chatbot.py` imports `openai`, so it's a hard runtime dependency even though the chatbot is off.
- `reminder_sent` column exists in the DB via `ALTER TABLE` but is **not** in `models.py` — a fresh `db.create_all()` would omit it.
- Comment admin endpoints require a staff JWT; the admin UI must call them via the authed `API` axios instance (not raw `fetch`).

## Known-open (deferred by owner)
- `POST /api/otp/debug-send` is live (lets anyone set an OTP for any number → identity spoofing).
- `otp/send` returns `otp_code` in its JSON body; OTP has no server-side expiry (`expires_at=2099`).
- SMS API key was in git history before it was untracked → **rotate it** on sms.ir.
- `seed.py` default logins: doctor `09120000001`/`doctor123`, secretary `09120000002`/`secretary123` — change if still live.

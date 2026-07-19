# Nobatyar Project — Full Context

## Project Overview
Full-stack clinic management system for Dr. Hossein Moradi (روانشناس بالینی)
- **Site**: https://moradipsy.ir
- **API**: https://api.moradipsy.ir (nginx → Flask :5001)
- **GitHub**: https://github.com/mhsh77/nobatyar (private)

## Repo Structure
```
nobatyar/
├── backend/              # Flask API (Python)
│   ├── app.py            # App factory + blueprint registration
│   ├── config.py         # DB, JWT, SMS config
│   ├── models.py         # SQLAlchemy models
│   ├── sms_utils.py      # SMS sending (verify template + URL-based)
│   ├── routes/
│   │   ├── auth.py       # Login, JWT
│   │   ├── appointments.py
│   │   ├── schedule.py
│   │   ├── posts.py      # Blog CRUD
│   │   ├── settings.py   # Site settings + image upload
│   │   ├── seminar.py    # Seminar + OTP + registrations
│   │   ├── comments.py   # Blog comments + replies + SMS notification
│   │   └── feedback.py   # Survey/feedback system
│   └── run.py
├── frontend/             # React SPA (Vite + Tailwind)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx, Blog.jsx, SinglePost.jsx
│   │   │   ├── SeminarRegister.jsx  # Seminar with OTP
│   │   │   ├── Survey.jsx           # Feedback survey with OTP + stars
│   │   │   ├── SiteSettings.jsx
│   │   │   └── doctor/
│   │   │       ├── SeminarManagement.jsx  # Seminar admin
│   │   │       ├── CommentsManagement.jsx # Comments + replies
│   │   │       └── SurveyManagement.jsx   # Survey responses
│   │   ├── components/
│   │   │   ├── JalaliDatePicker.jsx
│   │   │   └── home/
│   │   │       ├── Navbar.jsx, Hero.jsx, BlogSection.jsx, About.jsx, ...
│   │   │       └── Footer.jsx
│   │   └── utils/persianDate.js  # Jalali date (jalaali-js)
│   └── tailwind.config.cjs
```

## Credentials (VPS Iran 109.122.250.39)
- SSH: `ssh root@109.122.250.39` pass: `M1908c3xg!`
- Flask venv: `/var/www/moradipsy.ir/backend/venv/bin/python3`
- DB: `/var/www/moradipsy.ir/backend/instance/moradipsy.db`
- Service: `moradipsy-backend.service`
- Nginx: `/etc/nginx/sites-enabled/moradipsy.viracoai.net`
- CORS: Flask app has `CORS(app)` → allows all origins

## Doctor Login
- Mobile: `09369480748`
- Password: `Tooshkon`

## FTP (Frontend hosting)
- Host: `765433140.cloudylink.com:21`
- User: `root@moradipsy.ir`
- Pass: `M1908c3xg!`
- Path: `/` (root = public_html)
- Web server: LiteSpeed (with .htaccess mod_rewrite for SPA routing)
- Deploy: `VITE_API_URL=https://api.moradipsy.ir/api npm run build` → upload index.html + assets/

## Features Implemented

### 1. Blog System
- Blog listing (`/blog`), single post (`/blog/:id`), admin CRUD (`/posts`)
- BlogSection on homepage: 3 latest posts with `line-clamp-2` preview + "ادامه مطلب" link
- `API_BASE` fix: all image URLs use `https://api.moradipsy.ir` instead of relative paths

### 2. Seminar Registration (`/seminar`)
- Form: name, phone (OTP), student status, field, semester
- OTP verification via SMS (send_url_sms)
- Settings: title, date (Jalali picker), time, location, description
- On/off toggle → hides from navbar when off
- Admin panel (`/doctor/seminar`): settings tab + registrations tab with search, CSV export, delete

### 3. Blog Comments (`/blog/:id`)
- Comment form: name, phone (OTP), text
- OTP via SMS
- Admin approval required before display
- Nested replies: admin can reply from `/doctor/comments`
- SMS notification to commenter when doctor replies

### 4. Survey/Feedback (`/survey`)
- 3-step flow: OTP → name → star rating (1-5) + text
- SMS OTP verification
- Admin panel (`/doctor/survey`): list with search + delete

### 5. Site Settings
- Hero images, clinic images, doctor info
- Image upload via API

### 6. Appointments & Scheduling
- Online booking, doctor calendar, secretary management

## Key Technical Details

### API_BASE Pattern (CRITICAL)
All public-facing components use this pattern for image URLs:
```javascript
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';
```
**IMPORTANT**: `.replace(/\/api$/, '')` uses regex with `$` anchor — NOT `.replace('/api', '')` which would match `://api.` in the URL and produce `https:/.moradipsy.ir/`

### Axios Instance
```javascript
// src/api/axios.jsx
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
// Build: VITE_API_URL=https://api.moradipsy.ir/api
// Result: baseURL = https://api.moradipsy.ir/api
```

### Build Command
```bash
cd frontend && npm run build
```
`.env.production` file has `VITE_API_URL=https://api.moradipsy.ir/api`

### Deploy
1. `cd frontend && npm run build`
2. Upload `dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css` to FTP
3. Backend: `ssh root@109.122.250.39` → `systemctl restart moradipsy-backend.service`

### SMS Config
```python
SMS_IR_USERNAME = '9036559982'
SMS_IR_API_KEY = 'yA09lv...R0Qb'
SMS_IR_LINE = '30002108021746'
```
URL-based SMS: `GET https://api.sms.ir/v1/send?username=...&password=...&line=...&mobile=...&text=...`

### Nginx
- `client_max_body_size 50M;` (for image uploads)
- Proxies: `/api/`, `/uploads/`, `/seminar/` → Flask :5001

## Bugs Fixed
1. `import random\nfrom sms_utils import send_otp_sms, urllib.request, json` → broke due to extra imports
2. F-string with `\n` inside → split into two concatenated f-strings
3. `API_BASE = ''` in multiple components → changed to dynamic VITE_API_URL pattern
4. `.replace('/api', '')` → `.replace(/\/api$/, '')` (removes only trailing /api)
5. Custom Jalali date functions → replaced with `jalaali-js` library
6. RTL toggle switch → `ml-auto`/`mr-auto` instead of `translate-x`
7. Missing `tailwind.config.cjs` and `postcss.config.cjs`

## Pending
- SMS notification for comment replies needs proper sms.ir template (currently disabled)

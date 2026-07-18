# Changelog

## 2026-07-18 — Complete Seminar & Blog System

### 🆕 New Features

#### 📚 Seminar Registration System
- **Public registration page** (`/seminar`): Form with name, phone, student status, field of study, semester
- **OTP phone verification**: 4-digit code sent via API, 5-minute expiry, verified step before form submission
- **Seminar info display**: Title, date (Shamsi), time, location, and description shown above the form
- **On/off toggle**: Admin can enable/disable the seminar — when off, page shows "ثبت‌نام غیرفعال است" and navbar link is hidden
- **Navbar integration**: "سمینار" link appears dynamically only when seminar is enabled

#### 🎓 Seminar Admin Panel (`/doctor/seminar`)
- **Settings tab**: Title, Jalali date picker (future dates only), time, location, description
- **Toggle switch**: Enable/disable with RTL-fixed styling (`ml-auto`/`mr-auto` instead of `translate-x`)
- **Registrations tab**: Table with #, name, phone, student badge, field, semester, date
- **Search**: Full-text search by name, last name, or phone number
- **Export CSV**: Download all registrations as Excel-compatible CSV with BOM
- **Delete**: Per-row DELETE button with confirmation dialog
- **Stats cards**: Total registrations, student count, non-student count
- **Pagination**: Server-side pagination (50 per page)

#### 🗓️ Jalali (Persian) Date Picker
- **New component**: `JalaliDatePicker.jsx` — reusable, minimal, clean
- **Shamsi months**: Month names in Persian (فروردین–اسفند)
- **Future-only validation**: Only allows selecting dates from tomorrow onwards
- **3 dropdowns**: Year (current + 10), month (filtered), day (filtered)
- **Libraries**: Uses `jalaali-js` for accurate Jalali↔Gregorian conversion

#### 📝 Blog System
- **BlogSection on homepage**: Shows 3 latest posts as cards (image, title, excerpt, date, author)
- **"مشاهده همه مطالب" button**: Links to `/blog` full listing
- **Blog link in navbar**: "وبلاگ" added between "رزرو نوبت" and "ارتباط"
- **Blog page** (`/blog`): Grid layout with all published posts
- **Single post page** (`/blog/:id`): Full post content with image

#### 🔧 Admin Dashboard
- **Sidebar**: New 🎓 "سمینار" link in doctor's sidebar
- **Posts management**: `API_BASE` fixes for image previews
- **Site settings**: Image preview fixes

### 🐛 Bug Fixes

#### 🖼️ Image Loading (All Pages)
- **Root cause**: `const API_BASE = ''` in multiple components — images used relative URLs pointing to `moradipsy.ir` instead of `api.moradipsy.ir`
- **Fixed files**: Hero.jsx, About.jsx, Blog.jsx, SinglePost.jsx, BlogSection.jsx, Posts.jsx, SiteSettings.jsx, MedicalRecords.jsx, MedicalRecordForm.jsx, Capture.jsx
- **Fix**: Changed to `import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'https://api.moradipsy.ir'`

#### 🔗 VITE_API_URL Replacement Bug
- **Issue**: `.replace('/api', '')` matched the `/api` in `://api.moradipsy.ir/`, producing `https:/.moradipsy.ir/api`
- **Fix**: Changed to `.replace(/\/api$/, '')` — only removes `/api` from the end of the URL
- **Affected**: Hero.jsx, BlogSection.jsx, SeminarRegister.jsx, SeminarManagement.jsx

#### 📅 Persian Date Conversion
- **Issue**: Custom `toJalali` algorithm gave wrong years; `toGregorian` had off-by-one errors
- **Fix**: Replaced both with `jalaali-js` library (well-tested, accurate)

#### 🔄 RTL Toggle Styling
- **Issue**: `translate-x-6`/`translate-x-1` pushed thumb off-track in RTL mode
- **Fix**: Replaced with `ml-auto`/`mr-auto` for correct RTL positioning

#### 🆎 Author Name Encoding
- **Issue**: "دکتر حسین مرادی" stored as `Ø¯Ú©ØªØ±...` (double UTF-8 encoding) in SQLite
- **Fix**: Direct SQL UPDATE in `users` table to restore correct Persian text

#### 🎨 CSS/Styling
- **Issue**: Missing `tailwind.config.cjs` and `postcss.config.cjs` caused 1.7kB empty CSS build
- **Fix**: Created both configs with Vazirmatn font family and `medical` color palette

#### 📤 Nginx Upload Limit
- **Issue**: Default `client_max_body_size` was 1MB, blocking image uploads
- **Fix**: Added `client_max_body_size 50M` to both nginx.conf and site config

### ⚙️ Infrastructure

#### 🖥️ Backend (Iran VPS 109.122.250.39)
- **New file**: `routes/seminar.py` — Complete API with model, OTP, CRUD
- **Config**: `ENABLE_SEMINAR = True` flag (moradipsy only, nobatyar untouched)
- **Nginx**: Added `location /seminar/` proxy → Flask (port 5001)
- **API endpoints**:
  | Method | Path | Description |
  |--------|------|-------------|
  | GET | `/seminar/register` | HTML form |
  | POST | `/seminar/api/register` | Submit registration |
  | GET | `/seminar/api/registrations` | List (paginated) |
  | DELETE | `/seminar/api/register/<id>` | Delete registration |
  | POST | `/seminar/api/send-otp` | Generate OTP code |
  | POST | `/seminar/api/verify-otp` | Verify OTP code |
  | GET | `/seminar/admin` | Admin HTML page |

#### 🌐 Frontend (FTP 765433140.cloudylink.com)
- **LiteSpeed cache**: Multiple hard-refreshes needed for cache invalidation
- **SPA routing**: `.htaccess` mod_rewrite serves index.html for all routes

#### 📦 Deployment
- **Build**: `VITE_API_URL=https://api.moradipsy.ir/api npm run build`
- **Upload**: FTP to `765433140.cloudylink.com` (user: `root@moradipsy.ir`)
- **Files**: index.html + hashed JS/CSS in `/assets/`

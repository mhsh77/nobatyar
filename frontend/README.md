# Nobatyar / Moradipsy Frontend

سیستم مدیریت نوبت‌دهی و ثبت‌نام سمینار | React SPA برای مطب روانشناسی

## 🚀 ویژگی‌ها

- **نوبت‌دهی آنلاین** — رزرو نوبت مشاوره با انتخاب تاریخ و ساعت
- **ثبت‌نام سمینار** — فرم ثبت‌نام با تایید OTP و اطلاعات سمینار
- **وبلاگ** — نمایش و مدیریت مطالب آموزشی
- **پنل مدیریت** — داشبورد دکتر و منشی با مدیریت نوبت‌ها، پست‌ها، تنظیمات
- **تاریخ شمسی** — پشتیبانی کامل از تاریخ خورشیدی (با jalaali-js)
- **RTL کامل** — پشتیبانی از زبان فارسی و راست‌چین

## 🛠 تکنولوژی‌ها

| ابزار | نسخه |
|-------|------|
| React | 18 |
| Vite | 5 |
| Tailwind CSS | 3 |
| React Router | 6 |
| Axios | — |
| Framer Motion | 12 |
| jalaali-js | — |

## 📦 نصب و اجرا

```bash
npm install
VITE_API_URL=https://api.moradipsy.ir/api npm run dev
```

## 🌐 بیلد

```bash
VITE_API_URL=https://api.moradipsy.ir/api npm run build
```

## 📁 ساختار پروژه

```
src/
├── api/              # Axios config
├── components/       # UI components
│   ├── home/         # Home page sections
│   └── ui/           # Reusable UI kit
├── contexts/         # Auth context
├── pages/            # Route pages
│   ├── doctor/       # Doctor dashboard pages
│   └── secretary/    # Secretary pages
└── utils/            # Utilities (persian date, etc.)
```

# Nobatyar — سیستم مدیریت کلینیک روانشناسی

Full-stack clinic management system: **Flask backend** + **React frontend**

## 🏗 ساختار پروژه

```
nobatyar/
├── backend/          # Flask API (Python)
│   ├── routes/       # API endpoints
│   ├── models.py     # SQLAlchemy models
│   ├── app.py        # Flask app factory
│   └── run.py        # Entry point
├── frontend/         # React SPA (Vite + Tailwind)
│   ├── src/pages/    # Route pages
│   ├── src/components/  # UI components
│   └── src/utils/    # Utilities
└── README.md
```

## ✨ Features

- **Online appointment booking** with Persian calendar
- **Seminar registration** with OTP verification
- **Blog** with post management
- **Doctor & secretary dashboards**
- **Persian (Jalali) date** support
- **RTL** full support
- **CSV export** for registrations

## 🚀 Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
python run.py

# Frontend
cd frontend
npm install
VITE_API_URL=http://localhost:5001 npm run dev
```

## 🔗 Links

- Site: [moradipsy.ir](https://moradipsy.ir)
- API: [api.moradipsy.ir](https://api.moradipsy.ir)

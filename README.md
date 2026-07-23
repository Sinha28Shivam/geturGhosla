# Room Discovery App — Technical Documentation & Architecture

Complete room & PG discovery application featuring a **FastAPI (PostGIS + Redis)** backend and a **Vite + React (Framer Motion + Leaflet)** frontend with PWA mobile support.

---

## 🚀 Key Features Built Across All Phases

### Phase 1 — Core MVP & Auth
- **Dual Authentication**: Phone SMS OTP (`POST /auth/otp/request`, `POST /auth/otp/verify`) and Email OTP / Password fallback with JWT sessions.
- **Room Listings & Search**: Full room management (`POST /rooms`, `PATCH /rooms/{id}`, `DELETE /rooms/{id}`) with active/inactive soft deletes.
- **PostGIS Geo-Nearby Search**: Real-time radial search (`GET /rooms/nearby?lat=...&lng=...&radius_km=...`) using `ST_DWithin` and `ST_Distance`.
- **View Deduplication**: Deduped view count tracking (`POST /rooms/{id}/view`).
- **Interests Inbox**: Direct one-click lead management (`POST /rooms/{id}/interest`, `PATCH /interests/{id}/status`).
- **Admin Moderation**: Pending approval queue (`GET /admin/rooms/pending`, `PATCH /admin/rooms/{id}/status`).

### Phase 2 — Compare & Moderation
- **Redis Compare Matrix**: Stateless Redis-backed side-by-side room compare matrix (`POST /compare/{roomId}`, `GET /compare`, `DELETE /compare`) capped at 4 rooms.
- **Fraud & Spam Reporting**: Room reporting modal (`POST /rooms/{id}/report`) with auto-flagging after 3 reports, plus Admin report resolution queue (`GET /admin/reports`, `PATCH /admin/reports/{id}/resolve`).

### Phase 3 — Reviews, Saved Searches & Production
- **Tenant Reviews**: Verified tenant reviews (`POST /rooms/{id}/reviews`, `GET /rooms/{id}/reviews`) with star rating system.
- **Saved Search Alerts**: Configurable search alert criteria (`POST /saved-searches`, `GET /saved-searches`) with background worker push notifications.
- **Owner Availability Controls**: Instant availability toggling (`PATCH /rooms/{id}/availability`) and renewal (`POST /rooms/{id}/renew`).
- **Idempotency Protection**: `Idempotency-Key` header handling for idempotent write operations.
- **Cloudinary Presigned Uploads**: SHA-1 signature generation for direct browser-to-cloud photo uploads.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with PostGIS extension (`GeoAlchemy2`, `SQLAlchemy`)
- **Cache & Storage**: Redis (Docker container / Managed Redis) for Compare sets, rate limiting, and Idempotency keys
- **Security & Auth**: PyJWT, Passlib (Bcrypt), SlowAPI rate limiters
- **Notifications**: `pywebpush` worker module

### Frontend
- **Framework**: React 18 + Vite
- **Styling & UI**: Vanilla CSS + Glassmorphism / Modern palette (No utility clutter)
- **Animations**: Framer Motion
- **Maps**: Leaflet + OpenStreetMap (`react-leaflet` v4)
- **Icons**: Lucide React
- **PWA Support**: Service worker ready, standalone manifest, and mobile bottom tab navigation

---

## 📁 Repository Structure

```
RoomDiscoveryApp/
├── Backend/
│   ├── api/v1/routers/        # API Routers (auth, users, rooms, room_images, interests, admin, compare, reviews, saved_searches)
│   ├── core/                  # Security, config, Redis client, Idempotency middleware
│   ├── crud/                  # SQLAlchemy DB CRUD helper operations
│   ├── db/                    # Models & session configuration
│   ├── schemas/               # Pydantic schemas
│   ├── utils/                 # Email & Push notification background dispatchers
│   ├── main.py                # FastAPI entry point
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Backend environment template
├── Frontend/
│   ├── public/
│   │   └── manifest.json      # Mobile PWA web app manifest
│   ├── src/
│   │   ├── api/               # HTTP client & API service wrapper
│   │   ├── components/        # UI components (Map, Lightbox, FilterDrawer, Skeleton, Layout)
│   │   ├── features/          # Main application views (Browse, Detail, Compare, Saved Searches, Inbox, Profile, Admin)
│   │   ├── App.jsx            # Main app router & state provider
│   │   └── styles.css         # Responsive styling & Framer Motion keyframes
│   ├── index.html             # HTML entry point with Leaflet & PWA meta tags
│   └── package.json           # React dependencies
└── Project_docs/              # API Route specs & design documentation
```

---

## 🚦 Quick Start Guide

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **Docker Desktop** (for PostgreSQL with PostGIS & Redis)

### 2. Start Database & Redis (Docker)
```bash
# Start PostGIS
docker run -d --name my-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=room_db postgis/postgis

# Start Redis
docker run -d --name my-redis -p 6379:6379 redis
```

### 3. Setup & Run Backend
```bash
cd Backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Run FastAPI development server
uvicorn main:app --reload --port 8000
```
Backend API will be live at: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)

### 4. Setup & Run Frontend
```bash
cd Frontend
npm install
npm run dev
```
Frontend Web App will be live at: `http://localhost:5173`

---

## 📱 Mobile PWA & Production Deployment

### Mobile Testing
To test on a physical mobile device over the same Wi-Fi network:
```bash
npm run dev -- --host
```
Open `http://<YOUR_LOCAL_IP>:5173` on your mobile browser.

### Production Deployment
- **Frontend**: Deploy `Frontend/` to Vercel, Netlify, or Cloudflare Pages.
- **Backend**: Deploy `Backend/` container to Render, Railway, or Azure App Service.

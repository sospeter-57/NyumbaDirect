# NyumbaDirect

A dual-sided rental marketplace connecting Kenyan tenants directly with landlords — bypassing brokers and eliminating blind viewing fees.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Go 1.26, Chi router, SQLite |
| Maps | Leaflet + OpenStreetMap (no API key needed) |
| Payments | Safaricom Daraja API (M-Pesa STK Push) |
| Auth | JWT (HS256, bcrypt passwords) |

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env   # configure M-Pesa credentials (optional)
go mod download
go run ./cmd/server/   # starts on :8080

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # starts on :5173
```

The frontend proxies `/api` and `/uploads` to the backend.

## Project Structure

```
├── backend/
│   ├── cmd/server/          Entry point, router, middleware
│   ├── internal/
│   │   ├── auth/            JWT generation, validation, middleware
│   │   ├── database/        SQLite migrations, queries
│   │   ├── handlers/        HTTP handlers (auth, properties, payments, etc.)
│   │   ├── models/          Go structs matching DB schema
│   │   └── payments/        Daraja M-Pesa STK Push integration
│   ├── uploads/             User-uploaded profile pictures & property media
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      Shared layout (header, footer)
│   │   ├── context/         Auth state (JWT in localStorage)
│   │   ├── hooks/           useGeolocation, useDebounce
│   │   ├── pages/           Login, Register, Explore, PropertyDetail,
│   │   │                    NewListing, Dashboard, Tenant/Landlord Profile,
│   │   │                    Privacy, Terms, FAQ
│   │   ├── types/           TypeScript interfaces
│   │   └── utils/           API client, Haversine distance
│   ├── public/              Static assets, favicon
│   ├── Dockerfile
│   └── nginx.conf           Production reverse-proxy config
├── docs/                    Architecture, user guide, developer guide
├── .github/workflows/       CI/CD pipelines
├── Makefile
└── ARCHITECTURE.md
```

## Key Features

- **Role-based auth** — Tenants and Landlords with JWT sessions
- **Listing wizard** — Multi-step form (details, amenities, repair rates, photos)
- **Map explorer** — Browse properties with Leaflet, filter by type/price
- **Analytics** — Market fairness comparison by radius
- **Payments** — M-Pesa STK Push for listing activation (KES 299) and contact unlock (KES 99)
- **Repair rates** — Itemised deposit deduction matrix per listing
- **Reviews & fraud detection** — Auto-flags listings with 3+ fraud reports
- **Tenancy agreements** — Landlord uploads agreement documents
- **Profile management** — Profile pictures, business names, activity history

## Docker

```bash
docker build -t nyumba-backend ./backend
docker build -t nyumba-frontend ./frontend
# Run backend with volume for uploads
docker run -d -p 8080:8080 -v $(pwd)/backend/uploads:/app/uploads nyumba-backend
# Run frontend linked to backend container
docker run -d -p 80:80 --link <backend-container>:backend nyumba-frontend
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8080` | Backend server port |
| `DB_PATH` | No | `./nyumbadirect.db` | SQLite database path |
| `JWT_SECRET` | No | `change-me-...` | JWT signing key |
| `DARAJA_CONSUMER_KEY` | No | `test-...` | Safaricom API key (mock if starts with `test-`) |
| `DARAJA_CONSUMER_SECRET` | No | `test-...` | Safaricom API secret |
| `DARAJA_PASSKEY` | No | `test-...` | Safaricom online passkey |
| `DARAJA_SHORTCODE` | No | `174379` | Paybill number |
| `DARAJA_ENV` | No | `sandbox` | `sandbox` or `production` |

## License

Built by Sospeter Kinyanjui.

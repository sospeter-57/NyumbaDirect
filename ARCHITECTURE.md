# Architecture Overview

## System Design

NyumbaDirect follows a **two-tier architecture**: a Go REST API backend with an embedded SQLite database, and a React SPA frontend communicating over HTTP. There is no message queue, no cache layer (beyond an in-memory analytics cache), and no microservice split — the entire backend is a single binary.

```
┌─────────────┐      HTTP/JSON       ┌──────────────┐
│  React SPA  │ ◄──────────────────► │  Go Backend  │
│  (Vite)     │    /api/v1/*         │  (Chi)       │
│             │                      │              │
│  Port 5173  │                      │  Port 8080   │
└─────────────┘                      └──────┬───────┘
       │                                    │
       │ /uploads/*                          │ SQLite
       │ (proxied to backend)                │ (WAL mode)
       ▼                                    ▼
┌─────────────┐                      ┌──────────────┐
│  Browser    │                      │  nyumbadirect│
│  (static)   │                      │  .db         │
└─────────────┘                      └──────────────┘
```

## Backend Architecture

### Package Layout

```
cmd/server/         HTTP server setup, routing, middleware stack
internal/
  auth/             JWT token generation, validation, auth middleware, role middleware
  database/         SQLite connection, migration (auto-schema), all CRUD queries
  handlers/         HTTP request handlers grouped by domain
  models/           Go structs matching database schema + request/response types
  payments/         PaymentProvider interface, Daraja (M-Pesa) implementation
uploads/            User-uploaded files served statically
```

### Request Lifecycle

1. Chi router receives request
2. Middleware chain: Logger → Recoverer → RealIP → Timeout → CORS
3. Route matches handler
4. Auth middleware verifies JWT from `Authorization: Bearer <token>` header
5. Optional role middleware restricts to `tenant` or `landlord`
6. Handler parses request body, calls database functions
7. Handler writes JSON response

### Authentication Flow

- **Register**: `POST /auth/register?role=tenant|landlord` — bcrypt hash, insert user, return JWT
- **Login**: `POST /auth/login` — verify password, return JWT
- **JWT**: HS256-signed, 72-hour expiry, contains `user_id`, `phone`, `role`
- **Frontend**: stores token + user in `localStorage`, sends as Bearer header
- **401 handling**: frontend clears storage and redirects to `/login`

### Payment Flow (M-Pesa)

Both payment flows use the same pattern:

1. Frontend POSTs to backend with property ID
2. Backend creates a `subscription` record (PENDING status)
3. Backend calls `DarajaClient.STKPush()` → Safaricom API
4. Frontend polls `GET /subscription/status` every 3 seconds
5. Safaricom sends callback to `/api/v1/payments/mpesa/callback`
6. Backend marks subscription ACTIVE (and property ACTIVE for listing payments)

**Dev mode**: If `DARAJA_CONSUMER_KEY` starts with `test-`, STKPush returns a mock success and the subscription is activated immediately.

## Database

- **SQLite** with WAL journal mode for concurrent reads
- `SetMaxOpenConns(1)` to serialize writes
- Connection string: `?_journal_mode=WAL&_foreign_keys=on&_busy_timeout=5000`
- Migrations run on startup (idempotent `CREATE TABLE IF NOT EXISTS` + graceful `ALTER TABLE ADD COLUMN`)
- Tables: `users`, `properties`, `repair_rates`, `subscriptions`, `contact_unlocks`, `property_reviews`, `property_photos`

## Frontend Architecture

### Component Tree

```
App (BrowserRouter)
├── AuthProvider
│   └── AppRoutes
│       ├── Layout (header + footer)
│       │   ├── ExplorePage
│       │   ├── PropertyDetailPage
│       │   ├── NewListingPage (multi-step wizard)
│       │   ├── DashboardPage
│       │   ├── TenantProfilePage
│       │   └── LandlordProfilePage
│       ├── LoginPage (no Layout)
│       ├── RegisterPage (no Layout)
│       ├── PrivacyPage
│       ├── TermsPage
│       └── FAQPage
```

### State Management

- **Auth state**: React Context (`AuthContext`) — user object + token stored in `localStorage`
- **Page state**: Local `useState` + `useEffect` for data fetching
- **Derived state**: `useMemo` for filtered property lists, distance calculations

### Routing

- `react-router-dom` v7
- `ProtectedRoute` wrapper checks auth + optional role
- Public routes: Explore, PropertyDetail, Login, Register, legal pages
- Landlord-only: Dashboard, NewListing, LandlordProfile
- Tenant-only: TenantProfile

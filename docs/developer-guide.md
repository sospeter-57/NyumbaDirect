# Developer Guide

## Environment Setup

### Prerequisites

- Go 1.26+
- Node.js 22+
- SQLite 3

### Backend

```bash
cd backend
go mod download
cp .env.example .env
go run ./cmd/server/
```

The server starts on `http://localhost:8080`. The database file `nyumbadirect.db` is created automatically with all tables and columns migrated on startup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on `http://localhost:5173` and proxies `/api` and `/uploads` to the backend.

## Available Scripts

| Command | Description |
|---|---|
| `make build` | Build both backend and frontend |
| `make dev` | Run both servers (backend in background) |
| `make clean` | Remove build artifacts |

## Adding a New Feature

### Backend

1. **Add a new model** in `backend/internal/models/models.go`
2. **Add a migration** in `backend/internal/database/db.go` (`migrate()` or `migrateColumns()`)
3. **Add database functions** in the same file for CRUD operations
4. **Create a handler** in `backend/internal/handlers/` following the existing patterns
5. **Wire up the route** in `backend/cmd/server/main.go`
6. If auth is required, use `authMw` middleware; add `landlordMw` or `tenantMw` for role restriction

### Frontend

1. **Update types** in `frontend/src/types/index.ts` if new API fields are added
2. **Add API method** in `frontend/src/utils/api.ts`
3. **Create a page** in `frontend/src/pages/`
4. **Add route** in `frontend/src/App.tsx`
5. **Add nav link** in `frontend/src/components/Layout.tsx` if needed

## Database Migrations

Migrations run automatically on server startup in `d.migrate()` and `d.migrateColumns()`:

- `migrate()` uses a transaction for `CREATE TABLE IF NOT EXISTS` statements
- `migrateColumns()` runs `ALTER TABLE ADD COLUMN` statements individually (errors ignored for idempotency)

To add a new column:

```go
// In migrateColumns()
columns := append(existingColumns, "ALTER TABLE my_table ADD COLUMN new_column TEXT NOT NULL DEFAULT ''")
```

## API Conventions

- All routes under `/api/v1`
- Request/response bodies are JSON
- Errors follow `{"error": "message"}` format
- Auth uses `Authorization: Bearer <token>` header
- Pagination: not implemented (use bounds-based filtering for properties)

## Payment Integration

The payment system implements the `PaymentProvider` interface in `backend/internal/payments/provider.go`:

```go
type PaymentProvider interface {
    STKPush(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error)
    ProcessCallback(payload []byte) (*PaymentStatusResult, error)
}
```

To add a new payment provider:
1. Implement the interface
2. Replace `NewDarajaClient(cfg)` in `main.go` with your provider
3. Ensure your provider handles callbacks appropriately

**Dev mode**: When `DARAJA_CONSUMER_KEY` starts with `test-`, `STKPush()` returns a mock success and subscriptions are immediately activated. No real M-Pesa call is made.

## Testing

Backend: Tests are not yet implemented. Use `curl` to test endpoints:

```bash
# Register a tenant
curl -X POST http://localhost:8080/api/v1/auth/register?role=tenant \
  -H "Content-Type: application/json" \
  -d '{"phone":"+254712345678","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+254712345678","password":"test123"}'
```

## Production Build

```bash
make build
# Output: frontend/dist/ (static files), backend/server (binary)
```

### Docker

```bash
docker build -t nyumba-backend ./backend
docker build -t nyumba-frontend ./frontend
docker run -d -p 8080:8080 -v $(pwd)/backend/uploads:/app/uploads nyumba-backend
docker run -d -p 80:80 --link backend:backend nyumba-frontend
```

The frontend container uses nginx with the included `nginx.conf` which proxies `/api/` and `/uploads/` to the backend container.

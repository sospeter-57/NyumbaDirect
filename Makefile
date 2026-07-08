.PHONY: all backend frontend build dev clean

all: build

backend:
	cd backend && go build ./...

frontend:
	cd frontend && npm install && npm run build

build: backend frontend

dev-backend:
	cd backend && go run ./cmd/server/

dev-frontend:
	cd frontend && npm run dev

dev:
	cd backend && go run ./cmd/server/ & cd frontend && npm run dev

clean:
	rm -rf frontend/dist backend/uploads/profile_pictures/*
	touch backend/uploads/profile_pictures/.gitkeep

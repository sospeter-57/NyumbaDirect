# NyumbaDirect — Frontend

React 19 + TypeScript + Vite frontend for the NyumbaDirect property listing platform.

## Quick Start

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` requests to the Go backend at `http://localhost:8080`.

## Tech Stack

| Layer | |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite |
| Routing | react-router-dom v7 |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet + react-leaflet |
| Linting | Oxlint |

## Project Structure

```
src/
├── main.tsx            Entry point
├── App.tsx             Router + auth guards
├── index.css           Global styles + Tailwind config
├── components/
│   └── Layout.tsx      Shared header/navbar layout
├── context/
│   └── AuthContext.tsx  Auth state (JWT stored in localStorage)
├── hooks/              useDebounce, useGeolocation
├── pages/              Login, Register, Explore, PropertyDetail,
│                       NewListing, Dashboard
├── types/              TypeScript interfaces
└── utils/              API client, distance helpers
```

## Build for Production

```bash
npm run build
```

Output goes to `dist/`.

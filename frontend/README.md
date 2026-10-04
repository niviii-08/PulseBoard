# PulseBoard Frontend

React + Vite + TypeScript frontend for PulseBoard, an AI-powered social
media trend & brand intelligence platform. See the root
[`README.md`](../README.md) and [`docs/architecture.md`](../docs/architecture.md)
for the full product/architecture write-up and what's real vs. a
documented gap.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v3 · shadcn/ui (hand-written,
Radix-based) · React Router v7 · TanStack Query v5 · Zustand · Recharts

## Getting started

```bash
npm install
cp .env.example .env    # only needed once a real backend is running
npm run dev              # http://localhost:5173
```

The app runs entirely on mock data out of the box (`USE_MOCK_DATA = true`
in `src/lib/api/client.ts`) -- no backend required to explore every page.

## Scripts

```bash
npm run dev        # start the dev server
npm run build       # type-check (tsc -b) + production build
npm run preview      # serve the production build locally
npm run test          # run the Vitest suite once
npm run test:watch     # run Vitest in watch mode
npm run lint             # oxlint static analysis
```

## Project structure

```
src/
├── components/
│   ├── ui/          shadcn-style primitives (Button, Card, Dialog, ...)
│   ├── shared/       Reusable domain components (StatusBadge, MetricCard, ...)
│   ├── trends/        Trend/brand-specific components (TrendListCard, SentimentChart, RiskDriversList, badges)
│   └── layout/        AppShell, Sidebar, Topbar, AuthLayout, ProtectedRoute
├── pages/            One file per route
├── routes/            React Router configuration
├── hooks/
│   ├── queries/        TanStack Query hooks (mock/real toggle per hook)
│   └── useWebSocket.ts   Real-time connection management
├── store/              Zustand stores (auth, WebSocket connection)
├── lib/
│   ├── api/               client.ts (axios + USE_MOCK_DATA), mockData.ts
│   ├── formatters.ts        Shared date/number formatting
│   └── utils.ts               cn() class-merging helper
├── types/domain.ts           TypeScript types mirroring the backend's
│                              Pydantic schemas
└── test/                     Vitest smoke tests (real rendering, real
                               mock data, no headless-browser dependency)
```

## Switching from mock data to the real backend

Flip `USE_MOCK_DATA` to `false` in `src/lib/api/client.ts`. Every hook in
`src/hooks/queries/` already has an identical-shape real branch sitting
next to its mock branch -- no other code changes needed. Set
`VITE_API_BASE_URL` and `VITE_WS_URL` in `.env` to point at a running
instance of the backend.

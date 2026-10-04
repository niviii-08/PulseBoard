# PulseBoard — Social Media Trend & Brand Intelligence

An AI-powered social listening platform that detects emerging trends,
explains *why* they're trending, tracks sentiment shifts, maps how
trends propagate across platforms, and gives brands an early warning
before a complaint spiral becomes a crisis.

**The core product story: TREND → WHY → SENTIMENT → PROPAGATION → RISK.**

PulseBoard started as an uptime-monitoring tool; this is a full pivot
to a social intelligence platform, reusing the original auth, database,
Celery/Redis, and React/Vite infrastructure while replacing the product
itself end to end.

## Contents

- [Problem & solution](#problem--solution)
- [The five capabilities](#the-five-capabilities)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Data sources](#data-sources)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [What's real vs. what's a demo](#whats-real-vs-whats-a-demo)
- [Remaining limitations](#remaining-limitations)

## Problem & solution

Brands struggle to understand rapidly changing online conversation:
by the time a complaint pattern is obvious to a human watching a
dashboard, it's often already a story on three platforms. PulseBoard
continuously ingests public social/web signals, clusters them into
topics, scores momentum, tracks sentiment over time, reconstructs how a
topic spread across platforms, and scores brand risk with an explicit,
auditable breakdown of *why* — not just a number.

## The five capabilities

| Capability | Engine | Status |
|---|---|---|
| 🔥 Emerging trend detection | `app/services/trend_engine.py` — weighted momentum score (growth, acceleration, recency, engagement, cross-platform spread, sentiment movement), not raw mention count | ✅ Working, tested |
| 🧠 "Why is this trending?" | `app/services/explanation_engine.py` — deterministic template engine by default; optional real LLM call if `ANTHROPIC_API_KEY` is set, grounded in the same structured evidence either way | ✅ Working, tested |
| 📊 Sentiment shift detection | `app/services/sentiment_engine.py` — VADER-based per-post scoring + shift detection across bucketed snapshots | ✅ Working, tested |
| 🌐 Cross-platform propagation | `app/services/propagation_engine.py` — derived from real first-seen timestamps per platform; explicitly refuses to invent a path when there's insufficient data | ✅ Working, tested |
| 🎯 Brand crisis risk score | `app/services/risk_engine.py` — 0–100 score built from six named, capped drivers that sum to the total, so the score is explainable, not a black box | ✅ Working, tested |

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full data
pipeline diagram, data model, and an honest "what's real vs. what's a
documented gap" section.

## Tech stack

**Backend:** FastAPI, SQLAlchemy (async) + Alembic, PostgreSQL, Celery +
Redis, VADER (sentiment), feedparser (RSS), httpx.
**Frontend:** React 19, Vite, TypeScript, TanStack Query, Zustand,
Tailwind, shadcn/ui primitives, Recharts.
**Auth/infra:** JWT with refresh-token rotation, WebSocket real-time
relay over Redis pub/sub — all reused from the platform's original
uptime-monitoring incarnation.

## Data sources

| Source | Status | Notes |
|---|---|---|
| Demo | Working | Scripted causal scenarios (not independent random numbers) — see `app/collectors/demo.py` |
| News (RSS) | Working, real | Google News RSS by default, no API key required; SSRF-guarded fetch. Implemented correctly but not exercisable in the sandboxed environment this was built in (no general internet egress there) — verify against a live feed once deployed |
| Reddit | Honest stub | Reports `not_configured` until `REDDIT_CLIENT_ID`/`SECRET` are set; OAuth2 flow not implemented |
| YouTube | Honest stub | Reports `not_configured` until `YOUTUBE_API_KEY` is set; API calls not implemented |
| X / Twitter | Intentionally optional | No official free API tier exists; marked `optional` rather than built as an unreliable/ToS-violating scraper |

`GET /api/v1/sources` always reflects this table live — nothing here is
ever reported as active when it isn't.

## Running locally

### Docker (recommended)

```bash
cp .env.example .env
# generate a real secret: python -c "import secrets; print(secrets.token_urlsafe(48))"
# paste it into JWT_SECRET_KEY in .env
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000 (docs at `/docs`)

### Without Docker

```bash
# infra only
docker compose up -d postgres redis

# backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env   # adjust DATABASE_URL/REDIS_URL if not using the compose infra above
alembic upgrade head
python -m scripts.seed_demo_data      # seeds a dev user + the demo dataset, runs the full engine pipeline
uvicorn app.main:app --reload

# Celery (separate terminals, optional -- only needed for scheduled live collection)
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info

# frontend
cd ../frontend
npm install
npm run dev
```

Dev login after seeding: `admin@pulseboard.dev` / `DevPassword123!`

To refresh or reload the demo dataset at any time (instead of
re-running the seed script), authenticate and call:

```
POST /api/v1/collectors/run?source=demo
```

## Environment variables

Full list with defaults in [`.env.example`](backend/.env.example).
Required: `DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`,
`JWT_SECRET_KEY`. Everything under "Social intelligence" in that file
is optional -- the product works fully without any of it, using the
demo collector and the deterministic explanation engine.

## Testing

```bash
# backend (160 tests: 5 pure-function engine test files + auth/security/websocket/etc.)
cd backend && pytest

# frontend (18 tests: component + full-page render smoke tests against mock data)
cd frontend && npx vitest run
```

Both suites were run against a real PostgreSQL + Redis instance (not
just imported/inspected) as part of building this, including an
end-to-end pass: migrate, seed demo data, start the server, curl every
major endpoint, and confirm real, evidence-grounded responses.

## What's real vs. what's a demo

Per the project's own "no fake implementation" rule: every major
feature is `Data -> Processing -> Database -> API -> UI`, nothing is a
UI-only mock reading static JSON, and demo/simulated data is flagged
(`source_is_demo`) and badged in the UI everywhere it's shown. See
[`docs/architecture.md`](docs/architecture.md#whats-real-vs-whats-a-documented-gap)
for the specific list of what's fully real vs. an honest stub vs. a
documented gap.

## Remaining limitations

Stated plainly, not glossed over:

- **Topic clustering is keyword-overlap based**, not embeddings/BERTopic
  -- a deliberate simplicity choice (see
  `app/services/keyword_extraction.py`), not a shortcut taken silently.
- **Reddit and YouTube collectors are unimplemented stubs** that report
  their status honestly rather than faking data; wiring up their real
  API calls is bounded, well-understood follow-up work.
- **The News/RSS collector's live fetch path is implemented but
  unverified against a real feed** -- the sandbox this was built in had
  no general internet egress. Verify it once deployed.
- **No outbound alert delivery** (email/webhook) yet -- the Alert model
  and in-app list work; the previous product's email-sending scaffolding
  (`app/services/email_sender.py`) hasn't been wired to it.
- **Per-topic API/database/deployment/security reference docs** were
  replaced with a single architecture doc rather than five fully
  rewritten ones, to avoid shipping documentation that looks
  authoritative but is subtly wrong.
- **The frontend was validated against mock data (18/18 tests, clean
  `tsc`, successful `vite build`) and the backend was validated
  end-to-end against a live server independently** -- the two were not
  run together live in this session. The API contracts match exactly
  (same field names/shapes verified via curl against the real backend),
  but a live frontend+backend pairing hasn't been clicked through by a
  human yet.
#   P u l s e B o a r d  
 
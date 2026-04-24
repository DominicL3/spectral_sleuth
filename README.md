# Spectral Sleuth

An imaging-spectroscopy training app. Students learn to identify materials from
their reflectance signatures (380–2500 nm) across three question modes:
multiple choice, category identification, and feature spotting.

- **Backend:** FastAPI (Python 3.14)
- **Frontend:** Vite + React + TypeScript + uPlot + Tailwind
- **Data:** 35 curated spectra from USGS splib07 and ECOSTRESS, covering
  minerals, vegetation, soils, water, and manmade surfaces.

## Prerequisites

- Python 3.14 (`uv` recommended)
- Node.js 20+

## Setup

```bash
# From the repo root
uv sync                          # backend deps into .venv
cd frontend && npm install       # frontend deps

# Environment
cp backend/.env.example backend/.env     # then edit SECRET_KEY
cp frontend/.env.local.example frontend/.env.local
```

## Run (two terminals)

```bash
# Terminal 1 — backend on :8000
cd backend
uv run --project .. uvicorn main:app --port 8000

# Terminal 2 — frontend on :3000
cd frontend
npm run dev
```

Open http://localhost:3000.

## Tests

```bash
# Backend (from repo root)
uv run pytest
uv run ruff check backend/
uv run ruff format --check backend/

# Frontend
cd frontend && npx tsc --noEmit && npm run build
```

## Layout

```
backend/
  main.py               FastAPI app + routes
  quiz/
    schemas.py          Pydantic models (public API boundary)
    library.py          Loads data/spectra.json
    tokens.py           HMAC-signed question tokens (10 min TTL)
    engine.py           Weighted-random mode + spectrum picker
    modes/              multiple_choice, category_id, feature_spotting
  tests/                pytest suites (tokens, modes, endpoints, library)
  data/spectra.json     curated library (checked in)
frontend/
  src/lib/              types.ts + quizClient.ts (API contract mirror)
  src/pages/            Landing, Quiz, Results
  src/components/       SpectrumChart, QuestionPanel, HintOverlay, etc.
contract/api.md         Frozen API contract
```

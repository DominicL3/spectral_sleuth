# Imaging Spectroscopy Quiz App — Project Plan

## Overview

An interactive web-based quiz that teaches users to recognize and interpret
reflectance spectra from a curated library of ~50–100 representative materials
(minerals, vegetation, soils, water, snow, manmade surfaces). Users are shown
a spectrum and must identify it through one of three question modes that rotate
randomly. The app runs indefinitely — there is no fixed end, just a running
score.

---

## Tech Stack

| Layer      | Technology                        | Rationale                                                   |
|------------|-----------------------------------|-------------------------------------------------------------|
| Frontend   | Vite + React + TypeScript         | Minimal build tooling, no framework lock-in, fast HMR       |
| Styling    | Tailwind CSS (PostCSS plugin)     | Utility-first, consistent design tokens                     |
| Charting   | uPlot + SVG overlay               | ~40 KB, purpose-built for dense signal data; native crosshair snap and pan/zoom. Thin SVG layer on top for hint annotations, atmospheric gap shading, and feature-click targets. |
| Backend    | Python 3.11 + FastAPI             | Async performance, native numpy/scipy, Pydantic validation  |
| Data       | numpy, scipy, pandas              | Spectral processing, continuum removal, feature detection   |
| Hosting    | Frontend → Render (static site, free), Backend → Render (free web service, spins down after inactivity) | |
| Spectra    | Curated static JSON library (~50–100 spectra) | Subset from USGS splib07 (ASD, 350–2500 nm, 1 nm sampling) |

---

## Spectral Domain

- **Range:** 350–2500 nm (VSWIR only for v1)
- **Sampling:** 1 nm (2151 data points per spectrum), consistent with USGS splib07 ASD convolution
- **Units:** Reflectance (0.0–1.0)
- **Atmospheric gap masking:** Grey out ~1350–1450 nm and ~1800–1950 nm on all charts
  (these are atmospheric water vapor absorption windows where real sensors lose signal)
- **Future extension point:** TIR mode (2.5–15.4 µm, emissivity units) can be added as
  a separate quiz mode without rearchitecting — keep spectral range as a first-class
  parameter in the data model

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               Frontend (Vite + React)                │
│                                                      │
│  src/                                                │
│  ├── main.tsx           (entry point)                │
│  ├── App.tsx            (router + layout)            │
│  ├── pages/                                          │
│  │   ├── Landing.tsx    (landing / mode select)      │
│  │   ├── Quiz.tsx       (main quiz loop)             │
│  │   └── Results.tsx    (session summary)            │
│  ├── components/                                     │
│  │   ├── SpectrumChart.tsx  (uPlot + SVG overlay)    │
│  │   ├── QuestionPanel.tsx  (renders per-mode UI)    │
│  │   │   ├── MultipleChoiceUI.tsx                    │
│  │   │   ├── CategoryIDUI.tsx                        │
│  │   │   └── FeatureSpottingUI.tsx                   │
│  │   ├── HintOverlay.tsx                             │
│  │   ├── ExplanationPanel.tsx                        │
│  │   └── ScoreTracker.tsx                            │
│  └── lib/                                            │
│      ├── quizClient.ts  (API call wrappers)          │
│      └── types.ts       (shared TypeScript types)    │
└───────────────────┬──────────────────────────────────┘
                    │ REST / JSON (direct fetch; CORS
                    │ headers on FastAPI)
┌───────────────────▼──────────────────────────────────┐
│               Backend (FastAPI / Python)              │
│                                                      │
│  GET  /spectra              → library index          │
│  GET  /spectra/{id}         → full spectrum + meta   │
│  POST /question             → generated question     │
│  POST /evaluate             → answer + explanation   │
│  GET  /health               → liveness check         │
│                                                      │
│  quiz/                                               │
│  ├── modes/                                          │
│  │   ├── base.py            (QuestionMode ABC)       │
│  │   ├── multiple_choice.py                          │
│  │   ├── category_id.py                              │
│  │   └── feature_spotting.py                         │
│  ├── engine.py              (mode selection)         │
│  ├── library.py             (spectra loader)         │
│  └── tokens.py              (HMAC sign/verify)       │
│                                                      │
│  data/                                               │
│  └── spectra/               (curated JSON files)     │
└──────────────────────────────────────────────────────┘
```

---

## Data Model

### Spectrum JSON Schema

Each spectrum in the curated library is a single JSON file. Both raw reflectance
and continuum-removed reflectance are precomputed offline and stored together,
so toggling between views on the frontend is a trivial array swap with no
round-trip and no client-side computation.

```json
{
  "id": "kaolinite_kga1b",
  "name": "Kaolinite KGa-1b",
  "category": "mineral",
  "subcategory": "phyllosilicate",
  "display_name": "Kaolinite",
  "source_library": "USGS splib07",
  "source_id": "kaolinite1_kga1b.txt",
  "wavelengths_nm": [350, 351, 352, "..."],
  "reflectance": [0.312, 0.315, 0.317, "..."],
  "reflectance_cr": [1.000, 1.001, 0.998, "..."],
  "diagnostic_features": [
    {
      "wavelength_nm": 2200,
      "label": "Al-OH absorption",
      "description": "Strong doublet at 2200 nm diagnostic for Al-bearing phyllosilicates"
    },
    {
      "wavelength_nm": 1400,
      "label": "OH stretch",
      "description": "Structural OH overtone, common in hydroxyl-bearing minerals"
    }
  ],
  "explanation": "Kaolinite is an Al-Si clay mineral with a distinctive Al-OH doublet near 2200 nm. The ~1400 nm feature is structural OH. Absence of features below 1000 nm (unlike iron-bearing clays) is diagnostic.",
  "aliases": ["kaolin", "china clay"],
  "tags": ["clay", "alteration", "weathering"]
}
```

### Field Definitions

| Field                | Type             | Description                                              |
|----------------------|------------------|----------------------------------------------------------|
| `id`                 | string           | Unique identifier (slug)                                 |
| `name`               | string           | Full scientific name                                     |
| `category`           | enum             | `mineral`, `vegetation`, `soil`, `water`, `snow`, `manmade` |
| `subcategory`        | string           | Finer grouping (e.g., `phyllosilicate`, `carbonate`)    |
| `display_name`       | string           | Short name shown during quiz (may be withheld)          |
| `wavelengths_nm`     | float[]          | 350–2500, 1 nm steps (2151 values)                      |
| `reflectance`        | float[]          | 0.0–1.0, same length as wavelengths                     |
| `reflectance_cr`     | float[]          | Continuum-removed reflectance, precomputed offline       |
| `diagnostic_features`| object[]         | Key absorption features for hints                       |
| `explanation`        | string           | Post-answer educational text                            |
| `aliases`            | string[]         | Alternative accepted names (for future free-label mode) |
| `tags`               | string[]         | For future filtering / themed quiz sets                 |

---

## Curated Spectra Library (~80 targets)

### Vegetation (15)
- Green vegetation (grass, broadleaf, conifer, crop canopy)
- Senescent/dry vegetation (dry grass, corn stover, wheat straw)
- Non-photosynthetic vegetation (bark, litter, deadwood)
- Aquatic vegetation (macroalgae, seagrass)
- Lichen / moss

### Soils (12)
- Red clay (hematite-bearing)
- Organic-rich topsoil
- Sandy soil (quartz-dominated)
- Caliche (carbonate crust)
- Volcanic soil

### Minerals — Phyllosilicates (10)
- Kaolinite, montmorillonite, illite, muscovite, chlorite
- Vermiculite, talc, serpentine

### Minerals — Carbonates (6)
- Calcite, dolomite, magnesite, siderite

### Minerals — Iron Oxides / Hydroxides (8)
- Hematite, goethite, lepidocrocite, jarosite, ferrihydrite

### Minerals — Sulfates (5)
- Gypsum, alunite, jarosite (also Fe), anhydrite

### Minerals — Other (8)
- Quartz, feldspar (orthoclase, albite), olivine, pyroxene, amphibole

### Water / Ice (6)
- Clear deep water, turbid water, shallow water over sand
- Fresh snow, firn/old snow, ice

### Manmade (10)
- Asphalt (fresh, aged), concrete, red roof tile
- Green paint, white paint, gravel, bare soil/compacted
- (Useful as distractors and real-world relevance)

---

## Backend — Stateless Question Tokens

Rather than storing active questions in an in-memory dict (which breaks on Render
cold starts and has undefined lifetime), questions are encoded as signed tokens.

### How It Works

1. **`POST /question`** generates a question, then serializes the answer and
   evaluation metadata (mode, correct answer, tolerances, expiry) into a JSON
   payload and signs it with HMAC-SHA256 using a server secret.
2. The signed token is base64url-encoded and returned as `question_id`.
3. **`POST /evaluate`** decodes and verifies the token signature, checks expiry,
   then grades the user's response — no server-side lookup needed.

The server secret is set via `SECRET_KEY` in the backend's `.env`. Token TTL is
10 minutes, enforced by an `exp` claim embedded in the payload.

### `quiz/tokens.py`

```python
import hmac, hashlib, base64, json, time, os

SECRET = os.environ["SECRET_KEY"].encode()
TTL = 600  # seconds

def sign(payload: dict) -> str:
    payload["exp"] = int(time.time()) + TTL
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hmac.new(SECRET, body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"

def verify(token: str) -> dict:
    try:
        body, sig = token.rsplit(".", 1)
    except ValueError:
        raise ValueError("Malformed token")
    expected = hmac.new(SECRET, body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise ValueError("Invalid signature")
    payload = json.loads(base64.urlsafe_b64decode(body))
    if payload["exp"] < int(time.time()):
        raise ValueError("Token expired")
    return payload
```

---

## Backend — Quiz Mode Classes

### Abstract Base Class

```python
# quiz/modes/base.py
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any

class QuestionResponse(BaseModel):
    """Sent to the frontend — never includes correct_answer directly."""
    question_id: str          # signed HMAC token (embeds answer + metadata)
    mode: str
    spectrum_id: str
    prompt: str
    payload: dict[str, Any]   # mode-specific UI data

class Result(BaseModel):
    correct: bool
    correct_answer: str
    score_delta: int
    explanation: str
    diagnostic_features: list[dict]

class QuestionMode(ABC):
    mode_id: str
    weight: float   # probability weight for random selection

    @abstractmethod
    def generate(self, spectrum: dict, library: list[dict]) -> QuestionResponse:
        """Given a spectrum and the full library, produce a QuestionResponse."""
        ...

    @abstractmethod
    def evaluate(self, user_answer: str, token_payload: dict) -> Result:
        """Grade the user's answer using the decoded token payload."""
        ...
```

### Mode Implementations (Skeletons)

```python
# quiz/modes/multiple_choice.py
class MultipleChoiceMode(QuestionMode):
    mode_id = "multiple_choice"
    weight = 0.40
    num_choices = 4

    def generate(self, spectrum, library):
        # Pick 3 distractors from same category, different subcategory
        # Token payload: { mode, correct_answer, spectrum_id }
        # Return payload: { choices: [str x 4] }
        ...

    def evaluate(self, user_answer, token_payload):
        # Exact string match against token_payload["correct_answer"]
        ...


# quiz/modes/category_id.py
class CategoryIDMode(QuestionMode):
    mode_id = "category_id"
    weight = 0.35
    categories = ["mineral", "vegetation", "soil", "water", "snow", "manmade"]

    def generate(self, spectrum, library):
        # Token payload: { mode, correct_answer, spectrum_id }
        # Return payload: { categories: [str x 6] }
        ...

    def evaluate(self, user_answer, token_payload):
        # Exact string match
        ...


# quiz/modes/feature_spotting.py
class FeatureSpottingMode(QuestionMode):
    mode_id = "feature_spotting"
    weight = 0.25

    def generate(self, spectrum, library):
        # Pick one diagnostic_feature from spectrum
        # Token payload: { mode, correct_answer (wavelength), tolerance_partial, tolerance_full }
        # Return payload: { feature_label: str }
        ...

    def evaluate(self, user_answer, token_payload):
        # user_answer is a wavelength (float as string)
        # Correct if within tolerance_partial; bonus points if within tolerance_full
        ...
```

### Quiz Engine

```python
# quiz/engine.py
import random
from .modes.base import QuestionMode

class QuizEngine:
    def __init__(self, modes: list[QuestionMode], library: list[dict]):
        self.modes = modes
        self.library = library

    def next_question(self, session_history: list[str] = []):
        # Weighted random mode selection
        weights = [m.weight for m in self.modes]
        mode = random.choices(self.modes, weights=weights)[0]

        # Pick spectrum, avoiding recent repeats
        spectrum = self._pick_spectrum(session_history)
        return mode.generate(spectrum, self.library)

    def _pick_spectrum(self, session_history: list[str]):
        # Exclude last N seen (N=10 or full library size if small)
        # Sample uniformly from remaining candidates
        ...
```

### Library Loading

`quiz/library.py` loads `backend/data/spectra.json` once on startup and caches it
in memory. The file is a JSON array of spectrum objects; the loader parses it and
returns `list[dict]` to `QuizEngine`. Since the file is ~2–3 MB and all 80 spectra
fit comfortably in RAM, there is no streaming or pagination needed.

---

## Frontend — SpectrumChart Component

The chart is built with **uPlot** for the spectrum line and a **transparent SVG
overlay** positioned absolutely on top for annotations. uPlot owns the canvas
(rendering and interaction); the SVG layer owns hints, gap shading, region labels,
and the feature-click target. Keep them strictly separated — never draw spectrum
data in the SVG, never draw annotations in uPlot.

### Required Features

**Core rendering**
- Line chart: x = wavelength (nm), y = reflectance (0–1)
- Rendered to a `<canvas>` element by uPlot; fills its container responsively
- Smooth interpolated line (uPlot's default spline is fine)

**Navigation**
- Pan and zoom via uPlot's built-in wheel/drag behaviour
- Reset zoom button (calls `uplot.setScale` to restore original x/y range)
- Preset zoom buttons: "Full (350–2500)", "VNIR (350–1000)", "SWIR-1 (1000–1800)", "SWIR-2 (1800–2500)"

**Crosshair + value readout**
- uPlot's native cursor crosshair handles the vertical tracking line
- On cursor move, read `uplot.cursor.idx` to get the nearest 1 nm sample index — O(1), no math needed
- Corner tooltip showing: `λ = 1234 nm   R = 0.412`
- Tooltip rendered in React state, positioned in a fixed corner (not following the cursor)

**Atmospheric gap shading** (SVG overlay)
- Semi-transparent grey `<rect>` over 1350–1450 nm
- Semi-transparent grey `<rect>` over 1800–1950 nm
- `<text>` label "H₂O" centered in each region
- Rects are repositioned whenever the uPlot x-scale changes (zoom/pan)

**Region labels** (SVG overlay, subtle, x-axis aligned)
- `<text>` elements: "VNIR" over 350–1000 nm, "SWIR-1" over 1000–1800 nm, "SWIR-2" over 1800–2500 nm
- Reposition on scale change, same as gap rects

**Hint overlay** (SVG overlay, toggled by HintMode or user hint request)
- Vertical dashed `<line>` at each `diagnostic_feature.wavelength_nm`
- Small `<text>` label tag above the line
- CSS `opacity` transition for animated fade-in when revealed
- Separate toggle: show/hide all hints

**Continuum removal toggle**
- Button: "Continuum Removed" / "Raw Reflectance"
- Switching modes calls `u.setData()` with `reflectance_cr` or `reflectance` from the
  already-loaded spectrum JSON — no computation, no round-trip
- y-axis label updates via uPlot options

**Feature spotting interaction** (active only in FeatureSpottingMode)
- SVG overlay intercepts click events; records wavelength by inverting uPlot's x-scale
- Renders a draggable vertical `<line>` marker in the SVG
- Submit button confirms selection

### Component Interface (TypeScript)

```typescript
interface SpectrumChartProps {
  wavelengths: number[];        // 350–2500, 1 nm steps
  reflectance: number[];        // 0.0–1.0
  reflectanceCR: number[];      // continuum-removed, precomputed
  diagnosticFeatures?: DiagnosticFeature[];
  showHints?: boolean;
  continuumRemoved?: boolean;
  mode?: QuizMode;              // drives interaction behavior
  atmosphericGaps?: [number, number][];  // default: [[1350,1450],[1800,1950]]
  onFeatureClick?: (wavelength_nm: number) => void;
}

interface DiagnosticFeature {
  wavelength_nm: number;
  label: string;
  description: string;
}
```

---

## Frontend — Quiz Flow

```
Landing page
  └── "Start Quiz" → Quiz.tsx

Quiz loop (infinite):
  1. POST /question  → { question_id, mode, spectrum_id, prompt, payload }
  2. GET /spectra/{id} → spectrum data (wavelengths + reflectance + reflectance_cr)
  3. Render SpectrumChart + QuestionPanel for mode
  4. User can request up to 1 hint (costs -5 pts from score_delta)
  5. User submits answer
  6. POST /evaluate → { correct, correct_answer, score_delta, explanation }
  7. Show ExplanationPanel with:
      - Correct/incorrect banner
      - Correct answer label
      - Explanation text
      - Hint overlay auto-revealed (diagnostic features annotated)
      - Score update
  8. "Next Question" → back to step 1
```

### Scoring

| Event                         | Points      |
|-------------------------------|-------------|
| Correct answer, no hint       | +10         |
| Correct answer, hint used     | +5          |
| Wrong answer                  | 0           |
| FeatureSpotting within 15 nm  | Bonus +3    |

---

## API Endpoints

### `POST /question`

Request:
```json
{
  "session_history": ["kaolinite_kga1b", "green_veg_grass"]
}
```

Response:
```json
{
  "question_id": "<hmac-signed-token>",
  "mode": "multiple_choice",
  "spectrum_id": "hematite_fe203",
  "prompt": "What material is this spectrum?",
  "payload": {
    "choices": ["Hematite", "Goethite", "Jarosite", "Ferrihydrite"]
  }
}
```

`question_id` is an HMAC-signed token that embeds the correct answer and all
evaluation metadata. It is opaque to the frontend.

### `POST /evaluate`

Request:
```json
{
  "question_id": "<hmac-signed-token>",
  "user_answer": "Goethite"
}
```

Response:
```json
{
  "correct": false,
  "correct_answer": "Hematite",
  "score_delta": 0,
  "explanation": "Hematite (Fe₂O₃) shows strong absorption below 750 nm from charge transfer transitions, giving it a deep red color. Unlike goethite, it lacks the ~900 nm OH feature...",
  "diagnostic_features": [
    { "wavelength_nm": 530, "label": "Fe³⁺ charge transfer", "description": "..." },
    { "wavelength_nm": 860, "label": "Crystal field transition", "description": "..." }
  ]
}
```

### `GET /health`

Returns `{"status": "ok"}`. Used by the frontend to wake the Render backend on
page load.

---

## Directory Structure

```
spectroquiz/
├── frontend/                    # Vite + React app
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Router + top-level layout
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Quiz.tsx
│   │   │   └── Results.tsx
│   │   ├── components/
│   │   │   ├── SpectrumChart.tsx
│   │   │   ├── QuestionPanel.tsx
│   │   │   ├── modes/
│   │   │   │   ├── MultipleChoiceUI.tsx
│   │   │   │   ├── CategoryIDUI.tsx
│   │   │   │   └── FeatureSpottingUI.tsx
│   │   │   ├── HintOverlay.tsx
│   │   │   ├── ExplanationPanel.tsx
│   │   │   └── ScoreTracker.tsx
│   │   └── lib/
│   │       ├── quizClient.ts
│   │       └── types.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── .node-version
│   └── package.json
│
├── backend/                     # FastAPI app
│   ├── main.py                  # App entry, route registration
│   ├── quiz/
│   │   ├── modes/
│   │   │   ├── base.py
│   │   │   ├── multiple_choice.py
│   │   │   ├── category_id.py
│   │   │   └── feature_spotting.py
│   │   ├── engine.py
│   │   ├── library.py
│   │   └── tokens.py            # HMAC sign/verify
│   ├── data/
│   │   └── spectra.json         # Single JSON file: ~80 curated spectra (committed)
│   └── pyproject.toml
│
├── data/                        # Raw USGS archive — gitignored, local only
│   ├── ASCIIdata_splib07b/      # Downloaded from USGS ScienceBase (~5 GB)
│   └── ingest_usgs.py           # Preprocessing script (see Data Sourcing below)
│
├── .gitignore
└── README.md
```

---

## Data Sourcing

The raw USGS Spectral Library Version 7 (`ASCIIdata_splib07b`) has been downloaded
locally to `data/ASCIIdata_splib07b/`. This directory is **gitignored** — it is
~5 GB and must not be committed.

The preprocessing workflow is:

1. **Raw data** lives at `data/ASCIIdata_splib07b/` (local only, not version-controlled).
   Download from: https://www.sciencebase.gov/catalog/item/5807a2a2e4b0841e59e3a18d
2. **`data/ingest_usgs.py`** (to be implemented) reads the raw ASCII files, selects
   the ~80 target spectra by name, computes `reflectance_cr` (convex hull continuum
   removal), and outputs a single JSON array to `backend/data/spectra.json`.
3. **`backend/data/spectra.json`** (~2–3 MB) **is committed** to version control.
   This is a single JSON array of spectrum objects that the app loads on startup:
   ```json
   [
     { "id": "kaolinite_kga1b", "name": "...", "wavelengths_nm": [...], "reflectance": [...], "reflectance_cr": [...], ... },
     { "id": "hematite_fe203", ... },
     ...
   ]
   ```
   The backend loads this file once into memory at startup; all 80 spectra fit in ~2–3 MB.

The USGS ASCII format stores wavelengths in a shared file separate from per-spectrum
reflectance files — `ingest_usgs.py` must handle this path structure. The data is
public domain (Kokaly et al. 2017, USGS Data Series 1035) and freely redistributable.

---

## Development Environment

### Philosophy

Two runtimes, two package managers, kept cleanly separate:

| Runtime | Version manager | Package manager |
|---------|----------------|-----------------|
| Python  | `uv` (built-in) | `uv` |
| Node.js | `fnm`           | `npm` |

`uv` handles everything Python — it is simultaneously the Python version manager,
virtualenv manager, and package installer. You do not need `pip`, `venv`, or `pyenv`.

`fnm` (Fast Node Manager) is the Node equivalent of `uv`: written in Rust, installs
in seconds, and lets you pin a Node version per-project via a `.node-version` file.
Once `fnm` has installed Node, `npm` comes along for free.

---

### Prerequisites — Install Once

**macOS (Homebrew):**
```bash
# uv — Python version manager + package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# fnm — Node version manager
brew install fnm

# Add fnm to your shell (add to ~/.zshrc or ~/.bashrc):
eval "$(fnm env --use-on-cd)"
```

**Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -fsSL https://fnm.vercel.app/install | bash
# Add to ~/.bashrc or ~/.zshrc:
eval "$(fnm env --use-on-cd)"
```

**Windows (PowerShell):**
```powershell
# uv
powershell -ExecutionPolicy Bypass -c "irm https://astral.sh/uv/install.ps1 | iex"
# fnm
winget install Schniz.fnm
# Add to your PowerShell profile:
fnm env --use-on-cd | Out-String | Invoke-Expression
```

After installing, open a new terminal and verify:
```bash
uv --version      # e.g. uv 0.4.x
fnm --version     # e.g. fnm 1.x.x
```

---

### Backend Setup (Python / FastAPI)

```bash
cd spectroquiz/backend

# uv reads .python-version and creates a local virtualenv automatically.
# This installs Python 3.11 if you don't already have it.
uv python pin 3.11
uv sync
```

`uv sync` reads `pyproject.toml`, creates `.venv/` inside `backend/`, and installs
all dependencies. You never activate the virtualenv manually — all `uv run` commands
use it implicitly.

**`backend/pyproject.toml`:**
```toml
[project]
name = "spectroquiz-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.29",
    "pydantic>=2.7",
    "numpy>=1.26",
    "scipy>=1.13",
    "pandas>=2.2",
    "python-dotenv>=1.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.2",
    "httpx>=0.27",     # for FastAPI test client
    "ruff>=0.4",       # linter + formatter
]
```

**Run the dev server:**
```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

**Run tests:**
```bash
cd backend
uv run pytest
```

**Add a dependency:**
```bash
uv add httpx                  # runtime dep
uv add --dev pytest-asyncio   # dev-only dep
```

---

### Frontend Setup (Vite + React)

```bash
cd spectroquiz/frontend

# Install the Node version pinned for this project
fnm use       # reads .node-version, installs if missing

# Install all npm packages
npm install
```

**`frontend/.node-version`:**
```
20
```

**Scaffold from scratch (first time only):**
```bash
npm create vite@latest . -- --template react-ts
npm install uplot
npm install --save-dev @types/uplot tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**`frontend/package.json` (key dependencies):**
```json
{
  "name": "spectroquiz-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "uplot": "^1"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/node": "^20",
    "@types/uplot": "^1",
    "@vitejs/plugin-react": "^4",
    "vite": "^5",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

**Run the dev server:**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

**Add a package:**
```bash
npm install <package-name>
npm install --save-dev <package-name>
```

---

### Wiring Frontend → Backend (CORS)

During development, the frontend runs on `:3000` and the backend on `:8000`.
On Render, they are separate services on different origins. The solution is
CORS headers on FastAPI — no proxy needed.

**`backend/main.py`** — add middleware:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://spectroquiz.onrender.com",   # update to your actual Render URL
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

Frontend calls use an env var for the base URL:
```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
```

Note: Vite uses `import.meta.env.VITE_*` for environment variables, not
`process.env.NEXT_PUBLIC_*`.

**`frontend/.env.local`** (local dev, never commit):
```bash
VITE_API_URL=http://localhost:8000
```

Set `VITE_API_URL` to your Render backend URL in the Render dashboard under
Environment → Environment Variables for the static site service.

---

### Running Both Services

Open two terminal tabs:

```bash
# Terminal 1
cd spectroquiz/backend && uv run uvicorn main:app --reload --port 8000

# Terminal 2
cd spectroquiz/frontend && npm run dev
```

---

### Environment Variables

**`backend/.env`** (never commit):
```bash
ENV=development
SECRET_KEY=your-secret-key-here   # used for HMAC question token signing
```

**`frontend/.env.local`** (never commit):
```bash
VITE_API_URL=http://localhost:8000
```

Commit `backend/.env.example` and `frontend/.env.local.example` as templates so
other developers know what variables are expected.

---

### `.gitignore` (repo root)

```
# Python
backend/.venv/
backend/__pycache__/
backend/**/__pycache__/

# Node
frontend/node_modules/
frontend/dist/

# Env files
**/.env
**/.env.local

# Raw spectral library — too large to commit (~5 GB)
# Download manually from https://www.sciencebase.gov/catalog/item/5807a2a2e4b0841e59e3a18d
# then run data/ingest_usgs.py to produce backend/data/spectra.json
data/ASCIIdata_splib07b/
```

---

### Quick Reference

| Task                        | Command                                                      |
|-----------------------------|--------------------------------------------------------------|
| Install Python deps         | `cd backend && uv sync`                                      |
| Add Python package          | `cd backend && uv add <pkg>`                                 |
| Run backend                 | `cd backend && uv run uvicorn main:app --reload --port 8000` |
| Run backend tests           | `cd backend && uv run pytest`                                |
| Lint/format Python          | `cd backend && uv run ruff check . && uv run ruff format .`  |
| Install Node deps           | `cd frontend && fnm use && npm install`                      |
| Add Node package            | `cd frontend && npm install <pkg>`                           |
| Run frontend                | `cd frontend && npm run dev`                                 |
| Build frontend              | `cd frontend && npm run build`                               |

---

## Implementation Phases

### Phase 1 — Core (MVP)
- [ ] Backend: spectra loader, `QuestionMode` ABC, `MultipleChoiceMode`, `CategoryIDMode`
- [ ] Backend: `/spectra`, `/question`, `/evaluate`, `/health` endpoints
- [ ] Backend: stateless HMAC token signing/verification (`quiz/tokens.py`)
- [ ] Backend: ~20 spectra ingested and formatted (5 minerals, 5 veg, 5 soil, 3 water, 2 snow)
- [ ] Frontend: `SpectrumChart` with pan/zoom, crosshair snap, atmospheric gap shading
- [ ] Frontend: `MultipleChoiceUI` and `CategoryIDUI`
- [ ] Frontend: Basic quiz loop, score tracking
- [ ] Deployment: Render static site (frontend) + Render free web service (backend)

### Phase 2 — Full Quiz Modes
- [ ] Backend: `FeatureSpottingMode`
- [ ] Frontend: `FeatureSpottingUI` (click-to-mark wavelength)
- [ ] Frontend: `HintOverlay` (animated diagnostic feature annotations)
- [ ] Frontend: `ExplanationPanel` (post-answer with hint overlay auto-reveal)
- [ ] Expand library to ~80 spectra

### Phase 3 — Polish
- [ ] Frontend: Continuum removal toggle (swap between `reflectance` and `reflectance_cr`)
- [ ] Frontend: Preset zoom buttons (VNIR / SWIR-1 / SWIR-2)
- [ ] Frontend: Region labels on x-axis
- [ ] Frontend: Results / summary page with per-category breakdown
- [ ] Frontend: Light/dark mode toggle

### Phase 4 — Extensions (Future)
- [ ] Free-label quiz mode (text input + fuzzy matching)
- [ ] Adaptive difficulty (up-weight harder modes on strong performance)
- [ ] TIR mode (2.5–15.4 µm, emissivity, ECOSTRESS library)
- [ ] "Themed quiz sets" (e.g., hydrothermal alteration minerals only)
- [ ] Mixture spectra (linear spectral unmixing challenges)
- [ ] Leaderboard / shareable score

---

## Key Implementation Notes

1. **uPlot + React:** uPlot manages its own DOM — initialise it in a `useEffect`
   with a `useRef` container, and destroy it on cleanup (`u.destroy()`). Pass new
   data via `u.setData()` rather than re-creating the instance. The SVG overlay
   sits as an `<svg>` sibling, absolutely positioned over the uPlot canvas, sized
   to match via a `ResizeObserver`. Never let React re-render the uPlot DOM directly.

2. **Continuum removal:** Both `reflectance` and `reflectance_cr` are precomputed
   offline (via convex hull in `ingest_usgs.py`) and stored in the spectrum JSON.
   Toggling on the frontend simply calls `u.setData()` with the appropriate array —
   no computation, no round-trip.

3. **Crosshair snapping:** uPlot fires a `setCursor` hook on every mouse move,
   providing the nearest data index directly. Read `u.data[0][idx]` (wavelength)
   and `u.data[1][idx]` (reflectance) and display them in the corner readout. No
   manual scale inversion needed — uPlot handles it internally.

4. **FeatureSpotting tolerance:** Use ±30 nm for a correct answer, ±15 nm for
   bonus points (+3). Both thresholds are embedded in the signed token so the
   backend stays authoritative.

5. **Distractor selection:** In `MultipleChoiceMode`, distractors should come from
   the same `category` but different `subcategory`. For minerals, same-subcategory
   distractors (e.g., all phyllosilicates) tend to be harder questions.

6. **CORS:** FastAPI exposes CORS headers explicitly (see Wiring section). The
   frontend calls the backend URL directly via `VITE_API_URL`. No proxy layer.

7. **Stateless tokens:** The `correct_answer` field is never sent to the frontend
   directly. It is embedded in the signed HMAC token returned as `question_id`.
   On `/evaluate`, the backend decodes and verifies the token to grade the answer.
   Token TTL is 10 minutes, enforced by the `exp` claim in the payload.

8. **Render cold starts:** The free backend tier spins down after ~15 minutes of
   inactivity. On the frontend, send a lightweight `GET /health` ping when the
   page first loads to wake the backend before the user hits "Start Quiz". Show
   a subtle "warming up…" indicator if the ping takes more than 2 seconds.

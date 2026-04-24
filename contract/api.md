# Spectral Sleuth — API Contract

> **Frozen during Phase 2.** Agents B and C must not modify this file.
> If a contract change is required, write a note in `CONTRACT_ISSUES.md` at
> repo root and flag it for Phase 3.

---

## Base URL

Development: `http://localhost:8000`

---

## Error Response Shape

All error responses use HTTP status codes and return:

```json
{
  "error": "<machine_readable_slug>",
  "detail": "<human_readable_string or null>"
}
```

| Status | `error` value        | When                                      |
|--------|----------------------|-------------------------------------------|
| 400    | `malformed_token`    | Token string is structurally invalid      |
| 400    | `invalid_signature`  | Token HMAC does not match                 |
| 400    | `token_expired`      | Token `exp` claim is in the past          |
| 404    | `not_found`          | Spectrum id does not exist in library     |
| 500    | `server_error`       | Unexpected internal error                 |

---

## Endpoints

### `GET /health`

Returns a liveness signal. The frontend calls this on page load.

**Response 200:**
```json
{ "status": "ok" }
```

---

### `GET /spectra`

Returns a lightweight index of all spectra (no array data).

**Response 200** — array of `SpectrumIndexEntry`:
```json
[
  {
    "id": "kaolinite_cm3",
    "name": "Kaolinite CM3",
    "category": "mineral",
    "subcategory": "phyllosilicate",
    "display_name": "Kaolinite"
  }
]
```

---

### `GET /spectra/{id}`

Returns the full spectrum including wavelength and reflectance arrays.

**Response 200** — `SpectrumFull`:
```json
{
  "id": "kaolinite_cm3",
  "name": "Kaolinite CM3",
  "category": "mineral",
  "subcategory": "phyllosilicate",
  "display_name": "Kaolinite",
  "wavelengths_nm": [380, 381, "... (2121 values)"],
  "reflectance": [0.312, 0.315, "..."],
  "reflectance_cr": [1.000, 1.001, "..."],
  "diagnostic_features": [
    {
      "wavelength_nm": 1400,
      "label": "Al-OH overtone doublet",
      "description": "Al-OH overtone doublet (~1395/1415 nm)"
    }
  ],
  "explanation": "Kaolinite is an Al-Si clay..."
}
```

**Response 404:** `not_found`

---

### `POST /question`

Generates a new quiz question. The backend picks a mode (weighted random) and a
spectrum (avoiding recent history), then returns an opaque signed token.

**Request:**
```json
{
  "session_history": ["kaolinite_cm3", "green_veg_grass"]
}
```
`session_history` is optional (defaults to `[]`). The backend excludes the last
`min(10, len(library) - 1)` ids when picking a spectrum.

**Response 200** — `QuestionResponse`:
```json
{
  "question_id": "<hmac-signed-token>",
  "mode": "multiple_choice",
  "spectrum_id": "hematite_wo301",
  "prompt": "What material is this spectrum?",
  "payload": {
    "choices": ["Hematite", "Goethite", "Jarosite", "Ferrihydrite"]
  }
}
```

#### Mode-specific `payload` shapes

**`multiple_choice`**
```json
{ "choices": ["<correct>", "<distractor>", "<distractor>", "<distractor>"] }
```
Choices are shuffled. Order in `payload.choices` does not reveal the answer.

**`category_id`**
```json
{ "categories": ["mineral", "vegetation", "soil", "water", "manmade"] }
```
Always all 5 categories derived from the live data.

**`feature_spotting`**
```json
{ "feature_label": "Al-OH overtone doublet" }
```
User must click the wavelength on the chart.

---

### `POST /evaluate`

Verifies the token, grades the answer, and returns the result.

**Request:**
```json
{
  "question_id": "<hmac-signed-token>",
  "user_answer": "Goethite",
  "hint_used": false
}
```
`hint_used` defaults to `false`. For `feature_spotting`, `user_answer` is the
selected wavelength as a string (e.g. `"1402.5"`).

**Response 200** — `Result`:
```json
{
  "correct": false,
  "correct_answer": "Hematite",
  "score_delta": 0,
  "explanation": "Hematite (Fe₂O₃) shows strong absorption below 750 nm...",
  "diagnostic_features": [
    { "wavelength_nm": 530, "label": "Fe³⁺ charge transfer", "description": "..." }
  ]
}
```

**Response 400:** `malformed_token` | `invalid_signature` | `token_expired`

---

## HMAC Token

### Signing

```
body  = base64url( json( payload_with_exp ) )
sig   = hmac-sha256( SECRET_KEY, body ).hexdigest()
token = body + "." + sig
```

TTL = **600 seconds** from issue time (`exp` = `int(time.time()) + 600`).

### Token Payload Schema — per mode

All payloads include:

| Field   | Type   | Description                           |
|---------|--------|---------------------------------------|
| `mode`  | string | `multiple_choice` / `category_id` / `feature_spotting` |
| `spectrum_id` | string | id of the spectrum used        |
| `exp`   | int    | Unix timestamp expiry                 |

**`multiple_choice` additional fields:**

| Field            | Type   |
|------------------|--------|
| `correct_answer` | string | Display name of the correct spectrum |

**`category_id` additional fields:**

| Field            | Type   |
|------------------|--------|
| `correct_answer` | string | Category string (e.g. `"mineral"`)   |

**`feature_spotting` additional fields:**

| Field               | Type  |
|---------------------|-------|
| `correct_answer_nm` | float | Wavelength of the target feature (nm) |
| `tolerance_partial` | int   | `30` nm — threshold for correct       |
| `tolerance_full`    | int   | `15` nm — threshold for full-score bonus |

---

## Scoring Table

| Condition                                        | `score_delta` |
|--------------------------------------------------|---------------|
| Correct, no hint                                 | +10           |
| Correct, hint used                               | +5            |
| Wrong                                            | 0             |
| FeatureSpotting: `\|Δ\| ≤ tolerance_full` (15 nm) | Additional +3 |

The hint penalty is applied by the `/evaluate` handler: if `hint_used=true` and
the answer is correct, `score_delta` is reduced by 5 (i.e. +10 → +5).

---

## Category List (derived from data)

```json
["manmade", "mineral", "soil", "vegetation", "water"]
```
(5 categories, alphabetically sorted — matches `library.get_categories()`)

---

## Feature Spotting Tolerances

```
tolerance_partial = 30   # nm — answer is "correct" if |Δ| ≤ 30
tolerance_full    = 15   # nm — +3 bonus if |Δ| ≤ 15
```

---

## Wavelength Range

The ingested library covers **380–2500 nm** (2121 data points, 1 nm steps).
Frontend zoom presets:
- Full: 380–2500
- VNIR: 380–1000
- SWIR-1: 1000–1800
- SWIR-2: 1800–2500

Atmospheric gap mask regions: `[[1350, 1450], [1800, 1950]]`

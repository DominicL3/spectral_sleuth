"""
backend/main.py — FastAPI application entry point.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # Must happen before quiz.tokens is imported (reads SECRET_KEY)

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from quiz import library  # noqa: E402
from quiz import tokens  # noqa: E402
from quiz.engine import QuizEngine  # noqa: E402
from quiz.modes.category_id import CategoryIDMode  # noqa: E402
from quiz.modes.feature_spotting import FeatureSpottingMode  # noqa: E402
from quiz.modes.multiple_choice import MultipleChoiceMode  # noqa: E402
from quiz.schemas import (  # noqa: E402
    EvaluateRequest,
    ErrorResponse,
    QuestionRequest,
    QuestionResponse,
    Result,
    SpectrumFull,
    SpectrumIndexEntry,
)

# ---------------------------------------------------------------------------
# Engine (populated during lifespan)
# ---------------------------------------------------------------------------

engine: QuizEngine | None = None


# ---------------------------------------------------------------------------
# Lifespan: pre-load the spectra library and instantiate the engine
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    all_spectra = library.get_all()  # warms the lru_cache
    engine = QuizEngine(
        modes=[MultipleChoiceMode(), CategoryIDMode(), FeatureSpottingMode()],
        library=all_spectra,
    )
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Spectral Sleuth API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------


@app.exception_handler(NotImplementedError)
async def not_implemented_handler(
    request: Request, exc: NotImplementedError
) -> JSONResponse:
    return JSONResponse(
        status_code=501,
        content=ErrorResponse(
            error="not_implemented", detail="Coming in Phase 2"
        ).model_dump(),
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/spectra", response_model=list[SpectrumIndexEntry])
async def list_spectra() -> list[SpectrumIndexEntry]:
    return [
        SpectrumIndexEntry(
            id=s["id"],
            name=s["name"],
            category=s["category"],
            subcategory=s["subcategory"],
            display_name=s["display_name"],
        )
        for s in library.get_all()
    ]


@app.get("/spectra/{spectrum_id}", response_model=SpectrumFull)
async def get_spectrum(spectrum_id: str):
    try:
        s = library.get_by_id(spectrum_id)
    except KeyError:
        return JSONResponse(
            status_code=404,
            content=ErrorResponse(error="not_found", detail=spectrum_id).model_dump(),
        )
    return SpectrumFull(**s)


@app.post("/question", response_model=QuestionResponse)
async def create_question(body: QuestionRequest) -> QuestionResponse:
    assert engine is not None, "Engine not initialised"
    response, token_payload = engine.next_question(body.session_history)
    response.question_id = tokens.sign(token_payload)
    return response


@app.post("/evaluate", response_model=Result)
async def evaluate_answer(body: EvaluateRequest) -> Result:
    # Verify token
    try:
        payload = tokens.verify(body.question_id)
    except tokens.MalformedToken as exc:
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="malformed_token", detail=str(exc)
            ).model_dump(),
        )
    except tokens.InvalidSignature as exc:
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="invalid_signature", detail=str(exc)
            ).model_dump(),
        )
    except tokens.TokenExpired as exc:
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(error="token_expired", detail=str(exc)).model_dump(),
        )

    # Dispatch to the correct mode
    assert engine is not None, "Engine not initialised"
    mode_map = {m.mode_id: m for m in engine.modes}
    mode_id = payload["mode"]
    if mode_id not in mode_map:
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="malformed_token", detail=f"Unknown mode: {mode_id!r}"
            ).model_dump(),
        )

    spectrum = library.get_by_id(payload["spectrum_id"])
    result = mode_map[mode_id].evaluate(body.user_answer, payload, spectrum)

    # Apply hint penalty: correct + hint used → subtract 5
    if body.hint_used and result.correct:
        result = Result(
            correct=result.correct,
            correct_answer=result.correct_answer,
            score_delta=result.score_delta - 5,
            explanation=result.explanation,
            diagnostic_features=result.diagnostic_features,
        )

    # Fill explanation from spectrum if mode didn't provide one
    if not result.explanation:
        result = Result(
            correct=result.correct,
            correct_answer=result.correct_answer,
            score_delta=result.score_delta,
            explanation=spectrum.get("explanation", ""),
            diagnostic_features=result.diagnostic_features,
        )

    # Fill diagnostic_features from spectrum if empty
    if not result.diagnostic_features:
        from quiz.schemas import DiagnosticFeature

        result = Result(
            correct=result.correct,
            correct_answer=result.correct_answer,
            score_delta=result.score_delta,
            explanation=result.explanation,
            diagnostic_features=[
                DiagnosticFeature(**f) for f in spectrum.get("diagnostic_features", [])
            ],
        )

    return result

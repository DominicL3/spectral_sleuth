"""
quiz/schemas.py — Pydantic v2 models that form the public API boundary.
Internal mode code may use plain dicts; these models govern what enters
and leaves the HTTP layer.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Spectrum models
# ---------------------------------------------------------------------------


class DiagnosticFeature(BaseModel):
    wavelength_nm: float
    label: str
    description: str


class SpectrumIndexEntry(BaseModel):
    """Lightweight entry returned by GET /spectra (no arrays)."""

    id: str
    name: str
    category: str
    subcategory: str
    display_name: str


class SpectrumFull(BaseModel):
    """Full spectrum payload returned by GET /spectra/{id}."""

    id: str
    name: str
    category: str
    subcategory: str
    display_name: str
    wavelengths_nm: list[float]
    # Some spectra contain `null` values in masked regions (e.g. atmospheric
    # gaps). uPlot renders these as line gaps.
    reflectance: list[float | None]
    reflectance_cr: list[float | None]
    diagnostic_features: list[DiagnosticFeature]
    explanation: str


# ---------------------------------------------------------------------------
# Question / evaluation models
# ---------------------------------------------------------------------------


class QuestionRequest(BaseModel):
    session_history: list[str] = []


class QuestionResponse(BaseModel):
    """Sent to the frontend — never includes the correct answer directly."""

    question_id: str  # signed HMAC token
    mode: str
    spectrum_id: str
    prompt: str
    payload: dict[str, Any]


class EvaluateRequest(BaseModel):
    question_id: str
    user_answer: str
    hint_used: bool = False


class Result(BaseModel):
    correct: bool
    correct_answer: str
    score_delta: int
    explanation: str
    diagnostic_features: list[DiagnosticFeature]


# ---------------------------------------------------------------------------
# Error model
# ---------------------------------------------------------------------------


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None

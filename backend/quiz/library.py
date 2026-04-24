"""
quiz/library.py — loads spectra.json once at startup and exposes a clean
read-only API.  Synthesizes a short `label` field on every diagnostic_feature
so the frontend always receives a non-empty label.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

_DATA_PATH = Path(__file__).parent.parent / "data" / "spectra.json"


def _synthesize_label(description: str) -> str:
    """Derive a short label from a feature description.

    Strategy: take the text before the first '(' or '.', strip whitespace,
    and cap at 40 characters.
    """
    text = re.split(r"[.(]", description, maxsplit=1)[0].strip()
    return text[:40] if text else description[:40]


@lru_cache(maxsize=1)
def _load() -> list[dict]:
    with _DATA_PATH.open() as fh:
        spectra: list[dict] = json.load(fh)

    for spectrum in spectra:
        for feature in spectrum.get("diagnostic_features", []):
            if not feature.get("label"):
                feature["label"] = _synthesize_label(feature.get("description", ""))

    return spectra


def get_all() -> list[dict]:
    """Return all spectra (with synthesized labels)."""
    return _load()


def get_by_id(spectrum_id: str) -> dict:
    """Return a single spectrum by id, or raise KeyError."""
    for spectrum in _load():
        if spectrum["id"] == spectrum_id:
            return spectrum
    raise KeyError(f"Spectrum not found: {spectrum_id!r}")


def get_categories() -> list[str]:
    """Return sorted list of unique top-level categories present in the data."""
    return sorted({s["category"] for s in _load()})

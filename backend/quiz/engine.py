"""
quiz/engine.py — Picks mode and spectrum for each question.
"""

from __future__ import annotations

import random

from quiz.schemas import QuestionResponse

from .modes.base import QuestionMode


class QuizEngine:
    def __init__(self, modes: list[QuestionMode], library: list[dict]):
        self.modes = modes
        self.library = library

    def next_question(
        self, session_history: list[str]
    ) -> tuple[QuestionResponse, dict]:
        mode = random.choices(self.modes, weights=[m.weight for m in self.modes], k=1)[
            0
        ]
        spectrum = self._pick_spectrum(session_history)
        # FeatureSpotting needs diagnostic_features; re-pick if empty
        if mode.mode_id == "feature_spotting" and not spectrum.get(
            "diagnostic_features"
        ):
            spectrum = next(
                (
                    s
                    for s in self.library
                    if s.get("diagnostic_features") and s["id"] != spectrum["id"]
                ),
                spectrum,
            )
        return mode.generate(spectrum, self.library)

    def _pick_spectrum(self, session_history: list[str]) -> dict:
        exclude = set(session_history[-min(10, len(self.library) - 1) :])
        candidates = [s for s in self.library if s["id"] not in exclude]
        if not candidates:
            candidates = self.library
        return random.choice(candidates)

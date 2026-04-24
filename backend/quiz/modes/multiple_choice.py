"""
quiz/modes/multiple_choice.py — Multiple choice question mode.
"""

from __future__ import annotations

import random

from quiz.schemas import DiagnosticFeature, QuestionResponse, Result

from .base import QuestionMode


class MultipleChoiceMode(QuestionMode):
    mode_id = "multiple_choice"
    weight = 0.40
    num_choices = 4

    def generate(
        self, spectrum: dict, library: list[dict]
    ) -> tuple[QuestionResponse, dict]:
        distractors = self._pick_distractors(spectrum, library)
        choices = [spectrum["display_name"]] + [d["display_name"] for d in distractors]
        random.shuffle(choices)

        response = QuestionResponse(
            question_id="",  # filled by main.py after signing
            mode=self.mode_id,
            spectrum_id=spectrum["id"],
            prompt="What material is this spectrum?",
            payload={"choices": choices},
        )
        token_payload = {
            "mode": self.mode_id,
            "spectrum_id": spectrum["id"],
            "correct_answer": spectrum["display_name"],
        }
        return response, token_payload

    def evaluate(self, user_answer: str, token_payload: dict, spectrum: dict) -> Result:
        correct_answer = token_payload["correct_answer"]
        correct = user_answer.strip().lower() == correct_answer.strip().lower()
        return Result(
            correct=correct,
            correct_answer=correct_answer,
            score_delta=10 if correct else 0,
            explanation=spectrum.get("explanation", ""),
            diagnostic_features=[
                DiagnosticFeature(**f) for f in spectrum.get("diagnostic_features", [])
            ],
        )

    def _pick_distractors(self, spectrum: dict, library: list[dict]) -> list[dict]:
        """Pick 3 distractor spectra.

        Priority:
        1. Same category, different subcategory.
        2. Same category, any different id.
        3. Any other spectrum (safety valve).
        """
        same_cat_diff_sub = [
            s
            for s in library
            if s["id"] != spectrum["id"]
            and s["category"] == spectrum["category"]
            and s["subcategory"] != spectrum["subcategory"]
        ]

        if len(same_cat_diff_sub) >= 3:
            return random.sample(same_cat_diff_sub, 3)

        # Fall back: same category, any different id
        same_cat = [
            s
            for s in library
            if s["id"] != spectrum["id"] and s["category"] == spectrum["category"]
        ]
        if len(same_cat) >= 3:
            return random.sample(same_cat, 3)

        # Safety valve: fill from anywhere else
        pool = [s for s in library if s["id"] != spectrum["id"]]
        return random.sample(pool, min(3, len(pool)))

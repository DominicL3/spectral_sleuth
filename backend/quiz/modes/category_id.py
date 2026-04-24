"""
quiz/modes/category_id.py — Category identification question mode.
"""

from __future__ import annotations

from quiz import library as lib
from quiz.schemas import DiagnosticFeature, QuestionResponse, Result

from .base import QuestionMode


class CategoryIDMode(QuestionMode):
    mode_id = "category_id"
    weight = 0.35

    def generate(
        self, spectrum: dict, library: list[dict]
    ) -> tuple[QuestionResponse, dict]:
        categories = lib.get_categories()

        response = QuestionResponse(
            question_id="",  # filled by main.py after signing
            mode=self.mode_id,
            spectrum_id=spectrum["id"],
            prompt="Which category does this spectrum belong to?",
            payload={"categories": categories},
        )
        token_payload = {
            "mode": self.mode_id,
            "spectrum_id": spectrum["id"],
            "correct_answer": spectrum["category"],
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

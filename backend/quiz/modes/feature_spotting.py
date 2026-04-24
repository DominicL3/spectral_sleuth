"""
quiz/modes/feature_spotting.py — Feature spotting question mode.
"""

from __future__ import annotations

import random

from quiz.schemas import DiagnosticFeature, QuestionResponse, Result

from .base import QuestionMode


class FeatureSpottingMode(QuestionMode):
    mode_id = "feature_spotting"
    weight = 0.25

    def generate(
        self, spectrum: dict, library: list[dict]
    ) -> tuple[QuestionResponse, dict]:
        features = spectrum.get("diagnostic_features", [])
        feature = random.choice(features)

        response = QuestionResponse(
            question_id="",  # filled by main.py after signing
            mode=self.mode_id,
            spectrum_id=spectrum["id"],
            prompt=f"Click the wavelength of: {feature['label']}",
            payload={"feature_label": feature["label"]},
        )
        token_payload = {
            "mode": self.mode_id,
            "spectrum_id": spectrum["id"],
            "correct_answer_nm": float(feature["wavelength_nm"]),
            "tolerance_partial": 30,
            "tolerance_full": 15,
        }
        return response, token_payload

    def evaluate(self, user_answer: str, token_payload: dict, spectrum: dict) -> Result:
        correct_nm = float(token_payload["correct_answer_nm"])
        tol_partial = int(token_payload.get("tolerance_partial", 30))
        tol_full = int(token_payload.get("tolerance_full", 15))
        correct_answer_str = f"{correct_nm:.0f} nm"

        try:
            user_nm = float(user_answer)
        except ValueError, TypeError:
            return Result(
                correct=False,
                correct_answer=correct_answer_str,
                score_delta=0,
                explanation=f"Could not parse '{user_answer}' as a wavelength in nm.",
                diagnostic_features=[
                    DiagnosticFeature(**f)
                    for f in spectrum.get("diagnostic_features", [])
                ],
            )

        delta = abs(user_nm - correct_nm)

        if delta > tol_partial:
            correct = False
            score_delta = 0
        elif delta <= tol_full:
            correct = True
            score_delta = 13  # 10 base + 3 bonus
        else:
            correct = True
            score_delta = 10

        return Result(
            correct=correct,
            correct_answer=correct_answer_str,
            score_delta=score_delta,
            explanation=spectrum.get("explanation", ""),
            diagnostic_features=[
                DiagnosticFeature(**f) for f in spectrum.get("diagnostic_features", [])
            ],
        )

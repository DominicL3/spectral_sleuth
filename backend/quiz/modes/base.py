"""
quiz/modes/base.py — Abstract base class for quiz question modes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from quiz.schemas import QuestionResponse, Result


class QuestionMode(ABC):
    mode_id: str
    weight: float

    @abstractmethod
    def generate(
        self, spectrum: dict, library: list[dict]
    ) -> tuple[QuestionResponse, dict]:
        """Return (response_for_frontend, token_payload_to_sign).

        The token_payload must NOT include 'exp' — main.py signs it via
        tokens.sign() which appends the expiry claim.
        """
        ...

    @abstractmethod
    def evaluate(self, user_answer: str, token_payload: dict, spectrum: dict) -> Result:
        """Grade the user's answer and return a Result.

        Args:
            user_answer: The raw string submitted by the user.
            token_payload: The decoded (verified) token dict.
            spectrum: The full spectrum dict from the library.
        """
        ...

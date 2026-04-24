"""Tests for quiz mode classes."""

from __future__ import annotations

import pytest

from quiz import library
from quiz.modes.category_id import CategoryIDMode
from quiz.modes.feature_spotting import FeatureSpottingMode
from quiz.modes.multiple_choice import MultipleChoiceMode
from quiz.schemas import DiagnosticFeature, QuestionResponse, Result


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def all_spectra():
    return library.get_all()


@pytest.fixture(scope="module")
def mineral_spectrum(all_spectra):
    """A spectrum with diagnostic features for FeatureSpotting tests."""
    return next(s for s in all_spectra if s.get("diagnostic_features"))


@pytest.fixture(scope="module")
def mc_mode():
    return MultipleChoiceMode()


@pytest.fixture(scope="module")
def cat_mode():
    return CategoryIDMode()


@pytest.fixture(scope="module")
def fs_mode():
    return FeatureSpottingMode()


# ---------------------------------------------------------------------------
# MultipleChoiceMode
# ---------------------------------------------------------------------------


class TestMultipleChoiceMode:
    def test_mode_attrs(self, mc_mode):
        assert mc_mode.mode_id == "multiple_choice"
        assert mc_mode.weight == 0.40

    def test_generate_shape(self, mc_mode, mineral_spectrum, all_spectra):
        response, token_payload = mc_mode.generate(mineral_spectrum, all_spectra)
        assert isinstance(response, QuestionResponse)
        assert response.mode == "multiple_choice"
        assert response.spectrum_id == mineral_spectrum["id"]
        assert response.prompt == "What material is this spectrum?"
        assert "choices" in response.payload
        choices = response.payload["choices"]
        assert len(choices) == 4
        assert mineral_spectrum["display_name"] in choices
        # question_id is empty string until signed by main.py
        assert response.question_id == ""

    def test_generate_token_payload(self, mc_mode, mineral_spectrum, all_spectra):
        _, token_payload = mc_mode.generate(mineral_spectrum, all_spectra)
        assert token_payload["mode"] == "multiple_choice"
        assert token_payload["spectrum_id"] == mineral_spectrum["id"]
        assert token_payload["correct_answer"] == mineral_spectrum["display_name"]

    def test_evaluate_correct(self, mc_mode, mineral_spectrum):
        token_payload = {
            "mode": "multiple_choice",
            "spectrum_id": mineral_spectrum["id"],
            "correct_answer": mineral_spectrum["display_name"],
        }
        result = mc_mode.evaluate(
            mineral_spectrum["display_name"], token_payload, mineral_spectrum
        )
        assert isinstance(result, Result)
        assert result.correct is True
        assert result.score_delta == 10

    def test_evaluate_wrong(self, mc_mode, mineral_spectrum):
        token_payload = {
            "mode": "multiple_choice",
            "spectrum_id": mineral_spectrum["id"],
            "correct_answer": mineral_spectrum["display_name"],
        }
        result = mc_mode.evaluate("Wrong Answer", token_payload, mineral_spectrum)
        assert result.correct is False
        assert result.score_delta == 0

    def test_evaluate_case_insensitive(self, mc_mode, mineral_spectrum):
        token_payload = {
            "mode": "multiple_choice",
            "spectrum_id": mineral_spectrum["id"],
            "correct_answer": mineral_spectrum["display_name"],
        }
        result = mc_mode.evaluate(
            mineral_spectrum["display_name"].upper(), token_payload, mineral_spectrum
        )
        assert result.correct is True

    def test_choices_shuffled(self, mc_mode, mineral_spectrum, all_spectra):
        """Run generate several times; correct answer should not always be first."""
        positions = set()
        for _ in range(30):
            response, _ = mc_mode.generate(mineral_spectrum, all_spectra)
            choices = response.payload["choices"]
            positions.add(choices.index(mineral_spectrum["display_name"]))
        # With 30 runs the correct answer should appear in multiple positions
        assert len(positions) > 1


# ---------------------------------------------------------------------------
# CategoryIDMode
# ---------------------------------------------------------------------------


class TestCategoryIDMode:
    def test_mode_attrs(self, cat_mode):
        assert cat_mode.mode_id == "category_id"
        assert cat_mode.weight == 0.35

    def test_generate_shape(self, cat_mode, mineral_spectrum, all_spectra):
        response, token_payload = cat_mode.generate(mineral_spectrum, all_spectra)
        assert isinstance(response, QuestionResponse)
        assert response.mode == "category_id"
        assert response.spectrum_id == mineral_spectrum["id"]
        assert response.prompt == "Which category does this spectrum belong to?"
        assert "categories" in response.payload
        cats = response.payload["categories"]
        assert isinstance(cats, list)
        assert len(cats) == 5
        assert cats == sorted(cats)  # alphabetically sorted per contract

    def test_generate_token_payload(self, cat_mode, mineral_spectrum, all_spectra):
        _, token_payload = cat_mode.generate(mineral_spectrum, all_spectra)
        assert token_payload["mode"] == "category_id"
        assert token_payload["correct_answer"] == mineral_spectrum["category"]

    def test_evaluate_correct(self, cat_mode, mineral_spectrum):
        token_payload = {
            "mode": "category_id",
            "spectrum_id": mineral_spectrum["id"],
            "correct_answer": mineral_spectrum["category"],
        }
        result = cat_mode.evaluate(
            mineral_spectrum["category"], token_payload, mineral_spectrum
        )
        assert result.correct is True
        assert result.score_delta == 10

    def test_evaluate_wrong(self, cat_mode, mineral_spectrum):
        token_payload = {
            "mode": "category_id",
            "spectrum_id": mineral_spectrum["id"],
            "correct_answer": mineral_spectrum["category"],
        }
        result = cat_mode.evaluate("water", token_payload, mineral_spectrum)
        assert result.correct is False
        assert result.score_delta == 0

    def test_evaluate_case_insensitive(self, cat_mode, mineral_spectrum):
        token_payload = {
            "mode": "category_id",
            "spectrum_id": mineral_spectrum["id"],
            "correct_answer": mineral_spectrum["category"],
        }
        result = cat_mode.evaluate(
            mineral_spectrum["category"].upper(), token_payload, mineral_spectrum
        )
        assert result.correct is True


# ---------------------------------------------------------------------------
# FeatureSpottingMode
# ---------------------------------------------------------------------------


class TestFeatureSpottingMode:
    def test_mode_attrs(self, fs_mode):
        assert fs_mode.mode_id == "feature_spotting"
        assert fs_mode.weight == 0.25

    def test_generate_shape(self, fs_mode, mineral_spectrum, all_spectra):
        response, token_payload = fs_mode.generate(mineral_spectrum, all_spectra)
        assert isinstance(response, QuestionResponse)
        assert response.mode == "feature_spotting"
        assert response.spectrum_id == mineral_spectrum["id"]
        assert "Click the wavelength of:" in response.prompt
        assert "feature_label" in response.payload

    def test_generate_token_payload(self, fs_mode, mineral_spectrum, all_spectra):
        _, token_payload = fs_mode.generate(mineral_spectrum, all_spectra)
        assert token_payload["mode"] == "feature_spotting"
        assert "correct_answer_nm" in token_payload
        assert token_payload["tolerance_partial"] == 30
        assert token_payload["tolerance_full"] == 15

    def _make_payload(self, spectrum, nm=1400.0):
        return {
            "mode": "feature_spotting",
            "spectrum_id": spectrum["id"],
            "correct_answer_nm": nm,
            "tolerance_partial": 30,
            "tolerance_full": 15,
        }

    def test_evaluate_exact_correct(self, fs_mode, mineral_spectrum):
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("1400.0", payload, mineral_spectrum)
        assert result.correct is True
        assert result.score_delta == 13  # bonus for ≤15 nm

    def test_evaluate_within_full_bonus(self, fs_mode, mineral_spectrum):
        """1410 is 10 nm from 1400 → within tolerance_full → score_delta=13."""
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("1410", payload, mineral_spectrum)
        assert result.correct is True
        assert result.score_delta == 13

    def test_evaluate_within_partial_no_bonus(self, fs_mode, mineral_spectrum):
        """1420 is 20 nm from 1400 → within tolerance_partial but not full → score_delta=10."""
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("1420", payload, mineral_spectrum)
        assert result.correct is True
        assert result.score_delta == 10

    def test_evaluate_at_partial_boundary(self, fs_mode, mineral_spectrum):
        """Exactly 30 nm away → still correct (≤30)."""
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("1430", payload, mineral_spectrum)
        assert result.correct is True
        assert result.score_delta == 10

    def test_evaluate_just_outside_partial(self, fs_mode, mineral_spectrum):
        """31 nm away → wrong."""
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("1431", payload, mineral_spectrum)
        assert result.correct is False
        assert result.score_delta == 0

    def test_evaluate_far_wrong(self, fs_mode, mineral_spectrum):
        """100 nm away → wrong."""
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("1500", payload, mineral_spectrum)
        assert result.correct is False
        assert result.score_delta == 0

    def test_evaluate_unparseable(self, fs_mode, mineral_spectrum):
        """Non-numeric input should not raise — return correct=False."""
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("not_a_number", payload, mineral_spectrum)
        assert result.correct is False
        assert result.score_delta == 0

    def test_evaluate_correct_answer_display(self, fs_mode, mineral_spectrum):
        """correct_answer should be formatted as '<nm> nm'."""
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("1400", payload, mineral_spectrum)
        assert result.correct_answer == "1400 nm"

    def test_result_has_diagnostic_features(self, fs_mode, mineral_spectrum):
        payload = self._make_payload(mineral_spectrum, nm=1400.0)
        result = fs_mode.evaluate("1400", payload, mineral_spectrum)
        assert isinstance(result.diagnostic_features, list)
        for feat in result.diagnostic_features:
            assert isinstance(feat, DiagnosticFeature)

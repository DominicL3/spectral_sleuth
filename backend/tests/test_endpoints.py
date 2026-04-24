"""Integration tests for FastAPI endpoints."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from main import app
from quiz import library, tokens
from quiz.modes.category_id import CategoryIDMode
from quiz.modes.feature_spotting import FeatureSpottingMode
from quiz.modes.multiple_choice import MultipleChoiceMode
from quiz.schemas import DiagnosticFeature  # noqa: F401


@pytest.fixture(scope="module")
def client():
    """TestClient with lifespan context so the engine is initialised."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# GET /spectra
# ---------------------------------------------------------------------------


def test_list_spectra_count(client):
    resp = client.get("/spectra")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 35


def test_list_spectra_no_arrays(client):
    resp = client.get("/spectra")
    assert resp.status_code == 200
    for entry in resp.json():
        assert "wavelengths_nm" not in entry
        assert "reflectance" not in entry
        assert "reflectance_cr" not in entry
        assert "diagnostic_features" not in entry
        # Required fields present
        assert "id" in entry
        assert "name" in entry
        assert "category" in entry
        assert "subcategory" in entry
        assert "display_name" in entry


# ---------------------------------------------------------------------------
# GET /spectra/{id}
# ---------------------------------------------------------------------------


def test_get_spectrum_valid(client):
    spectra = library.get_all()
    first = spectra[0]
    resp = client.get(f"/spectra/{first['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == first["id"]
    assert "wavelengths_nm" in data
    assert "reflectance" in data
    assert "reflectance_cr" in data
    assert "diagnostic_features" in data
    assert "explanation" in data


def test_get_spectrum_not_found(client):
    resp = client.get("/spectra/does_not_exist")
    assert resp.status_code == 404
    body = resp.json()
    # Contract requires the flat error shape, not HTTPException's wrapped form.
    assert body.get("error") == "not_found"
    assert body.get("detail") == "does_not_exist"


# ---------------------------------------------------------------------------
# POST /question
# ---------------------------------------------------------------------------


def test_question_returns_valid_structure(client):
    resp = client.post("/question", json={"session_history": []})
    assert resp.status_code == 200
    data = resp.json()
    assert "question_id" in data
    assert "mode" in data
    assert "spectrum_id" in data
    assert "prompt" in data
    assert "payload" in data
    assert data["mode"] in ("multiple_choice", "category_id", "feature_spotting")
    assert isinstance(data["question_id"], str)
    assert len(data["question_id"]) > 10  # non-empty signed token


def test_question_default_history(client):
    """question endpoint should work with no body at all (session_history defaults to [])."""
    resp = client.post("/question", json={})
    assert resp.status_code == 200


def test_question_with_history(client):
    spectra = library.get_all()
    history = [s["id"] for s in spectra[:5]]
    resp = client.post("/question", json={"session_history": history})
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /evaluate — happy paths via hand-crafted tokens
# ---------------------------------------------------------------------------


def _make_signed_token(payload: dict) -> str:
    """Helper: sign a token payload (will be valid for TTL seconds)."""
    return tokens.sign(payload)


def test_evaluate_multiple_choice_correct(client):
    spectra = library.get_all()
    spectrum = spectra[0]
    token = _make_signed_token(
        {
            "mode": "multiple_choice",
            "spectrum_id": spectrum["id"],
            "correct_answer": spectrum["display_name"],
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": spectrum["display_name"],
            "hint_used": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["score_delta"] == 10
    assert data["correct_answer"] == spectrum["display_name"]


def test_evaluate_multiple_choice_wrong(client):
    spectra = library.get_all()
    spectrum = spectra[0]
    token = _make_signed_token(
        {
            "mode": "multiple_choice",
            "spectrum_id": spectrum["id"],
            "correct_answer": spectrum["display_name"],
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": "Totally Wrong Answer",
            "hint_used": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is False
    assert data["score_delta"] == 0


def test_evaluate_multiple_choice_correct_with_hint(client):
    """Correct answer + hint_used → score_delta = 5."""
    spectra = library.get_all()
    spectrum = spectra[0]
    token = _make_signed_token(
        {
            "mode": "multiple_choice",
            "spectrum_id": spectrum["id"],
            "correct_answer": spectrum["display_name"],
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": spectrum["display_name"],
            "hint_used": True,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["score_delta"] == 5


def test_evaluate_category_id_correct(client):
    spectra = library.get_all()
    spectrum = spectra[0]
    token = _make_signed_token(
        {
            "mode": "category_id",
            "spectrum_id": spectrum["id"],
            "correct_answer": spectrum["category"],
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": spectrum["category"],
            "hint_used": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["score_delta"] == 10


def test_evaluate_feature_spotting_exact(client):
    """Exact wavelength → correct + bonus (score_delta=13)."""
    spectra = [s for s in library.get_all() if s.get("diagnostic_features")]
    spectrum = spectra[0]
    target_nm = float(spectrum["diagnostic_features"][0]["wavelength_nm"])
    token = _make_signed_token(
        {
            "mode": "feature_spotting",
            "spectrum_id": spectrum["id"],
            "correct_answer_nm": target_nm,
            "tolerance_partial": 30,
            "tolerance_full": 15,
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": str(target_nm),
            "hint_used": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["score_delta"] == 13


def test_evaluate_feature_spotting_within_partial(client):
    """25 nm off → correct but no bonus (score_delta=10)."""
    spectra = [s for s in library.get_all() if s.get("diagnostic_features")]
    spectrum = spectra[0]
    target_nm = float(spectrum["diagnostic_features"][0]["wavelength_nm"])
    token = _make_signed_token(
        {
            "mode": "feature_spotting",
            "spectrum_id": spectrum["id"],
            "correct_answer_nm": target_nm,
            "tolerance_partial": 30,
            "tolerance_full": 15,
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": str(target_nm + 25),
            "hint_used": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["score_delta"] == 10


def test_evaluate_feature_spotting_outside_partial(client):
    """50 nm off → wrong."""
    spectra = [s for s in library.get_all() if s.get("diagnostic_features")]
    spectrum = spectra[0]
    target_nm = float(spectrum["diagnostic_features"][0]["wavelength_nm"])
    token = _make_signed_token(
        {
            "mode": "feature_spotting",
            "spectrum_id": spectrum["id"],
            "correct_answer_nm": target_nm,
            "tolerance_partial": 30,
            "tolerance_full": 15,
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": str(target_nm + 50),
            "hint_used": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is False
    assert data["score_delta"] == 0


def test_evaluate_feature_spotting_hint_penalty(client):
    """Correct within 15 nm + hint → 13 - 5 = 8."""
    spectra = [s for s in library.get_all() if s.get("diagnostic_features")]
    spectrum = spectra[0]
    target_nm = float(spectrum["diagnostic_features"][0]["wavelength_nm"])
    token = _make_signed_token(
        {
            "mode": "feature_spotting",
            "spectrum_id": spectrum["id"],
            "correct_answer_nm": target_nm,
            "tolerance_partial": 30,
            "tolerance_full": 15,
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": str(target_nm),
            "hint_used": True,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["score_delta"] == 8


def test_evaluate_result_has_explanation_and_features(client):
    """evaluate always returns explanation and diagnostic_features."""
    spectra = library.get_all()
    spectrum = spectra[0]
    token = _make_signed_token(
        {
            "mode": "multiple_choice",
            "spectrum_id": spectrum["id"],
            "correct_answer": spectrum["display_name"],
        }
    )
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": spectrum["display_name"],
            "hint_used": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["explanation"], str)
    assert len(data["explanation"]) > 0
    assert isinstance(data["diagnostic_features"], list)


# ---------------------------------------------------------------------------
# POST /evaluate — token error paths
# ---------------------------------------------------------------------------


def test_evaluate_expired_token(client, monkeypatch):
    """An expired token should return 400 with error='token_expired'."""
    token = _make_signed_token(
        {
            "mode": "multiple_choice",
            "spectrum_id": "kaolinite_cm3",
            "correct_answer": "Kaolinite",
        }
    )
    # Advance time past TTL
    future_time = time.time() + tokens.TTL + 10
    monkeypatch.setattr(time, "time", lambda: future_time)
    resp = client.post(
        "/evaluate",
        json={
            "question_id": token,
            "user_answer": "Kaolinite",
        },
    )
    assert resp.status_code == 400
    data = resp.json()
    assert data.get("error") == "token_expired"


def test_evaluate_tampered_token(client):
    """A tampered token should return 400 with error='invalid_signature'."""
    token = _make_signed_token(
        {
            "mode": "multiple_choice",
            "spectrum_id": "kaolinite_cm3",
            "correct_answer": "Kaolinite",
        }
    )
    # Flip a char in the signature
    body, sig = token.rsplit(".", 1)
    bad_sig = sig[:-1] + ("0" if sig[-1] != "0" else "1")
    bad_token = f"{body}.{bad_sig}"
    resp = client.post(
        "/evaluate",
        json={
            "question_id": bad_token,
            "user_answer": "Kaolinite",
        },
    )
    assert resp.status_code == 400
    data = resp.json()
    assert data.get("error") == "invalid_signature"


def test_evaluate_malformed_token(client):
    """A token without a '.' should return 400 with error='malformed_token'."""
    resp = client.post(
        "/evaluate",
        json={
            "question_id": "thisisnotavalidtoken",
            "user_answer": "Kaolinite",
        },
    )
    assert resp.status_code == 400
    data = resp.json()
    assert data.get("error") == "malformed_token"


# ---------------------------------------------------------------------------
# Full /question → /evaluate roundtrip
# ---------------------------------------------------------------------------


def test_question_evaluate_roundtrip_multiple_modes(client):
    """Run several question→evaluate roundtrips using hand-signed tokens."""
    spectra = library.get_all()
    mc = MultipleChoiceMode()
    cat = CategoryIDMode()

    for spectrum in spectra[:5]:
        # MC
        _response, payload = mc.generate(spectrum, spectra)
        token = tokens.sign(payload)
        resp = client.post(
            "/evaluate",
            json={
                "question_id": token,
                "user_answer": payload["correct_answer"],
            },
        )
        assert resp.status_code == 200
        assert resp.json()["correct"] is True
        assert resp.json()["score_delta"] == 10

        # CategoryID
        _response, payload = cat.generate(spectrum, spectra)
        token = tokens.sign(payload)
        resp = client.post(
            "/evaluate",
            json={
                "question_id": token,
                "user_answer": payload["correct_answer"],
            },
        )
        assert resp.status_code == 200
        assert resp.json()["correct"] is True
        assert resp.json()["score_delta"] == 10


def test_question_evaluate_roundtrip_feature_spotting(client):
    """FeatureSpotting roundtrip: submit exact nm → score_delta=13."""
    spectra = [s for s in library.get_all() if s.get("diagnostic_features")]
    fs = FeatureSpottingMode()

    for spectrum in spectra[:3]:
        _response, payload = fs.generate(spectrum, spectra)
        correct_nm = payload["correct_answer_nm"]
        token = tokens.sign(payload)
        resp = client.post(
            "/evaluate",
            json={
                "question_id": token,
                "user_answer": str(correct_nm),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["correct"] is True
        assert data["score_delta"] == 13

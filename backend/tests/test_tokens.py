"""Tests for quiz/tokens.py."""

from __future__ import annotations

import time

import pytest

from quiz import tokens
from quiz.tokens import (
    InvalidSignature,
    MalformedToken,
    TokenExpired,
    sign,
    verify,
)


def test_roundtrip():
    payload = {
        "mode": "multiple_choice",
        "spectrum_id": "kaolinite_cm3",
        "correct_answer": "Kaolinite",
    }
    token = sign(payload)
    result = verify(token)
    assert result["mode"] == payload["mode"]
    assert result["spectrum_id"] == payload["spectrum_id"]
    assert result["correct_answer"] == payload["correct_answer"]
    assert "exp" in result


def test_roundtrip_feature_spotting():
    payload = {
        "mode": "feature_spotting",
        "spectrum_id": "kaolinite_cm3",
        "correct_answer_nm": 1400.0,
        "tolerance_partial": 30,
        "tolerance_full": 15,
    }
    token = sign(payload)
    result = verify(token)
    assert result["correct_answer_nm"] == 1400.0
    assert result["tolerance_partial"] == 30
    assert result["tolerance_full"] == 15


def test_tamper_body():
    """Flipping a character in the body should raise InvalidSignature."""
    token = sign({"mode": "test", "spectrum_id": "x"})
    body, sig = token.rsplit(".", 1)
    # Flip first char of body
    tampered_body = ("A" if body[0] != "A" else "B") + body[1:]
    tampered = f"{tampered_body}.{sig}"
    with pytest.raises(InvalidSignature):
        verify(tampered)


def test_tamper_signature():
    """Flipping a character in the signature should raise InvalidSignature."""
    token = sign({"mode": "test", "spectrum_id": "x"})
    body, sig = token.rsplit(".", 1)
    # Flip last char of sig
    tampered_sig = sig[:-1] + ("0" if sig[-1] != "0" else "1")
    tampered = f"{body}.{tampered_sig}"
    with pytest.raises(InvalidSignature):
        verify(tampered)


def test_expired_token(monkeypatch):
    """A token with exp in the past should raise TokenExpired."""
    # Sign normally
    token = sign({"mode": "test", "spectrum_id": "x"})
    # Fast-forward time past TTL
    future_time = time.time() + tokens.TTL + 10
    monkeypatch.setattr(time, "time", lambda: future_time)
    with pytest.raises(TokenExpired):
        verify(token)


def test_malformed_no_dot():
    """A token without a '.' separator should raise MalformedToken."""
    with pytest.raises(MalformedToken):
        verify("nodothere")


def test_malformed_empty():
    """An empty string token should raise MalformedToken."""
    with pytest.raises(MalformedToken):
        verify("")


def test_malformed_bad_body():
    """A token with valid structure but non-base64 body should raise MalformedToken."""
    # Construct a token with a body that can't be base64-decoded as JSON
    import hashlib
    import hmac

    bad_body = "!!!not_base64!!!"
    sig = hmac.new(tokens.SECRET, bad_body.encode(), hashlib.sha256).hexdigest()
    with pytest.raises((MalformedToken, InvalidSignature)):
        verify(f"{bad_body}.{sig}")


def test_sign_does_not_mutate_original():
    """sign() should not mutate the caller's dict."""
    payload = {"mode": "test", "spectrum_id": "x"}
    original_keys = set(payload.keys())
    sign(payload)
    assert set(payload.keys()) == original_keys

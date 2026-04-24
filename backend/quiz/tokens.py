"""
quiz/tokens.py — Stateless HMAC-signed question tokens.

Tokens are base64url(json(payload)) + "." + hmac-sha256-hex.
TTL is 600 seconds from issue time.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time

SECRET = os.environ.get("SECRET_KEY", "dev-only-secret-change-me").encode()
TTL = 600  # seconds


class TokenError(ValueError): ...


class MalformedToken(TokenError): ...


class InvalidSignature(TokenError): ...


class TokenExpired(TokenError): ...


def sign(payload: dict) -> str:
    """Sign a payload dict and return a token string."""
    payload = {**payload, "exp": int(time.time()) + TTL}
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hmac.new(SECRET, body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def verify(token: str) -> dict:
    """Verify a token string and return its payload dict.

    Raises:
        MalformedToken: if the token structure is invalid.
        InvalidSignature: if the HMAC does not match.
        TokenExpired: if the exp claim is in the past.
    """
    try:
        body, sig = token.rsplit(".", 1)
    except ValueError as e:
        raise MalformedToken("Malformed token") from e
    expected = hmac.new(SECRET, body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise InvalidSignature("Invalid signature")
    try:
        payload = json.loads(base64.urlsafe_b64decode(body))
    except (ValueError, TypeError) as e:
        raise MalformedToken("Malformed token body") from e
    if payload.get("exp", 0) < int(time.time()):
        raise TokenExpired("Token expired")
    return payload

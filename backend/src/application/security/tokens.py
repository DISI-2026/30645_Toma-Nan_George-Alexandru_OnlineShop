from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta


class InvalidAccessTokenError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class AuthTokenPayload:
    user_id: int
    role: str
    expires_at: datetime


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def create_access_token(*, user_id: int, role: str, secret_key: str, expires_in_minutes: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_in_minutes)).timestamp()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64url_encode(payload_bytes)
    signature = hmac.new(secret_key.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64url_encode(signature)}"


def decode_access_token(token: str, *, secret_key: str) -> AuthTokenPayload:
    try:
        payload_b64, signature_b64 = token.split(".", maxsplit=1)
    except ValueError as exc:
        raise InvalidAccessTokenError("Malformed token.") from exc

    expected_signature = hmac.new(
        secret_key.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).digest()
    provided_signature = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise InvalidAccessTokenError("Invalid signature.")

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        user_id = int(payload["sub"])
        role = str(payload["role"])
        exp = int(payload["exp"])
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise InvalidAccessTokenError("Invalid payload.") from exc

    expires_at = datetime.fromtimestamp(exp, tz=UTC)
    if datetime.now(UTC) >= expires_at:
        raise InvalidAccessTokenError("Token expired.")

    return AuthTokenPayload(user_id=user_id, role=role, expires_at=expires_at)


def create_password_reset_token() -> str:
    return secrets.token_urlsafe(48)


def hash_password_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


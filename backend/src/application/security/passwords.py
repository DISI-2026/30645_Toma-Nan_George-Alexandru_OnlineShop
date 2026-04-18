from __future__ import annotations

import hashlib
import hmac
import secrets

PBKDF2_PREFIX = "pbkdf2_sha256"
DEFAULT_ITERATIONS = 390000


def hash_password_pbkdf2(password: str, *, iterations: int = DEFAULT_ITERATIONS) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    )
    return f"{PBKDF2_PREFIX}${iterations}${salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith(f"{PBKDF2_PREFIX}$"):
        parts = password_hash.split("$")
        if len(parts) != 4:
            return False

        _, iteration_str, salt, expected_hash = parts
        try:
            iterations = int(iteration_str)
        except ValueError:
            return False

        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
        )
        return hmac.compare_digest(digest.hex(), expected_hash)

    # Temporary fallback for pre-existing data that may not be stored in PBKDF2 format.
    return hmac.compare_digest(password, password_hash)

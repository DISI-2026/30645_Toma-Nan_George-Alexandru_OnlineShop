from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status

from application.security.tokens import InvalidAccessTokenError
from application.security import decode_access_token

ACCESS_TOKEN_COOKIE_NAME = "access_token"
AUTH_COOKIE_PATH = "/"
AUTH_COOKIE_SAMESITE = "lax"


@dataclass(frozen=True, slots=True)
class AuthContext:
    user_id: int
    role: str


async def get_auth_context(request: Request) -> AuthContext:
    access_token = None
    authorization = request.headers.get("Authorization")
    if authorization:
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials:
            access_token = credentials.strip()

    if not access_token:
        access_token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token.",
        )

    settings = request.app.state.settings
    secret_key = settings.auth_secret_key
    try:
        payload = decode_access_token(access_token, secret_key=secret_key)
    except InvalidAccessTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
        ) from exc

    return AuthContext(user_id=payload.user_id, role=payload.role)


def require_roles(*allowed_roles: str):
    async def _require_roles(
        auth_context: AuthContext = Depends(get_auth_context),
    ) -> AuthContext:
        if auth_context.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return auth_context

    return _require_roles


async def get_optional_auth_context(request: Request) -> AuthContext | None:
    try:
        return await get_auth_context(request)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            return None
        raise

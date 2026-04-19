from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from application.security.tokens import InvalidAccessTokenError
from application.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class AuthContext:
    user_id: int
    role: str


async def get_auth_context(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthContext:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token.",
        )

    settings = request.app.state.settings
    secret_key = settings.auth_secret_key
    try:
        payload = decode_access_token(credentials.credentials, secret_key=secret_key)
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

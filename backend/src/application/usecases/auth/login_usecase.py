from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.auth import LoginRequestDTO, LoginResultDTO, LoggedInUserDTO
from application.exceptions import InvalidCredentialsError
from application.security import create_access_token, verify_password
from models import User


class LoginUseCase:
    def __init__(
        self,
        session: AsyncSession,
        *,
        secret_key: str,
        access_token_ttl_minutes: int,
    ) -> None:
        self._session = session
        self._secret_key = secret_key
        self._access_token_ttl_minutes = access_token_ttl_minutes

    async def execute(self, request: LoginRequestDTO) -> LoginResultDTO:
        statement = select(User).where(User.email == request.email)
        result = await self._session.execute(statement)
        user = result.scalar_one_or_none()
        if user is None:
            raise InvalidCredentialsError("Invalid credentials.")

        if not verify_password(request.password, user.password_hash):
            raise InvalidCredentialsError("Invalid credentials.")

        access_token = create_access_token(
            user_id=user.id,
            role=user.role.value,
            secret_key=self._secret_key,
            expires_in_minutes=self._access_token_ttl_minutes,
        )
        return LoginResultDTO(
            access_token=access_token,
            user=LoggedInUserDTO(
                id=user.id,
                email=user.email,
                role=user.role.value,
            ),
        )

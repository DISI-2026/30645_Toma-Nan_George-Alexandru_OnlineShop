from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.auth import ResetPasswordRequestDTO, ResetPasswordResponseDTO
from application.security import (
    hash_password_pbkdf2,
    hash_password_reset_token,
    password_matches_minimum_requirements,
)
from models import PasswordResetToken, User


class InvalidOrExpiredResetTokenError(Exception):
    pass


class PasswordDoesNotMatchMinimumRequirementsError(Exception):
    pass


class ResetPasswordUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, request: ResetPasswordRequestDTO) -> ResetPasswordResponseDTO:
        now = datetime.now(UTC)
        token_hash = hash_password_reset_token(request.token)

        statement = (
            select(PasswordResetToken, User)
            .join(User, User.id == PasswordResetToken.user_id)
            .where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
        )
        match = (await self._session.execute(statement)).first()
        if match is None:
            raise InvalidOrExpiredResetTokenError("Invalid or expired token.")

        token_entry, user = match
        if not password_matches_minimum_requirements(request.new_password):
            raise PasswordDoesNotMatchMinimumRequirementsError(
                "Password doesnt match minimum requirements."
            )

        user.password_hash = hash_password_pbkdf2(request.new_password)
        token_entry.used_at = now

        invalidate_other_tokens = (
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.id != token_entry.id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=now)
        )
        await self._session.execute(invalidate_other_tokens)

        return ResetPasswordResponseDTO(message="Parola a fost resetată cu succes")

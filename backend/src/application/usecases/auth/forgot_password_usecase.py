from __future__ import annotations

import asyncio
import logging
import smtplib
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.auth import ForgotPasswordRequestDTO, ForgotPasswordResponseDTO
from application.security import create_password_reset_token, hash_password_reset_token
from backend.config import Settings
from models import PasswordResetToken, User

logger = logging.getLogger(__name__)


class ForgotPasswordUseCase:
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings,
    ) -> None:
        self._session = session
        self._settings = settings

    async def execute(self, request: ForgotPasswordRequestDTO) -> ForgotPasswordResponseDTO:
        statement = select(User).where(User.email == request.email)
        user = (await self._session.execute(statement)).scalar_one_or_none()
        if user is None:
            return ForgotPasswordResponseDTO(message="Email trimis cu succes")

        raw_token = create_password_reset_token()
        token_hash = hash_password_reset_token(raw_token)
        now = datetime.now(UTC)

        invalidate_previous_tokens = (
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=now)
        )
        await self._session.execute(invalidate_previous_tokens)

        self._session.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=now
                + timedelta(minutes=self._settings.password_reset_token_ttl_minutes),
            )
        )

        reset_url = (
            f"{self._settings.frontend_base_url.rstrip('/')}/reset-password?token={raw_token}"
        )
        await self._send_email(recipient=user.email, reset_url=reset_url)
        return ForgotPasswordResponseDTO(message="Email trimis cu succes")

    async def _send_email(self, *, recipient: str, reset_url: str) -> None:
        message = EmailMessage()
        message["Subject"] = "Resetare parola"
        message["From"] = self._settings.smtp_from_email
        message["To"] = recipient
        message.set_content(
            "Am primit o cerere de resetare a parolei.\n\n"
            f"Accesati acest link pentru a seta o parola noua:\n{reset_url}\n"
        )
        smtp_hosts = [self._settings.smtp_host]
        if self._settings.smtp_host != "localhost":
            smtp_hosts.append("localhost")

        for smtp_host in smtp_hosts:
            try:
                await asyncio.to_thread(self._send_smtp_message, message, smtp_host)
                return
            except Exception:
                continue

        logger.warning(
            "Failed to deliver password reset email to %s. Reset URL: %s",
            recipient,
            reset_url,
            exc_info=True,
        )

    def _send_smtp_message(self, message: EmailMessage, smtp_host: str) -> None:
        with smtplib.SMTP(smtp_host, self._settings.smtp_port, timeout=2) as smtp:
            smtp.send_message(message)

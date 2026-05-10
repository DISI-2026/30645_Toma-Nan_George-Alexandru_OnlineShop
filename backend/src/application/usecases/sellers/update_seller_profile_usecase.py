from __future__ import annotations

import uuid
from pathlib import Path
from typing import Final

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.sellers import UpdateSellerProfileRequestDTO, UpdateSellerProfileResponseDTO
from application.dtos.sellers.get_seller_profile_dto import SellerCategoryDTO
from application.exceptions import (
    InvalidFieldError,
    InvalidLogoTypeError,
    LogoTooLargeError,
    SellerProfileNotFoundError,
)
from models import Seller, User

ALLOWED_LOGO_TYPES: Final[dict[str, str]] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class UpdateSellerProfileUseCase:
    def __init__(
        self,
        session: AsyncSession,
        *,
        media_root: Path,
        max_logo_size_bytes: int = 2 * 1024 * 1024,
    ) -> None:
        self._session = session
        self._media_root = media_root
        self._max_logo_size_bytes = max_logo_size_bytes

    async def execute(
        self,
        user_id: int,
        request: UpdateSellerProfileRequestDTO,
        logo: UploadFile | None = None,
    ) -> UpdateSellerProfileResponseDTO:
        user = await self._get_user(user_id)
        seller = await self._get_seller_by_user_id(user_id)
        if seller is None:
            raise SellerProfileNotFoundError(
                "Seller profile not yet created. Use POST /sellers/me to create one."
            )

        if request.company_name is not None:
            self._validate_company_name(request.company_name)
            seller.company_name = request.company_name.strip()

        self._validate_optional_fields(
            description=request.description,
            phone=request.phone,
            address=request.address,
            tax_id=request.tax_id,
        )

        if request.description is not None:
            seller.description = self._clean_optional(request.description)
        if request.phone is not None:
            seller.phone = self._clean_optional(request.phone)
        if request.address is not None:
            seller.address = self._clean_optional(request.address)
        if request.tax_id is not None:
            seller.tax_id = self._clean_optional(request.tax_id)

        old_logo_path = None
        new_logo_path = None
        if logo is not None:
            old_logo_path = seller.logo_path
            new_logo_path = await self._store_logo(logo)
            seller.logo_path = new_logo_path

        try:
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            if new_logo_path is not None:
                self._delete_logo(new_logo_path)
            raise

        if old_logo_path:
            self._delete_logo(old_logo_path)

        categories, avg_rating, total_products = await self._get_public_metrics(seller.id)

        return UpdateSellerProfileResponseDTO(
            id=seller.id,
            company_name=seller.company_name,
            description=seller.description,
            logo_url=seller.logo_path,
            categories=categories,
            avg_rating=avg_rating,
            total_products=total_products,
            member_since=seller.created_at,
            email=user.email,
            phone=seller.phone,
            address=seller.address,
            tax_id=seller.tax_id,
        )

    async def _get_user(self, user_id: int) -> User:
        user = await self._session.get(User, user_id)
        if user is None:
            raise ValueError("User not found.")
        if user.role.value != "seller":
            raise ValueError("User is not a seller.")
        return user

    async def _get_seller_by_user_id(self, user_id: int) -> Seller | None:
        result = await self._session.execute(
            select(Seller).where(Seller.user_id == user_id)
        )
        return result.scalar_one_or_none()

    def _validate_company_name(self, company_name: str) -> None:
        value = company_name.strip()
        if len(value) < 2 or len(value) > 200:
            raise InvalidFieldError("company_name", "Must be between 2 and 200 characters.")

    def _validate_optional_fields(
        self,
        *,
        description: str | None,
        phone: str | None,
        address: str | None,
        tax_id: str | None,
    ) -> None:
        self._validate_max_length("description", description, 2000)
        self._validate_max_length("address", address, 500)
        self._validate_max_length("tax_id", tax_id, 20)
        self._validate_phone(phone)

    def _validate_phone(self, phone: str | None) -> None:
        if phone is None:
            return
        value = phone.strip()
        if not value:
            return
        allowed_chars = set("0123456789+ -()")
        if any(char not in allowed_chars for char in value):
            raise InvalidFieldError("phone", "Invalid phone number.")

    def _validate_max_length(self, field: str, value: str | None, max_length: int) -> None:
        if value is not None and len(value.strip()) > max_length:
            raise InvalidFieldError(field, f"Must be at most {max_length} characters.")

    async def _store_logo(self, logo: UploadFile) -> str:
        content_type = logo.content_type or ""
        file_extension = ALLOWED_LOGO_TYPES.get(content_type)
        if file_extension is None:
            raise InvalidLogoTypeError("Only jpg, png, and webp files are allowed.")

        content = await logo.read()
        if len(content) > self._max_logo_size_bytes:
            raise LogoTooLargeError("Logo must be at most 2 MB.")

        seller_media_root = self._media_root / "sellers"
        seller_media_root.mkdir(parents=True, exist_ok=True)

        file_name = f"logo_{uuid.uuid4().hex}{file_extension}"
        file_path = seller_media_root / file_name
        file_path.write_bytes(content)
        return f"/media/sellers/{file_name}"

    def _delete_logo(self, logo_path: str | None) -> None:
        if not logo_path:
            return
        relative_path = logo_path.removeprefix("/media/")
        file_path = self._media_root / relative_path
        if file_path.exists():
            file_path.unlink()

    def _clean_optional(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    async def _get_public_metrics(
        self,
        seller_id: int,
    ) -> tuple[list[SellerCategoryDTO], float, int]:
        return ([], 0.0, 0)

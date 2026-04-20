from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.sellers import SellerProfilePublicDTO, SellerProfilePrivateDTO
from application.dtos.sellers.get_seller_profile_dto import SellerCategoryDTO
from models import Seller, User


class SellerProfileNotFoundError(Exception):
    pass


class GetSellerProfileUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_public_profile(self, seller_id: int) -> SellerProfilePublicDTO:
        seller = await self._session.get(Seller, seller_id)
        if seller is None:
            raise SellerProfileNotFoundError("Seller profile not found.")

        categories, avg_rating, total_products = await self._get_public_metrics(seller.id)

        return SellerProfilePublicDTO(
            id=seller.id,
            company_name=seller.company_name,
            description=seller.description,
            logo_url=seller.logo_path,
            categories=categories,
            avg_rating=avg_rating,
            total_products=total_products,
            member_since=seller.created_at,
        )

    async def get_private_profile(self, user_id: int) -> SellerProfilePrivateDTO:
        user = await self._get_user(user_id)
        seller = await self._get_seller_by_user_id(user_id)
        if seller is None:
            raise SellerProfileNotFoundError(
                "Seller profile not yet created. Use POST /sellers/me to create one."
            )

        categories, avg_rating, total_products = await self._get_public_metrics(seller.id)

        return SellerProfilePrivateDTO(
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

    async def _get_public_metrics(
        self,
        seller_id: int,
    ) -> tuple[list[SellerCategoryDTO], float, int]:
        return ([], 0.0, 0)

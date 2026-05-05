from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.auth import (
    RegisterBuyerRequestDTO,
    RegisterRequestDTO,
    RegisterResponseDTO,
    RegisterSellerRequestDTO,
    RegisteredUserDTO,
)
from application.security import hash_password_pbkdf2
from models import Buyer, Category, Seller, User, UserRole


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidBuyerPreferenceCategoriesError(Exception):
    pass


class RegisterUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, request: RegisterRequestDTO) -> RegisterResponseDTO:
        existing_user_statement = select(User.id).where(User.email == request.email)
        existing_user = (
            await self._session.execute(existing_user_statement)
        ).scalar_one_or_none()
        if existing_user is not None:
            raise EmailAlreadyRegisteredError("Email is already in use.")

        role = (
            UserRole.BUYER
            if isinstance(request, RegisterBuyerRequestDTO)
            else UserRole.SELLER
        )
        user = User(
            email=request.email,
            password_hash=hash_password_pbkdf2(request.password),
            role=role,
        )
        self._session.add(user)
        await self._session.flush()

        if isinstance(request, RegisterBuyerRequestDTO):
            category_ids = sorted(set(request.preferred_category_ids))
            preferred_categories: list[Category] = []
            if category_ids:
                categories_statement = select(Category).where(
                    Category.id.in_(category_ids)
                )
                preferred_categories = list(
                    (await self._session.execute(categories_statement)).scalars()
                )

                if len(preferred_categories) != len(category_ids):
                    found_ids = {category.id for category in preferred_categories}
                    missing_ids = [
                        category_id
                        for category_id in category_ids
                        if category_id not in found_ids
                    ]
                    raise InvalidBuyerPreferenceCategoriesError(
                        f"Invalid preferred categories: {missing_ids}."
                    )

            self._session.add(
                Buyer(
                    user_id=user.id,
                    address=request.address,
                    preferred_categories=preferred_categories,
                )
            )
        else:
            seller_request = request
            if not isinstance(seller_request, RegisterSellerRequestDTO):
                raise TypeError("Unsupported register payload type.")
            self._session.add(
                Seller(
                    user_id=user.id,
                    company_name=seller_request.company_name,
                    description=seller_request.description,
                )
            )

        return RegisterResponseDTO(
            user=RegisteredUserDTO(
                id=user.id,
                email=user.email,
                role=user.role.value,
            )
        )

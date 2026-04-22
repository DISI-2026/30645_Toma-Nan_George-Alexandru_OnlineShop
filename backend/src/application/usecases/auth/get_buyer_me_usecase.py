from __future__ import annotations

from application.dtos.auth.me_dto import (
    BuyerFavoriteCategoryDTO,
    BuyerMeDTO,
    BuyerPreferencesDTO,
    BuyerPriceRangeDTO,
)
from models import User


class GetBuyerMeUseCase:
    def execute(self, user: User) -> BuyerMeDTO | None:
        if user.buyer is None:
            return None

        favorite_categories = sorted(
            user.buyer.preferred_categories,
            key=lambda category: category.id,
        )
        return BuyerMeDTO(
            id=user.buyer.id,
            full_name=user.buyer.full_name,
            email=user.email,
            phone=user.buyer.phone,
            address=user.buyer.address,
            preferences=BuyerPreferencesDTO(
                favorite_categories=[
                    BuyerFavoriteCategoryDTO(
                        category_id=category.id,
                        category_name=category.name,
                    )
                    for category in favorite_categories
                ],
                price_range=BuyerPriceRangeDTO(
                    min=user.buyer.preferred_price_min,
                    max=user.buyer.preferred_price_max,
                ),
            ),
            created_at=user.buyer.created_at,
        )

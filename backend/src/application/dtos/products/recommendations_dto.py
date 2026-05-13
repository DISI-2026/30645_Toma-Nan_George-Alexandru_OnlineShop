from typing import Literal

from pydantic import BaseModel

from .list_products_dto import ProductListItemDTO


class GetProductRecommendationsResponseDTO(BaseModel):
    recommendations: list[ProductListItemDTO]
    source: Literal["personalized", "popular"]

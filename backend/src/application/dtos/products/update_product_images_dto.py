from __future__ import annotations

from pydantic import BaseModel, Field


class UpdateProductImageDTO(BaseModel):
    id: int = Field(..., gt=0)
    display_order: int = Field(..., ge=0)
    is_thumbnail: bool


class UpdateProductImagesRequestDTO(BaseModel):
    images: list[UpdateProductImageDTO]

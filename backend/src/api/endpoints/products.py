from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Body, Depends, File, Form, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.dependencies.db import get_db_session
from api.dependencies.seller import get_current_seller
from api.exception_handler import handle_route_exceptions
from application.dtos.products import (
    CreateProductRequestDTO,
    CreateProductResponseDTO,
    UpdateProductImagesRequestDTO,
    UpdateProductRequestDTO,
    UpdateProductResponseDTO,
)
from application.usecases.products import (
    CreateProductUseCase,
    ProcessImagesUseCase,
    UpdateProductImagesUseCase,
    UpdateProductUseCase,
)
from models import Product, Seller

router = APIRouter(prefix="/sellers/me/products", tags=["products"])


@router.post("", response_model=CreateProductResponseDTO, status_code=status.HTTP_201_CREATED)
@handle_route_exceptions()
async def create_product(
    seller: Annotated[Seller, Depends(get_current_seller)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    title: Annotated[str, Form(...)],
    description: Annotated[str, Form(...)],
    price: Annotated[Decimal, Form(...)],
    stock: Annotated[int, Form(...)],
    category_id: Annotated[int, Form(...)],
    images: list[UploadFile] = File(default=[]),
) -> CreateProductResponseDTO:
    request_dto = CreateProductRequestDTO(
        title=title,
        description=description,
        price=price,
        stock=stock,
        category_id=category_id,
    )
    
    create_product_usecase = CreateProductUseCase(session)
    product = await create_product_usecase.execute(seller.id, request_dto)
    
    process_images_usecase = ProcessImagesUseCase(session)
    await process_images_usecase.execute(product, images)
    
    result = await session.execute(
        select(Product).where(Product.id == product.id).options(selectinload(Product.images))
    )
    product_with_images = result.scalar_one()
    
    return CreateProductResponseDTO.model_validate(product_with_images)


@router.patch("/{product_id}/images", response_model=CreateProductResponseDTO)
@handle_route_exceptions()
async def update_product_images(
    product_id: int,
    seller: Annotated[Seller, Depends(get_current_seller)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    request: UpdateProductImagesRequestDTO = Body(...),
) -> CreateProductResponseDTO:
    use_case = UpdateProductImagesUseCase(session)
    product = await use_case.execute(seller.id, product_id, request)
    return CreateProductResponseDTO.model_validate(product)


@router.patch("/{product_id}", response_model=UpdateProductResponseDTO)
@handle_route_exceptions()
async def update_product(
    product_id: int,
    seller: Annotated[Seller, Depends(get_current_seller)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    request: UpdateProductRequestDTO = Body(...),
) -> UpdateProductResponseDTO:
    use_case = UpdateProductUseCase(session)
    return await use_case.execute(seller.id, product_id, request)

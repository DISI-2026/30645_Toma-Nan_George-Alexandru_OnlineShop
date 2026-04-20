from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.sellers import (
    CreateSellerProfileRequestDTO,
    CreateSellerProfileResponseDTO,
    SellerProfilePublicDTO,
    SellerProfilePrivateDTO,
    UpdateSellerProfileRequestDTO,
    UpdateSellerProfileResponseDTO,
)
from application.usecases.sellers import (
    CreateSellerProfileUseCase,
    GetSellerProfileUseCase,
    UpdateSellerProfileUseCase,
)
from backend.config import Settings

router = APIRouter(prefix="/sellers", tags=["sellers"])


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


@router.get("/me", response_model=SellerProfilePrivateDTO)
@handle_route_exceptions()
async def get_private_seller_profile(
    auth_context: Annotated[AuthContext, Depends(require_roles("seller"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SellerProfilePrivateDTO:
    use_case = GetSellerProfileUseCase(session)
    return await use_case.get_private_profile(auth_context.user_id)


@router.post("/me", response_model=CreateSellerProfileResponseDTO, status_code=status.HTTP_201_CREATED)
@handle_route_exceptions()
async def create_seller_profile(
    auth_context: Annotated[AuthContext, Depends(require_roles("seller"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    company_name: Annotated[str, Form(...)],
    description: Annotated[str | None, Form()] = None,
    phone: Annotated[str | None, Form()] = None,
    address: Annotated[str | None, Form()] = None,
    tax_id: Annotated[str | None, Form()] = None,
    logo: UploadFile | None = File(default=None),
) -> CreateSellerProfileResponseDTO:
    use_case = CreateSellerProfileUseCase(
        session,
        media_root=settings.media_root,
        max_logo_size_bytes=settings.max_logo_size_bytes,
    )
    request_dto = CreateSellerProfileRequestDTO(
        company_name=company_name,
        description=description,
        phone=phone,
        address=address,
        tax_id=tax_id,
    )
    return await use_case.execute(auth_context.user_id, request_dto, logo)


@router.get("/{seller_id}", response_model=SellerProfilePublicDTO)
@handle_route_exceptions()
async def get_public_seller_profile(
    seller_id: int,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SellerProfilePublicDTO:
    use_case = GetSellerProfileUseCase(session)
    return await use_case.get_public_profile(seller_id)


@router.patch("/me", response_model=UpdateSellerProfileResponseDTO)
@handle_route_exceptions()
async def update_seller_profile(
    auth_context: Annotated[AuthContext, Depends(require_roles("seller"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    company_name: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
    phone: Annotated[str | None, Form()] = None,
    address: Annotated[str | None, Form()] = None,
    tax_id: Annotated[str | None, Form()] = None,
    logo: UploadFile | None = File(default=None),
) -> UpdateSellerProfileResponseDTO:
    use_case = UpdateSellerProfileUseCase(
        session,
        media_root=settings.media_root,
        max_logo_size_bytes=settings.max_logo_size_bytes,
    )
    request_dto = UpdateSellerProfileRequestDTO(
        company_name=company_name,
        description=description,
        phone=phone,
        address=address,
        tax_id=tax_id,
    )
    return await use_case.execute(auth_context.user_id, request_dto, logo)

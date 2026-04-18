from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.db import get_db_session
from application.dtos.auth import (
    LoginRequestDTO,
    LoginResponseDTO,
    RegisterRequestDTO,
    RegisterResponseDTO,
)
from application.usecases.auth import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidBuyerPreferenceCategoriesError,
    LoginUseCase,
    RegisterUseCase,
)
from backend.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=RegisterResponseDTO, status_code=status.HTTP_201_CREATED
)
async def register(
    request: RegisterRequestDTO,
    session: AsyncSession = Depends(get_db_session),
) -> RegisterResponseDTO:
    use_case = RegisterUseCase(session)
    try:
        return await use_case.execute(request)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        ) from exc
    except InvalidBuyerPreferenceCategoriesError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/login", response_model=LoginResponseDTO)
async def login(
    http_request: Request,
    request: LoginRequestDTO,
    session: AsyncSession = Depends(get_db_session),
) -> LoginResponseDTO:
    settings = http_request.app.state.settings
    use_case = LoginUseCase(
        session,
        secret_key=settings.auth_secret_key,
        access_token_ttl_minutes=settings.access_token_ttl_minutes,
    )

    try:
        return await use_case.execute(request)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        ) from exc

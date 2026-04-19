from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.auth import (
    LoginRequestDTO,
    LoginResponseDTO,
    RegisterRequestDTO,
    RegisterResponseDTO,
)
from application.usecases.auth import (
    LoginUseCase,
    RegisterUseCase,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=RegisterResponseDTO, status_code=status.HTTP_201_CREATED
)
@handle_route_exceptions()
async def register(
    request: RegisterRequestDTO,
    session: AsyncSession = Depends(get_db_session),
) -> RegisterResponseDTO:
    use_case = RegisterUseCase(session)
    return await use_case.execute(request)


@router.post("/login", response_model=LoginResponseDTO)
@handle_route_exceptions()
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

    return await use_case.execute(request)

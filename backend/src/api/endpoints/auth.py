from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.auth import (
    ForgotPasswordRequestDTO,
    ForgotPasswordResponseDTO,
    LoginRequestDTO,
    LoginResponseDTO,
    ResetPasswordRequestDTO,
    ResetPasswordResponseDTO,
    RegisterRequestDTO,
    RegisterResponseDTO,
)
from application.usecases.auth import (
    ForgotPasswordUseCase,
    LoginUseCase,
    RegisterUseCase,
    ResetPasswordUseCase,
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


@router.post("/forgot-password", response_model=ForgotPasswordResponseDTO)
@handle_route_exceptions()
async def forgot_password(
    http_request: Request,
    request: ForgotPasswordRequestDTO,
    session: AsyncSession = Depends(get_db_session),
) -> ForgotPasswordResponseDTO:
    settings = http_request.app.state.settings
    use_case = ForgotPasswordUseCase(session, settings)
    return await use_case.execute(request)


@router.post("/reset-password", response_model=ResetPasswordResponseDTO)
@handle_route_exceptions()
async def reset_password(
    request: ResetPasswordRequestDTO,
    session: AsyncSession = Depends(get_db_session),
) -> ResetPasswordResponseDTO:
    use_case = ResetPasswordUseCase(session)
    return await use_case.execute(request)

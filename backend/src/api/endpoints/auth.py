from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import (
    ACCESS_TOKEN_COOKIE_NAME,
    AUTH_COOKIE_PATH,
    AUTH_COOKIE_SAMESITE,
)
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
    response: Response,
    request: LoginRequestDTO,
    session: AsyncSession = Depends(get_db_session),
) -> LoginResponseDTO:
    settings = http_request.app.state.settings
    use_case = LoginUseCase(
        session,
        secret_key=settings.auth_secret_key,
        access_token_ttl_minutes=settings.access_token_ttl_minutes,
    )
    login_result = await use_case.execute(request)
    cookie_max_age_seconds = settings.access_token_ttl_minutes * 60

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=login_result.access_token,
        httponly=True,
        max_age=cookie_max_age_seconds,
        path=AUTH_COOKIE_PATH,
        samesite=AUTH_COOKIE_SAMESITE,
    )
    return LoginResponseDTO(user=login_result.user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        path=AUTH_COOKIE_PATH,
        samesite=AUTH_COOKIE_SAMESITE,
    )

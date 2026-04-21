from __future__ import annotations

import inspect
import logging
from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar, cast

from fastapi import HTTPException, status

from backend.api.errors import APIError
from application.usecases.auth import (
    EmailAlreadyRegisteredError,
    InvalidBuyerPreferenceCategoriesError,
    InvalidCredentialsError,
)
from api.dependencies.seller import SellerNotFoundError
from application.usecases.products import (
    CategoryNotFoundError,
    InvalidFieldError,
    ProductNotFoundError,
    ProductNotOwnedBySellerError,
)
from application.usecases.sellers import (
    SellerProfileAlreadyExistsError,
    SellerProfileNotFoundError,
)

logger = logging.getLogger(__name__)

P = ParamSpec("P")
R = TypeVar("R")


def handle_route_exceptions() -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        signature = inspect.signature(func)

        if inspect.iscoroutinefunction(func):

            @wraps(func)
            async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> Any:
                try:
                    return await cast(Any, func)(*args, **kwargs)
                except APIError:
                    raise
                except HTTPException:
                    raise
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
                except InvalidCredentialsError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid email or password.",
                    ) from exc
                except SellerProfileAlreadyExistsError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Seller profile already exists.",
                    ) from exc
                except SellerProfileNotFoundError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=str(exc),
                    ) from exc
                except (ProductNotFoundError, SellerNotFoundError) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=str(exc),
                    ) from exc
                except ProductNotOwnedBySellerError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=str(exc),
                    ) from exc
                except (CategoryNotFoundError, InvalidFieldError) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(exc),
                    ) from exc
                except Exception as exc:
                    logger.exception(
                        "Unhandled exception in route %s",
                        getattr(func, "__name__", "<unknown>"),
                    )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Internal server error.",
                    ) from exc

            async_wrapper.__signature__ = signature  # type: ignore[attr-defined]
            return cast(Callable[P, R], async_wrapper)

        @wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> Any:
            try:
                return func(*args, **kwargs)
            except APIError:
                raise
            except HTTPException:
                raise
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
            except InvalidCredentialsError as exc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password.",
                ) from exc
            except SellerProfileAlreadyExistsError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Seller profile already exists.",
                ) from exc
            except SellerProfileNotFoundError as exc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(exc),
                ) from exc
            except Exception as exc:
                logger.exception(
                    "Unhandled exception in route %s",
                    getattr(func, "__name__", "<unknown>"),
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Internal server error.",
                ) from exc

        sync_wrapper.__signature__ = signature  # type: ignore[attr-defined]
        return cast(Callable[P, R], sync_wrapper)

    return decorator

from __future__ import annotations

import inspect
import logging
from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar, cast

from fastapi import HTTPException, status
from pydantic import ValidationError

from application.exceptions import (
    AdminSellerCategoryNotFoundError,
    AdminSellerNotFoundError,
    BuyerProfileNotFoundError,
    CartBuyerProfileNotFoundError,
    CartEmptyError,
    CartItemNotFoundError,
    CartProductNotFoundError,
    CartQuantityExceedsStockError,
    CategoryAlreadyExistsError,
    CategoryDeleteBlockedError,
    CategoryNotFoundError,
    DuplicateSlugError,
    EmailAlreadyRegisteredError,
    ImageTooLargeError,
    InsufficientStockError,
    InvalidBuyerPreferenceCategoriesError,
    InvalidCategoryFieldError,
    InvalidCredentialsError,
    InvalidFieldError,
    InvalidImageFormatError,
    InvalidLogoTypeError,
    InvalidOrderStatusTransitionError,
    InvalidOrExpiredResetTokenError,
    InvalidSalesStatsQueryError,
    LogoTooLargeError,
    ManagedCategoryNotFoundError,
    NotificationAccessDeniedError,
    NotificationNotFoundError,
    OrderAccessDeniedError,
    OrderNotFoundError,
    PasswordDoesNotMatchMinimumRequirementsError,
    ProductNotFoundError,
    ProductNotOwnedBySellerError,
    ReviewAlreadyExistsError,
    ReviewBuyerProfileNotFoundError,
    ReviewEligibilityError,
    ReviewNotFoundError,
    ReviewNotOwnedBySellerError,
    ReviewReplyAlreadyExistsError,
    SellerCategoryAssignmentAlreadyExistsError,
    SellerCategoryAssignmentDeleteBlockedError,
    SellerCategoryAssignmentNotFoundError,
    SellerCategoryMismatchError,
    SellerProfileAlreadyExistsError,
    SellerProfileNotFoundError,
    TooManyImagesError,
)
from api.dependencies.seller import SellerNotFoundError
from backend.api.errors import APIError

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
                except (
                    InvalidBuyerPreferenceCategoriesError,
                    InvalidOrExpiredResetTokenError,
                    PasswordDoesNotMatchMinimumRequirementsError,
                ) as exc:
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
                except (
                    SellerProfileNotFoundError,
                    AdminSellerNotFoundError,
                    AdminSellerCategoryNotFoundError,
                    SellerCategoryAssignmentNotFoundError,
                ) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=str(exc),
                    ) from exc
                except ManagedCategoryNotFoundError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=str(exc),
                    ) from exc
                except CategoryAlreadyExistsError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=str(exc),
                    ) from exc
                except SellerCategoryAssignmentAlreadyExistsError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=str(exc),
                    ) from exc
                except CategoryDeleteBlockedError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=str(exc),
                    ) from exc
                except SellerCategoryAssignmentDeleteBlockedError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=str(exc),
                    ) from exc
                except (
                    OrderNotFoundError,
                    BuyerProfileNotFoundError,
                    NotificationNotFoundError,
                ) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=str(exc),
                    ) from exc
                except (
                    CartProductNotFoundError,
                    CartItemNotFoundError,
                    CartBuyerProfileNotFoundError,
                    ReviewBuyerProfileNotFoundError,
                ) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=str(exc),
                    ) from exc
                except (
                    ProductNotFoundError,
                    SellerNotFoundError,
                    CategoryNotFoundError,
                    ReviewNotFoundError,
                ) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=str(exc),
                    ) from exc
                except OrderAccessDeniedError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=str(exc),
                    ) from exc
                except NotificationAccessDeniedError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=str(exc),
                    ) from exc
                except ProductNotOwnedBySellerError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=str(exc),
                    ) from exc
                except SellerCategoryMismatchError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=str(exc),
                    ) from exc
                except ReviewNotOwnedBySellerError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=str(exc),
                    ) from exc
                except DuplicateSlugError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=str(exc),
                    ) from exc
                except (ReviewReplyAlreadyExistsError, ReviewAlreadyExistsError) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=str(exc),
                    ) from exc
                except InvalidOrderStatusTransitionError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=str(exc),
                    ) from exc
                except (
                    CartQuantityExceedsStockError,
                    CartEmptyError,
                    InsufficientStockError,
                    ReviewEligibilityError,
                ) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=str(exc),
                    ) from exc
                except (
                    InvalidFieldError,
                    InvalidImageFormatError,
                    ImageTooLargeError,
                    InvalidLogoTypeError,
                    LogoTooLargeError,
                    TooManyImagesError,
                    InvalidCategoryFieldError,
                    InvalidSalesStatsQueryError,
                ) as exc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(exc),
                    ) from exc
                except ValidationError as exc:
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
            except (
                InvalidBuyerPreferenceCategoriesError,
                InvalidOrExpiredResetTokenError,
                PasswordDoesNotMatchMinimumRequirementsError,
            ) as exc:
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
            except (
                SellerProfileNotFoundError,
                AdminSellerNotFoundError,
                AdminSellerCategoryNotFoundError,
                SellerCategoryAssignmentNotFoundError,
            ) as exc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(exc),
                ) from exc
            except ManagedCategoryNotFoundError as exc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(exc),
                ) from exc
            except CategoryAlreadyExistsError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=str(exc),
                ) from exc
            except SellerCategoryAssignmentAlreadyExistsError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=str(exc),
                ) from exc
            except CategoryDeleteBlockedError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(exc),
                ) from exc
            except SellerCategoryAssignmentDeleteBlockedError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(exc),
                ) from exc
            except (
                ProductNotFoundError,
                SellerNotFoundError,
                CategoryNotFoundError,
                ReviewNotFoundError,
            ) as exc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(exc),
                ) from exc
            except (
                OrderNotFoundError,
                BuyerProfileNotFoundError,
                NotificationNotFoundError,
            ) as exc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(exc),
                ) from exc
            except (
                CartProductNotFoundError,
                CartItemNotFoundError,
                CartBuyerProfileNotFoundError,
                ReviewBuyerProfileNotFoundError,
            ) as exc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(exc),
                ) from exc
            except OrderAccessDeniedError as exc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=str(exc),
                ) from exc
            except NotificationAccessDeniedError as exc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=str(exc),
                ) from exc
            except ProductNotOwnedBySellerError as exc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=str(exc),
                ) from exc
            except SellerCategoryMismatchError as exc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=str(exc),
                ) from exc
            except ReviewNotOwnedBySellerError as exc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=str(exc),
                ) from exc
            except DuplicateSlugError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=str(exc),
                ) from exc
            except (ReviewReplyAlreadyExistsError, ReviewAlreadyExistsError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=str(exc),
                ) from exc
            except InvalidOrderStatusTransitionError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(exc),
                ) from exc
            except (
                CartQuantityExceedsStockError,
                CartEmptyError,
                InsufficientStockError,
                ReviewEligibilityError,
            ) as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(exc),
                ) from exc
            except (
                InvalidFieldError,
                InvalidImageFormatError,
                ImageTooLargeError,
                InvalidLogoTypeError,
                LogoTooLargeError,
                TooManyImagesError,
                InvalidCategoryFieldError,
                InvalidSalesStatsQueryError,
            ) as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                ) from exc
            except ValidationError as exc:
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

        sync_wrapper.__signature__ = signature  # type: ignore[attr-defined]
        return cast(Callable[P, R], sync_wrapper)

    return decorator

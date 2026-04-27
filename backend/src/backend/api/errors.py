from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

HTTP_ERROR_CODES: Final[dict[int, str]] = {
    status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
    status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
    status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_409_CONFLICT: "CONFLICT",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
}


@dataclass(slots=True)
class APIError(Exception):
    status_code: int
    code: str
    message: str
    details: list[dict[str, str]] = field(default_factory=list)


async def api_error_handler(_: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


def _http_error_code(status_code: int) -> str:
    return HTTP_ERROR_CODES.get(status_code, "HTTP_ERROR")


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Request failed."
    details = exc.detail if isinstance(exc.detail, list) else []
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": _http_error_code(exc.status_code),
                "message": message,
                "details": details,
            }
        },
    )


async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    details: list[dict[str, str]] = []
    for error in exc.errors():
        location = [str(part) for part in error["loc"] if part != "body"]
        details.append(
            {
                "field": ".".join(location) or "request",
                "message": error["msg"],
            }
        )

    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": details,
            }
        },
    )

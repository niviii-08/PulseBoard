"""
Structured error handling.

Defines a small application-specific exception hierarchy and registers
FastAPI exception handlers so that every error response — whether raised
deliberately, raised as a validation error, or an unhandled bug — comes
back to the client in one consistent JSON envelope:

    {
        "error": {
            "code": "SOME_ERROR_CODE",
            "message": "Human readable message",
            "details": {...} | null
        }
    }

This is registered once in main.py via `register_exception_handlers(app)`.
Later phases (services, incidents, auth) should raise `PulseBoardError`
subclasses rather than bare HTTPExceptions so error codes stay consistent
across the API.
"""

import logging
from typing import Any, Optional

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("pulseboard.errors")


class PulseBoardError(Exception):
    """Base class for all application-raised errors."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, details: Optional[Any] = None):
        self.message = message
        self.details = details
        super().__init__(message)


class NotFoundError(PulseBoardError):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"


class ValidationAppError(PulseBoardError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "VALIDATION_ERROR"


class ServiceUnavailableError(PulseBoardError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "SERVICE_UNAVAILABLE"


def _envelope(code: str, message: str, details: Optional[Any] = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(PulseBoardError)
    async def pulseboard_error_handler(request: Request, exc: PulseBoardError):
        logger.warning(
            "Handled application error: %s (%s) on %s %s",
            exc.error_code,
            exc.message,
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.error_code, exc.message, exc.details),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope("HTTP_ERROR", str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        # Pydantic's error context (`ctx`) can contain non-JSON-native
        # values -- e.g. a `Decimal` from a `gt=0` constraint on a
        # Decimal field. jsonable_encoder recursively converts those to
        # JSON-safe types (Decimal -> float/str) instead of letting the
        # JSONResponse's plain json.dumps() crash on them.
        safe_errors = jsonable_encoder(exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_envelope("VALIDATION_ERROR", "Request validation failed", safe_errors),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        # Never leak internal details (stack traces, exception text) to the
        # client for unexpected errors — log the full detail server-side
        # and return a generic message instead.
        logger.exception(
            "Unhandled exception on %s %s", request.method, request.url.path
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope(
                "INTERNAL_ERROR", "An unexpected error occurred."
            ),
        )

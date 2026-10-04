"""
Logging configuration.

Sets up structured, consistent logging for the whole application via
`logging.config.dictConfig`. Two formats are available, chosen by
`settings.LOG_FORMAT`:

- "text" (default) -- a readable single-line format for local
  development: timestamp, level, logger name, request ID, message.
- "json" -- one JSON object per line, for any real log aggregator
  (CloudWatch, Datadog, Loki, ELK) to parse without a custom grok
  pattern. Recommended for any deployed environment.

Every log line (app code, uvicorn's own loggers, SQLAlchemy) is tagged
with the current request's ID via `RequestIdFilter`
(app/core/request_logging.py), so log lines from a single request can be
grepped/queried together in production even under concurrent load. All
app code just calls `logging.getLogger("pulseboard.<module>")`; nothing
about that needs to change if the format is switched.
"""

import json
import logging.config
from datetime import datetime, timezone

from app.core.config import settings
from app.core.request_logging import RequestIdFilter


class JsonFormatter(logging.Formatter):
    """
    Minimal dependency-free JSON line formatter. Deliberately not using
    a third-party JSON-logging library -- the fields a log aggregator
    actually needs (timestamp, level, logger, message, request_id, plus
    whatever's in `extra`) are small and stable enough that hand-rolling
    this avoids one more dependency for something this simple.
    """

    _RESERVED = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {
        "message",
        "asctime",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        # Anything passed via `extra={...}` (e.g. RequestLoggingMiddleware's
        # http_method/http_path/http_status/duration_ms) rides along too,
        # rather than being silently dropped the way plain %-formatting
        # would drop it.
        for key, value in record.__dict__.items():
            if key not in self._RESERVED and key not in payload:
                payload[key] = value
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    log_level = settings.LOG_LEVEL.upper()
    use_json = settings.LOG_FORMAT.lower() == "json"

    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "request_id": {"()": RequestIdFilter},
        },
        "formatters": {
            "default": {
                "format": (
                    "%(asctime)s | %(levelname)-8s | %(name)s | "
                    "[req:%(request_id)s] | %(message)s"
                ),
                "datefmt": "%Y-%m-%dT%H:%M:%S%z",
            },
            "json": {"()": "app.core.logging_config.JsonFormatter"},
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json" if use_json else "default",
                "filters": ["request_id"],
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": log_level,
            "handlers": ["console"],
        },
        "loggers": {
            "pulseboard": {
                "level": log_level,
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "uvicorn.error": {"level": "INFO", "handlers": ["console"], "propagate": False},
            # uvicorn's own access log is suppressed (level raised to
            # WARNING) in favor of RequestLoggingMiddleware's line, which
            # additionally carries the request ID and structured fields
            # uvicorn's default access log doesn't include.
            "uvicorn.access": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "sqlalchemy.engine": {
                "level": "INFO" if settings.DB_ECHO else "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
        },
    }

    logging.config.dictConfig(logging_config)

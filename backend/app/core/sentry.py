"""
Optional Sentry error tracking.

Entirely opt-in and additive: with `SENTRY_DSN` unset (the default),
`init_sentry()` is a no-op and `sentry-sdk` doesn't even need to be
installed. Set `SENTRY_DSN` to enable it -- no code changes required
anywhere else, since FastAPI/Starlette/SQLAlchemy/Celery are all
auto-instrumented by sentry-sdk's own integrations once initialized.

Kept as its own module (rather than inline in main.py) so it's obvious
at a glance that this is the one and only place Sentry is wired in, and
so `sentry-sdk` stays an optional dependency in requirements.txt-terms:
nothing else in the codebase imports it.
"""

import logging

from app.core.config import settings

logger = logging.getLogger("pulseboard.sentry")


def init_sentry() -> None:
    if not settings.SENTRY_DSN:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.redis import RedisIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning(
            "SENTRY_DSN is set but the 'sentry-sdk' package isn't installed "
            "(it's an optional extra -- `pip install sentry-sdk[fastapi,celery]`). "
            "Continuing without error tracking."
        )
        return

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=settings.APP_VERSION,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
            # WARNING-and-above breadcrumbs, ERROR-and-above create events
            # -- matches this app's own logging convention of using
            # logger.exception() for genuinely actionable failures (see
            # e.g. app/services/incident_automation.py's publish-event
            # failure handling) rather than every warning being an alert.
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        # Request bodies can contain a password (login/register) or a
        # webhook secret (create/rotate) -- never send them to a
        # third-party service by default.
        send_default_pii=False,
        max_request_body_size="never",
    )
    logger.info("Sentry error tracking initialized (environment=%s).", settings.ENVIRONMENT)

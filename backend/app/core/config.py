"""
Application configuration.

All runtime configuration is centralized here and loaded from environment
variables (or a .env file in local development) via pydantic-settings.
Nothing else in the codebase should call os.environ directly — everything
should go through the `settings` singleton exported at the bottom of this
module. This keeps configuration auditable and testable (settings can be
overridden in tests via dependency overrides or environment patching).
"""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --- General ---
    ENVIRONMENT: str = Field(default="development")
    APP_NAME: str = Field(default="PulseBoard")
    APP_VERSION: str = Field(default="0.1.0")
    # Verbose error responses / interactive tracebacks. Defaults to False
    # (safe-by-default) even though local development commonly wants it
    # on -- .env.example sets DEBUG=true explicitly for that reason. A
    # library/deployment default of True would mean anyone who forgets
    # to set this in production silently ships debug mode.
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")

    # "text" (human-readable, the local-dev default) or "json"
    # (one JSON object per line -- what any real log aggregator wants:
    # CloudWatch, Datadog, Loki, ELK). Independent of ENVIRONMENT so a
    # deployment can choose either regardless of environment name.
    LOG_FORMAT: str = Field(default="text")

    # Optional error tracking (Sentry). Left unset (the default), error
    # tracking is simply not initialized -- see app/core/sentry.py. Set
    # to a real Sentry DSN to enable it; no code changes required.
    SENTRY_DSN: str | None = Field(default=None)
    SENTRY_TRACES_SAMPLE_RATE: float = Field(default=0.0)

    # --- API ---
    API_V1_PREFIX: str = Field(default="/api/v1")

    # --- CORS ---
    # Comma-separated list of allowed origins, e.g.:
    # BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    # Kept as a raw string field (rather than List[str]) because
    # pydantic-settings attempts JSON-decoding for list-typed env values
    # before any field validator runs, which breaks plain comma-separated
    # input. `cors_origins` below is the parsed form everything else uses.
    BACKEND_CORS_ORIGINS: str = Field(default="")

    # --- Proxy trust ---
    # Whether this process sits behind a reverse proxy/load balancer that
    # can be trusted to set X-Forwarded-For itself (overwriting, not
    # appending to, any value a client sent). Only flip this on when that
    # is actually true of the deployment: if it's false and a request
    # reaches this process directly (or through a proxy that blindly
    # forwards client-supplied headers), trusting X-Forwarded-For lets a
    # client set it to an arbitrary value and get a fresh rate-limit
    # bucket on every request -- defeating the limiter entirely. See
    # app/core/rate_limit.py's _client_key.
    TRUST_PROXY_HEADERS: bool = Field(default=False)

    @property
    def cors_origins(self) -> List[str]:
        if not self.BACKEND_CORS_ORIGINS.strip():
            return []
        return [
            origin.strip()
            for origin in self.BACKEND_CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    # --- Database ---
    # Async URL used by the running application (asyncpg driver).
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://pulseboard:pulseboard@localhost:5432/pulseboard"
    )
    DB_POOL_SIZE: int = Field(default=10)
    DB_MAX_OVERFLOW: int = Field(default=5)
    DB_ECHO: bool = Field(default=False)

    # --- Redis ---
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # --- Celery ---
    # A separate Redis logical DB (index 1, vs the app's index 0) so the
    # app's own cache/pub-sub keys and Celery's broker/result-backend
    # bookkeeping keys never collide even though both live on the same
    # Redis instance in local dev.
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/1")

    # --- Security ---
    JWT_SECRET_KEY: str = Field(default="changeme-in-production")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)

    # --- Notifications (Phase 11) ---
    # Global kill switch. Set to false in the environment before running
    # a bulk/historical dataset import so backfilled rows never trigger
    # a notification flood -- see app/services/notification_service.py's
    # module docstring for the full safety story (this flag is the
    # second, independent layer; the first is that bulk imports must
    # write directly via the ORM/raw SQL and never call through the
    # live service-layer functions this flag guards).
    NOTIFICATIONS_ENABLED: bool = Field(default=True)
    FRONTEND_BASE_URL: str = Field(
        default="http://localhost:5173",
        description="Used to build unsubscribe links in outbound notification emails.",
    )

    # SMTP is optional. When SMTP_HOST is unset, app/services/email_sender.py
    # falls back to a console/log backend rather than failing -- this
    # build has no SMTP/ESP account wired up, and email_sender.py isn't
    # currently wired to the new Alert model either (see README's
    # "Remaining limitations"). Setting SMTP_HOST (and friends) below is
    # the only change needed to start actually sending mail once it is.
    SMTP_HOST: str = Field(default="")
    SMTP_PORT: int = Field(default=587)
    SMTP_USERNAME: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_USE_TLS: bool = Field(default=True)
    SMTP_TIMEOUT_SECONDS: float = Field(default=10.0)
    EMAIL_FROM: str = Field(default="status@pulseboard.local")
    EMAIL_FROM_NAME: str = Field(default="PulseBoard Status")

    # --- Webhook delivery ---
    WEBHOOK_TIMEOUT_SECONDS: float = Field(default=10.0)
    WEBHOOK_MAX_RETRIES: int = Field(default=5)
    # Base backoff; actual delay is WEBHOOK_RETRY_BACKOFF_SECONDS * 2**(attempt-1)
    # -- see app/tasks/notification_tasks.py:deliver_webhook_task.
    WEBHOOK_RETRY_BACKOFF_SECONDS: float = Field(default=30.0)

    # --- Social intelligence: AI explanation engine (optional) ---
    # Unset by default. When empty, app/services/explanation_engine.py
    # transparently falls back to its deterministic template engine --
    # see that module's docstring. Setting this key is the only change
    # needed to switch "why is this trending" / sentiment-shift summaries
    # over to LLM-generated prose.
    ANTHROPIC_API_KEY: str | None = Field(default=None)

    # --- Social intelligence: alert thresholds (all user-configurable) ---
    TREND_SCORE_ALERT_THRESHOLD: float = Field(default=70.0)
    SENTIMENT_SHIFT_ALERT_THRESHOLD_PCT_POINTS: float = Field(default=25.0)
    BRAND_RISK_ALERT_THRESHOLD: float = Field(default=60.0)
    MENTION_SPIKE_GROWTH_THRESHOLD_PCT: float = Field(default=150.0)
    CROSS_PLATFORM_SPREAD_MIN_PLATFORMS: int = Field(default=3)

    # --- Social intelligence: optional real data-collector credentials ---
    # All optional. Absent -> that collector reports itself as
    # "not_configured" on GET /api/v1/sources and is skipped by the
    # ingestion task, rather than silently pretending to collect data.
    REDDIT_CLIENT_ID: str | None = Field(default=None)
    REDDIT_CLIENT_SECRET: str | None = Field(default=None)
    YOUTUBE_API_KEY: str | None = Field(default=None)
    X_BEARER_TOKEN: str | None = Field(default=None)
    NEWS_RSS_FEEDS: str = Field(
        default="https://news.google.com/rss/search?q={query}",
        description="Comma-separated RSS feed URL templates; {query} is replaced with the brand/topic search term.",
    )

    @property
    def news_rss_feed_templates(self) -> List[str]:
        return [f.strip() for f in self.NEWS_RSS_FEEDS.split(",") if f.strip()]

    # --- Testing ---
    # Only read by tests/conftest.py. Defaults to the same host/user/password
    # as DATABASE_URL but a separate database name, so the test suite never
    # touches development data.
    TEST_DATABASE_URL: str = Field(
        default="postgresql+asyncpg://pulseboard:pulseboard@localhost:5432/pulseboard_test"
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    def assert_safe_for_environment(self) -> None:
        """
        Refuses to let the app boot in production with settings that are
        only ever safe as local-dev defaults. Called once at startup
        (see app/main.py's lifespan) rather than validated as a pydantic
        field constraint, because "is this valid" here depends on more
        than one field at once (ENVIRONMENT combined with each of the
        others) -- a plain field validator can't see across fields as
        clearly as an explicit check can, and failing loudly and early
        at process startup is much better than a subtly-insecure
        production deployment nobody notices.
        """
        if not self.is_production:
            return

        problems: list[str] = []

        if self.JWT_SECRET_KEY == "changeme-in-production" or len(self.JWT_SECRET_KEY) < 32:
            problems.append(
                "JWT_SECRET_KEY is missing, still the placeholder default, or too short "
                "(need a high-entropy secret of at least 32 characters)."
            )
        if self.DEBUG:
            problems.append(
                "DEBUG is true -- must be false in production (verbose error responses "
                "and interactive tracebacks are a significant information disclosure risk)."
            )
        if not self.cors_origins:
            problems.append(
                "BACKEND_CORS_ORIGINS is empty -- set it explicitly to the real frontend "
                "origin(s); an empty value currently blocks all cross-origin requests, "
                "which is safe but almost certainly not what's intended in production."
            )
        if any(origin.strip() == "*" for origin in self.cors_origins):
            problems.append(
                "BACKEND_CORS_ORIGINS contains '*' -- a wildcard origin combined with "
                "allow_credentials=True lets any website make authenticated requests on "
                "a logged-in user's behalf. List explicit origins instead."
            )

        if problems:
            raise RuntimeError(
                "Refusing to start with ENVIRONMENT=production and the following unsafe "
                "configuration:\n- " + "\n- ".join(problems)
            )


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings accessor. Using lru_cache means the .env file is only
    read once per process, and `get_settings()` can be used as a FastAPI
    dependency for consistency with the rest of the DI-based codebase.
    """
    return Settings()


settings = get_settings()

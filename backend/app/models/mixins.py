"""
Reusable model mixins.

- UUIDPKMixin: gives every model a UUID primary key generated
  application-side (uuid4), rather than relying on a Postgres extension
  like pgcrypto/uuid-ossp. This keeps the schema portable (no
  `CREATE EXTENSION` step required) at the cost of the ID being generated
  in Python rather than by the database — a fine tradeoff at this scale,
  and easy to point to in an interview as a deliberate choice.

- TimestampMixin: `created_at` / `updated_at` on every table, using
  timezone-aware server-side timestamps so the values are correct
  regardless of which timezone the application server runs in.
  `updated_at` is refreshed automatically on every UPDATE via
  `onupdate=func.now()`.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPKMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

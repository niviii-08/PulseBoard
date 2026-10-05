"""
ORM models package.

Every model module is imported here so that `Base.metadata` is fully
populated (required both for Alembic autogenerate and so that
relationship() string targets resolve).
"""

from app.core.database import Base
from app.models.enums import UserRole
from app.models.refresh_token import RefreshToken
from app.models.user import User

from app.models.social import Brand, RiskAssessment, PropagationEvent, Alert, RiskLevel, AlertType, AlertSeverity
from app.models.trend import Topic, Mention, TrendSnapshot, AIInsight, PlatformEnum
from app.models.extensions import Country, Entity, TopicMention
from app.models.content import Source, ContentItem, SentimentSnapshot

__all__ = [
    "Base",
    "User",
    "RefreshToken",
    "UserRole",

    # Trend models
    "Topic",
    "Mention",
    "TrendSnapshot",
    "AIInsight",
    "PlatformEnum",

    # Brand / risk / alerting models
    "Brand",
    "RiskAssessment",
    "PropagationEvent",
    "Alert",
    "RiskLevel",
    "AlertType",
    "AlertSeverity",

    "Country",
    "Entity",
    "TopicMention",
    "Source",
    "ContentItem",
    "SentimentSnapshot",
]

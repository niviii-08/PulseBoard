from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "pulseboard",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.ingestion_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
    task_time_limit=120,
    task_soft_time_limit=110,
)

# Real-source collection runs every 10 minutes (RSS/official APIs have no
# reason to be polled faster than that, and it keeps this well clear of
# any source's rate limits). Demo data is NOT regenerated on a schedule --
# it's a one-shot local seed, triggered via scripts/seed_demo_data.py or
# POST /api/v1/collectors/run?source=demo, not something that should keep
# re-running in the background and overwriting itself.
celery_app.conf.beat_schedule = {
    "collect-and-process": {
        "task": "ingestion.collect_and_process",
        "schedule": 600.0,
    },
}

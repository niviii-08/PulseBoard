"""
One-shot local seed: a dev user + the full scripted demo dataset,
run through the real engine pipeline (not just inserted as static rows).

Usage (from backend/, with the venv active and migrations applied):

    python -m scripts.seed_demo_data

Idempotent for the user (looked up by email); re-running re-generates
demo mentions/snapshots (the pipeline's rebuild_* functions replace
per-topic derived data), so it's safe to run again after a schema change
without needing a fresh database.
"""

import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models import User, UserRole
from app.tasks.ingestion_tasks import _refresh_demo_data

DEV_SEED_PASSWORD = "DevPassword123!"


async def get_or_create_user(session, *, email: str, full_name: str, role: UserRole) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        hashed_password=hash_password(DEV_SEED_PASSWORD),
        is_active=True,
    )
    session.add(user)
    await session.flush()
    return user


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        admin = await get_or_create_user(
            session, email="admin@pulseboard.dev", full_name="Ada Admin", role=UserRole.ADMIN
        )
        viewer = await get_or_create_user(
            session, email="viewer@pulseboard.dev", full_name="Vic Viewer", role=UserRole.VIEWER
        )
        await session.commit()
        print(f"Users ready: {admin.email}, {viewer.email}")

    print("Generating demo social data and running the engine pipeline "
          "(trend scoring, sentiment shift, propagation, brand risk, "
          "AI explanations, alerts)...")
    result = await _refresh_demo_data()
    print(f"Done: {result}")

    print("\nSeed complete.")
    print(f"Dev login: admin@pulseboard.dev / {DEV_SEED_PASSWORD} (admin)")
    print(f"Dev login: viewer@pulseboard.dev / {DEV_SEED_PASSWORD} (viewer)")


if __name__ == "__main__":
    asyncio.run(seed())

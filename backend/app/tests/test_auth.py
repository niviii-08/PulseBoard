"""
Authentication and authorization tests.

Covers: registration (incl. bootstrap-admin and privilege-escalation
prevention), password hashing, login, /me, refresh-token rotation and
reuse detection, logout, and RBAC enforcement on a real protected route.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.security import verify_password
from app.models.refresh_token import RefreshToken
from app.models.user import User

DEV_PASSWORD = "CorrectHorseBattery9!"


async def _register(client: AsyncClient, email: str, password: str = DEV_PASSWORD, full_name: str = "Test User"):
    return await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )


async def _login(client: AsyncClient, email: str, password: str = DEV_PASSWORD):
    return await client.post("/api/v1/auth/login", json={"email": email, "password": password})


# --- Registration ---------------------------------------------------------


class TestRegistration:
    async def test_first_registered_user_becomes_admin(self, client: AsyncClient):
        resp = await _register(client, "first@example.com")
        assert resp.status_code == 201
        assert resp.json()["role"] == "admin"

    async def test_second_registered_user_is_viewer(self, client: AsyncClient):
        await _register(client, "first2@example.com")
        resp = await _register(client, "second2@example.com")
        assert resp.status_code == 201
        assert resp.json()["role"] == "viewer"

    async def test_duplicate_email_is_rejected(self, client: AsyncClient):
        await _register(client, "dupe@example.com")
        resp = await _register(client, "dupe@example.com")
        assert resp.status_code == 409

    async def test_password_is_never_stored_in_plaintext(
        self, client: AsyncClient, db_session
    ):
        password = "SuperSecretPassword1!"
        resp = await _register(client, "hashcheck@example.com", password=password)
        assert resp.status_code == 201

        result = await db_session.execute(
            select(User).where(User.email == "hashcheck@example.com")
        )
        user = result.scalar_one()

        assert user.hashed_password != password
        assert user.hashed_password.startswith("$2b$")  # bcrypt marker
        assert verify_password(password, user.hashed_password) is True
        assert verify_password("wrong-password", user.hashed_password) is False

    async def test_weak_password_rejected_by_schema(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "weak@example.com", "password": "short", "full_name": "Weak Pw"},
        )
        assert resp.status_code == 422


# --- Login / me ------------------------------------------------------------


class TestLoginAndMe:
    async def test_login_with_correct_credentials_returns_tokens(self, client: AsyncClient):
        await _register(client, "login1@example.com")
        resp = await _login(client, "login1@example.com")
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body and "refresh_token" in body
        assert body["token_type"] == "bearer"
        assert body["expires_in"] > 0

    async def test_login_with_wrong_password_fails(self, client: AsyncClient):
        await _register(client, "login2@example.com")
        resp = await _login(client, "login2@example.com", password="totally-wrong")
        assert resp.status_code == 401

    async def test_login_with_unknown_email_fails_same_as_wrong_password(
        self, client: AsyncClient
    ):
        resp = await _login(client, "doesnotexist@example.com", password="whatever123")
        assert resp.status_code == 401

    async def test_me_without_token_is_401(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_me_with_garbage_token_is_401(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
        )
        assert resp.status_code == 401

    async def test_me_with_valid_token_returns_current_user(self, client: AsyncClient):
        await _register(client, "login3@example.com")
        login_resp = await _login(client, "login3@example.com")
        token = login_resp.json()["access_token"]

        resp = await client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "login3@example.com"


# --- Refresh token rotation & reuse detection ------------------------------


class TestRefreshTokens:
    async def test_refresh_returns_new_token_pair(self, client: AsyncClient):
        await _register(client, "refresh1@example.com")
        login_resp = await _login(client, "refresh1@example.com")
        old_refresh = login_resp.json()["refresh_token"]

        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
        assert resp.status_code == 200
        body = resp.json()
        assert body["refresh_token"] != old_refresh

    async def test_new_access_token_from_refresh_works_on_protected_route(
        self, client: AsyncClient
    ):
        await _register(client, "refresh2@example.com")
        login_resp = await _login(client, "refresh2@example.com")
        refresh_resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": login_resp.json()["refresh_token"]},
        )
        new_access = refresh_resp.json()["access_token"]

        me_resp = await client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access}"}
        )
        assert me_resp.status_code == 200

    async def test_reusing_a_rotated_refresh_token_fails(self, client: AsyncClient):
        await _register(client, "refresh3@example.com")
        login_resp = await _login(client, "refresh3@example.com")
        old_refresh = login_resp.json()["refresh_token"]

        first = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
        assert first.status_code == 200

        replay = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
        assert replay.status_code == 401

    async def test_reuse_detection_revokes_the_newly_issued_token_too(
        self, client: AsyncClient
    ):
        """
        If a rotated (old) refresh token is replayed, that's a compromise
        signal — ALL tokens for that user should be revoked, including
        the brand-new one issued by the legitimate rotation, forcing a
        fresh login.
        """
        await _register(client, "refresh4@example.com")
        login_resp = await _login(client, "refresh4@example.com")
        old_refresh = login_resp.json()["refresh_token"]

        rotate_resp = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
        )
        new_refresh = rotate_resp.json()["refresh_token"]

        # Replay the old (already-rotated) token -> triggers mass revocation.
        replay = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
        assert replay.status_code == 401

        # The legitimately-issued new token should now ALSO be dead.
        follow_up = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": new_refresh}
        )
        assert follow_up.status_code == 401

    async def test_unknown_refresh_token_fails(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": "not-a-real-token-at-all"}
        )
        assert resp.status_code == 401


# --- Logout ------------------------------------------------------------


class TestLogout:
    async def test_logout_revokes_the_refresh_token(self, client: AsyncClient, db_session):
        await _register(client, "logout1@example.com")
        login_resp = await _login(client, "logout1@example.com")
        refresh_token = login_resp.json()["refresh_token"]

        logout_resp = await client.post(
            "/api/v1/auth/logout", json={"refresh_token": refresh_token}
        )
        assert logout_resp.status_code == 204

        reuse_resp = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
        )
        assert reuse_resp.status_code == 401

    async def test_logout_is_idempotent_for_unknown_tokens(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/logout", json={"refresh_token": "never-issued-token"}
        )
        # Deliberately 204 either way -- logout never reveals whether a
        # token existed.
        assert resp.status_code == 204

    async def test_logout_does_not_invalidate_the_still_live_access_token(
        self, client: AsyncClient
    ):
        """
        Documents a deliberate tradeoff: access tokens are stateless JWTs,
        so logging out (revoking the refresh token) does not retroactively
        invalidate an access token that was already issued and hasn't
        expired yet. This is why access tokens are kept short-lived.
        """
        await _register(client, "logout2@example.com")
        login_resp = await _login(client, "logout2@example.com")
        access_token = login_resp.json()["access_token"]
        refresh_token = login_resp.json()["refresh_token"]

        await client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})

        me_resp = await client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
        )
        assert me_resp.status_code == 200


# --- RBAC on a real protected route ----------------------------------------
#
# NOTE: The original minimal /services demo endpoints from Phase 3 (a bare
# list + admin-only create, used here only to prove get_current_user /
# require_admin worked against real persisted data) have since been
# replaced by the full Service CRUD API built in Phase 4 -- pagination,
# filtering, sorting, search, SSRF-guarded writes, and a proper
# {items, total, page, ...} response envelope instead of a bare list.
#
# RBAC enforcement on /services is now tested far more thoroughly in
# app/tests/test_services.py::TestServiceRBAC (create/update/delete/list/
# get, each checked for viewer/admin/anonymous), so the earlier duplicate
# coverage here has been removed rather than patched to match the new
# response shape and SSRF rules -- keeping one authoritative test module
# per resource instead of two files asserting slightly different things
# about the same endpoints.


# --- Dependency-level unit tests (bypassing HTTP) --------------------------


class TestRequireAdminDependency:
    """
    Exercises app.api.deps.require_admin directly as a plain async
    function, independent of any route — the fastest, most isolated way
    to pin down its exact behavior for each role.
    """

    async def test_admin_user_passes_through(self):
        from app.api.deps import require_admin
        from app.models.enums import UserRole

        fake_admin = User(email="a@example.com", full_name="A", role=UserRole.ADMIN, hashed_password="x")
        result = await require_admin(current_user=fake_admin)
        assert result is fake_admin

    async def test_viewer_user_is_rejected(self):
        from fastapi import HTTPException

        from app.api.deps import require_admin
        from app.models.enums import UserRole

        fake_viewer = User(email="v@example.com", full_name="V", role=UserRole.VIEWER, hashed_password="x")
        with pytest.raises(HTTPException) as exc_info:
            await require_admin(current_user=fake_viewer)
        assert exc_info.value.status_code == 403

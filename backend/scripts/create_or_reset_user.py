"""
Utility script to create a user or reset an existing user's password from the terminal.

Usage (from backend/ directory with .venv active):
    python -m scripts.create_or_reset_user <email> <password> [full_name]

Example:
    python -m scripts.create_or_reset_user 2403717672622032@cit.edu.in MyPassword123! "Neevetha N"
"""

import sys
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.enums import UserRole


async def create_or_reset_user(email: str, password: str, full_name: str = "User"):
    email_clean = email.strip().lower()
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email_clean))
        user = result.scalar_one_or_none()
        
        if user:
            user.hashed_password = hash_password(password)
            user.is_active = True
            await session.commit()
            print(f"[SUCCESS] Password updated successfully for existing user: {email_clean}")
            print(f"You can now log in at http://localhost:5173/login with:")
            print(f"  Email: {email_clean}")
            print(f"  Password: {password}")
        else:
            user = User(
                email=email_clean,
                full_name=full_name.strip(),
                hashed_password=hash_password(password),
                role=UserRole.ADMIN,
                is_active=True,
                state="Tamil Nadu",
                content_type="Both",
                interests=["Technology", "Pop Culture"],
            )
            session.add(user)
            await session.commit()
            print(f"[SUCCESS] New user created successfully: {email_clean}")
            print(f"You can now log in at http://localhost:5173/login with:")
            print(f"  Email: {email_clean}")
            print(f"  Password: {password}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python -m scripts.create_or_reset_user <email> <password> [full_name]")
        sys.exit(1)
        
    user_email = sys.argv[1]
    user_pw = sys.argv[2]
    user_name = sys.argv[3] if len(sys.argv) > 3 else "User"
    
    asyncio.run(create_or_reset_user(user_email, user_pw, user_name))

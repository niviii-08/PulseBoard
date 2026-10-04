"""
Shared enumerations.
"""

import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    VIEWER = "viewer"

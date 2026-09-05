from fastapi import Header, HTTPException, status
from typing import Optional
from .config import settings

class UserRole:
    OPS = "ops"
    ADMIN = "admin"

def get_current_role(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
) -> str:
    """
    Extracts and validates user role.
    In production: strictly validates X-API-Key against settings.ADMIN_API_KEY / OPS_API_KEY.
    For local UI convenience: accepts X-User-Role header or defaults to 'ops'.
    """
    if x_api_key:
        if x_api_key == settings.ADMIN_API_KEY:
            return UserRole.ADMIN
        elif x_api_key == settings.OPS_API_KEY:
            return UserRole.OPS
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API Key provided"
            )

    if x_user_role:
        role = x_user_role.lower().strip()
        if role in [UserRole.OPS, UserRole.ADMIN]:
            return role

    # Default fallback for unauthenticated local development
    return UserRole.OPS

def require_admin(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
) -> str:
    """Enforces Admin-only access for compliance configuration and opt-out mutations."""
    role = get_current_role(x_api_key, x_user_role)
    if role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required to perform this compliance modification."
        )
    return role

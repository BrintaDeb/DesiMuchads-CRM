import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    blacklist_token,
    get_current_user,
)
from app.models.models import User, UserSession
from app.models.enums import UserRole
from app.schemas.schemas import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserSessionOut,
    ApiResponse,
    UserOut,
    UserCreate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(
    login_data: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.email == login_data.email.lower(), User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact Agency Super Admin.",
        )

    # Generate Dual Tokens
    access_token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "full_name": user.full_name,
        "can_manage_automations": getattr(user, "can_manage_automations", False),
    }
    access_token = create_access_token(access_token_payload)
    refresh_token = create_refresh_token(str(user.id))

    # Identify client device
    user_agent = request.headers.get("user-agent", "Unknown Device")
    client_ip = request.client.host if request.client else "127.0.0.1"
    device_name = "Desktop Workstation"
    if "Mobile" in user_agent:
        device_name = "Mobile Device"
    elif "Macintosh" in user_agent:
        device_name = "macOS Workstation"
    elif "Windows" in user_agent:
        device_name = "Windows PC"
    elif "Linux" in user_agent:
        device_name = "Linux Workstation"

    refresh_payload = decode_refresh_token(refresh_token)
    refresh_jti = refresh_payload.get("jti", str(uuid.uuid4()))

    session_record = UserSession(
        user_id=user.id,
        refresh_token_jti=refresh_jti,
        ip_address=client_ip,
        user_agent=user_agent[:450],
        device_name=device_name,
        last_active_at=datetime.utcnow(),
    )
    db.add(session_record)
    await db.commit()

    # Set HttpOnly, Secure, SameSite=Strict cookie for refresh token
    response.set_cookie(
        key="muchad_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )

    user_out = UserOut.model_validate(user)
    return ApiResponse(
        data=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_out,
        )
    )


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh_token(
    request: Request,
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    token = request.cookies.get("muchad_refresh_token")
    if not token and body and body.refresh_token:
        token = body.refresh_token

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    payload = decode_refresh_token(token)
    user_id = payload.get("sub")
    jti = payload.get("jti")

    # Fetch user
    user_query = select(User).where(User.id == uuid.UUID(user_id), User.is_active == True)
    res = await db.execute(user_query)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate tokens: blacklist old refresh jti
    exp = payload.get("exp", int((datetime.utcnow() + timedelta(days=7)).timestamp()))
    if jti:
        await blacklist_token(jti, exp)

    new_access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "full_name": user.full_name,
        "can_manage_automations": getattr(user, "can_manage_automations", False),
    })
    new_refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(
        key="muchad_refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )

    return ApiResponse(
        data=TokenResponse(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )
    )


@router.post("/logout", response_model=ApiResponse[dict])
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    refresh_token = request.cookies.get("muchad_refresh_token")
    if refresh_token:
        try:
            payload = decode_refresh_token(refresh_token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                await blacklist_token(jti, exp)
                # Mark matching session revoked
                q = select(UserSession).where(UserSession.refresh_token_jti == jti)
                res = await db.execute(q)
                s = res.scalar_one_or_none()
                if s:
                    s.is_revoked = True
                    await db.commit()
        except Exception:
            pass

    response.delete_cookie("muchad_refresh_token", path="/")
    return ApiResponse(data={"message": "Logged out successfully across active sessions"})


@router.get("/sessions", response_model=ApiResponse[List[UserSessionOut]])
async def list_active_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all active sessions and devices for the logged-in user.
    """
    query = select(UserSession).where(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False,
    ).order_by(UserSession.last_active_at.desc())
    res = await db.execute(query)
    sessions = res.scalars().all()

    current_token = request.cookies.get("muchad_refresh_token")
    current_jti = None
    if current_token:
        try:
            current_jti = decode_refresh_token(current_token).get("jti")
        except Exception:
            pass

    out_list = [
        UserSessionOut(
            id=s.id,
            device_name=s.device_name,
            ip_address=s.ip_address,
            last_active_at=s.last_active_at,
            created_at=s.created_at,
            is_current=(s.refresh_token_jti == current_jti),
        )
        for s in sessions
    ]
    return ApiResponse(data=out_list)


@router.delete("/sessions/{session_id}", response_model=ApiResponse[dict])
async def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Terminates a specific device session.
    """
    query = select(UserSession).where(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id,
    )
    res = await db.execute(query)
    session_record = res.scalar_one_or_none()
    if not session_record:
        raise HTTPException(status_code=404, detail="Session not found")

    session_record.is_revoked = True
    await blacklist_token(session_record.refresh_token_jti, int((datetime.utcnow() + timedelta(days=7)).timestamp()))
    await db.commit()
    return ApiResponse(data={"status": "REVOKED", "session_id": str(session_id)})


@router.post("/logout-everywhere", response_model=ApiResponse[dict])
async def logout_everywhere(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes all active sessions for this account across all devices.
    """
    query = select(UserSession).where(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False,
    )
    res = await db.execute(query)
    active_sessions = res.scalars().all()

    exp = int((datetime.utcnow() + timedelta(days=7)).timestamp())
    for s in active_sessions:
        s.is_revoked = True
        await blacklist_token(s.refresh_token_jti, exp)

    await db.commit()
    response.delete_cookie("muchad_refresh_token", path="/")
    return ApiResponse(data={"message": f"Successfully revoked {len(active_sessions)} active device sessions."})


@router.get("/me", response_model=ApiResponse[UserOut])
async def get_me(current_user: User = Depends(get_current_user)):
    return ApiResponse(data=UserOut.model_validate(current_user))

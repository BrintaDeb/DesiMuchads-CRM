import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import ClientVaultSecret, Client, User, AutomationAuditLog
from app.models.enums import UserRole
from app.schemas.schemas import (
    ApiResponse,
    VaultSecretCreate,
    VaultSecretOut,
    VaultSecretDecryptedOut,
)
from app.services.vault import vault_service

router = APIRouter(prefix="/vault", tags=["AES-256 Client Credential Vault"])


@router.get("/secrets/{client_id}", response_model=ApiResponse[List[VaultSecretOut]])
async def list_vault_secrets(
    client_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify client access
    c_query = select(Client).where(Client.id == client_id)
    c_res = await db.execute(c_query)
    client = c_res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if current_user.role == UserRole.CLIENT and client.contact_email != current_user.email:
        raise HTTPException(status_code=403, detail="Forbidden")

    query = select(ClientVaultSecret).where(ClientVaultSecret.client_id == client_id).order_by(ClientVaultSecret.created_at.desc())
    res = await db.execute(query)
    secrets = res.scalars().all()
    return ApiResponse(data=[VaultSecretOut.model_validate(s) for s in secrets])


@router.post("/secrets/{client_id}", response_model=ApiResponse[VaultSecretOut])
async def create_vault_secret(
    client_id: uuid.UUID,
    data: VaultSecretCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Encrypt secret string with AES-256 Fernet
    encrypted_bytes = vault_service.encrypt(data.secret_value)

    secret = ClientVaultSecret(
        client_id=client_id,
        platform_name=data.platform_name,
        username=data.username,
        encrypted_secret=encrypted_bytes,
        last_accessed_by_id=current_user.id,
    )
    db.add(secret)
    await db.commit()
    await db.refresh(secret)
    return ApiResponse(data=VaultSecretOut.model_validate(secret))


@router.get("/secrets/{id}/decrypt", response_model=ApiResponse[VaultSecretDecryptedOut])
async def decrypt_vault_secret(
    id: uuid.UUID,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    query = select(ClientVaultSecret).where(ClientVaultSecret.id == id)
    res = await db.execute(query)
    secret = res.scalar_one_or_none()
    if not secret:
        raise HTTPException(status_code=404, detail="Vault secret not found")

    # Decrypt cipherbytes
    decrypted_str = vault_service.decrypt(secret.encrypted_secret)

    # Audit access
    secret.last_accessed_by_id = current_user.id
    secret.updated_at = datetime.utcnow()

    audit = AutomationAuditLog(
        trigger_event="VAULT_DECRYPTED",
        entity_type="ClientVaultSecret",
        entity_id=secret.id,
        action_taken=f"Credential for '{secret.platform_name}' decrypted by {current_user.full_name} ({current_user.role.value})",
        status="SUCCESS",
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(
        data=VaultSecretDecryptedOut(
            id=secret.id,
            client_id=secret.client_id,
            platform_name=secret.platform_name,
            username=secret.username,
            last_accessed_by_id=secret.last_accessed_by_id,
            updated_at=secret.updated_at,
            created_at=secret.created_at,
            decrypted_secret=decrypted_str,
        )
    )


import base64
import os
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class VaultService:
    def __init__(self, key: Optional[str] = None):
        raw_key = key or settings.FERNET_ENCRYPTION_KEY
        # If key is already a valid urlsafe 32-byte Fernet key, use it; otherwise derive it
        try:
            self._fernet = Fernet(raw_key.encode() if isinstance(raw_key, str) else raw_key)
        except Exception:
            # Derive 32-byte urlsafe base64 key using PBKDF2
            salt = b"muchad_crm_vault_salt_2026"
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100_000,
            )
            derived = base64.urlsafe_b64encode(kdf.derive(raw_key.encode()))
            self._fernet = Fernet(derived)

    def encrypt(self, plain_text: str) -> bytes:
        """
        Encrypts plaintext string into Fernet AES-256 ciphertext bytes.
        """
        if not plain_text:
            raise ValueError("Cannot encrypt empty value")
        return self._fernet.encrypt(plain_text.encode("utf-8"))

    def decrypt(self, encrypted_bytes: bytes) -> str:
        """
        Decrypts Fernet ciphertext bytes back into plaintext string.
        """
        if not encrypted_bytes:
            raise ValueError("Cannot decrypt empty payload")
        decrypted = self._fernet.decrypt(encrypted_bytes)
        return decrypted.decode("utf-8")


# Singleton instance
vault_service = VaultService()


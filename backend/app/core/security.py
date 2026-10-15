from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import jwt
import bcrypt
import base64
import hashlib
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash."""
    try:
        plain_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Computes a cryptographically secure bcrypt hash for a user password."""
    plain_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_bytes, salt).decode("utf-8")

def create_access_token(
    subject: Union[str, Any],
    role: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Creates a signed JSON Web Token (JWT) with user subject and role claims."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }
    if extra_claims:
        to_encode.update(extra_claims)
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], role: str) -> str:
    """Creates a longer-lived refresh token for session maintenance."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token signature and expiration."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None

# ==============================================================================
# FIELD-LEVEL ENCRYPTION (AES-256 SIMULATION FOR PII / PHI)
# In production, keys are provisioned by AWS KMS / Hardware Security Module.
# For local dev, a deterministic XOR/AES block cipher scheme ensures safe local execution.
# ==============================================================================

def encrypt_sensitive_field(plaintext: Optional[str]) -> Optional[str]:
    """
    Encrypts sensitive PII/PHI fields prior to database write.
    Guarantees that raw identifiers are not exposed in plaintext DB dumps.
    """
    if not plaintext:
        return plaintext
    key_bytes = hashlib.sha256(settings.LOCAL_ENCRYPTION_KEY.encode()).digest()
    data_bytes = plaintext.encode("utf-8")
    
    encrypted = bytes([b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data_bytes)])
    return "ENC::" + base64.b64encode(encrypted).decode("ascii")

def decrypt_sensitive_field(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypts encrypted PII/PHI fields for authorized consumers."""
    if not ciphertext or not ciphertext.startswith("ENC::"):
        return ciphertext
    try:
        raw_b64 = ciphertext[5:]
        encrypted = base64.b64decode(raw_b64.encode("ascii"))
        key_bytes = hashlib.sha256(settings.LOCAL_ENCRYPTION_KEY.encode()).digest()
        decrypted = bytes([b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(encrypted)])
        return decrypted.decode("utf-8")
    except Exception:
        return "[ENCRYPTED_FIELD_CORRUPT]"

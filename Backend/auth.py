import hashlib
import os
import secrets
import time
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from database import Login, get_db

SECRET_KEY = os.getenv("JWT_SECRET", "").strip()
JWT_ALGORITHM = "HS256"
JWT_ISSUER = "hackforge-expense-api"
JWT_AUDIENCE = "hackforge-expense-clients"
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    if "$" in stored_hash:
        try:
            salt, key = stored_hash.split("$", 1)
            new_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
            return secrets.compare_digest(key, new_key.hex())
        except Exception:
            return False
    return secrets.compare_digest(stored_hash, password)

def create_access_token(payload: Dict[str, Any], expires_in_seconds: int = 86400 * 7) -> str:
    now = int(time.time())
    claims = {
        **payload,
        "iat": now,
        "exp": now + expires_in_seconds,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    }
    return jwt.encode(claims, SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={"require": ["sub", "exp", "iat", "iss", "aud"]},
        )
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        ) from exc
    if not isinstance(payload.get("sub"), str) or not payload["sub"].strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    return payload

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Login:
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer token in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth.credentials)
    user = db.query(Login).filter_by(username=payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_admin(current_user: Login = Depends(get_current_user)) -> Login:
    if current_user.role not in ["Admin", "Finance"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative privileges required for this action",
        )
    return current_user

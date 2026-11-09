import time
import re
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import threading
from fastapi import Request, HTTPException, status
import logging

logger = logging.getLogger(__name__)

# Security parameters
LOGIN_MAX_IDENTIFIER_ATTEMPTS = 5     # 5 failed attempts per user/phone/email
LOGIN_MAX_IP_ATTEMPTS = 15            # 15 failed attempts per IP
LOGIN_WINDOW_SECONDS = 900            # 15 minutes lockout window

CLEARANCE_MAX_ATTEMPTS = 5            # 5 failed admin master password attempts
CLEARANCE_WINDOW_SECONDS = 600        # 10 minutes lockout window


def clean_phone_number(val: str) -> str:
    """Normalize phone number by stripping whitespace, hyphens, parentheses, and leading plus."""
    digits = re.sub(r"[^\d]", "", val)
    return digits


def normalize_identifier(identifier: str) -> str:
    """Normalizes an email or phone number for consistent rate limiting and matching."""
    raw = (identifier or "").strip()
    if "@" in raw:
        return raw.lower()
    # If phone or digits
    clean_digits = clean_phone_number(raw)
    if clean_digits:
        return clean_digits
    return raw.lower()


def get_client_ip(request: Request) -> str:
    """Extracts client IP considering X-Forwarded-For and X-Real-IP proxy headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First IP in comma-separated list is client IP
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"


class InMemoryRateLimiter:
    """
    Thread-safe sliding-window rate limiter for brute-force attack prevention.
    Supports dual tracking by client IP and account identifier (Email or Phone No).
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._failures: Dict[str, List[float]] = defaultdict(list)

    def _cleanup_expired(self, key: str, window_seconds: int, now: float) -> List[float]:
        threshold = now - window_seconds
        valid = [t for t in self._failures.get(key, []) if t > threshold]
        self._failures[key] = valid
        return valid

    def check_limit(self, key: str, max_attempts: int, window_seconds: int) -> Tuple[bool, int, int]:
        """
        Returns (is_allowed, attempts_remaining, wait_seconds).
        """
        now = time.time()
        with self._lock:
            valid_failures = self._cleanup_expired(key, window_seconds, now)
            count = len(valid_failures)

            if count >= max_attempts:
                oldest = valid_failures[0]
                wait_seconds = max(1, int(window_seconds - (now - oldest)))
                return False, 0, wait_seconds

            attempts_remaining = max_attempts - count
            return True, attempts_remaining, 0

    def record_failure(self, key: str, window_seconds: int) -> int:
        now = time.time()
        with self._lock:
            valid_failures = self._cleanup_expired(key, window_seconds, now)
            valid_failures.append(now)
            self._failures[key] = valid_failures
            return len(valid_failures)

    def reset(self, key: str) -> None:
        with self._lock:
            if key in self._failures:
                del self._failures[key]


# Global rate limiter instance
auth_rate_limiter = InMemoryRateLimiter()


def check_login_rate_limit(request: Request, identifier: str) -> None:
    """
    Checks rate limits for login attempts.
    Applies both per-identifier (email or phone) and per-IP safeguards.
    Raises HTTPException(429) if locked out.
    """
    norm_id = normalize_identifier(identifier)
    ip = get_client_ip(request)

    id_key = f"login:ident:{norm_id}"
    ip_key = f"login:ip:{ip}"

    # 1. Check Identifier limit
    allowed_id, left_id, wait_id = auth_rate_limiter.check_limit(
        id_key, LOGIN_MAX_IDENTIFIER_ATTEMPTS, LOGIN_WINDOW_SECONDS
    )
    if not allowed_id:
        mins = max(1, (wait_id + 59) // 60)
        logger.warning(f"Security: Login lockout triggered for identifier '{norm_id}' from IP '{ip}'. Wait {wait_id}s")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts for this account. Security lockout active for {mins} minutes. Please try again in {wait_id} seconds.",
            headers={
                "Retry-After": str(wait_id),
                "X-RateLimit-Limit": str(LOGIN_MAX_IDENTIFIER_ATTEMPTS),
                "X-RateLimit-Remaining": "0",
            },
        )

    # 2. Check IP limit
    allowed_ip, left_ip, wait_ip = auth_rate_limiter.check_limit(
        ip_key, LOGIN_MAX_IP_ATTEMPTS, LOGIN_WINDOW_SECONDS
    )
    if not allowed_ip:
        mins = max(1, (wait_ip + 59) // 60)
        logger.warning(f"Security: IP brute-force lockout triggered for IP '{ip}'. Wait {wait_ip}s")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts from this network. Security lockout active for {mins} minutes. Please try again in {wait_ip} seconds.",
            headers={
                "Retry-After": str(wait_ip),
                "X-RateLimit-Limit": str(LOGIN_MAX_IP_ATTEMPTS),
                "X-RateLimit-Remaining": "0",
            },
        )


def record_login_failure(request: Request, identifier: str) -> int:
    """Records a failed login attempt across identifier and IP."""
    norm_id = normalize_identifier(identifier)
    ip = get_client_ip(request)

    id_key = f"login:ident:{norm_id}"
    ip_key = f"login:ip:{ip}"

    count = auth_rate_limiter.record_failure(id_key, LOGIN_WINDOW_SECONDS)
    auth_rate_limiter.record_failure(ip_key, LOGIN_WINDOW_SECONDS)
    return count


def record_login_success(request: Request, identifier: str) -> None:
    """Clears failed attempts counter upon verified login."""
    norm_id = normalize_identifier(identifier)
    ip = get_client_ip(request)

    auth_rate_limiter.reset(f"login:ident:{norm_id}")
    auth_rate_limiter.reset(f"login:ip:{ip}")


def check_clearance_rate_limit(request: Request, user_id: str = "admin") -> None:
    """Checks rate limits for Admin Master Clearance Password verification."""
    ip = get_client_ip(request)
    key = f"clearance:{user_id}:{ip}"

    allowed, left, wait = auth_rate_limiter.check_limit(
        key, CLEARANCE_MAX_ATTEMPTS, CLEARANCE_WINDOW_SECONDS
    )
    if not allowed:
        mins = max(1, (wait + 59) // 60)
        logger.warning(f"Security: Admin clearance lockout triggered for user '{user_id}' from IP '{ip}'")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many invalid master password attempts. Clearance locked for {mins} minutes. Please try again in {wait} seconds.",
            headers={"Retry-After": str(wait)},
        )


def record_clearance_failure(request: Request, user_id: str = "admin") -> int:
    ip = get_client_ip(request)
    key = f"clearance:{user_id}:{ip}"
    return auth_rate_limiter.record_failure(key, CLEARANCE_WINDOW_SECONDS)


def record_clearance_success(request: Request, user_id: str = "admin") -> None:
    ip = get_client_ip(request)
    key = f"clearance:{user_id}:{ip}"
    auth_rate_limiter.reset(key)

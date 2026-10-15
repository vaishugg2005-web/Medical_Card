import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException, status
from app.core.config import settings

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.request_records = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        if client_ip == "testclient":
            return await call_next(request)
        now = time.time()
        
        # Purge records older than 60 seconds
        self.request_records[client_ip] = [
            t for t in self.request_records[client_ip] if now - t < 60
        ]
        
        # Check limit
        limit = settings.RATE_LIMIT_PER_MINUTE
        if "/qr/resolve" in request.url.path or "/access/emergency" in request.url.path:
            limit = settings.EMERGENCY_SCAN_RATE_LIMIT_PER_MINUTE

        if len(self.request_records[client_ip]) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait a moment before trying again."
            )

        self.request_records[client_ip].append(now)
        return await call_next(request)

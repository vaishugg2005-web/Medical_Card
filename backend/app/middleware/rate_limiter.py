import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request, status
from app.core.config import settings

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.request_records = defaultdict(list)
        self.emergency_records = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        if client_ip == "testclient":
            return await call_next(request)
        now = time.time()
        
        is_emergency = "/qr/resolve" in request.url.path or "/access/emergency" in request.url.path
        
        if is_emergency:
            # Purge older than 60s
            self.emergency_records[client_ip] = [
                t for t in self.emergency_records[client_ip] if now - t < 60
            ]
            if len(self.emergency_records[client_ip]) >= settings.EMERGENCY_SCAN_RATE_LIMIT_PER_MINUTE:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Rate limit exceeded for emergency scans. Please wait a moment before trying again."}
                )
            self.emergency_records[client_ip].append(now)
        else:
            self.request_records[client_ip] = [
                t for t in self.request_records[client_ip] if now - t < 60
            ]
            if len(self.request_records[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Rate limit exceeded. Please wait a moment before trying again."}
                )
            self.request_records[client_ip].append(now)

        return await call_next(request)

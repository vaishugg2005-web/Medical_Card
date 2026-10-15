from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest, Counter, Histogram, CONTENT_TYPE_LATEST

router = APIRouter()

# Metrics instrumentation
REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests processed", ["method", "endpoint", "status_code"])
EMERGENCY_ACCESS_COUNT = Counter("emergency_break_glass_total", "Total emergency break-glass activations")
AUTH_FAILURES = Counter("auth_failures_total", "Total failed authentication attempts")
ACCESS_DENIALS = Counter("access_denials_total", "Total unauthorized access attempts blocked")

@router.get("", response_class=PlainTextResponse)
def get_metrics():
    """Returns Prometheus scrapable metrics."""
    return PlainTextResponse(generate_latest().decode("utf-8"), media_type=CONTENT_TYPE_LATEST)

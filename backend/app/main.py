import time
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.endpoints import health_endpoint, router as api_v1_router
from app.core.config import settings
from app.core.logging import get_logger
from app.services.document_processor import UnsupportedFileTypeError

logger = get_logger("app.main")

app = FastAPI(
    title="Route Agent API",
    description="Autonomous Research Agent combining private document retrieval, web search, and LLM reasoning.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Middleware to measure total HTTP request duration."""
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response


# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Clean structured format for validation errors."""
    logger.warning("Request validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": jsonable_encoder(exc.errors()),
        },
    )


@app.exception_handler(UnsupportedFileTypeError)
async def unsupported_file_type_handler(request: Request, exc: UnsupportedFileTypeError):
    """Structured handler for unsupported file uploads."""
    logger.warning("Unsupported file type on %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "Unsupported File Type", "detail": str(exc)},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler to avoid leaking raw stack traces to users."""
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected server error occurred. Please try again later.",
        },
    )


# Include API Routers
app.include_router(api_v1_router, prefix="/api/v1")

# Compatibility alias for health
@app.get("/health", include_in_schema=False)
async def root_health():
    return await health_endpoint()


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "Route Agent API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }

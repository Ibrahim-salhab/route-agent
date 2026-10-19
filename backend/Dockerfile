# ==============================================================================
# Route Agent Backend Dockerfile
# Production-ready, non-root execution with layer-cached dependencies
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    CHROMA_PERSIST_DIRECTORY=/app/data/chroma \
    HF_HOME=/app/data/huggingface \
    HOST=0.0.0.0 \
    PORT=8000

WORKDIR /app

# Install system dependencies (curl and certificates for safe model downloads)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group
RUN groupadd --gid 10001 appgroup && \
    useradd --uid 10001 --gid appgroup --shell /bin/false --no-create-home appuser

# Copy and install dependencies first for optimal layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app ./app

# Pre-create data directories and set ownership for unprivileged user
RUN mkdir -p /app/data/chroma /app/data/huggingface && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose backend API port
EXPOSE 8000

# Health check using Python's standard library
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health')" || exit 1

# Predictable startup command using exec form
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

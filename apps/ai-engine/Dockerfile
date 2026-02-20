# ---- AI Engine (FastAPI + ATS) ----
FROM python:3.11-slim

WORKDIR /app

# System deps for asyncpg / psycopg2 / lxml
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache)
COPY apps/ai-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY apps/ai-engine/ .

# Cloud Run requires port 8080
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]

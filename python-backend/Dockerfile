# Base stage for both development and production
FROM python:3.11-slim AS base
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Development stage
FROM base AS development
# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir python-multipart && \
    pip install --no-cache-dir "uvicorn[standard]"
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base AS production
# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir python-multipart && \
    pip install --no-cache-dir "uvicorn[standard]"
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM --platform=$BUILDPLATFORM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Install uvicorn separately
RUN pip install --no-cache-dir uvicorn

# Copy the rest of the application
COPY . .

# Make sure the command is available
RUN which uvicorn

# Run the FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

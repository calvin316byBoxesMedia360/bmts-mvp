# Use official Node.js runtime as a parent image
FROM node:22-bookworm-slim

# Install system dependencies for Python, compilation, and OpenCV/PaddlePaddle
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    python3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy requirements file and install Python dependencies in a virtual environment
COPY requirements-ocr.txt ./
RUN python3 -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements-ocr.txt

# Copy the rest of the application files
COPY . .

# Set environment variables for OCR and server execution
ENV PORT=4173
ENV BMTS_PYTHON=/app/.venv/bin/python
ENV BMTS_OCR_CACHE_HOME=/app/data/.paddlex_runtime
ENV BMTS_OCR_HOME=/app/data/.home_runtime
ENV BMTS_OCR_APP_CACHE=/app/data/.cache_runtime

# Expose port
EXPOSE 4173

# Start the application
CMD ["node", "server.js"]

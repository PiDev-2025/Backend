# First stage: Base image with Python dependencies (this only needs to be rebuilt when requirements change)
FROM python:3.11-slim AS python-base

# Add build-time label for identifying this as a base image
LABEL stage=python-base

# Install only essential build dependencies without recommendations
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set up pip caching
RUN pip install --no-cache-dir --upgrade pip wheel setuptools

# We'll only copy requirements.txt first to leverage Docker caching
WORKDIR /build
COPY Car-Number-Plates-Detection-IA-Model-/requirements.txt ./

# Use wheel cache for faster builds and future installs
RUN pip wheel --wheel-dir=/wheels -r requirements.txt
RUN pip install --no-index --find-links=/wheels -r requirements.txt

# Second stage: Node dependencies (can be cached separately)
FROM node:20-slim AS node-deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Final stage: Combine everything
FROM node:20-slim AS final

# Install only runtime dependencies (no build tools needed)
# Ensure python3 is installed and create a symlink for 'python' just in case
# Although we changed Node to use 'python3', this adds robustness
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    libgl1 \
    libglib2.0-0 \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy pre-built Python virtual environment
COPY --from=python-base /opt/venv /opt/venv
COPY --from=python-base /wheels /wheels

# Copy Node.js dependencies
COPY --from=node-deps /app/node_modules ./node_modules

# Set environment to use the virtual environment
# This ensures that even if 'python3' is called, it uses the venv's packages
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/opt/venv"

# Copy application source - do this last to maximize layer caching
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads/plates

EXPOSE 3001
CMD ["node", "server.js"]
#!/bin/bash
# Pull latest code, rebuild and restart the Docker container
# The audit counter data is persisted via a Docker volume

set -e

echo "Pulling latest code..."
git pull

echo "Building Docker image..."
docker build -t free-seo .

echo "Stopping old container..."
docker stop free-seo 2>/dev/null || true
docker rm free-seo 2>/dev/null || true

echo "Starting new container..."
docker run -d \
  --name free-seo \
  -p 80:80 \
  --env-file .env \
  -v free-seo-data:/app/server/data \
  --restart unless-stopped \
  free-seo

echo "Deployed!"
docker logs -f free-seo

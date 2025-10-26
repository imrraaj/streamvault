#!/bin/bash

echo "🎵 StreamVault - Local Development Setup"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Start MinIO
echo "📦 Starting MinIO container..."
docker compose up -d

# Wait for MinIO to be healthy
echo "⏳ Waiting for MinIO to be ready..."
sleep 5

# Configure MinIO
echo "🔧 Configuring MinIO..."
docker exec streamvault-minio mc alias set local http://localhost:9000 minioadmin minioadmin > /dev/null 2>&1

# Create bucket
echo "📁 Creating music-streaming-bucket..."
docker exec streamvault-minio mc mb local/music-streaming-bucket --ignore-existing

# Set public read access
echo "🔓 Setting bucket permissions..."
docker exec streamvault-minio mc anonymous set download local/music-streaming-bucket

echo ""
echo "✅ MinIO Setup Complete!"
echo "   - Console: http://localhost:9001"
echo "   - API: http://localhost:9000"
echo "   - Credentials: minioadmin / minioadmin"
echo ""

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
fi

# Check .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Copying from example..."
    cp .env.local.example .env.local
    echo "⚠️  Please edit .env.local with your Privy App ID and contract addresses"
fi

echo ""
echo "🚀 Ready to start! Run: bun dev"
echo ""
echo "📝 Next steps:"
echo "   1. Get Privy App ID from https://dashboard.privy.io"
echo "   2. Deploy contracts and update .env.local"
echo "   3. Run: bun dev"
echo "   4. Visit: http://localhost:3000"

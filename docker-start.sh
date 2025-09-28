#!/bin/bash

# Docker Development Environment Startup Script

set -e

echo "🚀 Starting Sports Manager Docker Environment..."

# Check if .env file exists, if not copy from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.docker..."
    cp .env.docker .env
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🎯 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Show logs
echo "📋 Service URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
echo "   Cerbos: http://localhost:3593"
echo ""
echo "✅ Docker environment is ready!"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f [service]"
echo "   Stop all: docker-compose down"
echo "   Reset database: docker-compose down -v && docker-compose up -d"
echo "   Shell into container: docker-compose exec [service] sh"
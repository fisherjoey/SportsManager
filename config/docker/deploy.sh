#!/bin/bash

# Sports Manager Quick Deploy Script
# Simple deployment with same environment values

echo "🚀 Starting Sports Manager Deployment..."
echo "==========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file with default values..."
    cat > .env << 'EOF'
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=sports_management
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/sports_management

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# API Configuration
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# Node Environment
NODE_ENV=production

# Redis Configuration
REDIS_URL=redis://redis:6379
DISABLE_REDIS=false

# Optional Services
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

# Location Services
LOCATION_SERVICE=openroute
GOOGLE_MAPS_API_KEY=
MAPBOX_ACCESS_TOKEN=
OPENROUTE_API_KEY=
EOF
    echo "✅ .env file created with default values"
    echo "⚠️  Please update API_URL and NEXT_PUBLIC_API_URL with your server IP if needed"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose pull

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 15

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Check backend health
echo "💓 Checking backend health..."
if curl -f http://localhost:3001/health 2>/dev/null; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed - it may still be starting up"
fi

echo ""
echo "==========================================="
echo "🎉 Deployment complete!"
echo "==========================================="
echo ""
echo "📋 Services are available at:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   Database:  localhost:5432"
echo ""
echo "📚 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Check status:     docker-compose ps"
echo ""
echo "💡 To access from external IP, update .env file:"
echo "   API_URL=http://your-server-ip:3001"
echo "   NEXT_PUBLIC_API_URL=http://your-server-ip:3001"
echo "   Then restart: docker-compose restart"
echo ""
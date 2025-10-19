#!/bin/bash
#
# SportsManager Deployment Script
# Complete deployment with database, backend, frontend, and Cerbos
#

set -e

echo "========================================="
echo "SportsManager Full Stack Deployment"
echo "========================================="
echo ""
echo "This script will deploy:"
echo "  ✓ PostgreSQL Database (with data)"
echo "  ✓ Cerbos Authorization Server"
echo "  ✓ Backend API Server"
echo "  ✓ Frontend Next.js Application"
echo ""
echo "Auth bypass: ENABLED (for Figma scraping)"
echo ""

# Check if running in deployment directory
if [ ! -f "docker-compose.deploy.yml" ]; then
  echo "❌ Error: Must run from deployment directory"
  echo "   cd deployment && ./deploy.sh"
  exit 1
fi

# Check for required files
echo "Checking required files..."
if [ ! -f ".env.deploy" ]; then
  echo "❌ Missing .env.deploy file"
  exit 1
fi

if [ ! -f "database-dumps/sports_management_full.dump" ]; then
  echo "❌ Missing database dump file"
  exit 1
fi

if [ ! -d "../cerbos-policies" ]; then
  echo "❌ Missing cerbos-policies directory"
  exit 1
fi

echo "✓ All required files present"
echo ""

# Copy environment file if .env doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating .env from .env.deploy..."
  cp .env.deploy .env
  echo "✓ .env file created"
  echo ""
fi

# Pull latest images
echo "Pulling Docker images..."
docker-compose -f docker-compose.deploy.yml --env-file .env pull postgres cerbos

# Build services
echo ""
echo "Building services..."
docker-compose -f docker-compose.deploy.yml --env-file .env build --no-cache

# Start database first
echo ""
echo "Starting PostgreSQL database..."
docker-compose -f docker-compose.deploy.yml --env-file .env up -d postgres

# Wait for database
echo "Waiting for database to be ready..."
sleep 10

# Check database health
until docker-compose -f docker-compose.deploy.yml --env-file .env exec -T postgres pg_isready -U postgres; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "✓ Database is ready"
echo ""

# Restore database
echo "Restoring database from dump..."
docker-compose -f docker-compose.deploy.yml --env-file .env exec -T postgres pg_restore \
  -U postgres \
  -d sports_management \
  --no-owner \
  --no-acl \
  /docker-entrypoint-initdb.d/sports_management_full.dump 2>/dev/null || echo "Database already populated"

echo "✓ Database restored"
echo ""

# Start all services
echo "Starting all services..."
docker-compose -f docker-compose.deploy.yml --env-file .env up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
sleep 15

# Check service status
echo ""
echo "========================================="
echo "Service Status:"
echo "========================================="
docker-compose -f docker-compose.deploy.yml --env-file .env ps

echo ""
echo "========================================="
echo "Deployment Complete! 🎉"
echo "========================================="
echo ""
echo "Services are available at:"
echo "  Frontend:  http://localhost:3004"
echo "  Backend:   http://localhost:3001"
echo "  Cerbos:    http://localhost:3592"
echo "  Database:  localhost:5432"
echo ""
echo "All pages are accessible without login (auth bypass enabled)"
echo ""
echo "Useful commands:"
echo "  View logs:    docker-compose -f deployment/docker-compose.deploy.yml logs -f"
echo "  Stop all:     docker-compose -f deployment/docker-compose.deploy.yml down"
echo "  Restart:      docker-compose -f deployment/docker-compose.deploy.yml restart"
echo ""
echo "For Figma scraping:"
echo "  1. Visit http://localhost:3004"
echo "  2. Navigate to any page"
echo "  3. Copy the URL to Figma's 'Import from URL' feature"
echo ""

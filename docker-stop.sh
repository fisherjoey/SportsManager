#!/bin/bash

# Docker Development Environment Shutdown Script

set -e

echo "🛑 Stopping Sports Manager Docker Environment..."

# Stop all services
docker-compose down

echo "✅ All services stopped!"
echo ""
echo "💡 Additional options:"
echo "   Remove volumes (database data): docker-compose down -v"
echo "   Remove images: docker-compose down --rmi all"
echo "   Clean everything: docker-compose down -v --rmi all"
# Sports Manager Docker Makefile
.PHONY: help start stop restart build clean logs shell test migrate seed

# Default target
help:
	@echo "Sports Manager Docker Commands:"
	@echo ""
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make build      - Build Docker images"
	@echo "  make clean      - Stop and remove all containers, volumes"
	@echo "  make logs       - View logs for all services"
	@echo "  make shell-backend  - Access backend container shell"
	@echo "  make shell-frontend - Access frontend container shell"
	@echo "  make shell-db   - Access database shell"
	@echo "  make test       - Run all tests"
	@echo "  make migrate    - Run database migrations"
	@echo "  make seed       - Seed the database"
	@echo "  make prod       - Start production environment"
	@echo ""

# Start development environment
start:
	@echo "Starting development environment..."
	@if [ ! -f .env ]; then cp .env.docker .env; fi
	@docker-compose up -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"

# Stop all services
stop:
	@echo "Stopping all services..."
	@docker-compose down

# Restart services
restart: stop start

# Build Docker images
build:
	@echo "Building Docker images..."
	@docker-compose build

# Build without cache
build-fresh:
	@echo "Building Docker images (no cache)..."
	@docker-compose build --no-cache

# Clean everything
clean:
	@echo "Cleaning up Docker environment..."
	@docker-compose down -v --rmi local
	@echo "Cleanup complete!"

# View logs
logs:
	@docker-compose logs -f

# Specific service logs
logs-backend:
	@docker-compose logs -f backend

logs-frontend:
	@docker-compose logs -f frontend

logs-db:
	@docker-compose logs -f postgres

# Shell access
shell-backend:
	@docker-compose exec backend sh

shell-frontend:
	@docker-compose exec frontend sh

shell-db:
	@docker-compose exec postgres psql -U postgres -d sports_management

# Testing
test:
	@echo "Running backend tests..."
	@docker-compose exec backend npm test
	@echo "Running frontend tests..."
	@docker-compose exec frontend npm test

test-backend:
	@docker-compose exec backend npm test

test-frontend:
	@docker-compose exec frontend npm test

# Database operations
migrate:
	@echo "Running database migrations..."
	@docker-compose exec backend npm run migrate:latest

migrate-rollback:
	@echo "Rolling back database migration..."
	@docker-compose exec backend npm run migrate:rollback

seed:
	@echo "Seeding database..."
	@docker-compose exec backend npm run seed

seed-initial:
	@echo "Running initial seed..."
	@docker-compose exec backend npm run seed:initial

# Production environment
prod:
	@echo "Starting production environment..."
	@docker-compose -f docker-compose.prod.yml up -d

prod-build:
	@echo "Building production images..."
	@docker-compose -f docker-compose.prod.yml build

prod-stop:
	@echo "Stopping production environment..."
	@docker-compose -f docker-compose.prod.yml down

# Development helpers
dev-reset:
	@echo "Resetting development environment..."
	@docker-compose down -v
	@docker-compose up -d
	@sleep 5
	@docker-compose exec backend npm run migrate:latest
	@docker-compose exec backend npm run seed:initial
	@echo "Development environment reset complete!"

# Health check
health:
	@echo "Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Backend health:"
	@curl -s http://localhost:3001/health || echo "Backend not responding"
	@echo ""
	@echo "Frontend health:"
	@curl -s http://localhost:3000/api/health || echo "Frontend not responding"

# Docker system maintenance
docker-clean:
	@echo "Cleaning Docker system..."
	@docker system prune -af --volumes
	@echo "Docker system cleaned!"

# Status check
status:
	@docker-compose ps
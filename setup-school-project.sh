#!/bin/bash
# Quick Setup Script for School Project (Team/Coach/Player Portal)
# Run this to set up your school project environment

set -e  # Exit on error

echo "🎓 Setting up SENG513 School Project - Team/Coach/Player Portal"
echo "================================================================"
echo ""

# 1. Create school project branch
echo "📌 Step 1: Creating school project branch..."
git checkout -b school/seng513-team-portal 2>/dev/null || git checkout school/seng513-team-portal
git tag school-project-start -f

echo "✅ Branch created: school/seng513-team-portal"
echo ""

# 2. Create school-specific environment file
echo "📝 Step 2: Creating school project environment file..."
cat > .env.school <<EOF
# =========================================
# SENG513 School Project Configuration
# Team/Coach/Player Portal
# =========================================

# Project Mode
SCHOOL_PROJECT_MODE=true
PROJECT_FOCUS=team_coach_player
PROJECT_NAME="Team/Coach/Player Management System"
NODE_ENV=development

# Feature Toggles
ENABLE_REFEREE_PORTAL=false
ENABLE_TEAM_PORTAL=true
ENABLE_COACH_PORTAL=true
ENABLE_PLAYER_PORTAL=true

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=sports_management_school
DB_USER=postgres
DB_PASSWORD=postgres123
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/sports_management_school

# JWT
JWT_SECRET=school-project-secret-key-$(openssl rand -hex 16)
JWT_EXPIRES_IN=7d

# API
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api

# Cerbos
CERBOS_HOST=cerbos:3593
CERBOS_TLS=false

# Frontend
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_SCHOOL_PROJECT_MODE=true

# Redis (disabled for simplicity)
DISABLE_REDIS=true

# Location Services
LOCATION_SERVICE=openroute
OPENROUTE_API_KEY=your-key-here

# Debug
NEXT_PUBLIC_ENABLE_DEBUG=true
EOF

cp .env.school .env
echo "✅ Created .env.school and copied to .env"
echo ""

# 3. Create school-specific Docker Compose
echo "🐳 Step 3: Creating school project Docker Compose..."
cat > docker-compose.school.yml <<EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: school-project-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: sports_management_school
    ports:
      - "5433:5432"  # Different port to avoid conflicts
    volumes:
      - school_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - school-network

  cerbos:
    image: ghcr.io/cerbos/cerbos:latest
    container_name: school-project-cerbos
    command: server --config=/config/config.yaml
    ports:
      - "3592:3592"
      - "3593:3593"
    volumes:
      - ./cerbos/policies:/policies:ro
      - ./cerbos/config:/config:ro
    healthcheck:
      test: ["CMD", "/cerbos", "healthcheck", "--config=/config/config.yaml"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - school-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: school-project-backend
    environment:
      SCHOOL_PROJECT_MODE: "true"
      ENABLE_REFEREE_PORTAL: "false"
      ENABLE_TEAM_PORTAL: "true"
      NODE_ENV: development
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: sports_management_school
      DB_USER: postgres
      DB_PASSWORD: postgres123
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/sports_management_school
      JWT_SECRET: school-project-secret
      CERBOS_HOST: cerbos:3593
      FRONTEND_URL: http://localhost:3000
      DISABLE_REDIS: "true"
    ports:
      - "3001:3001"
    volumes:
      - ./backend/src:/app/src
      - ./backend/knexfile.ts:/app/knexfile.ts
    depends_on:
      postgres:
        condition: service_healthy
      cerbos:
        condition: service_healthy
    networks:
      - school-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: school-project-frontend
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_API_URL: http://localhost:3001/api
      NEXT_PUBLIC_SCHOOL_PROJECT_MODE: "true"
      NEXT_PUBLIC_ENABLE_DEBUG: "true"
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/app:/app/app
      - ./frontend/components:/app/components
    depends_on:
      - backend
    networks:
      - school-network

networks:
  school-network:
    driver: bridge

volumes:
  school_postgres_data:
EOF

echo "✅ Created docker-compose.school.yml"
echo ""

# 4. Create school project directory structure
echo "📁 Step 4: Creating school project directories..."
mkdir -p docs/school-project
mkdir -p backend/src/routes/school
mkdir -p frontend/app/school-portal/{team,coach,player}

echo "✅ Directory structure created"
echo ""

# 5. Create initial documentation
cat > docs/school-project/README.md <<EOF
# SENG513 School Project
## Team/Coach/Player Management Portal

This is a school project branching off from the main Sports Manager application.
Focus: Team roster management, coach dashboards, and player statistics.

## Branch
\`school/seng513-team-portal\`

## Features to Implement

### Team Portal
- [ ] Team roster management
- [ ] Team schedule view
- [ ] Team statistics dashboard

### Coach Portal
- [ ] Player management
- [ ] Game planning
- [ ] Team communications
- [ ] Performance tracking

### Player Portal
- [ ] Player profile
- [ ] Personal schedule
- [ ] Personal statistics
- [ ] Team information

## Setup

\`\`\`bash
# Use school project environment
cp .env.school .env

# Start with Docker
docker-compose -f docker-compose.school.yml up -d

# Or without Docker
cd backend && npm run dev
cd frontend && npm run dev
\`\`\`

## Database

Using separate database: \`sports_management_school\`

## Submission

Tag: \`school-seng513-submission\`
EOF

echo "✅ Created school project documentation"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "✅ School Project Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start your development environment:"
echo "   docker-compose -f docker-compose.school.yml up -d"
echo ""
echo "2. Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Database: localhost:5433 (note: different port!)"
echo ""
echo "3. Start building features in:"
echo "   - backend/src/routes/school/"
echo "   - frontend/app/school-portal/"
echo ""
echo "4. See docs/school-project/README.md for feature list"
echo ""
echo "5. Read SCHOOL_PROJECT_SEPARATION.md for detailed guidance"
echo ""
echo "🎓 Happy coding! Good luck with your school project!"
echo ""

# SENG513 - Docker Compose Deployment Guide
## Sports Manager Application

**Student Name:** [Your Name Here]
**Course:** SENG 513
**Project:** Sports Manager - Multi-Container Docker Application
**Date:** January 2025

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Password Strategy](#password-strategy)
5. [Setup Instructions](#setup-instructions)
6. [Service Details](#service-details)
7. [Common Commands](#common-commands)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

---

## Project Overview

The Sports Manager application is a comprehensive multi-container Docker application designed for managing sports leagues, teams, games, and referee assignments. It demonstrates modern DevOps practices including:

- **Multi-stage Docker builds** for optimized production images
- **Container orchestration** using Docker Compose
- **Service isolation** with dedicated containers for each component
- **Health checks** and dependency management
- **Volume persistence** for data retention
- **Environment-based configuration** for different deployment scenarios

---

## Architecture

### System Components

The application consists of 4 main services:

```
┌─────────────────────────────────────────────────────────────┐
│                    Sports Manager System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │───▶│   Backend    │───▶│  PostgreSQL  │  │
│  │  (Next.js)   │    │  (Node.js)   │    │  (Database)  │  │
│  │  Port: 3000  │    │  Port: 3001  │    │  Port: 5432  │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                              │                                │
│                              ▼                                │
│                       ┌──────────────┐                       │
│                       │    Cerbos    │                       │
│                       │    (Auth)    │                       │
│                       │ Port: 3592/3 │                       │
│                       └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Service Descriptions

1. **PostgreSQL Database** (`postgres`)
   - Stores all application data
   - Uses persistent volumes for data retention
   - Alpine Linux base for minimal footprint

2. **Cerbos Authorization Server** (`cerbos`)
   - Handles role-based access control (RBAC)
   - Policy-based authorization engine
   - Provides both HTTP and gRPC APIs

3. **Backend API** (`backend`)
   - Node.js/Express TypeScript application
   - RESTful API endpoints
   - Business logic and data validation
   - Runs database migrations on startup

4. **Frontend Application** (`frontend`)
   - Next.js 14 React application
   - Server-side rendering
   - Modern UI with Tailwind CSS

---

## Prerequisites

Before setting up the application, ensure you have the following installed:

- **Docker Desktop** (v20.10.0 or higher)
  - Download: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version`

- **Docker Compose** (v2.0.0 or higher)
  - Usually included with Docker Desktop
  - Verify: `docker-compose --version`

- **Git** (for cloning and version control)
  - Download: https://git-scm.com/downloads
  - Verify: `git --version`

- **Minimum System Requirements:**
  - 8GB RAM (16GB recommended)
  - 20GB free disk space
  - Modern CPU (4+ cores recommended)

---

## Password Strategy

### Overview

The application implements a **multi-layered password management strategy** to ensure security while maintaining ease of development. This strategy separates credentials for different environments and ensures sensitive data is never committed to version control.

### Strategy Components

#### 1. Environment-Based Configuration

We use **environment files** (`.env`) to manage credentials, with different files for different deployment scenarios:

- `.env.example` - Template with placeholder values (committed to Git)
- `.env.local` - Local development credentials (NOT committed)
- `.env.production` - Production credentials (NOT committed, managed separately)
- `.env.test` - Testing credentials (isolated test database)

#### 2. Git Ignore Protection

All environment files containing actual credentials are listed in `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.production
backend/.env
frontend/.env.local
deployment/.env.*
!.env.example
!.env.*.example
```

This ensures that real passwords are NEVER committed to the repository.

#### 3. Password Complexity Requirements

For production deployments, we enforce:

- **Database passwords:**
  - Minimum 16 characters
  - Mix of uppercase, lowercase, numbers, and symbols
  - No dictionary words
  - Example generator: `openssl rand -base64 32`

- **JWT Secret:**
  - Minimum 32 characters
  - Cryptographically random
  - Example: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

- **API Keys:**
  - Provider-specific requirements (Google Maps, OpenRoute, etc.)
  - Stored in environment variables
  - Rotated regularly

#### 4. Docker Secrets (Production)

For production deployments, we recommend using **Docker Secrets** or **Kubernetes Secrets** instead of environment variables:

```yaml
# Production example (not in this submission)
services:
  backend:
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```

#### 5. Development vs. Production Separation

**Development (included in this submission):**
- Simple passwords for local testing (e.g., `postgres123`)
- Passwords documented in `.env.example`
- Quick setup for team members

**Production (deployment guide):**
- Strong, unique passwords
- Secrets management system
- Environment variables injected at runtime
- Regular credential rotation

### Implementation in This Project

For this Docker Compose submission, we provide:

1. **`.env.example`** - A template showing all required variables with safe placeholder values
2. **Setup script** - Automatically copies `.env.example` to `.env` on first run
3. **Documentation** - Clear instructions on customizing passwords before deployment
4. **Best practices guide** - How to transition from development to production security

### Password Checklist

Before deploying to production:

- [ ] Replace all default passwords with strong, unique values
- [ ] Generate new JWT secret using cryptographic random generator
- [ ] Obtain and configure production API keys
- [ ] Enable database SSL/TLS connections
- [ ] Set up password rotation schedule
- [ ] Document password recovery procedures
- [ ] Configure backup credentials separately
- [ ] Enable audit logging for authentication events

---

## Setup Instructions

### Quick Start (5 minutes)

For new team members or quick demos:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd SportsManager-pre-typescript

# 2. Copy environment template
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Wait for services to be ready (about 30 seconds)
docker-compose ps

# 5. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Cerbos: http://localhost:3592
```

### Detailed Setup Steps

#### Step 1: Clone and Navigate

```bash
git clone <your-gitlab-repo-url>
cd SportsManager-pre-typescript
```

#### Step 2: Configure Environment Variables

The application requires several environment variables. We provide a template:

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file (optional for development)
# For production, you MUST change:
# - All passwords
# - JWT_SECRET
# - API keys
nano .env  # or use your preferred editor
```

**Important Environment Variables:**

| Variable | Description | Development Value | Production Requirement |
|----------|-------------|-------------------|------------------------|
| `DB_PASSWORD` | PostgreSQL password | `postgres123` | Strong password (16+ chars) |
| `JWT_SECRET` | Token signing key | `local-dev-secret` | Cryptographically random (32+ chars) |
| `CERBOS_HOST` | Authorization service | `cerbos:3593` | Same |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3000` | Your domain |
| `OPENROUTE_API_KEY` | Maps API key | Provided | Your own key |

#### Step 3: Build Docker Images

```bash
# Build all service images
docker-compose build

# This will:
# - Download base images (Node.js, PostgreSQL, Cerbos)
# - Install dependencies
# - Build TypeScript code
# - Create optimized production images
#
# Expected time: 5-10 minutes on first build
```

#### Step 4: Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# Services start in this order:
# 1. PostgreSQL (waits for health check)
# 2. Cerbos (waits for health check)
# 3. Backend (waits for Postgres + Cerbos)
# 4. Frontend (waits for Backend)
```

#### Step 5: Verify Services

```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                          STATUS
# sportsmanager-postgres-local  Up (healthy)
# sportsmanager-cerbos-local    Up (healthy)
# sportsmanager-backend-local   Up
# sportsmanager-frontend-local  Up

# View logs
docker-compose logs -f backend
```

#### Step 6: Database Initialization

The backend service automatically:
1. Runs database migrations (creates tables)
2. Seeds initial data (optional)

To manually run migrations:

```bash
docker-compose exec backend npm run migrate
```

#### Step 7: Access the Application

Open your browser and navigate to:

- **Frontend Application:** http://localhost:3000
- **Backend API Docs:** http://localhost:3001/api
- **Cerbos Playground:** http://localhost:3592/_cerbos/playground
- **Database:** `postgresql://postgres:postgres123@localhost:5432/sports_management`

### Default Login Credentials

For development and testing:

```
Admin Account:
  Email: admin@refassign.com
  Password: Admin123!

Test Referee:
  Email: referee@test.com
  Password: Referee123!
```

**⚠️ IMPORTANT:** Change these credentials in production!

---

## Service Details

### PostgreSQL Database

**Container Name:** `sportsmanager-postgres-local`
**Image:** `postgres:15-alpine`
**Port:** `5432`

**Features:**
- Persistent data storage using Docker volumes
- Health checks every 10 seconds
- Automatic restart on failure

**Data Persistence:**
```bash
# Data is stored in Docker volume: postgres_data_local
# To backup:
docker-compose exec postgres pg_dump -U postgres sports_management > backup.sql

# To restore:
docker-compose exec -T postgres psql -U postgres sports_management < backup.sql
```

### Cerbos Authorization

**Container Name:** `sportsmanager-cerbos-local`
**Image:** `ghcr.io/cerbos/cerbos:latest`
**Ports:** `3592` (HTTP), `3593` (gRPC)

**Features:**
- Policy-based access control
- Dynamic policy reloading
- Audit logging

**Policy Location:** `./cerbos/policies/`

### Backend API

**Container Name:** `sportsmanager-backend-local`
**Base Image:** `node:20-alpine`
**Port:** `3001`

**Features:**
- Hot-reload in development mode
- Automatic migration runner
- Health check endpoint: `/health`

**Development Mode:**
- Source code mounted as volume for live updates
- Uses `nodemon` for auto-restart
- TypeScript compilation on-the-fly

### Frontend Application

**Container Name:** `sportsmanager-frontend-local`
**Base Image:** `node:20-alpine`
**Port:** `3000`

**Features:**
- Next.js development server
- Hot module replacement (HMR)
- Fast refresh for React components

---

## Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services (keeps data)
docker-compose down

# Stop and remove all data (CAUTION: destroys database)
docker-compose down -v

# Restart a specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build
```

### Monitoring and Logs

```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# View last 100 lines
docker-compose logs --tail=100 backend

# Check service status
docker-compose ps
```

### Database Operations

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d sports_management

# Run migrations
docker-compose exec backend npm run migrate

# Rollback last migration
docker-compose exec backend npm run migrate:rollback

# Reset database (CAUTION: destroys all data)
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend npm run migrate
```

### Development Workflow

```bash
# Enter backend container shell
docker-compose exec backend sh

# Enter frontend container shell
docker-compose exec frontend sh

# Install new npm package in backend
docker-compose exec backend npm install <package-name>
docker-compose restart backend

# Run tests
docker-compose exec backend npm test
```

### Troubleshooting Commands

```bash
# Check Docker resources
docker system df

# View container resource usage
docker stats

# Inspect a service
docker-compose exec backend env

# Force rebuild without cache
docker-compose build --no-cache

# Remove all stopped containers
docker-compose rm -f

# Clean up Docker system
docker system prune -a
```

---

## Troubleshooting

### Service Won't Start

**Problem:** Container exits immediately after starting

**Solutions:**
```bash
# View detailed logs
docker-compose logs backend

# Common issues:
# 1. Port already in use
lsof -i :3000  # Check what's using port 3000
lsof -i :3001
lsof -i :5432

# 2. Missing environment variables
docker-compose config  # Validate docker-compose.yml

# 3. Permission issues (Linux/Mac)
sudo chown -R $USER:$USER .
```

### Database Connection Failed

**Problem:** Backend can't connect to PostgreSQL

**Solutions:**
```bash
# 1. Verify PostgreSQL is healthy
docker-compose ps postgres

# 2. Check database logs
docker-compose logs postgres

# 3. Verify connection string
docker-compose exec backend env | grep DATABASE_URL

# 4. Test connection manually
docker-compose exec postgres pg_isready -U postgres

# 5. Ensure PostgreSQL is fully started
docker-compose restart postgres
sleep 10
docker-compose restart backend
```

### Migration Errors

**Problem:** Database migrations fail

**Solutions:**
```bash
# 1. Check migration status
docker-compose exec backend npx knex migrate:status

# 2. Reset migrations (CAUTION: destroys data)
docker-compose exec backend npx knex migrate:rollback --all
docker-compose exec backend npx knex migrate:latest

# 3. Clean slate (CAUTION: destroys everything)
docker-compose down -v
docker-compose up -d
```

### Frontend Can't Reach Backend

**Problem:** API calls fail from frontend

**Solutions:**
```bash
# 1. Verify backend is running
curl http://localhost:3001/health

# 2. Check CORS configuration
docker-compose exec backend env | grep FRONTEND_URL

# 3. Verify network connectivity
docker-compose exec frontend ping backend
```

### Out of Disk Space

**Problem:** Docker runs out of space

**Solutions:**
```bash
# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Remove specific containers/images
docker-compose down
docker image prune -a
```

### Port Already in Use

**Problem:** "Port is already allocated" error

**Solutions:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Or change ports in docker-compose.yml
ports:
  - "3005:3000"  # Host:Container
```

---

## Security Considerations

### Development vs. Production

**Development (this submission):**
- ✓ Simple setup for quick demos
- ✓ Readable passwords for learning
- ✓ Permissive CORS for testing
- ⚠️ NOT suitable for public deployment

**Production Checklist:**

- [ ] **Passwords:**
  - [ ] Generate strong, unique passwords
  - [ ] Use Docker secrets or secret management service
  - [ ] Enable password rotation

- [ ] **Network Security:**
  - [ ] Use HTTPS/TLS for all connections
  - [ ] Configure proper CORS origins
  - [ ] Set up firewall rules
  - [ ] Use private networks for inter-service communication

- [ ] **Database:**
  - [ ] Enable SSL/TLS for PostgreSQL
  - [ ] Restrict database user permissions
  - [ ] Set up regular backups
  - [ ] Enable audit logging

- [ ] **Application:**
  - [ ] Remove development tools
  - [ ] Enable rate limiting
  - [ ] Configure proper logging
  - [ ] Set up monitoring and alerts
  - [ ] Use production-grade session management

- [ ] **Container Security:**
  - [ ] Run containers as non-root users (already implemented)
  - [ ] Scan images for vulnerabilities
  - [ ] Keep base images updated
  - [ ] Minimize installed packages

- [ ] **Secrets Management:**
  - [ ] Use environment variables or secrets management
  - [ ] Rotate API keys regularly
  - [ ] Never log sensitive data
  - [ ] Encrypt sensitive data at rest

### Additional Recommendations

1. **Use a Reverse Proxy** (Nginx, Traefik)
   - SSL termination
   - Load balancing
   - Security headers

2. **Implement Monitoring**
   - Container health monitoring
   - Application performance monitoring (APM)
   - Log aggregation

3. **Regular Updates**
   - Keep Docker and Docker Compose updated
   - Update base images monthly
   - Apply security patches promptly

4. **Backup Strategy**
   - Automated database backups
   - Test restore procedures
   - Off-site backup storage

---

## Additional Resources

### Documentation
- Docker Documentation: https://docs.docker.com/
- Docker Compose Documentation: https://docs.docker.com/compose/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Next.js Documentation: https://nextjs.org/docs

### Project Files
- `docker-compose.yml` - Service orchestration configuration
- `backend/Dockerfile` - Backend production build
- `backend/Dockerfile.dev` - Backend development build
- `frontend/Dockerfile` - Frontend production build
- `frontend/Dockerfile.dev` - Frontend development build
- `.env.example` - Environment variable template
- `cerbos/config/config.yaml` - Authorization service configuration

### Support
- Project Repository: [Your GitLab URL]
- Issue Tracker: [Your GitLab Issues URL]
- Team Contact: [Your Email]

---

## Conclusion

This Docker Compose setup demonstrates:

✓ **Modern DevOps practices** - Multi-stage builds, health checks, dependency management
✓ **Security-first approach** - Environment-based secrets, non-root containers
✓ **Developer-friendly** - Quick setup, hot-reload, comprehensive documentation
✓ **Production-ready foundation** - Easy to transition from development to production

The configuration is designed to be both educational (showing best practices) and practical (ready for actual use). It provides a solid foundation for the Sports Manager application while remaining flexible for future enhancements.

---

**Submission Checklist:**

- [x] `docker-compose.yml` committed to repository
- [x] All supporting Dockerfiles committed
- [x] Git tag `project-docker-milestone` created
- [x] `seng513-deployment.pdf` prepared
- [x] `seng513-deployment_files.zip` created with all necessary files

---

*End of Document*

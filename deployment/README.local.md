# Local Development Setup

This guide will help you set up the SportsManager application for local development with hot-reload enabled for both frontend and backend.

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose)
- **Git**
- At least 4GB RAM available for Docker
- Ports 3000, 3001, 5432, 3592, 3593 available

## Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/fisherjoey/SportsManager.git
cd SportsManager

# 2. Checkout develop branch
git checkout develop

# 3. Start the development environment
cd deployment
docker-compose -f docker-compose.local.yml up
```

That's it! The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Database**: localhost:5432
- **Cerbos**: localhost:3592 (HTTP), localhost:3593 (gRPC)

## What Gets Started

The local development environment includes:

1. **PostgreSQL Database** - Automatically seeded with production data
2. **Cerbos Authorization** - Policy-based access control
3. **Backend API** - Node.js/Express with hot-reload via nodemon
4. **Frontend** - Next.js with built-in hot-reload

## Test Credentials

All test users have the password: `Admin123!`

| Email | Role | Access Level |
|-------|------|--------------|
| admin@sportsmanager.com | Super Admin | Full system access |
| admin@cmba.ca | Admin | Administrative access |
| assignor@cmba.ca | Assignment Manager | Assign referees to games |
| coordinator@cmba.ca | Referee Coordinator | Manage referees |

## Hot-Reload Development

### Backend Changes
Any changes to files in `backend/src/` will automatically restart the backend server.

```bash
# Edit a file
vim backend/src/routes/games.ts

# Server automatically restarts (watch the logs)
# Changes are immediately available
```

### Frontend Changes
Any changes to files in `frontend/src/` will automatically refresh your browser.

```bash
# Edit a component
vim frontend/src/components/GamesList.tsx

# Browser automatically refreshes
# Changes are immediately visible
```

## Database Access

### Connect with psql
```bash
docker exec -it sportsmanager-postgres-local psql -U postgres -d sports_management
```

### Connect with your favorite client
- **Host**: localhost
- **Port**: 5432
- **Database**: sports_management
- **Username**: postgres
- **Password**: postgres123

### Reset Database
```bash
# Stop containers
docker-compose -f docker-compose.local.yml down

# Remove database volume
docker volume rm deployment_postgres_data_local

# Start fresh (seed data will be reloaded)
docker-compose -f docker-compose.local.yml up
```

## Running Migrations

```bash
# Run pending migrations
docker exec sportsmanager-backend-local sh -c "cd /app && npx knex migrate:latest"

# Rollback last migration
docker exec sportsmanager-backend-local sh -c "cd /app && npx knex migrate:rollback"

# Check migration status
docker exec sportsmanager-backend-local sh -c "cd /app && npx knex migrate:currentVersion"
```

## Viewing Logs

```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker-compose -f docker-compose.local.yml logs -f backend
docker-compose -f docker-compose.local.yml logs -f frontend
docker-compose -f docker-compose.local.yml logs -f postgres
docker-compose -f docker-compose.local.yml logs -f cerbos
```

## Stopping the Environment

```bash
# Stop but keep data
docker-compose -f docker-compose.local.yml down

# Stop and remove all data
docker-compose -f docker-compose.local.yml down -v
```

## Troubleshooting

### Port Already in Use
If you get port conflicts:

```bash
# Find what's using the port
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Either stop that process or change the port in docker-compose.local.yml
```

### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.local.yml logs backend

# Rebuild container
docker-compose -f docker-compose.local.yml build --no-cache backend
docker-compose -f docker-compose.local.yml up backend
```

### Database Connection Issues
```bash
# Ensure postgres is healthy
docker-compose -f docker-compose.local.yml ps

# Check database logs
docker-compose -f docker-compose.local.yml logs postgres

# Verify connection manually
docker exec -it sportsmanager-postgres-local psql -U postgres -d sports_management -c "SELECT 1;"
```

### Hot-Reload Not Working

**Backend:**
```bash
# Check if nodemon is watching
docker-compose -f docker-compose.local.yml logs backend | grep "watching"

# Verify volume mounts
docker inspect sportsmanager-backend-local | grep Mounts -A 10
```

**Frontend:**
```bash
# Check Next.js dev server
docker-compose -f docker-compose.local.yml logs frontend | grep "ready"
```

### Seed Data Not Loading
```bash
# Seed data only loads on first initialization
# To reload, remove the volume:
docker-compose -f docker-compose.local.yml down
docker volume rm deployment_postgres_data_local
docker-compose -f docker-compose.local.yml up
```

## Environment Variables

The local environment uses sensible defaults. If you need to customize:

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit as needed
vim .env.local

# Restart services
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up
```

## Development Workflow

```bash
# 1. Start the environment
docker-compose -f docker-compose.local.yml up

# 2. Make your changes
# - Edit backend/src/* for API changes
# - Edit frontend/src/* for UI changes
# - Changes auto-reload!

# 3. Test your changes
# - Visit http://localhost:3000
# - Use test credentials to log in
# - Verify your feature works

# 4. Stop when done
docker-compose -f docker-compose.local.yml down
```

## Next Steps

- Read [WORKFLOW.md](../docs/WORKFLOW.md) for git workflow and PR process
- Check [LOCAL_DEVELOPMENT.md](../docs/LOCAL_DEVELOPMENT.md) for advanced topics
- Review Cerbos policies in `cerbos-policies/` for authorization logic

## Getting Help

- Check existing issues: https://github.com/fisherjoey/SportsManager/issues
- Ask the team in Slack/Discord
- Review the [troubleshooting section](#troubleshooting) above
# Testing deployment

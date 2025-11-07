# Local Development Guide

Comprehensive guide for developing SportsManager locally.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Local Environment](#local-environment)
- [Hot-Reload Development](#hot-reload-development)
- [Database Management](#database-management)
- [Testing](#testing)
- [Debugging](#debugging)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

### Services

The local development stack includes:

```
┌─────────────────────────────────────────────┐
│           Development Environment            │
├─────────────────────────────────────────────┤
│                                              │
│  Frontend (Next.js)                          │
│  Port: 3000                                  │
│  Hot-reload: ✓                               │
│                                              │
│  Backend (Node/Express)                      │
│  Port: 3001                                  │
│  Hot-reload: ✓ (nodemon)                     │
│                                              │
│  PostgreSQL                                  │
│  Port: 5432                                  │
│  Seed data: Production export                │
│                                              │
│  Cerbos (Authorization)                      │
│  Ports: 3592 (HTTP), 3593 (gRPC)            │
│                                              │
└─────────────────────────────────────────────┘
```

### Directory Structure

```
SportsManager/
├── backend/
│   ├── src/              # Backend source (hot-reload)
│   ├── Dockerfile.dev    # Dev container with nodemon
│   └── knexfile.ts       # Database configuration
│
├── frontend/
│   ├── src/              # Frontend source (hot-reload)
│   ├── Dockerfile.dev    # Dev container with Next.js dev
│   └── next.config.js    # Next.js configuration
│
├── deployment/
│   ├── docker-compose.local.yml   # Local dev stack
│   ├── .env.local.example         # Environment template
│   └── seed-data/                 # Production database export
│
└── cerbos-policies/      # Authorization policies
```

## Local Environment

### Starting the Environment

```bash
cd deployment
docker-compose -f docker-compose.local.yml up
```

### Environment Variables

Copy and customize if needed:
```bash
cp .env.local.example .env.local
vim .env.local
```

Default configuration works out of the box for most development tasks.

### Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | See test accounts below |
| Backend API | http://localhost:3001/api | N/A |
| Database | localhost:5432 | postgres / postgres123 |
| Cerbos HTTP | http://localhost:3592 | N/A |
| Cerbos gRPC | localhost:3593 | N/A |

### Test Accounts

All accounts use password: `Admin123!`

- **admin@sportsmanager.com** - Super Admin (full access)
- **admin@cmba.ca** - Admin
- **assignor@cmba.ca** - Assignment Manager
- **coordinator@cmba.ca** - Referee Coordinator

## Hot-Reload Development

### Backend Hot-Reload

The backend uses **nodemon** to watch for file changes:

```bash
# Any change to backend/src/**/*.ts will:
# 1. Trigger nodemon to detect the change
# 2. Restart the Node.js process
# 3. Load your new code

# Watch the logs to see restarts:
docker-compose -f docker-compose.local.yml logs -f backend
```

**What triggers reload:**
- TypeScript files (`.ts`)
- JavaScript files (`.js`)
- JSON files (`.json`)

**What doesn't trigger reload:**
- Package.json changes (requires rebuild)
- Dockerfile changes (requires rebuild)
- Environment variable changes (restart container)

### Frontend Hot-Reload

The frontend uses **Next.js Fast Refresh**:

```bash
# Any change to frontend/src/** will:
# 1. Be detected by Next.js webpack
# 2. Recompile only changed modules
# 3. Update browser without full page reload (when possible)

# Watch the logs:
docker-compose -f docker-compose.local.yml logs -f frontend
```

**Fast Refresh features:**
- Preserves React component state
- Shows errors in browser overlay
- Instant feedback (<1 second typically)

### Rebuilding After Changes

Some changes require a container rebuild:

```bash
# If you change:
# - package.json dependencies
# - Dockerfile
# - Docker compose configuration

# Rebuild:
docker-compose -f docker-compose.local.yml build --no-cache backend
docker-compose -f docker-compose.local.yml up backend
```

## Database Management

### Connecting to Database

**Using psql in container:**
```bash
docker exec -it sportsmanager-postgres-local psql -U postgres -d sports_management
```

**Using your GUI client:**
- Host: `localhost`
- Port: `5432`
- Database: `sports_management`
- User: `postgres`
- Password: `postgres123`

### Running Migrations

**Apply pending migrations:**
```bash
docker exec sportsmanager-backend-local sh -c "cd /app && npx knex migrate:latest"
```

**Rollback last migration:**
```bash
docker exec sportsmanager-backend-local sh -c "cd /app && npx knex migrate:rollback"
```

**Check migration status:**
```bash
docker exec sportsmanager-backend-local sh -c "cd /app && npx knex migrate:currentVersion"
```

**Create new migration:**
```bash
# On your host machine:
cd backend
npx knex migrate:make migration_name
```

### Seeding Data

**Reset database with fresh seed data:**
```bash
# Stop containers
docker-compose -f docker-compose.local.yml down

# Remove database volume
docker volume rm deployment_postgres_data_local

# Start fresh (seed data auto-loads)
docker-compose -f docker-compose.local.yml up
```

**Manually load seed data:**
```bash
docker exec -i sportsmanager-postgres-local psql -U postgres -d sports_management < deployment/seed-data/seed_data.sql
```

### Database Backups

**Create backup:**
```bash
docker exec sportsmanager-postgres-local pg_dump -U postgres -d sports_management -F c -f /tmp/backup.dump
docker cp sportsmanager-postgres-local:/tmp/backup.dump ./backup.dump
```

**Restore backup:**
```bash
docker cp ./backup.dump sportsmanager-postgres-local:/tmp/backup.dump
docker exec sportsmanager-postgres-local pg_restore -U postgres -d sports_management -c /tmp/backup.dump
```

## Testing

### Backend Tests

```bash
# Run all tests
docker exec sportsmanager-backend-local npm test

# Run specific test file
docker exec sportsmanager-backend-local npm test -- --grep "games"

# Run with coverage
docker exec sportsmanager-backend-local npm run test:coverage
```

### Frontend Tests

```bash
# Run all tests
docker exec sportsmanager-frontend-local npm test

# Run in watch mode
docker exec sportsmanager-frontend-local npm test -- --watch

# Run specific test
docker exec sportsmanager-frontend-local npm test -- GamesList
```

### Integration Tests

```bash
# Coming soon: End-to-end tests with Playwright/Cypress
```

## Debugging

### Backend Debugging

**Enable debug logging:**
```bash
# Add to docker-compose.local.yml backend environment:
DEBUG: "app:*"
LOG_LEVEL: debug
```

**View backend logs:**
```bash
docker-compose -f docker-compose.local.yml logs -f backend
```

**Attach debugger:**
```bash
# Add to docker-compose.local.yml backend:
command: ["node", "--inspect=0.0.0.0:9229", "src/index.ts"]
ports:
  - "9229:9229"

# Then connect your IDE debugger to localhost:9229
```

### Frontend Debugging

**Browser DevTools:**
- Open http://localhost:3000
- Press F12 for DevTools
- Source maps enabled by default

**Next.js Debug Mode:**
```bash
# Frontend already runs in development mode
# Check logs for detailed Next.js information:
docker-compose -f docker-compose.local.yml logs -f frontend
```

### Database Debugging

**View all queries:**
```bash
# Enable query logging in postgres
docker exec -it sportsmanager-postgres-local psql -U postgres -d sports_management

# In psql:
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

# View logs:
docker logs sportsmanager-postgres-local -f
```

## Performance

### Optimizing Container Build Times

**Use layer caching:**
```dockerfile
# Dockerfile.dev structure optimizes caching:
# 1. Copy package files first (changes rarely)
# 2. Install dependencies (cached if package.json unchanged)
# 3. Copy source code (changes frequently)
```

**Faster npm install:**
```bash
# Use npm ci instead of npm install in production
# Local dev uses npm install for flexibility
```

### Optimizing Hot-Reload Speed

**Backend:**
- Nodemon only watches `src/` directory
- Excludes `node_modules` from watching
- Fast TypeScript compilation

**Frontend:**
- Next.js Fast Refresh is optimized by default
- Only rebuilds changed modules
- Maintains state when possible

## Troubleshooting

### Services Won't Start

**Check Docker resources:**
```bash
# Ensure Docker has enough resources:
# - 4GB+ RAM recommended
# - 2+ CPU cores

# Check in Docker Desktop: Settings → Resources
```

**Check port conflicts:**
```bash
# Windows:
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432

# Mac/Linux:
lsof -i :3000
lsof -i :3001
lsof -i :5432
```

### Hot-Reload Not Working

**Backend not reloading:**
```bash
# Check nodemon is running:
docker-compose -f docker-compose.local.yml logs backend | grep nodemon

# Verify volume mounts:
docker inspect sportsmanager-backend-local | grep Mounts -A 20

# Manual restart:
docker-compose -f docker-compose.local.yml restart backend
```

**Frontend not refreshing:**
```bash
# Check Next.js is in dev mode:
docker-compose -f docker-compose.local.yml logs frontend | grep "ready"

# Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Clear Next.js cache:
docker exec sportsmanager-frontend-local rm -rf .next
docker-compose -f docker-compose.local.yml restart frontend
```

### Database Connection Issues

**Can't connect to database:**
```bash
# Check postgres is running:
docker-compose -f docker-compose.local.yml ps postgres

# Check health:
docker exec sportsmanager-postgres-local pg_isready -U postgres

# View logs:
docker-compose -f docker-compose.local.yml logs postgres
```

**Seed data didn't load:**
```bash
# Seed data only loads on first init
# To reload:
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up
```

### Cerbos Authorization Issues

**Check Cerbos is running:**
```bash
docker-compose -f docker-compose.local.yml ps cerbos

# Test Cerbos health:
curl http://localhost:3592/_cerbos/health
```

**View Cerbos logs:**
```bash
docker-compose -f docker-compose.local.yml logs cerbos
```

**Reload policies:**
```bash
# Policies are mounted as read-only volumes
# Changes to cerbos-policies/ require restart:
docker-compose -f docker-compose.local.yml restart cerbos
```

### Performance Issues

**Slow container startup:**
```bash
# Increase Docker resources in Docker Desktop
# Settings → Resources → Increase memory to 6-8GB
```

**Slow hot-reload:**
```bash
# Disable antivirus scanning of project directory
# Use SSD instead of HDD if possible
# Close unnecessary applications
```

## Best Practices

### Development Workflow

1. **Start fresh daily:** `docker-compose down && docker-compose up`
2. **Commit often:** Small, focused commits
3. **Test locally:** Verify changes work before pushing
4. **Clean up:** Remove unused Docker volumes/images weekly

### Code Quality

1. **Linting:** Run linter before committing
2. **Type safety:** Fix TypeScript errors
3. **Console logs:** Remove debug logs before committing
4. **Comments:** Update comments when changing code

### Database

1. **Migrations:** Always use migrations, never manual schema changes
2. **Seed data:** Keep seed data minimal but realistic
3. **Backups:** Backup before major schema changes
4. **Testing:** Test migrations both up and down

## Additional Resources

- [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) - Quick start guide
- [WORKFLOW.md](./WORKFLOW.md) - Git workflow and deployment
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Next.js Docs](https://nextjs.org/docs)
- [Knex.js Docs](https://knexjs.org/)
- [Cerbos Docs](https://docs.cerbos.dev/)

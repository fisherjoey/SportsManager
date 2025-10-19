# Development Guide

This guide covers different development workflows for the SportsManager application.

## Quick Start

Choose one of these workflows based on your needs:

### 1. 🚀 Native Development (Fastest - Recommended for Solo Dev)

**Best for**: Rapid iteration, fastest hot-reload, solo development

```bash
# Start infrastructure only (Postgres, Redis, Cerbos)
docker-compose -f config/docker/docker-compose.yml up postgres redis cerbos

# In separate terminals:

# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

**Hot-Reload**: ⚡ Instant (0.1-0.5s)
- Frontend: Next.js Fast Refresh
- Backend: nodemon auto-restart

---

### 2. 🐳 Full Docker Development (Best for Teams)

**Best for**: Team consistency, full integration testing, production-like environment

```bash
# Start everything
docker-compose -f config/docker/docker-compose.dev.yml up

# Or run in background
docker-compose -f config/docker/docker-compose.dev.yml up -d

# View logs
docker-compose -f config/docker/docker-compose.dev.yml logs -f backend
docker-compose -f config/docker/docker-compose.dev.yml logs -f frontend
```

**Hot-Reload**: ⚡ Fast (1-3s)
- Frontend: Next.js Fast Refresh (works through Docker volumes)
- Backend: nodemon auto-restart (works through Docker volumes)

**When to restart**:
```bash
# After package.json changes
docker-compose -f config/docker/docker-compose.dev.yml restart backend
docker-compose -f config/docker/docker-compose.dev.yml restart frontend

# After Dockerfile changes
docker-compose -f config/docker/docker-compose.dev.yml up --build
```

---

### 3. 🔀 Hybrid Approach (Best for Debugging)

**Best for**: Debugging one service, testing integrations

```bash
# Option A: Docker backend + Native frontend
docker-compose -f config/docker/docker-compose.yml up postgres redis cerbos backend
cd frontend && npm run dev

# Option B: Docker frontend + Native backend
docker-compose -f config/docker/docker-compose.yml up postgres redis cerbos frontend
cd backend && npm run dev

# Option C: Everything Docker except what you're debugging
docker-compose -f config/docker/docker-compose.yml up postgres redis cerbos
cd backend && npm run dev
cd frontend && npm run dev
```

---

## Hot-Reload Configuration

### Frontend Hot-Reload

**Native Development** (Recommended):
- ✅ Instant Fast Refresh (0.1-0.5s)
- ✅ Full TypeScript checking
- ✅ Best DX (Developer Experience)

**Docker Development**:
- ✅ Fast Refresh works (1-3s)
- ✅ Automatic on file save
- ⚠️ Slightly slower due to Docker volume I/O

**Troubleshooting Docker Hot-Reload**:
If hot-reload is slow on Windows/macOS, try polling mode:

```bash
# In docker-compose.dev.yml, set:
WATCHPACK_POLLING: true
CHOKIDAR_USEPOLLING: true

# Or in .env file
WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true
```

⚠️ **Note**: Polling uses more CPU, only enable if needed

---

### Backend Hot-Reload

**Native Development** (Recommended):
- ✅ Instant nodemon restart (0.5-1s)
- ✅ TypeScript compilation on the fly
- ✅ Fastest development cycle

**Docker Development**:
- ✅ nodemon auto-restart (1-3s)
- ✅ Works out of the box
- ⚠️ Rebuild needed for Dockerfile or package.json changes

**Debugging with Docker**:
```bash
# Enable Node.js debugging
docker-compose -f config/docker/docker-compose.dev.yml up

# Attach debugger to localhost:9229
# In VS Code: Use "Attach to Docker" launch configuration
```

---

## Performance Optimization

### Docker Volume Performance (Windows/macOS)

Docker volumes can be slow on Windows/macOS. Here are optimizations:

**1. Use Selective Volume Mounts** (Already implemented in `docker-compose.dev.yml`)
```yaml
# Instead of mounting entire directory:
volumes:
  - ../../frontend:/app  # ❌ Slower

# Mount only what's needed:
volumes:  # ✅ Faster
  - ../../frontend/app:/app/app
  - ../../frontend/components:/app/components
  - ../../frontend/lib:/app/lib
  # etc...
```

**2. Exclude node_modules and build artifacts**
```yaml
volumes:
  - /app/node_modules  # Never sync node_modules
  - /app/.next         # Never sync Next.js cache
  - /app/dist          # Never sync build output
```

**3. Use WSL2 on Windows** (Recommended)
```bash
# Install WSL2, then clone project inside WSL2 filesystem
# 10-100x faster Docker volume performance
cd ~
git clone your-repo
code .
```

---

## Common Development Tasks

### Database Management

```bash
# Run migrations (Native)
cd backend
npm run migrate:latest

# Run migrations (Docker)
docker-compose -f config/docker/docker-compose.dev.yml exec backend npm run migrate:latest

# Rollback migration
docker-compose -f config/docker/docker-compose.dev.yml exec backend npm run migrate:rollback

# Seed database
docker-compose -f config/docker/docker-compose.dev.yml exec backend npm run seed:run

# Reset database
docker-compose -f config/docker/docker-compose.dev.yml down -v
docker-compose -f config/docker/docker-compose.dev.yml up
```

### View Logs

```bash
# All services
docker-compose -f config/docker/docker-compose.dev.yml logs -f

# Specific service
docker-compose -f config/docker/docker-compose.dev.yml logs -f backend
docker-compose -f config/docker/docker-compose.dev.yml logs -f frontend

# Last 100 lines
docker-compose -f config/docker/docker-compose.dev.yml logs --tail=100 backend
```

### Restart Services

```bash
# Restart specific service
docker-compose -f config/docker/docker-compose.dev.yml restart backend
docker-compose -f config/docker/docker-compose.dev.yml restart frontend

# Rebuild and restart (after Dockerfile changes)
docker-compose -f config/docker/docker-compose.dev.yml up --build backend
```

### Clean Up

```bash
# Stop all services
docker-compose -f config/docker/docker-compose.dev.yml down

# Stop and remove volumes (DELETES DATA!)
docker-compose -f config/docker/docker-compose.dev.yml down -v

# Remove images
docker-compose -f config/docker/docker-compose.dev.yml down --rmi all
```

---

## IDE Configuration

### VS Code

**Recommended Extensions**:
- ESLint
- Prettier
- Docker
- Remote - Containers (for Docker development)
- PostgreSQL (for database queries)

**Launch Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Docker Backend",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}/backend",
      "remoteRoot": "/app",
      "protocol": "inspector",
      "restart": true
    }
  ]
}
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # macOS/Linux

# Kill the process
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # macOS/Linux
```

### Hot-Reload Not Working

**Native Development**:
1. Check if `npm run dev` is running
2. Check terminal for errors
3. Try `npm install` again

**Docker Development**:
1. Check if volumes are mounted: `docker inspect sports_manager_frontend_dev`
2. Try restarting: `docker-compose restart frontend`
3. Check logs: `docker-compose logs -f frontend`
4. On Windows/macOS: Try polling mode (see above)

### Database Connection Issues

```bash
# Check if Postgres is running
docker-compose ps postgres

# Check Postgres logs
docker-compose logs postgres

# Connect to Postgres directly
docker-compose exec postgres psql -U postgres -d sports_management
```

### Docker Build Fails

```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache backend
docker-compose build --no-cache frontend
docker-compose up
```

---

## Recommended Workflow

For **active development**, we recommend **Native Development** (Option 1):

1. Start infrastructure in Docker:
   ```bash
   docker-compose -f config/docker/docker-compose.yml up postgres redis cerbos -d
   ```

2. Run backend and frontend natively:
   ```bash
   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   cd frontend && npm run dev
   ```

3. **Why?**
   - ⚡ Fastest hot-reload (instant)
   - 🐛 Easier debugging (native Node.js)
   - 🔄 No Docker overhead
   - 💻 Better IDE integration

4. **When to use Docker?**
   - 🧪 Integration testing
   - 🤝 Team onboarding
   - 🚀 Before deploying (test in production-like env)
   - 🔍 Debugging Docker-specific issues

---

## Performance Comparison

| Workflow | Hot-Reload Speed | Setup Time | Best For |
|----------|-----------------|------------|----------|
| **Native** | ⚡⚡⚡ 0.1-0.5s | ⏱️ 2 min | Solo dev, rapid iteration |
| **Docker Dev** | ⚡⚡ 1-3s | ⏱️⏱️ 5 min | Teams, consistency |
| **Hybrid** | ⚡⚡⚡ / ⚡⚡ | ⏱️ 3 min | Debugging, testing |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=sports_management

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Redis (optional)
DISABLE_REDIS=false

# Docker Hot-Reload (only if needed)
WATCHPACK_POLLING=false
CHOKIDAR_USEPOLLING=false

# API Keys (optional)
GOOGLE_MAPS_API_KEY=
OPENROUTE_API_KEY=
SENTRY_DSN=
```

---

## Next Steps

1. Choose your development workflow
2. Set up your `.env` file
3. Start developing!

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).
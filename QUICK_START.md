# 🚀 Quick Start Guide

## Start Everything (One Command)

```bash
npm run dev
```

**What this does:**
1. Starts Cerbos container (Docker required)
2. Starts Backend API on port 3001
3. Starts Frontend on port 3000

All services run in one terminal with color-coded output.

---

## Alternative: Use the Startup Script

**Windows:**
```cmd
dev-start.bat
```

**Mac/Linux:**
```bash
./dev-start.sh
```

These scripts will:
- ✅ Check if Docker is running
- ✅ Install dependencies if needed
- ✅ Start all services
- ⚠️ Give you options if Docker isn't available

---

## Individual Service Control

**Start services separately:**
```bash
# Terminal 1: Cerbos (background)
npm run start:cerbos

# Terminal 2: Backend
npm run dev:backend

# Terminal 3: Frontend
npm run dev:frontend
```

**Stop Cerbos when done:**
```bash
npm run stop:cerbos
```

---

## Access Your Services

Once running:

| Service | URL | Login |
|---------|-----|-------|
| **Frontend** | http://localhost:3000 | admin@refassign.com / (your password) |
| **Backend API** | http://localhost:3001/api | - |
| **Cerbos Health** | http://localhost:3592/_cerbos/health | - |
| **Database** | localhost:5432 | postgres / postgres123 |

---

## Common Commands Cheat Sheet

```bash
# Development
npm run dev                    # Start all services
npm run dev:backend            # Backend only
npm run dev:frontend           # Frontend only

# Cerbos
npm run start:cerbos           # Start (background)
npm run stop:cerbos            # Stop
npm run restart:cerbos         # Restart
npm run logs:cerbos            # View logs

# Database
cd backend && npm run migrate              # Run migrations
cd backend && npm run migrate:rollback     # Rollback
cd backend && npm run seed:initial         # Seed data

# Testing
npm run test:all               # All tests
cd backend && npm test         # Backend tests
cd frontend && npm test        # Frontend tests

# Validation
cd backend && npm run cerbos:validate      # Check Cerbos policies
cd backend && npm run type-check           # TypeScript check
npm run lint:all               # Lint all code

# Building
npm run build:all              # Build everything
cd backend && npm run build    # Backend only
cd frontend && npm run build   # Frontend only

# Cleanup
npm run clean                  # Remove build artifacts
```

---

## Troubleshooting

### ❌ "Docker is not running"

**Solution:**
1. Start Docker Desktop
2. Wait for Docker icon to appear in system tray
3. Run `npm run dev` again

**OR** run without Cerbos:
```bash
# Start backend and frontend only
npm run dev:backend &
npm run dev:frontend
```

---

### ❌ "Permission check failed" errors in logs

**Problem:** Cerbos not running

**Solution:**
```bash
# Check if Cerbos is healthy
curl http://localhost:3592/_cerbos/health

# If no response, start Cerbos
npm run start:cerbos

# Verify it's running
docker ps | grep cerbos
```

---

### ❌ "Port 3000/3001 already in use"

**Solution:**

**Windows:**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

---

### ❌ Database connection errors

**Check PostgreSQL is running:**
```bash
# Windows (local install)
pg_isready -h localhost -p 5432

# Docker
docker ps | grep postgres
```

**Check credentials in `backend/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=sports_management
```

---

### ❌ Tests hanging

**Solution:**
```bash
cd backend
npm test -- --forceExit --maxWorkers=1
```

---

## First Time Setup Checklist

- [ ] Install Node.js 18+
- [ ] Install Docker Desktop
- [ ] Clone repository
- [ ] Run `npm run install:all`
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Start PostgreSQL (local or Docker)
- [ ] Run `cd backend && npm run migrate`
- [ ] Run `npm run dev`
- [ ] Visit http://localhost:3000

---

## Development Workflow

1. **Start services:** `npm run dev`
2. **Make changes** in `backend/src/` or `frontend/`
3. **Hot reload** happens automatically
4. **Test:** `npm run test:all`
5. **Commit:** Git will run Cerbos policy check
6. **Push:** CI/CD runs all tests

---

## Need Help?

- 📖 Full docs: `/docs`
- 🐛 Issues: Check `/docs/ci-cd/PIPELINE_FIX_SUMMARY.md`
- 🔐 Cerbos: See `/docs/security/CERBOS_POLICY_ENFORCEMENT.md`
- 📊 Database: See `/docs/schema/README.md`

---

**Happy coding! 🎉**

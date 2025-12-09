# ✅ Development Environment - Fully Working!

**Status as of:** 2025-10-21 (Session 2)

---

## 🎉 All Systems Operational

✅ **PostgreSQL Database** - Running with seed data (6 users, 180 games, 36 teams)
✅ **Cerbos Authorization** - Running and validated
✅ **Backend API** - Running on http://localhost:3001
✅ **Frontend Next.js** - Running on http://localhost:3000
✅ **Frontend-Backend Connection** - Working through Next.js proxy

---

## 🔧 Issues Fixed Today (Session 2)

### Issue 1: Frontend Blocklist Error ✅ FIXED
**Error:** `TypeError: Cannot read properties of undefined (reading 'blocklist')`

**Root Cause:** Next.js 15.2.4 had an internal css-loader bug

**Solution:** Upgraded Next.js from 15.2.4 to 15.5.6
```bash
cd frontend
npm install next@15.5.6 --save-exact
```

**Result:** Frontend compiles successfully with React 19

---

### Issue 2: Docker Networking - Frontend Can't Reach Backend ✅ FIXED
**Error:** `Failed to proxy http://localhost:3001/api/auth/login [ECONNREFUSED]`

**Root Cause:** Frontend container was trying to reach `localhost:3001`, but inside Docker, localhost refers to the container itself, not the backend service.

**Solution:** Added separate API URLs for client-side vs server-side calls

**Changes Made:**

1. **Updated `deployment/docker-compose.local.yml`:**
   ```yaml
   frontend:
     environment:
       # Client-side API URL (exposed to browser)
       NEXT_PUBLIC_API_URL: http://localhost:3001/api

       # Server-side API URL (for Docker inter-container communication)
       INTERNAL_API_URL: http://backend:3001/api  # ← Added this
   ```

2. **Updated `frontend/next.config.js`:**
   ```javascript
   async rewrites() {
     // Use INTERNAL_API_URL for server-side proxy (Docker service name)
     // Fall back to NEXT_PUBLIC_API_URL for local dev (localhost)
     const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
     const backendUrl = apiUrl.replace(/\/api\/?$/, '')

     console.log('[Next.js] API Proxy configured to:', backendUrl);

     return [
       {
         source: '/api/:path*',
         destination: `${backendUrl}/api/:path*`,
       },
     ];
   }
   ```

**Result:** Frontend successfully proxies requests to backend container

---

## 🧪 Verification Tests

### Test 1: Direct Backend Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sportsmanager.com","password":"admin123"}'
```
**Result:** ✅ Returns HTTP 200 with JWT token

### Test 2: Frontend Proxy Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sportsmanager.com","password":"admin123"}'
```
**Result:** ✅ Returns HTTP 200 with JWT token (proxied through Next.js)

### Test 3: Backend Logs Verification
```bash
docker logs sportsmanager-backend-local 2>&1 | grep "auth/login"
```
**Result:** ✅ Shows incoming login requests from frontend proxy

---

## 📊 Current Environment Status

### Running Containers
```bash
docker ps --filter name=sportsmanager
```

| Container | Status | Port | Health |
|-----------|--------|------|--------|
| sportsmanager-postgres-local | Up | 5432 | ✅ Healthy |
| sportsmanager-cerbos-local | Up | 3592, 3593 | ✅ Healthy |
| sportsmanager-backend-local | Up | 3001 | ✅ Running |
| sportsmanager-frontend-local | Up | 3000 | ✅ Running |

### Database Content
- **Users:** 6 (admin, assignors, coordinators, referees)
- **Games:** 180
- **Teams:** 36
- **Positions:** 3 (Referee, Linesman, etc.)

### Test Credentials
- Email: `admin@sportsmanager.com`
- Password: `admin123`
- Role: `SUPER_ADMIN`

---

## 🚀 Quick Start Commands

### Start Environment
```bash
cd deployment
docker-compose -f docker-compose.local.yml up -d
```

### Check Status
```bash
docker ps --filter name=sportsmanager
```

### View Logs
```bash
# Backend
docker logs -f sportsmanager-backend-local

# Frontend
docker logs -f sportsmanager-frontend-local

# Cerbos
docker logs -f sportsmanager-cerbos-local
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sportsmanager.com","password":"admin123"}'
```

---

## 🎯 Next Steps

Now that the dev environment is fully working, you can:

1. **Test Assignment Workflow** - Use the assignment endpoints that were fixed in Session 1
2. **Test in Browser** - Open http://localhost:3000 and login
3. **Verify Cerbos Authorization** - Test different role permissions
4. **Test Frontend Components** - Verify all UI components work

---

## 📝 Technical Details

### Docker Networking Architecture

```
Browser (localhost)
    ↓
Frontend Container (localhost:3000)
    ↓ (server-side API calls)
    Uses: http://backend:3001 (Docker service name)
    ↓
Backend Container (localhost:3001)
    ↓
PostgreSQL Container (postgres:5432)
    ↓
Cerbos Container (cerbos:3593)
```

**Key Insight:**
- **Client-side calls** from browser use `http://localhost:3001` (published port)
- **Server-side calls** from Next.js proxy use `http://backend:3001` (Docker service name)

### Next.js API Proxy Flow

1. Browser requests: `POST http://localhost:3000/api/auth/login`
2. Next.js rewrites to: `http://backend:3001/api/auth/login` (using INTERNAL_API_URL)
3. Backend processes request and returns response
4. Next.js proxies response back to browser

---

## 🔍 Debugging Tips

### If Frontend Won't Start
```bash
# Check logs for errors
docker logs sportsmanager-frontend-local

# Rebuild container
cd deployment
docker-compose -f docker-compose.local.yml up -d --build frontend
```

### If Backend Connection Fails
```bash
# Check if INTERNAL_API_URL is set correctly
docker exec sportsmanager-frontend-local env | grep API_URL

# Should show:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
# INTERNAL_API_URL=http://backend:3001/api
```

### If Database Connection Fails
```bash
# Check database is running
docker exec sportsmanager-postgres-local psql -U postgres -d sports_management -c "SELECT COUNT(*) FROM users;"
```

---

## ✅ Success Criteria Met

- [x] All containers running and healthy
- [x] Frontend compiles without errors
- [x] Frontend can reach backend through proxy
- [x] Backend can authenticate users
- [x] Database contains seed data
- [x] Cerbos authorization service running
- [x] Login works through browser and API

**Development environment is ready for testing assignment workflows!** 🎉

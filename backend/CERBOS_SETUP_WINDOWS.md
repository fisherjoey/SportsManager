# Setting Up Cerbos on Windows

## The Problem You're Seeing

When you try to access a protected route, you get:
```json
{"error":"Internal Server Error","message":"Failed to check permissions"}
```

**Why:** The `requireCerbosPermission` middleware tries to connect to Cerbos, but Cerbos isn't running.

## The Solution: Install Docker & Start Cerbos

### Step 1: Install Docker Desktop for Windows

1. Download Docker Desktop:
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Or direct link: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

2. Install Docker Desktop:
   - Run the installer
   - Enable WSL 2 if prompted
   - Restart your computer if required

3. Start Docker Desktop:
   - Open Docker Desktop from Start menu
   - Wait for it to fully start (you'll see the whale icon in system tray)

4. Verify Docker is running:
   ```powershell
   docker --version
   # Should output: Docker version 24.x.x
   ```

### Step 2: Start Cerbos

Once Docker is running:

```powershell
# Navigate to project root
cd C:\Users\School\OneDrive\Desktop\SportsManager-pre-typescript

# Start Cerbos
docker-compose -f docker-compose.cerbos.yml up -d

# Verify Cerbos is running
curl http://localhost:3592/_cerbos/health

# Should return: {"status":"SERVING"}
```

### Step 3: Restart Your Backend

```powershell
cd backend
npm run dev
```

### Step 4: Test Your Route Again

Now when you make a request, it should work!

```powershell
# Get auth token first
$token = "YOUR_JWT_TOKEN"

# Test listing games
curl -H "Authorization: Bearer $token" http://localhost:3000/api/games

# Should return games list, not an error
```

---

## Alternative: Temporary Fallback (Development Only)

If you **can't install Docker right now**, you can temporarily use a fallback:

### Option A: Use the Fallback Middleware

Update `games.ts` to use fallback:

```typescript
import { requireCerbosPermissionWithFallback, developmentFallback } from '../middleware/cerbos-fallback';
import { requirePermission, requireAnyPermission } from '../middleware/auth';

// GET /api/games - Use fallback to old permission system
router.get('/', validateQuery('gamesFilter'), authenticateToken,
  requireCerbosPermissionWithFallback({
    resource: 'game',
    action: 'list',
  },
  // Fallback: just pass through (or use requirePermission if you want)
  developmentFallback()
), enhancedAsyncHandler(getGames));

// Or with old middleware as fallback:
router.post('/', authenticateToken,
  requireCerbosPermissionWithFallback({
    resource: 'game',
    action: 'create',
  },
  requirePermission('games:create') // Falls back to old system
), validateBody(gameSchema), enhancedAsyncHandler(createGame));
```

**Pros:**
- Backend works without Cerbos
- Can develop locally
- Shows warnings in logs

**Cons:**
- Using old permission system (no org/region isolation)
- Not testing actual Cerbos integration
- Need to remove fallback before production

### Option B: Temporarily Comment Out Cerbos Middleware

**FOR TESTING ONLY** - Quick and dirty:

```typescript
// Temporarily commented out for testing without Cerbos
// router.get('/', validateQuery('gamesFilter'), authenticateToken, requireCerbosPermission({
//   resource: 'game',
//   action: 'list',
// }), enhancedAsyncHandler(getGames));

// Temporary - using old system
router.get('/', validateQuery('gamesFilter'), authenticateToken, enhancedAsyncHandler(getGames));
```

**Remember to uncomment before committing!**

---

## Recommended Approach

### For Development (Right Now):

1. **Best:** Install Docker Desktop and start Cerbos (15 minutes)
2. **OK:** Use fallback middleware temporarily
3. **Not recommended:** Comment out Cerbos middleware

### For Production:

**Cerbos MUST be running.** No fallbacks in production.

---

## Debugging

### Check if Cerbos is running:

```powershell
# Check Docker containers
docker ps

# Should show cerbos container running
# CONTAINER ID   IMAGE                              PORTS
# abc123...      ghcr.io/cerbos/cerbos:latest      0.0.0.0:3592->3592/tcp

# Check Cerbos health
curl http://localhost:3592/_cerbos/health

# Check Cerbos logs
docker logs sportsmanager-cerbos
```

### Check if policies are loaded:

```powershell
# View loaded policies
curl http://localhost:3592/api/policies

# Should show game, assignment, referee policies
```

### Backend logs:

Your backend will log:
- `✅ Cerbos is available, using Cerbos authorization` - Good!
- `⚠️  Cerbos is not available, falling back to legacy permissions` - Need to start Cerbos
- `❌ Cerbos health check failed` - Cerbos not running or not accessible

---

## What's Required for Production

```
✅ Docker installed and running
✅ Cerbos service started
✅ Policies loaded (happens automatically)
✅ Backend can reach Cerbos (http://localhost:3592)
✅ Environment variables set (CERBOS_HOST, CERBOS_TLS)
```

---

## Summary

**Your error means:** Cerbos isn't running

**Quick fix:** Install Docker Desktop → Start Cerbos → Restart backend

**Temporary workaround:** Use fallback middleware (but only for dev!)

**Backend functions:** NO CHANGES NEEDED - just middleware changed

The migration is complete, you just need Cerbos running to test it! 🎉
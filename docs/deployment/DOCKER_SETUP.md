# Docker & Cerbos Setup Guide

## Why You Need This

Your backend now uses Cerbos for authorization. Without Cerbos running, you'll get:
```json
{"error":"Internal Server Error","message":"Failed to check permissions"}
```

**This is expected!** The middleware needs Cerbos to authorize requests.

---

## Step 1: Install Docker Desktop for Windows

### Download Docker Desktop

**Option A: Direct Download**
1. Go to: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
2. Run the installer
3. Follow the installation wizard

**Option B: From Docker Website**
1. Visit: https://www.docker.com/products/docker-desktop/
2. Click "Download for Windows"
3. Run the installer

### Installation Steps

1. **Run the Installer**
   - Double-click `Docker Desktop Installer.exe`
   - Accept the license agreement
   - Use recommended settings (WSL 2 backend)

2. **Enable WSL 2** (if prompted)
   - Docker will prompt to install WSL 2
   - This is required for Docker on Windows
   - Follow the prompts to enable it

3. **Restart Your Computer**
   - You'll likely need to restart after installation
   - This is normal

4. **Start Docker Desktop**
   - Open Docker Desktop from Start Menu
   - Wait for it to fully start (whale icon appears in system tray)
   - First start may take 2-3 minutes

### Verify Docker is Running

Open PowerShell or Command Prompt:

```powershell
# Check Docker version
docker --version
# Expected: Docker version 24.x.x, build xxxxx

# Check Docker Compose version
docker-compose --version
# Expected: Docker Compose version v2.x.x

# Test Docker is working
docker run hello-world
# Should download and run a test container
```

If you see version numbers, Docker is installed! ✅

---

## Step 2: Start Cerbos

### Navigate to Project Directory

```powershell
cd C:\Users\School\OneDrive\Desktop\SportsManager-pre-typescript
```

### Start Cerbos Service

```powershell
# Start Cerbos in detached mode
docker-compose -f docker-compose.cerbos.yml up -d

# Expected output:
# Creating network "sportsmanager_default" (if it doesn't exist)
# Creating sportsmanager-cerbos ... done
```

### Verify Cerbos is Running

```powershell
# Check if container is running
docker ps

# Should show:
# CONTAINER ID   IMAGE                              STATUS         PORTS
# abc123...      ghcr.io/cerbos/cerbos:latest      Up 10 seconds  0.0.0.0:3592->3592/tcp

# Check Cerbos health endpoint
curl http://localhost:3592/_cerbos/health

# Expected response:
# {"status":"SERVING"}
```

If you see `{"status":"SERVING"}`, Cerbos is ready! ✅

---

## Step 3: Verify Policies Are Loaded

```powershell
# Check that policies are loaded
curl http://localhost:3592/_cerbos/playground

# Should return HTML (the Cerbos playground interface)

# Or check logs to see policies being loaded
docker logs sportsmanager-cerbos

# Should show:
# INFO ... Loading policies from /policies
# INFO ... Loaded 3 resource policies
# INFO ... Server started
```

---

## Step 4: Start Your Backend

```powershell
cd backend
npm run dev
```

**Expected output:**
```
Server running on port 3000
✓ Database connected
✓ Cerbos connection established
```

**No Cerbos errors!** If you see Cerbos errors, go back to Step 2.

---

## Step 5: Test a Protected Route

### Get an Auth Token

```powershell
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"your_password\"}'

# Copy the token from response
```

### Test the Route

```powershell
# Set token as variable
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test listing games
curl -H "Authorization: Bearer $token" http://localhost:3000/api/games

# Should return games list (or empty array if no games)
# NOT the "Failed to check permissions" error!
```

✅ **Success!** If you get a response (even empty), Cerbos is working!

---

## Common Issues

### Issue: "docker: command not found"

**Solution:** Docker isn't installed or not in PATH
- Make sure Docker Desktop is installed
- Restart PowerShell/CMD after installation
- On Windows, make sure Docker Desktop is running (whale icon in tray)

### Issue: "Cannot connect to Docker daemon"

**Solution:** Docker Desktop isn't running
- Open Docker Desktop from Start Menu
- Wait for it to fully start (whale icon should be steady, not animated)
- Try the command again

### Issue: Port 3592 already in use

**Solution:** Another service is using that port
```powershell
# Check what's using port 3592
netstat -ano | findstr :3592

# Stop the other service or change Cerbos port in docker-compose.cerbos.yml
```

### Issue: "Failed to check permissions" still appearing

**Solutions:**
1. **Check Cerbos is running:**
   ```powershell
   docker ps | findstr cerbos
   ```

2. **Check Cerbos health:**
   ```powershell
   curl http://localhost:3592/_cerbos/health
   ```

3. **Check Cerbos logs:**
   ```powershell
   docker logs sportsmanager-cerbos
   # Look for errors
   ```

4. **Restart everything:**
   ```powershell
   # Stop Cerbos
   docker-compose -f docker-compose.cerbos.yml down

   # Start again
   docker-compose -f docker-compose.cerbos.yml up -d

   # Restart backend
   cd backend
   npm run dev
   ```

### Issue: Policies not loading

**Solution:** Check policy files exist
```powershell
# From project root
dir cerbos-policies\resources

# Should show:
# game.yaml
# assignment.yaml
# referee.yaml
```

If files are missing, policies weren't committed. Check git status.

---

## Useful Docker Commands

```powershell
# View Cerbos logs
docker logs sportsmanager-cerbos

# Follow logs in real-time
docker logs -f sportsmanager-cerbos

# Stop Cerbos
docker-compose -f docker-compose.cerbos.yml down

# Restart Cerbos
docker-compose -f docker-compose.cerbos.yml restart

# Remove Cerbos completely (and recreate)
docker-compose -f docker-compose.cerbos.yml down
docker-compose -f docker-compose.cerbos.yml up -d

# View all running containers
docker ps

# View all containers (including stopped)
docker ps -a
```

---

## Environment Variables

Your backend should have these set (already configured):

```env
CERBOS_HOST=localhost:3592
CERBOS_TLS=false
CERBOS_CACHE_ENABLED=true
CERBOS_CACHE_TTL=300000
```

These are the defaults in `CerbosAuthService.ts`, so you don't need to set them unless running Cerbos on a different host/port.

---

## Production Deployment

For production, ensure:

1. ✅ Cerbos runs as a service (not just local Docker)
2. ✅ Policies are version-controlled (already done)
3. ✅ TLS is enabled for Cerbos connection
4. ✅ Cerbos is monitored (health checks in your orchestrator)
5. ✅ Backend fails gracefully if Cerbos is down

Example production docker-compose:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - CERBOS_HOST=cerbos:3592
      - CERBOS_TLS=true
    depends_on:
      - cerbos

  cerbos:
    image: ghcr.io/cerbos/cerbos:latest
    volumes:
      - ./cerbos-policies:/policies:ro
    ports:
      - "3592:3592"
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3592/_cerbos/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

---

## Summary Checklist

Before your backend will work:

- [ ] Docker Desktop installed
- [ ] Docker Desktop running (whale icon in tray)
- [ ] Cerbos started: `docker-compose -f docker-compose.cerbos.yml up -d`
- [ ] Cerbos health check passes: `curl http://localhost:3592/_cerbos/health`
- [ ] Backend started: `npm run dev`
- [ ] Test route works without "Failed to check permissions" error

Once all checked, you're ready! ✅

---

## Next Steps

1. Install Docker Desktop (15 minutes)
2. Start Cerbos (2 minutes)
3. Start backend (1 minute)
4. Test routes (5 minutes)

**Total time: ~25 minutes to get everything running**
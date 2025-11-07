# Deployment Quick Start

## 🚀 One-Time Setup (5 minutes)

### Step 1: Add SSH Key to GitHub

1. Get your SSH private key:
   ```bash
   cat ~/.ssh/id_rsa
   ```

2. Go to GitHub: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

3. Create secret:
   - **Name:** `SSH_PRIVATE_KEY`
   - **Value:** Paste entire key (including BEGIN/END lines)
   - Click **Add secret**

### Step 2: Create Production Environment (Optional but Recommended)

1. Go to GitHub: `Settings` → `Environments` → `New environment`
2. **Name:** `production`
3. Enable: **Required reviewers** → Add yourself
4. Click **Save protection rules**

✅ Setup complete!

## 📦 How to Deploy

### Method 1: Push to Main Branch (Automatic)

```bash
git checkout main
git merge develop  # Or merge your feature branch
git push origin main
```

➡️ Deployment starts automatically

### Method 2: Manual Trigger

1. Go to GitHub **Actions** tab
2. Click **Deploy to Production**
3. Click **Run workflow** → Select `main` branch
4. Click **Run workflow**

➡️ Deployment starts

## 🔍 Monitor Deployment

1. GitHub **Actions** tab
2. Click the running workflow
3. Watch each step complete
4. **Expected time:** 3-5 minutes

## ✅ What Gets Deployed

When you push to `main`:

- ✅ Frontend (Next.js) - Rebuilt and restarted
- ✅ Backend (Node.js API) - Rebuilt and restarted
- ✅ Database migrations - Auto-detected and run
- ✅ Cerbos policies - Updated automatically
- ✅ Docker containers - Rebuilt if Dockerfiles changed

## 🎯 Deployment Process

```
1. Pre-deployment checks     (30 seconds)
   └─ Detect migrations, Docker changes

2. Database backup           (10 seconds)
   └─ Automatic backup before changes

3. Pull latest code          (5 seconds)
   └─ Git pull from main branch

4. Run migrations (if any)   (varies)
   └─ Only if migrations detected

5. Rebuild containers        (2-3 minutes)
   └─ npm install + Docker build

6. Health checks             (30 seconds)
   └─ Verify services are up

7. Verify deployment         (10 seconds)
   └─ Test https://syncedsport.com
```

## 🔧 Common Commands

### View Container Status
```bash
ssh -i ~/.ssh/id_rsa root@10.0.0.5
pct exec 102 -- bash
docker ps
```

### View Logs
```bash
# Backend logs
docker logs sportsmanager-backend --tail=50 --follow

# Frontend logs
docker logs sportsmanager-frontend --tail=50 --follow
```

### Manual Restart
```bash
cd /root/SportsManager/deployment
docker compose -f docker-compose.deploy.yml restart backend
docker compose -f docker-compose.deploy.yml restart frontend
```

### Run Migrations Manually
```bash
docker exec sportsmanager-backend sh -c "cd /app && npx knex migrate:latest"
```

### Rollback Migration
```bash
docker exec sportsmanager-backend sh -c "cd /app && npx knex migrate:rollback"
```

## ⚠️ Troubleshooting

### Deployment Failed

**Check logs in GitHub Actions:**
1. Click on failed job
2. Expand failed step
3. Read error message

**Check server logs:**
```bash
ssh -i ~/.ssh/id_rsa root@10.0.0.5
pct exec 102 -- bash
cd /root/SportsManager/deployment
docker compose -f docker-compose.deploy.yml logs --tail=100
```

### Services Not Healthy

```bash
# Check status
docker ps

# If backend unhealthy
docker logs sportsmanager-backend --tail=100

# If frontend unhealthy
docker logs sportsmanager-frontend --tail=100
```

### Website Not Loading

1. **Check Cloudflare Tunnel:**
   ```bash
   ssh -i ~/.ssh/id_rsa root@10.0.0.5
   pct exec 101 -- bash
   systemctl status cloudflared
   ```

2. **Test internal access:**
   ```bash
   pct exec 102 -- bash
   curl http://localhost:3004
   curl http://localhost:3001/health
   ```

3. **Restart tunnel if needed:**
   ```bash
   pct exec 101 -- systemctl restart cloudflared
   ```

## 📋 Pre-Deployment Checklist

Before pushing to `main`:

- [ ] Tested locally with `npm run dev`
- [ ] No console errors in browser
- [ ] API endpoints responding
- [ ] Database migrations tested
- [ ] No hardcoded secrets in code
- [ ] `.env` files not committed
- [ ] Reviewed `git diff develop..main`

## 🎉 Success Indicators

After deployment succeeds:

1. ✅ GitHub Actions shows green checkmark
2. ✅ https://syncedsport.com loads correctly
3. ✅ API calls work (check browser network tab)
4. ✅ `docker ps` shows healthy containers
5. ✅ No errors in `docker logs`

## 🔗 Useful Links

- **Live Site:** https://syncedsport.com
- **API Health:** https://syncedsport.com/api/health
- **GitHub Actions:** https://github.com/fisherjoey/SportsManager/actions
- **Full Documentation:** [CICD_SETUP.md](./CICD_SETUP.md)

## 📞 Emergency Contacts

If something breaks badly:

1. **Rollback to previous version:**
   ```bash
   ssh -i ~/.ssh/id_rsa root@10.0.0.5
   pct exec 102 -- bash
   cd /root/SportsManager
   git log --oneline -5  # Find previous commit
   git checkout <previous-commit-hash>
   cd deployment
   docker compose -f docker-compose.deploy.yml up -d --build
   ```

2. **Restore database from backup:**
   ```bash
   cd /root/SportsManager/deployment/database-dumps/backups
   ls -lth  # Find latest backup
   docker exec -i sportsmanager-postgres pg_restore -U postgres -d sports_management --clean /tmp/backup_XXXXXXXX.dump
   ```

---

**Remember:** The `main` branch = Production. Always merge to `develop` first for testing!

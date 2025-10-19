# 🚀 SportsManager - Quick Start for Figma Scraping

**Get everything running in under 5 minutes!**

## Prerequisites

- Docker Desktop installed and running
- That's it! Everything else is included.

## Deploy in 3 Steps

### 1. Clone and Navigate

```bash
git clone https://github.com/fisherjoey/SportsManager.git
cd SportsManager
git checkout feat/auth-bypass-figma-scraping
cd deployment
```

### 2. Deploy

```bash
./deploy.sh
```

Wait 2-3 minutes for build and startup.

### 3. Access

Open in browser: **http://localhost:3004**

✅ No login required!
✅ All pages accessible!
✅ Ready for Figma scraping!

## Scrape with Figma

1. Visit any page: `http://localhost:3004/games`
2. Copy the URL
3. In Figma: **File → Import → Paste URL**
4. Done! ✨

## Popular Pages to Scrape

- Dashboard: `http://localhost:3004`
- Games: `http://localhost:3004/games`
- Referees: `http://localhost:3004/referees`
- Admin: `http://localhost:3004/admin`
- Roles: `http://localhost:3004/admin/roles`
- Financial: `http://localhost:3004/financial-dashboard`
- Budget: `http://localhost:3004/budget`

## Stop Everything

```bash
cd deployment
docker-compose -f docker-compose.deploy.yml down
```

## Troubleshooting

### Ports Already in Use?

Stop conflicting services or change ports in `deployment/.env`:

```env
BACKEND_PORT=3001
FRONTEND_PORT=3004
DB_PORT=5432
```

### Services Not Starting?

```bash
# Check logs
docker-compose -f deployment/docker-compose.deploy.yml logs -f

# Restart everything
docker-compose -f deployment/docker-compose.deploy.yml restart
```

### Frontend Shows Login?

Restart frontend service:

```bash
docker-compose -f deployment/docker-compose.deploy.yml restart frontend
```

## What's Running?

```bash
docker-compose -f deployment/docker-compose.deploy.yml ps
```

You should see:
- ✅ sportsmanager-postgres (database)
- ✅ sportsmanager-cerbos (authorization)
- ✅ sportsmanager-backend (API)
- ✅ sportsmanager-frontend (web app)

---

**That's it!** You're ready to scrape! 🎨

For detailed documentation, see [README.md](README.md)

# SportsManager Deployment Package

Complete Docker deployment package for the SportsManager application with full authentication bypass for Figma scraping.

## 📦 What's Included

This deployment package includes:

- **PostgreSQL Database** - Full database with all content and seed data
- **Backend API Server** - Node.js/Express backend with TypeScript
- **Frontend Application** - Next.js frontend with React
- **Cerbos Authorization Server** - Policy-based authorization (bypassed)
- **Auth Bypass Configuration** - All authentication disabled for Figma scraping

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Docker Compose installed
- At least 4GB RAM available for containers
- Ports available: 3001 (backend), 3004 (frontend), 3592-3593 (Cerbos), 5432 (database)

### One-Command Deployment

```bash
cd deployment
./deploy.sh
```

This single script will:
1. ✓ Pull required Docker images
2. ✓ Build backend and frontend containers
3. ✓ Start PostgreSQL database
4. ✓ Restore database from dump
5. ✓ Start Cerbos authorization server
6. ✓ Start backend API
7. ✓ Start frontend application

### Access Your Application

After deployment completes (2-3 minutes):

- **Frontend**: http://localhost:3004
- **Backend API**: http://localhost:3001
- **Cerbos Admin**: http://localhost:3592
- **Database**: localhost:5432

## 🎨 Figma Scraping

All authentication is **disabled** by default. You can:

1. Visit any page: http://localhost:3004/games, http://localhost:3004/admin, etc.
2. Copy the full URL
3. In Figma: File → Import → Paste URL
4. Figma will scrape the fully rendered page

### Available Routes

All routes are publicly accessible:

- `/` - Dashboard
- `/games` - Games Management
- `/referees` - Referee Management
- `/admin` - Admin Panel
- `/admin/roles` - Role Management
- `/admin/permissions` - Permission Management
- `/financial-dashboard` - Financial Dashboard
- `/budget` - Budget Management
- And many more...

## 🔧 Configuration

### Environment Variables

Edit `deployment/.env` to customize:

```env
# Build target (dev or production)
BUILD_TARGET=dev

# Auth bypass (true for Figma scraping)
DISABLE_AUTH=true
NEXT_PUBLIC_DISABLE_AUTH=true

# Service ports
BACKEND_PORT=3001
FRONTEND_PORT=3004
DB_PORT=5432

# Database password
DB_PASSWORD=postgres123

# JWT secret
JWT_SECRET=development-secret-key
```

### For Production Deployment

To deploy with authentication **enabled**:

1. Edit `deployment/.env`:
   ```env
   BUILD_TARGET=production
   NODE_ENV=production
   DISABLE_AUTH=false
   NEXT_PUBLIC_DISABLE_AUTH=false
   ```

2. Generate a strong JWT secret:
   ```bash
   openssl rand -base64 32
   ```

3. Redeploy:
   ```bash
   ./deploy.sh
   ```

## 📊 Database Management

### Database Info

- **Name**: sports_management
- **User**: postgres
- **Password**: postgres123 (configurable)
- **Port**: 5432
- **Size**: 526KB dump

### Access Database

```bash
# Via Docker
docker-compose -f deployment/docker-compose.deploy.yml exec postgres psql -U postgres -d sports_management

# Via local psql (if installed)
psql -h localhost -p 5432 -U postgres -d sports_management
```

### Restore Database Manually

```bash
docker-compose -f deployment/docker-compose.deploy.yml exec -T postgres \
  pg_restore -U postgres -d sports_management --no-owner --no-acl \
  /docker-entrypoint-initdb.d/sports_management_full.dump
```

### Backup Database

```bash
docker-compose -f deployment/docker-compose.deploy.yml exec -T postgres \
  pg_dump -U postgres -d sports_management -F c > backup_$(date +%Y%m%d).dump
```

## 🛠️ Common Commands

### View Logs

```bash
# All services
docker-compose -f deployment/docker-compose.deploy.yml logs -f

# Specific service
docker-compose -f deployment/docker-compose.deploy.yml logs -f frontend
docker-compose -f deployment/docker-compose.deploy.yml logs -f backend
```

### Stop Services

```bash
# Stop all (keeps data)
docker-compose -f deployment/docker-compose.deploy.yml stop

# Stop and remove containers (keeps data)
docker-compose -f deployment/docker-compose.deploy.yml down

# Stop and remove everything including data
docker-compose -f deployment/docker-compose.deploy.yml down -v
```

### Restart Services

```bash
# Restart all
docker-compose -f deployment/docker-compose.deploy.yml restart

# Restart specific service
docker-compose -f deployment/docker-compose.deploy.yml restart frontend
```

### Rebuild Services

```bash
# Rebuild and restart
docker-compose -f deployment/docker-compose.deploy.yml up -d --build
```

## 🐛 Troubleshooting

### Services Not Starting

1. Check Docker is running:
   ```bash
   docker ps
   ```

2. Check logs for errors:
   ```bash
   docker-compose -f deployment/docker-compose.deploy.yml logs
   ```

3. Ensure ports are available:
   ```bash
   # Windows
   netstat -ano | findstr "3001 3004 5432"

   # Mac/Linux
   lsof -i :3001,3004,5432
   ```

### Database Connection Errors

1. Ensure database is healthy:
   ```bash
   docker-compose -f deployment/docker-compose.deploy.yml ps postgres
   ```

2. Check database logs:
   ```bash
   docker-compose -f deployment/docker-compose.deploy.yml logs postgres
   ```

### Frontend Shows Login Page

Auth bypass might not be enabled. Check:

1. Environment variables:
   ```bash
   docker-compose -f deployment/docker-compose.deploy.yml exec frontend env | grep DISABLE_AUTH
   ```

2. Restart frontend:
   ```bash
   docker-compose -f deployment/docker-compose.deploy.yml restart frontend
   ```

### Cerbos Not Working

1. Check Cerbos health:
   ```bash
   curl http://localhost:3592/_cerbos/health
   ```

2. Verify policies are mounted:
   ```bash
   docker-compose -f deployment/docker-compose.deploy.yml exec cerbos ls /policies
   ```

## 📁 File Structure

```
deployment/
├── docker-compose.deploy.yml  # Main Docker Compose file
├── .env.deploy                # Environment template
├── .env                       # Active environment (auto-created)
├── deploy.sh                  # Main deployment script
├── README.md                  # This file
└── database-dumps/
    ├── sports_management_full.dump  # Database backup
    └── restore-database.sh          # Database restore script
```

## 🔐 Security Notes

### Development/Figma Scraping Mode (Current)

- ✅ All authentication disabled
- ✅ All routes publicly accessible
- ✅ Perfect for Figma URL scraping
- ⚠️ **DO NOT** use in production
- ⚠️ **DO NOT** expose to internet

### Production Mode

To enable authentication for production:

1. Set `DISABLE_AUTH=false` in `.env`
2. Set `NEXT_PUBLIC_DISABLE_AUTH=false` in `.env`
3. Generate strong passwords and secrets
4. Use HTTPS/TLS certificates
5. Configure firewall rules
6. Use Docker secrets for sensitive data

## 📝 Test Data

The database includes:

- **7 Roles**: Super Admin, Admin, Assignment Manager, Assignor, Referee Coordinator, Senior Referee, Junior Referee
- **6 Test Users**: admin@sportsmanager.com, admin@cmba.ca, assignor@cmba.ca, coordinator@cmba.ca, senior.ref@cmba.ca, referee@test.com
- **Game Data**: 44+ games with full schedules
- **Locations**: Multiple recreation centers
- **Teams**: CMBA teams with various age groups

## 🆘 Support

### Getting Help

1. Check logs for errors
2. Verify environment variables
3. Ensure all ports are available
4. Check Docker has enough resources

### Useful Links

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Docker Guide](https://hub.docker.com/_/postgres)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)

## 🎯 Next Steps

After deployment:

1. ✓ Visit http://localhost:3004 to verify frontend loads
2. ✓ Check http://localhost:3001/health to verify backend is healthy
3. ✓ Test API endpoint: http://localhost:3001/api/games
4. ✓ Start scraping pages with Figma!

---

**Ready to deploy?** Run `./deploy.sh` and you'll be up in minutes! 🚀

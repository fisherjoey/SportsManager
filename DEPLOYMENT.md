# SportsManager Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Cerbos Setup](#cerbos-setup)
- [Application Deployment](#application-deployment)
- [Security Checklist](#security-checklist)
- [Post-Deployment Tasks](#post-deployment-tasks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v18+ (LTS recommended)
- **PostgreSQL**: v15+
- **Docker**: v24+ (for Cerbos)
- **Docker Compose**: v2.0+

### Optional Services
- **Redis**: For receipt processing queue (recommended for production)
- **Google Cloud Vision API**: For OCR functionality
- **OpenAI/DeepSeek API**: For AI-powered features

---

## Environment Variables

### Backend (.env file location: `backend/.env`)

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/sports_management
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_management
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your-very-long-random-secret-key-min-64-chars
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=production

# Cerbos Configuration
CERBOS_HOST=localhost:3592
CERBOS_TLS=false
CERBOS_CACHE_ENABLED=true
CERBOS_CACHE_TTL=300000
CERBOS_ADMIN_URL=http://localhost:3592/admin
CERBOS_ADMIN_USERNAME=admin
CERBOS_ADMIN_PASSWORD=secure_admin_password

# Redis (Optional - for queue processing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
DISABLE_REDIS=false  # Set to true if Redis not available

# AI Services (Optional)
GOOGLE_CLOUD_VISION_CREDENTIALS=/path/to/credentials.json
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...

# Email Service (Optional)
RESEND_API_KEY=re_...

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://admin.your-domain.com

# Audit & Logging
LOG_LEVEL=info
AUDIT_LOG_RETENTION_DAYS=90
```

### Frontend (.env file location: `frontend/.env`)

```bash
VITE_API_URL=https://api.your-domain.com
VITE_ENVIRONMENT=production
```

---

## Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sports_management;

# Create user (if not exists)
CREATE USER your_db_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sports_management TO your_db_user;

# Exit psql
\q
```

### 2. Run Migrations

```bash
cd backend

# Install dependencies
npm install

# Run migrations in order
npm run migrate:up

# Or manually run migration files
PGPASSWORD=your_password psql -U your_db_user -h localhost -d sports_management -f migrations/001_initial_schema.sql
PGPASSWORD=your_password psql -U your_db_user -h localhost -d sports_management -f migrations/20250926000001_add_multi_tenancy.sql
PGPASSWORD=your_password psql -U your_db_user -h localhost -d sports_management -f migrations/20250926000002_seed_default_organization.sql
# ... run all migration files in sequence
```

### 3. Verify Database Setup

```bash
# Check tables exist
PGPASSWORD=your_password psql -U your_db_user -h localhost -d sports_management -c "\dt"

# Verify default organization exists
PGPASSWORD=your_password psql -U your_db_user -h localhost -d sports_management -c "SELECT * FROM organizations;"

# Check roles table
PGPASSWORD=your_password psql -U your_db_user -h localhost -d sports_management -c "SELECT * FROM roles;"
```

---

## Cerbos Setup

### 1. Generate Admin API Credentials

⚠️ **CRITICAL FOR PRODUCTION**: The current config has empty Admin API credentials!

```bash
# Generate bcrypt hash for admin password
# Use online bcrypt generator or:
npm install -g bcrypt-cli
bcrypt "your_secure_admin_password"

# Copy the hash output (starts with $2y$10$...)
```

### 2. Update Cerbos Configuration

Edit `cerbos/config/config.yaml`:

```yaml
server:
  httpListenAddr: ":3592"
  grpcListenAddr: ":3593"
  adminAPI:
    enabled: true
    adminCredentials:
      username: admin
      passwordHash: $2y$10$YOUR_BCRYPT_HASH_HERE  # REPLACE THIS!

storage:
  driver: "sqlite3"
  sqlite3:
    dsn: "file:/data/cerbos.db?_fk=true"

audit:
  enabled: true
  backend: local
  local:
    storagePath: /data/audit.log

schema:
  enforcement: reject

telemetry:
  disabled: true  # Set to false if you want telemetry in production
```

### 3. Start Cerbos Container

```bash
# Start Cerbos
docker-compose -f docker-compose.cerbos.yml up -d

# Check logs
docker logs sportsmanager-cerbos --tail 50

# Verify health
curl http://localhost:3592/_cerbos/health
# Expected output: {"status":"SERVING"}

# Test Admin API (after setting credentials)
curl -u admin:your_secure_admin_password http://localhost:3592/admin/policies
```

### 4. Load Initial Policies

Policies are automatically loaded from `cerbos/policies/` directory. Verify:

```bash
# Check loaded policies
curl -u admin:your_admin_password http://localhost:3592/admin/policies
```

---

## Application Deployment

### 1. Backend Deployment

```bash
cd backend

# Install production dependencies only
npm ci --production

# Build TypeScript
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start dist/server.js --name sportsmanager-api
pm2 save
pm2 startup
```

### 2. Frontend Deployment

```bash
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Output will be in dist/ folder
# Deploy dist/ to your web server (Nginx, Apache, Vercel, Netlify, etc.)
```

### 3. Nginx Configuration Example

```nginx
# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. SSL/TLS Setup (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal is set up automatically
# Test renewal
sudo certbot renew --dry-run
```

---

## Security Checklist

### Pre-Production Security Tasks

- [ ] **JWT Secret**: Generate strong random secret (min 64 characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

- [ ] **Database Credentials**: Use strong passwords (min 16 characters, mixed case, numbers, symbols)

- [ ] **Cerbos Admin API**: Generate and set bcrypt password hash (see Cerbos Setup section)

- [ ] **Environment Variables**: Never commit `.env` files to git
  - Add `.env` to `.gitignore`
  - Use environment variable management service (AWS Secrets Manager, HashiCorp Vault, etc.)

- [ ] **CORS**: Update `ALLOWED_ORIGINS` to only include your production domains

- [ ] **API Rate Limiting**: Backend already has rate limiting - verify configuration in `backend/src/middleware/rateLimiter.ts`

- [ ] **HTTPS Only**: Ensure all connections use HTTPS in production

- [ ] **Database Access**: Restrict database access to application server IPs only

- [ ] **Cerbos Access**: Ensure Cerbos is not publicly accessible (use firewall rules)

- [ ] **File Uploads**: Verify upload size limits and file type restrictions

- [ ] **Audit Logs**: Configure audit log retention and archiving

### Security Headers (Already Configured)

The backend already includes:
- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Request size limits
- XSS protection

---

## Post-Deployment Tasks

### 1. Create Initial Admin User

```bash
# Method 1: Via API
curl -X POST https://api.your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@your-domain.com",
    "password": "SecurePassword123!",
    "name": "System Administrator"
  }'

# Method 2: Via Database (then assign roles)
PGPASSWORD=your_password psql -U your_db_user -h localhost -d sports_management
```

### 2. Assign Admin Roles

```sql
-- Get the user ID
SELECT id, email FROM users WHERE email = 'admin@your-domain.com';

-- Get role IDs
SELECT id, name FROM roles WHERE name IN ('Admin', 'Super Admin');

-- Assign roles to user
INSERT INTO user_roles (user_id, role_id, is_active)
VALUES
  ('user-uuid-here', 'admin-role-uuid', true),
  ('user-uuid-here', 'super-admin-role-uuid', true);
```

### 3. Verify System Health

```bash
# Check backend health
curl https://api.your-domain.com/health

# Check Cerbos health
curl http://localhost:3592/_cerbos/health

# Check database connection
PGPASSWORD=your_password psql -U your_db_user -h localhost -d sports_management -c "SELECT 1;"
```

### 4. Configure Backups

```bash
# Database backup script example
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
PGPASSWORD=your_password pg_dump -U your_db_user -h localhost sports_management > "$BACKUP_DIR/backup_$DATE.sql"

# Cerbos data backup
docker exec sportsmanager-cerbos sqlite3 /data/cerbos.db ".backup '/data/backup_$DATE.db'"
docker cp sportsmanager-cerbos:/data/backup_$DATE.db /backups/cerbos/

# Set up cron job for daily backups
# crontab -e
# 0 2 * * * /path/to/backup-script.sh
```

---

## Troubleshooting

### Backend Won't Start

**Issue**: Port 3001 already in use
```bash
# Find process using port
netstat -ano | grep :3001
# Kill the process or change PORT in .env
```

**Issue**: Database connection failed
```bash
# Verify database is running
systemctl status postgresql
# Check connection
psql -U your_db_user -h localhost -d sports_management
```

### Cerbos Issues

**Issue**: Cerbos container restarting
```bash
# Check logs
docker logs sportsmanager-cerbos --tail 100

# Common causes:
# 1. Invalid config.yaml syntax - validate YAML
# 2. Port conflicts - check if 3592/3593 are available
# 3. Volume permission issues - check docker volumes
```

**Issue**: Admin API authentication failed
```bash
# Verify credentials in config.yaml
# Regenerate bcrypt hash if needed
# Restart container after updating config
docker restart sportsmanager-cerbos
```

### Permission Denied Errors

**Issue**: 403 Forbidden on API calls
```bash
# Check user roles
SELECT u.email, r.name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'user@example.com';

# Check Cerbos policies are loaded
curl -u admin:password http://localhost:3592/admin/policies

# Check backend logs for Cerbos errors
docker logs backend-container --tail 100
```

### TypeScript Compilation Errors

**Issue**: Build fails with TS errors
```bash
# Check for type errors
cd backend && npx tsc --noEmit

# Common fixes:
# 1. Update node_modules: npm install
# 2. Clear cache: rm -rf node_modules dist && npm install
# 3. Check tsconfig.json settings
```

---

## Production Monitoring

### Recommended Tools

1. **Application Monitoring**: PM2, New Relic, Datadog
2. **Database Monitoring**: pg_stat_statements, pgBadger
3. **Log Aggregation**: ELK Stack, Grafana Loki
4. **Uptime Monitoring**: UptimeRobot, Pingdom
5. **Error Tracking**: Sentry (already configured in backend)

### Key Metrics to Monitor

- **API Response Times**: Target < 200ms for most endpoints
- **Database Query Performance**: Slow query log
- **Cerbos Response Times**: Should be < 10ms
- **Memory Usage**: Backend process, Cerbos container
- **Disk Space**: Especially for audit logs and backups
- **Error Rates**: Track 4xx and 5xx responses

---

## Update & Maintenance

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update with caution (test in staging first!)
npm update

# Update major versions
npm install package-name@latest
```

### Database Migrations

```bash
# Always backup before migrating!
PGPASSWORD=your_password pg_dump -U your_db_user sports_management > backup_before_migration.sql

# Run new migrations
npm run migrate:up

# Rollback if needed
npm run migrate:down
```

### Cerbos Policy Updates

```bash
# Update policy files in cerbos/policies/
# Policies auto-reload with sqlite3 storage
# Or use Admin API:
curl -X POST http://localhost:3592/admin/policy \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d @new-policy.json
```

---

## Support & Documentation

- **Backend API Docs**: http://localhost:3001/api-docs (Swagger)
- **Cerbos Docs**: https://docs.cerbos.dev
- **Issue Tracker**: [Your GitHub/GitLab repository]
- **Team Contact**: [Your team email/Slack]

---

## Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] All tests passing
- [ ] Database migrations tested in staging
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backup completed
- [ ] Security checklist reviewed

### Deployment
- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Run database migrations
- [ ] Build application
- [ ] Stop old process
- [ ] Start new process
- [ ] Restart Cerbos if config changed

### Post-Deployment
- [ ] Health check passes
- [ ] Critical user flows tested
- [ ] Monitoring alerts configured
- [ ] Team notified
- [ ] Deployment documented

---

**Last Updated**: 2025-09-27
**Version**: 1.0.0
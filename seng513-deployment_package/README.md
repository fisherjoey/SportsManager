# SENG513 Docker Compose Submission
## Sports Manager Application

This package contains all the Docker configuration files needed to run the Sports Manager application.

## Package Contents

```
seng513-deployment_package/
├── README.md                           # This file
├── docker-compose.yml                  # Main orchestration file
├── .env.example                        # Environment variables template
├── backend/
│   ├── Dockerfile                      # Production backend image
│   └── Dockerfile.dev                  # Development backend image
├── frontend/
│   ├── Dockerfile                      # Production frontend image
│   └── Dockerfile.dev                  # Development frontend image
└── cerbos/
    └── config/
        └── config.yaml                 # Authorization service config
```

## Quick Start (3 Steps)

### 1. Prepare Environment

```bash
# Copy environment template
cp .env.example .env

# (Optional) Edit .env to customize passwords and API keys
# For development, the defaults work fine
nano .env
```

### 2. Start Application

```bash
# Build and start all services
docker-compose up -d

# Wait about 30 seconds for services to initialize
```

### 3. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Database:** localhost:5432 (user: postgres, password: postgres123)

## Default Credentials

For testing and development:

```
Admin Account:
  Email: admin@refassign.com
  Password: Admin123!
```

## Services Included

This Docker Compose setup runs 4 containers:

1. **PostgreSQL** (Database)
   - Port: 5432
   - Database: sports_management
   - Persistent storage via Docker volume

2. **Cerbos** (Authorization)
   - Ports: 3592 (HTTP), 3593 (gRPC)
   - Policy-based access control

3. **Backend** (Node.js API)
   - Port: 3001
   - TypeScript Express server
   - Auto-runs migrations on startup

4. **Frontend** (Next.js)
   - Port: 3000
   - React application with hot-reload

## Common Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services (keeps data)
docker-compose down

# Stop and remove all data
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# Access database shell
docker-compose exec postgres psql -U postgres -d sports_management
```

## System Requirements

- **Docker Desktop** 20.10.0+
- **Docker Compose** 2.0.0+
- **System:** 8GB RAM, 20GB disk space

## Password Strategy

### Development (This Submission)

The included `.env.example` uses simple passwords for ease of setup:

- Database: `postgres123`
- JWT Secret: `local-dev-secret-key-change-in-production`

These are **intentionally simple** for:
- Quick team onboarding
- Local development
- Demonstration purposes

### Production Deployment

**⚠️ NEVER use development passwords in production!**

Before production deployment:

1. **Generate Strong Database Password:**
   ```bash
   openssl rand -base64 32
   ```

2. **Generate JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Update .env file:**
   - Replace all default passwords
   - Add production API keys
   - Configure production domains

4. **Use Docker Secrets (Recommended):**
   - For Kubernetes: Use Kubernetes Secrets
   - For Docker Swarm: Use Docker Secrets
   - For Docker Compose: Use environment variable files with restricted permissions

### Password Management Best Practices

✓ **Use environment files** - Keep passwords out of code
✓ **Add .env to .gitignore** - Never commit real passwords
✓ **Rotate credentials regularly** - Change passwords periodically
✓ **Use secret managers** - Consider HashiCorp Vault, AWS Secrets Manager
✓ **Minimum complexity** - 16+ chars, mixed case, numbers, symbols
✓ **Unique passwords** - Different password for each service

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Change port in docker-compose.yml
ports:
  - "3005:3000"  # Use port 3005 instead
```

### Database Connection Failed

```bash
# Restart database and wait
docker-compose restart postgres
sleep 10
docker-compose restart backend
```

### Services Won't Start

```bash
# View detailed logs
docker-compose logs backend

# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Development Workflow

The docker-compose.yml is configured for **development** with:

- **Hot-reload** - Code changes reflect immediately
- **Volume mounts** - Edit code on host, runs in container
- **Source maps** - Debug TypeScript directly
- **Development tools** - Nodemon, Next.js dev server

### Making Code Changes

1. Edit files on your host machine (no need to enter containers)
2. Changes are automatically detected and reload the service
3. View changes at http://localhost:3000

### Running Migrations

```bash
# Backend automatically runs migrations on startup
# To manually run:
docker-compose exec backend npm run migrate
```

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │ ──┐
│   (Next.js)     │   │
│   Port: 3000    │   │
└─────────────────┘   │
                      ▼
┌─────────────────┐  ┌─────────────────┐
│   Backend       │──│   PostgreSQL    │
│   (Node.js)     │  │   (Database)    │
│   Port: 3001    │  │   Port: 5432    │
└─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│    Cerbos       │
│  (Authorization)│
│   Port: 3592/3  │
└─────────────────┘
```

## Next Steps

1. **Review Documentation:**
   - See the full deployment guide in the repository
   - Review password strategy documentation
   - Check security best practices

2. **Customize Configuration:**
   - Update .env with your API keys
   - Modify ports if needed
   - Add additional services (Redis, monitoring)

3. **Production Preparation:**
   - Generate strong passwords
   - Set up SSL/TLS
   - Configure monitoring
   - Set up backups

## Additional Resources

- **Comprehensive Guide:** See `seng513-deployment.pdf` for detailed documentation
- **Docker Docs:** https://docs.docker.com/
- **Docker Compose Docs:** https://docs.docker.com/compose/
- **Project Repository:** [Your GitLab URL]

## Support

For issues or questions:

- Check the troubleshooting section above
- Review logs: `docker-compose logs -f`
- Consult the comprehensive deployment guide
- Contact: [Your Email]

---

**Submission Information:**
- **Tag:** `project-docker-milestone`
- **Date:** January 2025
- **Course:** SENG 513

---

*This package demonstrates understanding of Docker Compose, multi-container orchestration, environment-based configuration, and DevOps best practices.*

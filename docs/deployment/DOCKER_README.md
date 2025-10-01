# Docker Development Environment

This project is fully dockerized for easy development and deployment. You can start the entire application stack with a single command.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- At least 4GB of available RAM for Docker

## Quick Start

### Windows Users
```batch
# Start all services
docker-start.bat

# Stop all services
docker-stop.bat
```

### Linux/Mac Users
```bash
# Make scripts executable (first time only)
chmod +x docker-start.sh docker-stop.sh

# Start all services
./docker-start.sh

# Stop all services
./docker-stop.sh
```

### Manual Docker Commands
```bash
# Start services in development mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset everything (including database)
docker-compose down -v
```

## Services

The Docker environment includes the following services:

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js application |
| Backend | 3001 | Node.js/Express API |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache and job queue |
| Cerbos | 3593 | Authorization service |

## Environment Configuration

### Development
The default configuration uses `.env.docker` for development. Key settings:
- Database: PostgreSQL with default credentials
- Redis: Enabled for job queuing
- Hot-reload: Enabled for both frontend and backend

### Production
For production deployment:
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

## Common Tasks

### Access Container Shell
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# Database shell
docker-compose exec postgres psql -U postgres -d sports_management
```

### Run Database Migrations
```bash
# Run migrations
docker-compose exec backend npm run migrate:latest

# Rollback migrations
docker-compose exec backend npm run migrate:rollback

# Create new migration
docker-compose exec backend npx knex migrate:make migration_name
```

### Seed Database
```bash
# Run all seeds
docker-compose exec backend npm run seed

# Run specific seed
docker-compose exec backend npm run seed:initial
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Build and Rebuild
```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache

# Force recreate containers
docker-compose up -d --force-recreate
```

## Troubleshooting

### Port Already in Use
If you get port conflict errors:
```bash
# Check what's using the port (example for port 3000)
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Kill the process or change the port in docker-compose.yml
```

### Database Connection Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Check database logs
docker-compose logs postgres
```

### Permission Issues (Linux)
```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Fix permissions
chmod -R 755 .
```

### Container Won't Start
```bash
# Check container status
docker-compose ps

# Check logs for errors
docker-compose logs [service-name]

# Rebuild the image
docker-compose build --no-cache [service-name]
```

### Out of Disk Space
```bash
# Clean up Docker system
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Development Workflow

1. **Start Development Environment**
   ```bash
   docker-compose up -d
   ```

2. **Make Code Changes**
   - Frontend changes: Auto-reloaded via Next.js hot reload
   - Backend changes: Auto-reloaded via nodemon

3. **Run Tests**
   ```bash
   # Backend tests
   docker-compose exec backend npm test

   # Frontend tests
   docker-compose exec frontend npm test
   ```

4. **Check Logs**
   ```bash
   docker-compose logs -f backend frontend
   ```

5. **Stop Environment**
   ```bash
   docker-compose down
   ```

## Production Deployment

### Build for Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Push to registry (if using)
docker-compose -f docker-compose.prod.yml push
```

### Deploy to Server
```bash
# On production server
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### SSL/HTTPS Setup
The production compose file includes an nginx service. Configure SSL:
1. Place SSL certificates in `./nginx/ssl/`
2. Update `./nginx/conf.d/default.conf` with SSL configuration
3. Restart nginx: `docker-compose restart nginx`

## Monitoring

### Health Checks
All services include health checks:
```bash
# Check service health
docker-compose ps

# Manual health check
curl http://localhost:3001/health  # Backend
curl http://localhost:3000/api/health  # Frontend
```

### Resource Usage
```bash
# View resource usage
docker stats

# View specific service
docker stats sports_manager_backend
```

## Backup and Restore

### Database Backup
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres sports_management > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres sports_management < backup.sql
```

### Full Backup
```bash
# Stop services
docker-compose down

# Backup volumes
docker run --rm -v sportsmanager_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# Restore volumes
docker run --rm -v sportsmanager_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

## Tips

- **Development**: Use `docker-compose.yml` with volume mounts for hot-reload
- **Production**: Use `docker-compose.prod.yml` with optimized builds
- **Debugging**: Add `DEBUG=*` to environment variables for verbose logging
- **Performance**: Allocate at least 4GB RAM to Docker Desktop
- **Security**: Always use secrets management in production (Docker Secrets, Vault, etc.)

## Support

For issues or questions:
1. Check service logs: `docker-compose logs [service]`
2. Verify environment variables in `.env`
3. Ensure Docker Desktop is running and has sufficient resources
4. Try rebuilding images: `docker-compose build --no-cache`
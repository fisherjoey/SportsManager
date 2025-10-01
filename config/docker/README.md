# Docker Configuration

This directory contains all Docker-related configuration files for the Sports Manager application.

## Files

- **docker-compose.yml** - Main Docker Compose configuration for development
- **docker-compose.prod.yml** - Production Docker Compose configuration with Nginx
- **docker-compose.cerbos.yml** - Cerbos authorization service configuration
- **deploy.sh** - Quick deployment script
- **docker-start.sh/bat** - Helper scripts to start Docker services
- **docker-stop.sh/bat** - Helper scripts to stop Docker services
- **Makefile** - Make commands for Docker operations
- **.env.docker** - Docker environment variables template
- **.env.cerbos** - Cerbos-specific environment variables

## Usage

### Development
```bash
docker-compose -f docker-compose.yml up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Quick Deploy
```bash
./deploy.sh
```

## Environment Variables

Copy `.env.docker` to the project root as `.env` and configure:
- Database credentials
- JWT secrets
- API URLs
- Optional service configurations
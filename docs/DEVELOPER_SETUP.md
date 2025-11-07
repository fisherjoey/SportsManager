# Developer Setup Guide

Get up and running with SportsManager in **5 minutes**.

## Prerequisites

- **Docker Desktop** installed and running
- **Git** installed
- **4GB+ RAM** available for Docker

## Quick Start

### Step 1: Clone and Checkout
```bash
git clone https://github.com/fisherjoey/SportsManager.git
cd SportsManager
git checkout develop
```

### Step 2: Start Development Environment
```bash
cd deployment
docker-compose -f docker-compose.local.yml up
```

### Step 3: Access the Application

Wait for all services to start (about 30-60 seconds), then visit:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

### Step 4: Login

Use any of these test accounts (all use password: `Admin123!`):

| Email | Role | Access |
|-------|------|--------|
| admin@sportsmanager.com | Super Admin | Full access |
| admin@cmba.ca | Admin | Admin access |
| assignor@cmba.ca | Assignment Manager | Manage assignments |
| coordinator@cmba.ca | Referee Coordinator | Manage referees |

## That's It!

You're now running SportsManager locally. Any changes you make to:
- `backend/src/**` will auto-restart the backend
- `frontend/src/**` will auto-refresh the browser

## Next Steps

- **Make Changes**: Edit files in `backend/src/` or `frontend/src/`
- **Test Changes**: Refresh your browser or check the API
- **Read Workflow**: See [WORKFLOW.md](./WORKFLOW.md) for git process
- **Advanced Topics**: See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)

## Common Issues

### Ports Already in Use
```bash
# Check what's using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Either kill that process or edit docker-compose.local.yml to use different ports
```

### Docker Not Starting
```bash
# Make sure Docker Desktop is running
# Check Docker status:
docker ps

# If issues persist, restart Docker Desktop
```

### Database Not Loading
```bash
# Stop everything
docker-compose -f docker-compose.local.yml down

# Remove volumes and restart fresh
docker volume rm deployment_postgres_data_local
docker-compose -f docker-compose.local.yml up
```

## Getting Help

- Check [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed guides
- Review [WORKFLOW.md](./WORKFLOW.md) for git and deployment processes
- Ask the team in Slack/Discord
- Create an issue: https://github.com/fisherjoey/SportsManager/issues

## Stopping the Environment

```bash
# Stop services but keep data
docker-compose -f docker-compose.local.yml down

# Stop and remove all data (fresh start next time)
docker-compose -f docker-compose.local.yml down -v
```

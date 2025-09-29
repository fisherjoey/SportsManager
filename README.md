# Sports Manager Application

A comprehensive sports management system for organizing leagues, teams, games, and referee assignments.

## Quick Deployment

### One-Command Deploy with Docker

```bash
# Clone the repository
git clone [your-repo-url]
cd sports-manager

# Deploy everything with default settings
./config/docker/deploy.sh
```

**That's it!** The application will be running with:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: PostgreSQL (postgres/postgres123)
- All services configured and ready

### Default Environment Values

The deployment automatically uses these values:
- **Database**: `postgres` / `postgres123` / `sports_management`
- **JWT Secret**: `your-secret-key-here`
- **Redis**: Enabled for caching
- **Node Environment**: Production mode

To use custom values, edit the `.env` file after first run.

## Project Structure

```
├── frontend/         # Next.js frontend application
│   ├── app/         # Next.js App Router pages
│   ├── components/  # React components
│   └── public/      # Static assets
├── backend/          # Node.js/Express backend API (TypeScript)
│   ├── src/         # Source code
│   ├── migrations/  # Database migrations
│   └── seeds/       # Database seeds
├── cerbos/          # Authorization policies
├── config/          # Configuration files
│   ├── docker/      # Docker & deployment configs
│   └── scripts/     # Utility scripts
├── docs/            # Project documentation
│   ├── architecture/ # System architecture docs
│   ├── deployment/  # Deployment guides
│   ├── migration/   # Migration docs
│   └── testing/     # Test documentation
└── __tests__/       # Test files and fixtures
```

## Getting Started (Manual Setup)

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis (optional, can use DISABLE_REDIS=true)

### Installation

1. Clone the repository
2. Install all dependencies:
   ```bash
   npm run install:all
   ```
   Or manually:
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database credentials
   ```

4. Run database migrations:
   ```bash
   cd backend && npm run migrate
   ```

### Development

Start both frontend and backend concurrently:
```bash
npm run dev
```

Or start them separately:

**Backend:**
```bash
cd backend && npm run dev
# Or with Redis disabled:
cd backend && DISABLE_REDIS=true npm start
```

**Frontend:**
```bash
cd frontend && npm run dev
```

## Docker Deployment Options

### Development Mode
```bash
docker-compose -f config/docker/docker-compose.yml up -d
```

### Production Mode (with Nginx)
```bash
docker-compose -f config/docker/docker-compose.prod.yml up -d
```

### Useful Docker Commands
```bash
# View logs
docker-compose -f config/docker/docker-compose.yml logs -f

# Stop services
docker-compose -f config/docker/docker-compose.yml down

# Restart services
docker-compose -f config/docker/docker-compose.yml restart

# Database backup
docker exec sports_manager_db pg_dump -U postgres sports_management > backup.sql
```

## Documentation

- [Project Structure](PROJECT_STRUCTURE.md)
- [Architecture Overview](docs/architecture/)
- [Deployment Guide](docs/deployment/)
- [Database Schema](docs/architecture/database-diagram.md)
- [Testing Guide](docs/testing/)

## Tech Stack

### Backend
- Node.js with Express
- TypeScript (migration in progress)
- PostgreSQL database
- Redis for caching
- JWT authentication

### Frontend
- Next.js 14
- React with TypeScript
- Tailwind CSS
- shadcn/ui components

## License

Private repository - All rights reserved
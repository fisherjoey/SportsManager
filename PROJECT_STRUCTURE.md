# Project Structure

The Sports Manager project is organized as follows:

```
sports-manager/
├── backend/                # Backend API (Node.js/TypeScript)
│   ├── src/                # Source code
│   ├── migrations/         # Database migrations
│   ├── seeds/             # Database seeds
│   └── package.json       # Backend dependencies
│
├── frontend/              # Frontend application (Next.js)
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
│
├── cerbos/               # Authorization policies
│   ├── policies/         # Cerbos policy files
│   └── config/          # Cerbos configuration
│
├── config/              # Configuration files
│   ├── docker/          # Docker & deployment configs
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.prod.yml
│   │   └── deploy.sh
│   └── scripts/         # Utility scripts
│
├── docs/                # Documentation
│   ├── architecture/    # System architecture docs
│   ├── deployment/      # Deployment guides
│   ├── migration/       # Migration documentation
│   └── testing/         # Test documentation
│
├── __tests__/          # Test files
│   ├── fixtures/       # Test data
│   └── *.test.js      # Test suites
│
└── .env.example        # Environment template
```

## Key Directories

### `/backend`
Contains the Node.js/TypeScript API server with Express, database models, services, and routes.

### `/frontend`
Next.js React application for the web interface.

### `/cerbos`
Authorization policies and configuration for the Cerbos authorization service.

### `/config`
All configuration files including Docker setups, deployment scripts, and utility tools.

### `/docs`
Comprehensive documentation organized by topic:
- **architecture/** - System design and technical architecture
- **deployment/** - Deployment guides and instructions
- **migration/** - Database and service migration docs
- **testing/** - Test plans and results

### `/__tests__`
All test files and fixtures for both backend and frontend testing.

## Quick Start

1. Copy `.env.example` to `.env`
2. Run `docker-compose -f config/docker/docker-compose.yml up`
3. Access frontend at http://localhost:3000
4. Access API at http://localhost:3001

## Deployment

For deployment instructions, see:
- `config/docker/deploy.sh` - Quick deployment script
- `docs/deployment/` - Detailed deployment documentation
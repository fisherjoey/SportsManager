# Sports Manager - Quick Start

## Start Development

**One command to start everything:**

```bash
npm run dev
```

This starts:
- ✅ Cerbos (authorization) on http://localhost:3592
- ✅ Backend API on http://localhost:3001
- ✅ Frontend on http://localhost:3000

## First Time Setup

```bash
# 1. Install dependencies
npm run install:all

# 2. Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# 3. Run migrations
cd backend && npm run migrate

# 4. Start everything
npm run dev
```

## Useful Commands

```bash
npm run dev              # Start all (Cerbos + Backend + Frontend)
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run start:cerbos     # Start Cerbos in background
npm run stop:cerbos      # Stop Cerbos
npm run test:all         # Run all tests
npm run build:all        # Build all
```

## Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Cerbos | http://localhost:3592 |

## Recent Updates (Oct 2025)

**✅ Comprehensive Audit Complete** - See [`docs/audit-2025-10-18/`](./docs/audit-2025-10-18/README.md)

**Key Findings**:
- 168 frontend requirements documented
- 330 backend endpoints cataloged
- 116 database tables documented
- 218 hours of implementation work identified

**Next Steps**: See [`PRIORITY_ACTION_CHECKLIST.md`](./docs/audit-2025-10-18/implementation/PRIORITY_ACTION_CHECKLIST.md)

## Documentation

- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Development Guide**: [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Project Structure**: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **📊 Audit Results**: [`docs/audit-2025-10-18/`](./docs/audit-2025-10-18/README.md) ⭐
- **📋 Implementation Plan**: [`docs/audit-2025-10-18/implementation/`](./docs/audit-2025-10-18/implementation/)
- **API Docs**: `backend/docs/API.md`
- **Architecture**: `docs/architecture/`

## Troubleshooting

**"Docker not running"**: Start Docker Desktop first, then run `npm run dev`

**Permission errors**: Make sure Cerbos is running: `npm run start:cerbos`

**Port in use**: Kill the process or change ports in `.env` files

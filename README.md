# Sports Manager Application

A comprehensive sports management system for organizing leagues, teams, games, and referee assignments.

## Project Structure

```
├── frontend/         # Next.js frontend application
│   ├── app/         # Next.js App Router pages
│   ├── components/  # React components
│   ├── hooks/       # Custom React hooks
│   ├── lib/         # Utilities and helpers
│   ├── types/       # TypeScript type definitions
│   └── public/      # Static assets
├── backend/          # Node.js/Express backend API (TypeScript)
│   ├── src/         # Source code
│   ├── dist/        # Compiled JavaScript
│   └── migrations/  # Database migrations
├── docs/            # Project documentation
│   ├── architecture/ # System architecture docs
│   └── guides/      # User and admin guides
├── scripts/         # Build and utility scripts
└── .github/         # GitHub workflows and templates
```

## Getting Started

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

## Documentation

- [Architecture Overview](docs/architecture/)
- [API Documentation](backend/docs/API.md)
- [Database Schema](docs/database-diagram.md)
- [Testing Guide](docs/testing/TESTING-STANDARDS.md)
- [Development Guide](docs/development/CLAUDE.md)

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
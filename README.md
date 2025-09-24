# Sports Manager Application

A comprehensive sports management system for organizing leagues, teams, games, and referee assignments.

## Project Structure

```
├── backend/           # Node.js/Express backend API
├── app/              # Next.js frontend application
├── components/       # Shared React components
├── docs/            # Project documentation
│   ├── architecture/ # System architecture docs
│   ├── permissions/ # RBAC and permissions documentation
│   ├── development/ # Development guides and instructions
│   ├── testing/     # Testing documentation
│   └── guides/      # User and admin guides
├── config/          # Configuration files
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
2. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
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

Start the backend server:
```bash
cd backend && npm start
# Or with Redis disabled:
DISABLE_REDIS=true npm start
```

Start the frontend:
```bash
npm run dev
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
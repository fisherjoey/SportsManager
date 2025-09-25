# Sports Management API

REST API backend for the Sports Management Application built with Node.js, Express, and PostgreSQL.

## Features

- **Games Management**: CRUD operations for games with advanced filtering
- **Referee Management**: Referee profiles with availability tracking
- **Assignment System**: Referee-to-game assignments with position tracking
- **Authentication**: JWT-based auth with role-based access
- **Database**: PostgreSQL with Knex.js migrations and seeding

## Quick Start

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v12+)
- npm or pnpm

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Setup database:**
   ```bash
   # Create database
   createdb sports_management
   
   # Run migrations
   npm run migrate
   
   # Seed initial data
   npm run seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile

### Games
- `GET /api/games` - List games with filtering
- `GET /api/games/:id` - Get specific game
- `POST /api/games` - Create new game
- `PUT /api/games/:id` - Update game
- `PATCH /api/games/:id/status` - Update game status
- `DELETE /api/games/:id` - Delete game

### Referees
- `GET /api/referees` - List referees with filtering
- `GET /api/referees/:id` - Get specific referee
- `POST /api/referees` - Create new referee
- `PUT /api/referees/:id` - Update referee
- `PATCH /api/referees/:id/availability` - Update availability
- `GET /api/referees/available/:gameId` - Get available referees for game
- `DELETE /api/referees/:id` - Delete referee

### Assignments
- `GET /api/assignments` - List assignments with filtering
- `GET /api/assignments/:id` - Get specific assignment
- `POST /api/assignments` - Create new assignment
- `POST /api/assignments/bulk` - Bulk assign referees
- `PATCH /api/assignments/:id/status` - Update assignment status
- `DELETE /api/assignments/:id` - Remove assignment

## Database Schema

### Core Tables

- **users**: Authentication and user management
- **referees**: Referee profiles with postal codes
- **games**: Game details with location and pay rates
- **positions**: Referee positions (Referee 1, 2, 3)
- **game_assignments**: Junction table for referee-game assignments

### Key Features

- **Postal Code Matching**: Games and referees have postal codes for location-based matching
- **Position System**: Simple 3-position system (Referee 1, Referee 2, Referee 3)
- **Status Tracking**: Games and assignments have status workflows
- **Conflict Prevention**: Database constraints prevent double-booking

## Environment Variables

```bash
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_management
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

## Development

### Database Operations

```bash
# Create new migration
npx knex migrate:make migration_name

# Run migrations
npm run migrate

# Rollback migrations
npx knex migrate:rollback

# Create seed file
npx knex seed:make seed_name

# Run seeds
npm run seed
```

### Testing

```bash
npm test
```

## Production Deployment

1. Set production environment variables
2. Run migrations: `npm run migrate`
3. Start with: `npm start`

## API Response Format

### Success Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50
  }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (for deletes)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error
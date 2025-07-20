# Sports Management App

A full-stack web application for managing sports referee assignments and game scheduling. Built with Next.js, React, and Node.js.

## Features

- **User Management**: Admin and referee role-based authentication
- **Game Management**: Create, schedule, and assign games
- **Referee Assignment**: Automatically match referees to games based on location and availability  
- **Dashboard Views**: Different dashboards for admins and referees
- **Calendar Integration**: Visual calendar view of games and assignments
- **Profile Management**: User profile settings and preferences

## Tech Stack

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **Shadcn/ui** - Pre-built components
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Knex.js** - Query builder and migrations
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware

## Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL 12+
- Git

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "Sports Management App"
```

### 2. Database Setup

Install and start PostgreSQL, then create the database:

```bash
createdb sports_management
```

### 3. Backend Setup

```bash
cd backend
npm install

# Copy environment template and configure
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

Run database migrations and seeds:
```bash
npm run migrate
npm run seed
```

Start the backend server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### 4. Frontend Setup

```bash
# From the root directory
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Backend
- `npm run dev` - Start development server with nodemon
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Run database seeds
- `npm test` - Run tests

## Project Structure

```
Sports Management App/
├── app/                    # Next.js app directory
├── components/             # React components
│   ├── ui/                # Shadcn/ui components
│   └── ...                # Feature components
├── lib/                   # Utility functions
├── hooks/                 # Custom React hooks
├── styles/                # Global styles
├── public/                # Static assets
├── backend/               # Express.js API
│   ├── src/              # Source code
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   └── config/       # Configuration
│   ├── migrations/       # Database migrations
│   └── seeds/           # Database seeds
├── database-schema.sql    # Database schema reference
└── README.md
```

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - Authentication and user roles
- `referees` - Referee profiles and preferences
- `games` - Game information and scheduling
- `teams` - Team details
- `positions` - Referee positions (Referee 1, 2, 3)
- `game_assignments` - Referee-to-game assignments

## Authentication

The app uses JWT-based authentication with two user roles:
- **Admin**: Can create games, manage referees, and assign games
- **Referee**: Can view available games and manage their assignments

## Development

### Adding New Components
Components use the Shadcn/ui system. Add new UI components:
```bash
npx shadcn-ui@latest add <component-name>
```

### Database Changes
Create new migrations:
```bash
cd backend
npx knex migrate:make <migration_name>
```

### API Endpoints
Main API routes are available at:
- `/api/auth` - Authentication
- `/api/games` - Game management
- `/api/referees` - Referee management  
- `/api/assignments` - Assignment management

## Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
PORT=3001
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License
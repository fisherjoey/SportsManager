# School Project - Minimal Starter

🎉 **Clean starting point for your SENG513 Team/Coach/Player portal!**

---

## What You Have

### ✅ Frontend (Clean UI Foundation)

```
frontend/
├── components/
│   ├── ui/                    # Complete shadcn/ui component library
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ... (30+ UI components)
│   │
│   ├── auth-provider.tsx      # Authentication context
│   ├── login-form.tsx         # Login page component
│   ├── theme-provider.tsx     # Dark/light theme
│   ├── error-boundary.tsx     # Error handling
│   └── page-access-guard.tsx  # Authorization helper
│
├── app/
│   ├── login/                 # Login page
│   ├── school-portal/         # Your workspace!
│   │   ├── page.tsx          # Portal home
│   │   ├── layout.tsx        # Portal layout
│   │   ├── team/             # Team management (empty starter)
│   │   ├── coach/            # Coach management (empty starter)
│   │   └── player/           # Player management (empty starter)
│   │
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── page.tsx              # Redirects to /school-portal
│
└── lib/
    ├── utils.ts              # Utility functions
    └── api.ts                # API helpers
```

### ✅ Backend (Essential Infrastructure)

```
backend/src/
├── routes/
│   ├── auth.ts               # Login/logout/register
│   ├── health.ts             # Health check
│   ├── teams.ts              # Team endpoints (basic)
│   ├── games.ts              # Game endpoints (basic)
│   ├── leagues.ts            # League endpoints (basic)
│   ├── locations.ts          # Venue endpoints
│   ├── users.ts              # User management
│   ├── roles.ts              # RBAC roles
│   ├── pages.ts              # Page access
│   ├── cerbos.ts             # Authorization
│   │
│   └── school/               # Empty - ready for your code!
│
├── middleware/
│   ├── auth.ts               # JWT authentication
│   └── requireCerbosPermission.ts  # Authorization
│
├── services/
│   └── (minimal services)
│
└── types/
    └── (TypeScript types)
```

### ✅ Database Tables (Shared Foundation)

```sql
✅ users           # Authentication & user profiles
✅ roles           # RBAC system
✅ teams           # Team information (expand this!)
✅ games           # Game scheduling
✅ leagues         # League management
✅ locations       # Venues/facilities

🆕 You'll create:
   - players
   - coaches
   - player_stats
   - team_stats
   - (whatever else you need)
```

---

## What Was Removed

All referee/assignor business logic:
- ❌ Assignment system
- ❌ Referee management
- ❌ Availability tracking
- ❌ Financial modules
- ❌ 150+ business components
- ❌ 50+ backend routes

**Result:** 86,000+ lines of code removed, clean slate!

---

## Getting Started

### 1. Start Development Environment

```bash
# Start all services
docker-compose up -d

# Or run locally
cd backend && npm run dev
cd frontend && npm run dev
```

### 2. Access the Application

- **Frontend:** http://localhost:3000 (redirects to /school-portal)
- **Backend API:** http://localhost:3001
- **Login:** Use existing auth system

### 3. Start Building!

Your workspace is in:
- **Frontend:** `frontend/app/school-portal/`
- **Backend:** `backend/src/routes/school/`

---

## Next Steps - Build Your Features

### Phase 1: Database (Start Here!)

Create migrations for your tables:

```bash
cd backend
npm run knex migrate:make create_players_table
npm run knex migrate:make create_coaches_table
npm run knex migrate:make create_player_stats_table
```

Example migration:

```typescript
// backend/src/migrations/YYYYMMDD_create_players_table.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('players', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('team_id').references('id').inTable('teams');
    table.uuid('user_id').references('id').inTable('users');
    table.integer('jersey_number');
    table.string('position');
    table.string('status').defaultTo('active');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('players');
}
```

### Phase 2: Backend APIs

Create routes in `backend/src/routes/school/`:

```typescript
// backend/src/routes/school/players.ts
import express from 'express';
import { authenticate } from '../../middleware/auth';

const router = express.Router();

// GET /api/school/players
router.get('/', authenticate, async (req, res) => {
  // Get all players
});

// POST /api/school/players
router.post('/', authenticate, async (req, res) => {
  // Create a player
});

export default router;
```

Register in `backend/src/app.ts`:

```typescript
import schoolPlayersRoutes from './routes/school/players';
app.use('/api/school/players', schoolPlayersRoutes);
```

### Phase 3: Frontend Pages

Build pages in `frontend/app/school-portal/`:

```typescript
// frontend/app/school-portal/team/roster/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TeamRosterPage() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Fetch players
    fetch('/api/school/players')
      .then(res => res.json())
      .then(data => setPlayers(data));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Team Roster</h2>
        <Button>Add Player</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Players</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your roster table here */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Available UI Components

You have a complete component library! Here are the main ones:

### Layout & Structure
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Dialog`, `DialogContent`, `DialogHeader`
- `Sheet`, `SheetContent`, `SheetTrigger`

### Forms & Inputs
- `Form`, `FormField`, `FormItem`, `FormLabel`
- `Input`, `Textarea`, `Select`
- `Button`, `Checkbox`, `Switch`, `RadioGroup`

### Data Display
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `Badge`, `Avatar`, `Separator`
- `Tooltip`, `Popover`, `DropdownMenu`

### Feedback
- `Alert`, `AlertDescription`
- `Toast`, `useToast`
- `Progress`, `Skeleton`

**See:** `frontend/components/ui/` for all components

---

## Example: Building a Feature End-to-End

Let's build "Player List" feature:

### 1. Database Migration

```bash
cd backend
npm run knex migrate:make create_players_table
```

### 2. Backend Route

```typescript
// backend/src/routes/school/players.ts
import express from 'express';
import { db } from '../db';

const router = express.Router();

router.get('/', async (req, res) => {
  const players = await db('players')
    .join('users', 'players.user_id', 'users.id')
    .join('teams', 'players.team_id', 'teams.id')
    .select('players.*', 'users.name as player_name', 'teams.name as team_name');

  res.json(players);
});

export default router;
```

### 3. Frontend Page

```typescript
// frontend/app/school-portal/player/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/school/players')
      .then(res => res.json())
      .then(setPlayers);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Players</h2>

      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Jersey #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>{player.player_name}</TableCell>
                  <TableCell>{player.team_name}</TableCell>
                  <TableCell>{player.position}</TableCell>
                  <TableCell>{player.jersey_number}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

Done! You have a working feature.

---

## Recommended Feature Order

### Week 1: Foundation
1. ✅ Database tables (players, coaches)
2. ✅ Basic API endpoints (CRUD)
3. ✅ Simple list pages

### Week 2: Core Features
4. ✅ Team roster management
5. ✅ Player profiles
6. ✅ Coach dashboard

### Week 3: Enhanced Features
7. ✅ Statistics tracking
8. ✅ Team schedules
9. ✅ Search & filters

### Week 4: Polish
10. ✅ Forms & validation
11. ✅ Error handling
12. ✅ Testing & docs

---

## Git Tags

You have these restore points:

- `school-project-start` - Before any changes
- `school-before-cleanup-to-minimal` - Before cleanup (has all old code)
- `school-minimal-starter` - Current clean state ⭐

To restore:
```bash
git checkout school-minimal-starter
```

---

## Environment Variables

Already configured in `.env.school`:

```bash
SCHOOL_PROJECT_MODE=true
ENABLE_REFEREE_PORTAL=false
ENABLE_TEAM_PORTAL=true
ENABLE_COACH_PORTAL=true
ENABLE_PLAYER_PORTAL=true

DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/sports_management_school
```

---

## Helpful Commands

```bash
# Database
cd backend
npm run migrate              # Run migrations
npm run migrate:rollback     # Undo last migration
npm run knex seed:run        # Run seeds

# Development
npm run dev                  # Start backend dev server
cd frontend && npm run dev   # Start frontend dev server

# Git
git log --oneline            # View commits
git tag                      # View tags
git diff                     # See changes

# Docker
docker-compose up -d         # Start all services
docker-compose logs -f       # View logs
docker-compose down          # Stop services
```

---

## Resources

- **shadcn/ui Docs:** https://ui.shadcn.com/
- **Next.js Docs:** https://nextjs.org/docs
- **TypeScript Docs:** https://www.typescriptlang.org/docs
- **Knex.js Docs:** http://knexjs.org/

---

## Summary

You now have:
- ✅ Clean UI component library (shadcn/ui)
- ✅ Authentication system working
- ✅ Empty school-portal structure ready
- ✅ Minimal backend with shared routes
- ✅ Database foundation (users, teams, games, leagues)
- ✅ No referee/business logic clutter

**Ready to build your team/coach/player features from scratch!** 🚀

Start with creating your database tables, then build APIs, then build UI. Good luck with your school project!

# School Project Quick Start Guide
## Team/Coach/Player Portal

**Goal:** Separate your school project from the existing Referee/Assignor system

---

## TL;DR - Fastest Setup

### Option 1: Run Setup Script (Easiest)

```bash
# Windows
.\setup-school-project.bat

# Mac/Linux
chmod +x setup-school-project.sh
./setup-school-project.sh
```

This automatically:
- ✅ Creates branch `school/seng513-team-portal`
- ✅ Sets up `.env.school` configuration
- ✅ Creates directory structure
- ✅ Generates initial documentation

### Option 2: Manual Setup (5 minutes)

```bash
# 1. Create school branch
git checkout -b school/seng513-team-portal
git tag school-project-start

# 2. Copy environment
cp .env.example .env
# Edit .env: Set SCHOOL_PROJECT_MODE=true

# 3. Start coding!
```

---

## Key Decisions Made Simple

### 1. Branch Strategy ✅ RECOMMENDED

**Use a separate branch for school project**

```bash
git checkout -b school/seng513-team-portal
```

**Why?**
- ✅ Complete isolation from referee system
- ✅ Easy to submit just your work
- ✅ No conflicts with original project
- ✅ Can still cherry-pick useful code back later

### 2. Database Strategy

**Option A: Separate Database** ✅ RECOMMENDED for school

```bash
# In .env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/sports_management_school
```

**Why?**
- ✅ Complete data isolation
- ✅ Can experiment freely
- ✅ Easy to reset/seed

**Option B: Shared Database with Flags**

```bash
# In .env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/sports_management
SCHOOL_PROJECT_MODE=true
```

**Why?**
- ✅ Can reuse existing data (teams, leagues, games)
- ✅ Less setup
- ⚠️ Need to be careful not to break referee features

### 3. Code Organization

```
Your New Features:
backend/src/
├── routes/
│   ├── teams.ts          ← Expand this (already exists)
│   ├── coaches.ts        ← NEW - Create this
│   ├── players.ts        ← NEW - Create this
│   └── school/           ← NEW - Or put everything here
│       ├── teams.ts
│       ├── coaches.ts
│       └── players.ts

frontend/app/
├── school-portal/        ← NEW - All your school features
│   ├── team/
│   ├── coach/
│   └── player/
```

---

## What to Keep vs. What to Change

### ✅ Keep and Use (Shared Infrastructure)

These are useful for both projects:

```
✅ Authentication system (JWT, login/logout)
✅ Database connection
✅ Teams table
✅ Games table
✅ Leagues table
✅ Locations/venues table
✅ Users table
✅ Cerbos authorization (adapt for coaches/players)
```

### ❌ Disable or Ignore (Referee-Specific)

You don't need these for school:

```
❌ Referee profiles
❌ Assignment board
❌ Referee availability
❌ Assignment matching algorithm
❌ Referee-specific UI components
```

### 🆕 Add New (School Project Features)

What you'll build:

```
🆕 Player roster management
🆕 Coach dashboards
🆕 Player statistics
🆕 Team management (enhanced)
🆕 Player profiles
🆕 Coach-player assignments
```

---

## Environment Configuration

### Simple .env for School Project

```bash
# Project Mode
SCHOOL_PROJECT_MODE=true
PROJECT_FOCUS=team_coach_player

# Disable referee features
ENABLE_REFEREE_PORTAL=false
ENABLE_TEAM_PORTAL=true
ENABLE_COACH_PORTAL=true
ENABLE_PLAYER_PORTAL=true

# Database (choose one)
# Option A: Separate school database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/sports_management_school

# Option B: Shared database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/sports_management

# Everything else stays the same
JWT_SECRET=your-secret-key
PORT=3001
FRONTEND_URL=http://localhost:3000
```

---

## Feature Flag Usage

### Backend (Conditionally Load Routes)

```typescript
// backend/src/server.ts
import { isSchoolProjectMode } from './config';

if (!isSchoolProjectMode()) {
  // Skip referee routes in school mode
  app.use('/api/referees', refereeRoutes);
  app.use('/api/assignments', assignmentRoutes);
}

// Always load team/coach/player routes
app.use('/api/teams', teamRoutes);
app.use('/api/coaches', coachRoutes);      // NEW
app.use('/api/players', playerRoutes);     // NEW
```

### Frontend (Conditionally Render UI)

```typescript
// frontend/components/navigation.tsx
import { isSchoolProjectMode } from '@/lib/config';

export default function Navigation() {
  return (
    <nav>
      {/* School project features */}
      <Link href="/school-portal/team">Teams</Link>
      <Link href="/school-portal/coach">Coaches</Link>
      <Link href="/school-portal/player">Players</Link>

      {/* Hide referee features in school mode */}
      {!isSchoolProjectMode() && (
        <>
          <Link href="/referees">Referees</Link>
          <Link href="/assignments">Assignments</Link>
        </>
      )}
    </nav>
  );
}
```

---

## New Database Tables You'll Need

### Players Table

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  jersey_number INTEGER,
  position VARCHAR(50),
  join_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, injured, suspended
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Coaches Table

```sql
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50), -- head_coach, assistant_coach, trainer
  specialty VARCHAR(100),
  certification_level VARCHAR(50),
  hire_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Player Stats Table

```sql
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id),
  game_id UUID REFERENCES games(id),
  points INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  -- Add more sport-specific stats
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Create Migration

```bash
cd backend
npm run knex migrate:make create_school_project_tables

# Edit the migration file
# Add the CREATE TABLE statements above
# Then run:
npm run migrate
```

---

## Daily Workflow

### Starting Development

```bash
# 1. Make sure you're on school branch
git checkout school/seng513-team-portal

# 2. Start Docker services
docker-compose up -d
# OR for separate school setup:
docker-compose -f docker-compose.school.yml up -d

# 3. Develop!
# Edit code in backend/src/routes/school/ or frontend/app/school-portal/
# Changes auto-reload
```

### Making Commits

```bash
# Use clear commit messages for grading
git add .
git commit -m "feat(school): Add player roster management API"
git commit -m "feat(school): Add coach dashboard UI"
git commit -m "fix(school): Fix player stats calculation"

# Tag important milestones
git tag school-milestone-1-players
git tag school-milestone-2-coaches
```

### Submission Preparation

```bash
# When ready to submit
git tag school-seng513-final-submission

# Generate submission package
git archive --format=zip --output=seng513-submission.zip school-seng513-final-submission

# Or create a patch of your changes
git diff school-project-start..HEAD > school-project-changes.patch
```

---

## Typical File Structure for School Project

```
SportsManager/
├── .env.school                    # School config
├── docker-compose.school.yml      # School Docker setup
│
├── backend/
│   └── src/
│       ├── routes/
│       │   └── school/            # All school routes here
│       │       ├── teams.ts       # Team management API
│       │       ├── coaches.ts     # Coach management API
│       │       └── players.ts     # Player management API
│       │
│       └── migrations/
│           └── 100_school_*.ts    # School migrations (100+ to separate)
│
├── frontend/
│   └── app/
│       └── school-portal/         # All school UI here
│           ├── layout.tsx
│           ├── page.tsx
│           ├── team/
│           │   ├── page.tsx       # Team dashboard
│           │   └── [id]/          # Team details
│           ├── coach/
│           │   ├── page.tsx       # Coach dashboard
│           │   └── [id]/          # Coach details
│           └── player/
│               ├── page.tsx       # Player dashboard
│               └── [id]/          # Player profile
│
└── docs/
    └── school-project/            # School documentation
        ├── README.md
        ├── API.md
        └── FEATURES.md
```

---

## Common Pitfalls to Avoid

### ❌ Don't Do This

```bash
# Don't commit school work to main branch
git checkout main
# ... make school changes ...
git commit  # ❌ Wrong branch!

# Don't mix referee and school features
if (isRefereePage && isCoachPage) { } // ❌ Confusing

# Don't break existing referee features
// backend/src/routes/referees.ts
// ... delete everything ... // ❌ Others might use this!
```

### ✅ Do This Instead

```bash
# Always work on school branch
git checkout school/seng513-team-portal
# ... make school changes ...
git commit  # ✅ Correct!

# Keep features separate
if (isSchoolProjectMode()) { showCoachDashboard(); }

# Leave existing code alone
// Create new files instead
// backend/src/routes/school/coaches.ts  // ✅ New file
```

---

## Help! I Need To...

### "Switch back to referee system"

```bash
git checkout main
cp .env.referee .env  # Or .env.example
docker-compose up -d
```

### "Copy my school work to a new repo"

```bash
# Create archive of school branch
git archive --format=zip --prefix=school-project/ -o school-project.zip school/seng513-team-portal

# Extract to new location
unzip school-project.zip -d ../new-school-repo/
cd ../new-school-repo/school-project
git init
git add .
git commit -m "Initial commit: School project"
```

### "Merge useful code back to main"

```bash
# From school branch, find commits you want
git log --oneline

# Switch to main
git checkout main

# Cherry-pick specific commits
git cherry-pick abc123  # Replace abc123 with commit hash

# Or merge entire branch (risky)
git merge school/seng513-team-portal
```

### "Start fresh but keep infrastructure"

```bash
# Reset school branch to starting point
git checkout school/seng513-team-portal
git reset --hard school-project-start

# Now build from scratch again
```

---

## Summary Checklist

Before starting development:

- [ ] Created school branch: `git checkout -b school/seng513-team-portal`
- [ ] Tagged start: `git tag school-project-start`
- [ ] Created `.env.school` with `SCHOOL_PROJECT_MODE=true`
- [ ] Decided on database strategy (separate vs. shared)
- [ ] Created directory structure (`backend/src/routes/school/`, `frontend/app/school-portal/`)
- [ ] Read full separation guide: `SCHOOL_PROJECT_SEPARATION.md`

During development:

- [ ] Always work on `school/seng513-team-portal` branch
- [ ] Use clear commit messages: `feat(school): ...`
- [ ] Create migrations for new tables
- [ ] Document your features
- [ ] Tag important milestones

Before submission:

- [ ] Final tag: `git tag school-seng513-final-submission`
- [ ] Clean commit history: `git log --oneline`
- [ ] Documentation complete
- [ ] All tests passing
- [ ] Demo ready

---

## Getting Help

- **Full Guide:** `SCHOOL_PROJECT_SEPARATION.md` (comprehensive 5000+ word guide)
- **Setup Scripts:** `setup-school-project.bat` (Windows) or `.sh` (Mac/Linux)
- **This File:** Quick reference for common tasks

---

**Ready to start?**

```bash
# Run this to set up everything:
.\setup-school-project.bat  # Windows
# OR
./setup-school-project.sh    # Mac/Linux

# Then start developing!
docker-compose up -d
```

Good luck with your school project! 🎓🚀

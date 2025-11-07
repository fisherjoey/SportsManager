# School Project Separation Strategy
## Team/Coach/Player Portal vs. Referee/Assignor Portal

This document outlines how to separate your school project (Team/Coach/Player focus) from the existing Referee/Assignor system while maintaining a clean codebase.

---

## Table of Contents

1. [Git Branching Strategy](#git-branching-strategy)
2. [Code Organization](#code-organization)
3. [Feature Flags Approach](#feature-flags-approach)
4. [Database Separation](#database-separation)
5. [Documentation Strategy](#documentation-strategy)
6. [Recommended Workflow](#recommended-workflow)

---

## Git Branching Strategy

### Option 1: Separate School Branch (Recommended)

Create a dedicated branch for your school project that diverges from the main project:

```bash
# Create a new branch for your school project
git checkout -b school/team-coach-player-portal

# Tag the starting point
git tag school-project-start

# This branch will be your school project workspace
```

**Advantages:**
- ✅ Complete isolation from main project
- ✅ Can make breaking changes without affecting original
- ✅ Easy to submit just your school work
- ✅ Can still cherry-pick useful changes back to main

**When to use:** If your school project is a significant departure and you want maximum flexibility.

### Option 2: Feature Branch with Flags

Keep both portals in the same codebase but use feature flags:

```bash
# Create a feature branch
git checkout -b feature/team-portal

# Keep merging from main to stay updated
git merge main
```

**Advantages:**
- ✅ Share common infrastructure (auth, database, etc.)
- ✅ Easier to maintain both portals
- ✅ Can toggle features on/off

**When to use:** If there's significant overlap and you want to maintain both portals long-term.

### Recommended: Hybrid Approach

```bash
# 1. Create school project branch
git checkout -b school/seng513-team-portal

# 2. Remove/disable referee features you don't need
# 3. Focus on team/coach/player features
# 4. Keep commit history clean for submission

# 5. If you want to bring improvements back to main:
git checkout main
git cherry-pick <commit-hash>  # Pick specific improvements
```

---

## Code Organization

### Current Structure (Referee/Assignor Focus)

```
backend/src/
├── routes/
│   ├── referees.ts          # Referee management
│   ├── assignments.ts       # Game assignments
│   ├── availability.ts      # Referee availability
│   └── games.ts            # Game management
frontend/
├── app/
│   ├── assignments/        # Assignment board
│   ├── referees/          # Referee management
│   └── games/            # Game scheduling
```

### Proposed Structure (Team/Coach/Player Focus)

```
backend/src/
├── routes/
│   ├── teams.ts           # Team management
│   ├── coaches.ts         # Coach profiles & management
│   ├── players.ts         # Player roster management
│   ├── games.ts           # Game viewing (reuse existing)
│   ├── roster-management.ts  # Roster operations
│   └── team-stats.ts     # Team/Player statistics
│
│   # Optional: Keep in separate directory
│   ├── _archived-referee/  # Move old referee routes here
│
frontend/
├── app/
│   ├── team-portal/       # NEW: Team dashboard
│   │   ├── roster/        # Player management
│   │   ├── schedule/      # Team schedule
│   │   └── stats/         # Team statistics
│   ├── coach-portal/      # NEW: Coach dashboard
│   │   ├── players/       # Player development
│   │   ├── game-plans/    # Strategy & planning
│   │   └── communications/ # Team communications
│   ├── player-portal/     # NEW: Player dashboard
│   │   ├── profile/       # Player profile
│   │   ├── schedule/      # Personal schedule
│   │   └── stats/         # Personal statistics
│
│   # Optional: Archive old features
│   ├── _archived-referee/
│   │   ├── assignments/
│   │   └── referees/
```

### Directory Naming Conventions

For clear separation, use prefixes:

```
# School Project Features (prefix with school_ or team_)
backend/src/routes/school_teams.ts
backend/src/routes/school_coaches.ts
backend/src/routes/school_players.ts

frontend/app/school-portal/
frontend/components/school/

# OR organize by domain
backend/src/domains/
├── team-management/
├── coach-management/
└── player-management/
```

---

## Feature Flags Approach

### Environment-Based Toggle

Add to your `.env`:

```bash
# Feature Toggles
ENABLE_REFEREE_PORTAL=false
ENABLE_TEAM_PORTAL=true
ENABLE_COACH_PORTAL=true
ENABLE_PLAYER_PORTAL=true

# School Project Mode
SCHOOL_PROJECT_MODE=true
PROJECT_FOCUS=team_coach_player
```

### Backend Implementation

Create a feature flag service:

```typescript
// backend/src/services/FeatureFlagService.ts
export class FeatureFlagService {
  static isRefereePortalEnabled(): boolean {
    return process.env.ENABLE_REFEREE_PORTAL === 'true';
  }

  static isTeamPortalEnabled(): boolean {
    return process.env.ENABLE_TEAM_PORTAL === 'true';
  }

  static isSchoolProjectMode(): boolean {
    return process.env.SCHOOL_PROJECT_MODE === 'true';
  }

  static getProjectFocus(): 'referee' | 'team_coach_player' {
    return process.env.PROJECT_FOCUS as any || 'referee';
  }
}

// Usage in routes
import { FeatureFlagService } from './services/FeatureFlagService';

if (!FeatureFlagService.isRefereePortalEnabled()) {
  // Don't register referee routes
  console.log('Referee portal disabled for school project');
} else {
  app.use('/api/referees', refereeRoutes);
  app.use('/api/assignments', assignmentRoutes);
}

// Always register team portal routes
app.use('/api/teams', teamRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/players', playerRoutes);
```

### Frontend Implementation

```typescript
// frontend/lib/features.ts
export const features = {
  refereePortal: process.env.NEXT_PUBLIC_ENABLE_REFEREE_PORTAL === 'true',
  teamPortal: process.env.NEXT_PUBLIC_ENABLE_TEAM_PORTAL === 'true',
  coachPortal: process.env.NEXT_PUBLIC_ENABLE_COACH_PORTAL === 'true',
  playerPortal: process.env.NEXT_PUBLIC_ENABLE_PLAYER_PORTAL === 'true',
  schoolProjectMode: process.env.NEXT_PUBLIC_SCHOOL_PROJECT_MODE === 'true',
};

// Usage in components
import { features } from '@/lib/features';

export default function Navigation() {
  return (
    <nav>
      {features.teamPortal && <Link href="/team-portal">Teams</Link>}
      {features.coachPortal && <Link href="/coach-portal">Coaches</Link>}
      {features.playerPortal && <Link href="/player-portal">Players</Link>}

      {/* Hide referee features in school mode */}
      {!features.schoolProjectMode && (
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

## Database Separation

### Shared Tables (Keep Using)

These tables are useful for both portals:

```sql
✅ organizations  -- Sports organizations
✅ leagues        -- League management
✅ teams          -- Team information
✅ locations      -- Venue information
✅ games          -- Game scheduling
✅ users          -- User accounts
✅ roles          -- RBAC system
```

### Referee-Specific Tables (Optional to Hide)

```sql
⚠️ referees             -- Referee profiles
⚠️ referee_levels       -- Certification levels
⚠️ referee_availability -- Availability tracking
⚠️ assignments          -- Referee assignments
⚠️ assignment_history   -- Assignment tracking
```

**Options:**

1. **Keep but ignore** - Tables exist but you don't use them in your school project
2. **Hide with views** - Create views that exclude referee data
3. **Separate schema** - Create `school_project` schema with only needed tables

### New Tables for School Project

You'll likely need:

```sql
-- Player Management
CREATE TABLE players (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  jersey_number INTEGER,
  position VARCHAR(50),
  join_date DATE,
  status VARCHAR(20), -- active, injured, suspended
  created_at TIMESTAMP DEFAULT NOW()
);

-- Coach Management
CREATE TABLE coaches (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50), -- head_coach, assistant_coach, trainer
  specialty VARCHAR(100),
  certification_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Player Statistics
CREATE TABLE player_stats (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  game_id UUID REFERENCES games(id),
  points INTEGER,
  assists INTEGER,
  -- Add sport-specific stats
  created_at TIMESTAMP DEFAULT NOW()
);

-- Team Roster
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  season VARCHAR(20),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Migration Strategy

```bash
# Create migrations for your school project tables
cd backend
npm run knex migrate:make create_school_project_tables

# Keep them separate from referee migrations
backend/src/migrations/
├── 001_initial_setup.ts          # Shared
├── 002_referee_system.ts         # Skip in school mode
├── 100_school_players.ts         # NEW
├── 101_school_coaches.ts         # NEW
├── 102_school_team_rosters.ts    # NEW
```

---

## Documentation Strategy

### Project README Organization

Update your README to indicate dual purpose:

```markdown
# Sports Manager

A multi-purpose sports management platform.

## Current Configurations

### Production (Referee/Assignor Portal)
- Referee assignment management
- Game scheduling for assignors
- Availability tracking

### School Project (Team/Coach/Player Portal)
- Team roster management
- Coach dashboards
- Player statistics and profiles
- **Branch:** `school/seng513-team-portal`
- **Tag:** `school-project-submission`

## Quick Start

### For School Project
\`\`\`bash
git checkout school/seng513-team-portal
cp .env.school.example .env
npm run dev
\`\`\`

### For Production
\`\`\`bash
git checkout main
cp .env.production.example .env
npm run dev
\`\`\`
```

### Separate Documentation Files

```
docs/
├── school-project/
│   ├── README.md              # School project overview
│   ├── FEATURES.md            # Team/Coach/Player features
│   ├── DATABASE_SCHEMA.md     # School project schema
│   ├── API_ENDPOINTS.md       # Team/Coach/Player APIs
│   └── SUBMISSION.md          # Submission checklist
│
├── production/
│   ├── README.md              # Production system
│   ├── REFEREE_SYSTEM.md      # Referee features
│   └── DEPLOYMENT.md          # Production deployment
```

---

## Recommended Workflow

### Step-by-Step Setup

```bash
# 1. Create and switch to school project branch
git checkout -b school/seng513-team-portal

# 2. Tag the starting point
git tag school-project-start

# 3. Create school-specific environment file
cp .env.example .env.school
```

Edit `.env.school`:
```bash
# School Project Configuration
SCHOOL_PROJECT_MODE=true
PROJECT_FOCUS=team_coach_player
PROJECT_NAME="Team/Coach/Player Management System"

# Disable referee features
ENABLE_REFEREE_PORTAL=false
ENABLE_TEAM_PORTAL=true
ENABLE_COACH_PORTAL=true
ENABLE_PLAYER_PORTAL=true

# Database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/sports_management_school
```

```bash
# 4. Create school-specific Docker Compose
cp docker-compose.yml docker-compose.school.yml
```

Edit `docker-compose.school.yml`:
```yaml
services:
  postgres:
    environment:
      POSTGRES_DB: sports_management_school  # Separate database

  backend:
    environment:
      SCHOOL_PROJECT_MODE: true
      ENABLE_REFEREE_PORTAL: false
      ENABLE_TEAM_PORTAL: true
```

```bash
# 5. Create migrations for school project
cd backend
npm run knex migrate:make create_players_table
npm run knex migrate:make create_coaches_table
npm run knex migrate:make create_player_stats_table

# 6. Start development
docker-compose -f docker-compose.school.yml up -d
```

### Daily Development Workflow

```bash
# Work on school project
git checkout school/seng513-team-portal

# Make changes
git add .
git commit -m "feat(school): Add player roster management"

# Keep commits clean and descriptive for grading
git log --oneline  # Review your commits

# When ready to submit
git tag school-project-submission-v1
```

### Merging Useful Changes Back

If you create something useful for the main project:

```bash
# From school branch
git log --oneline  # Find the commit hash

# Switch to main
git checkout main

# Cherry-pick specific commits
git cherry-pick <commit-hash>

# Or create a PR
git checkout -b feature/player-management
git cherry-pick <commit-hash-1> <commit-hash-2>
git push origin feature/player-management
```

---

## Project Focus Comparison

### What to Keep (Shared Infrastructure)

| Feature | Referee Portal | School Project | Notes |
|---------|---------------|----------------|-------|
| Authentication | ✅ | ✅ | Shared JWT system |
| Authorization (Cerbos) | ✅ | ✅ | Reuse for teams/coaches |
| Database | ✅ | ✅ | Add new tables |
| Games Management | ✅ | ✅ | View games from team perspective |
| Leagues | ✅ | ✅ | Teams belong to leagues |
| Teams | ⚠️ Limited | ✅ Full | Expand team features |
| Locations | ✅ | ✅ | Game venues |

### What to Disable (Referee-Specific)

| Feature | Action |
|---------|--------|
| Referee Profiles | ❌ Disable/Hide |
| Assignment Board | ❌ Disable/Hide |
| Referee Availability | ❌ Disable/Hide |
| Referee Levels | ❌ Disable/Hide |
| Assignment History | ❌ Disable/Hide |

### What to Add (Team/Coach/Player)

| Feature | Priority | Description |
|---------|----------|-------------|
| Player Roster Management | 🔴 High | Add/remove players, jersey numbers |
| Coach Dashboard | 🔴 High | Team overview, player management |
| Player Profiles | 🔴 High | Stats, positions, contact info |
| Team Statistics | 🟡 Medium | Win/loss, team performance |
| Player Statistics | 🟡 Medium | Individual performance tracking |
| Team Communications | 🟢 Low | Announcements, messages |
| Practice Scheduling | 🟢 Low | Practice management |
| Equipment Tracking | 🟢 Low | Uniforms, equipment |

---

## Quick Decision Matrix

**Choose your approach based on:**

### Use Separate Branch (`school/seng513-team-portal`) if:
- ✅ You want complete isolation
- ✅ School project is significantly different
- ✅ You don't need to maintain referee features
- ✅ Easier to submit just your work
- ✅ You might want to showcase this separately

**Recommended for: Most school projects**

### Use Feature Flags (same branch) if:
- ✅ You want both portals long-term
- ✅ Significant code sharing between portals
- ✅ You're maintaining both systems
- ✅ Easy toggle between modes

**Recommended for: Professional development**

---

## Environment Files for Both Modes

Create separate environment files:

```
.env.referee          # Original referee/assignor focus
.env.school           # School project (team/coach/player)
.env.example          # Generic template
```

Switch between them:

```bash
# For school project
cp .env.school .env
npm run dev

# For referee system
cp .env.referee .env
npm run dev
```

---

## Submission Preparation

When ready to submit your school project:

```bash
# 1. Clean up commits
git log --oneline  # Review

# 2. Create submission tag
git tag -a school-seng513-submission -m "SENG513 Final Submission: Team/Coach/Player Portal"

# 3. Generate documentation
# Include only school project features in your docs

# 4. Create submission package
git archive --format=zip --output=seng513-team-portal-submission.zip school-seng513-submission

# 5. Or export just your changes
git diff school-project-start..HEAD > school-project-changes.patch
```

---

## Next Steps

1. **Decide on approach** - Separate branch vs. feature flags
2. **Create branch/environment** - Set up your school project workspace
3. **Plan features** - List team/coach/player features needed
4. **Create migrations** - Add new database tables
5. **Build features** - Focus on your school requirements
6. **Document** - Keep clear docs for submission

---

## Questions to Consider

- **Database:** Separate DB or shared with flags?
  - Recommendation: Separate DB for school (`sports_management_school`)

- **Git Strategy:** New branch or feature flags?
  - Recommendation: New branch (`school/seng513-team-portal`)

- **Code Reuse:** How much to reuse vs. rebuild?
  - Recommendation: Reuse auth, DB connection, shared models

- **Deployment:** Separate docker-compose?
  - Recommendation: Yes, `docker-compose.school.yml`

---

**Ready to start?** Run:

```bash
git checkout -b school/seng513-team-portal
cp .env.example .env.school
# Edit .env.school with SCHOOL_PROJECT_MODE=true
```

Then start building your team/coach/player features! 🚀

# Feature Comparison: Referee Portal vs. Team/Coach/Player Portal

This document helps you understand which features belong to which system and what to keep/change for your school project.

---

## System Overview

| Aspect | Referee/Assignor Portal (Original) | Team/Coach/Player Portal (School) |
|--------|-----------------------------------|----------------------------------|
| **Primary Users** | Referees, Assignors, Administrators | Coaches, Players, Team Managers |
| **Main Purpose** | Assign referees to games | Manage team rosters and player development |
| **Key Workflow** | Game → Find Available Referee → Assign | Team → Add Players → Track Performance |
| **Focus** | Scheduling and assignment | Roster management and statistics |

---

## Database Tables

### ✅ Shared Tables (Use in Both)

| Table | Purpose | Used By Referee | Used By School | Notes |
|-------|---------|----------------|---------------|-------|
| `users` | User accounts | ✅ | ✅ | Everyone needs accounts |
| `roles` | RBAC system | ✅ | ✅ | Different roles for each portal |
| `organizations` | Sports organizations | ✅ | ✅ | Both need org structure |
| `leagues` | League information | ✅ | ✅ | Teams belong to leagues |
| `teams` | Team information | ⚠️ Basic | ✅ Enhanced | Expand for school project |
| `games` | Game scheduling | ✅ | ✅ | Different perspectives |
| `locations` | Venues/fields | ✅ | ✅ | Where games happen |

### 🔴 Referee-Only Tables (Disable/Ignore for School)

| Table | Purpose | Action for School Project |
|-------|---------|--------------------------|
| `referees` | Referee profiles | ❌ Ignore |
| `referee_levels` | Certification levels | ❌ Ignore |
| `referee_availability` | When refs are available | ❌ Ignore |
| `assignments` | Game assignments to refs | ❌ Ignore |
| `assignment_history` | Assignment tracking | ❌ Ignore |
| `referee_game_reports` | Post-game reports | ❌ Ignore |

### 🟢 School-Only Tables (Create New)

| Table | Purpose | Priority |
|-------|---------|----------|
| `players` | Player roster information | 🔴 High |
| `coaches` | Coach information | 🔴 High |
| `player_stats` | Individual player statistics | 🟡 Medium |
| `team_stats` | Team-level statistics | 🟡 Medium |
| `practice_schedules` | Practice management | 🟢 Low |
| `team_communications` | Announcements, messages | 🟢 Low |
| `equipment` | Equipment tracking | 🟢 Low |

---

## API Endpoints

### ✅ Shared Endpoints (Keep/Adapt)

| Endpoint | Referee Use | School Use | Action |
|----------|------------|------------|--------|
| `GET /api/teams` | View teams for assignment | Manage teams | ✅ Keep, expand |
| `GET /api/games` | Games to assign | Team schedule | ✅ Keep, adapt view |
| `GET /api/leagues` | League info | League standings | ✅ Keep |
| `GET /api/locations` | Venue info | Game locations | ✅ Keep |
| `POST /api/auth/login` | Referee login | Coach/Player login | ✅ Keep |

### 🔴 Referee-Only Endpoints (Disable for School)

| Endpoint | Purpose | Action |
|----------|---------|--------|
| `GET /api/referees` | List referees | ❌ Disable/Hide |
| `POST /api/assignments` | Create assignment | ❌ Disable |
| `GET /api/assignments/board` | Assignment board | ❌ Disable |
| `GET /api/referees/:id/availability` | Ref availability | ❌ Disable |
| `POST /api/assignments/match` | Auto-match algorithm | ❌ Disable |

### 🟢 School-Only Endpoints (Create New)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /api/teams/:id/roster` | Get team roster | 🔴 High |
| `POST /api/teams/:id/players` | Add player to team | 🔴 High |
| `GET /api/players/:id` | Player profile | 🔴 High |
| `GET /api/coaches/:id` | Coach profile | 🔴 High |
| `POST /api/coaches` | Create coach | 🔴 High |
| `GET /api/players/:id/stats` | Player statistics | 🟡 Medium |
| `GET /api/teams/:id/stats` | Team statistics | 🟡 Medium |
| `POST /api/teams/:id/practice` | Schedule practice | 🟢 Low |

---

## Frontend Pages

### ✅ Shared Pages (Keep/Adapt)

| Page | Referee Portal | School Portal | Action |
|------|---------------|---------------|--------|
| `/login` | Login page | Login page | ✅ Keep |
| `/dashboard` | Assignor dashboard | Coach/Team dashboard | ✅ Adapt |
| `/games` | Games to assign | Team schedule | ✅ Different views |
| `/teams` | Basic team list | Full team management | ✅ Expand |
| `/profile` | User profile | User profile | ✅ Keep |

### 🔴 Referee-Only Pages (Disable/Remove)

| Page | Purpose | Action |
|------|---------|--------|
| `/referees` | Referee management | ❌ Remove |
| `/assignments` | Assignment board | ❌ Remove |
| `/assignments/create` | Create assignment | ❌ Remove |
| `/referees/availability` | Availability calendar | ❌ Remove |
| `/assignments/match` | Auto-matching | ❌ Remove |

### 🟢 School-Only Pages (Create New)

| Page | Purpose | Priority |
|------|---------|----------|
| `/school-portal` | Landing page | 🔴 High |
| `/school-portal/team` | Team dashboard | 🔴 High |
| `/school-portal/team/roster` | Roster management | 🔴 High |
| `/school-portal/coach` | Coach dashboard | 🔴 High |
| `/school-portal/player` | Player dashboard | 🔴 High |
| `/school-portal/team/stats` | Team statistics | 🟡 Medium |
| `/school-portal/player/:id` | Player profile | 🟡 Medium |
| `/school-portal/coach/:id` | Coach profile | 🟡 Medium |
| `/school-portal/team/schedule` | Team schedule | 🟡 Medium |
| `/school-portal/practice` | Practice management | 🟢 Low |

---

## Features Comparison

### Authentication & Authorization

| Feature | Referee Portal | School Portal | Implementation |
|---------|---------------|---------------|----------------|
| User Login | ✅ | ✅ | Same system |
| JWT Tokens | ✅ | ✅ | Same system |
| Cerbos RBAC | ✅ | ✅ | Different policies |
| Roles | Referee, Assignor, Admin | Coach, Player, Team Admin | Different roles |

### Core Features

| Feature | Referee Portal | School Portal | Notes |
|---------|---------------|---------------|-------|
| **User Management** | ✅ Manage referees | ✅ Manage coaches/players | Different user types |
| **Game Management** | ✅ Schedule & assign | ✅ View schedule | Different permissions |
| **Assignment System** | ✅ Core feature | ❌ Not needed | Referee-specific |
| **Roster Management** | ❌ Not needed | ✅ Core feature | School-specific |
| **Statistics** | ⚠️ Referee stats | ✅ Player/Team stats | Different metrics |
| **Availability** | ✅ Referee availability | ⚠️ Player availability | Different use case |
| **Communications** | ⚠️ Assignment notifications | ✅ Team messages | Expand for school |
| **Reports** | ✅ Assignment reports | ✅ Performance reports | Different reports |

### User Perspectives

| View | Referee Portal | School Portal |
|------|---------------|---------------|
| **Administrator** | Manage referees, Create assignments | Manage teams, coaches, players |
| **Primary User** | View assignments, Accept/Decline | View roster, stats, schedule |
| **Secondary User** | View availability, Update profile | Track progress, communicate |
| **Manager** | Assignor dashboard | Coach dashboard |

---

## Data Model Comparison

### Referee Portal Core Entities

```
Referee ──┬── Availability
          ├── Certifications
          └── Assignment History
              │
              └── Game
```

### School Portal Core Entities

```
Team ──┬── Players ──── Player Stats
       │               └── Game Stats
       ├── Coaches
       ├── Schedule (Games)
       └── Team Stats
```

---

## User Roles Comparison

### Referee Portal Roles

| Role | Permissions | Pages |
|------|------------|-------|
| **Super Admin** | Manage everything | All pages |
| **Assignor** | Create assignments, manage referees | Assignments, Referees, Games |
| **Referee** | View assignments, update availability | My Assignments, My Profile |
| **Viewer** | Read-only access | View only |

### School Portal Roles

| Role | Permissions | Pages |
|------|------------|-------|
| **Super Admin** | Manage everything | All pages |
| **Team Admin** | Manage team, roster, coaches | Team Management, Roster |
| **Head Coach** | Manage players, view stats | Roster, Stats, Schedule |
| **Assistant Coach** | View roster, limited edits | Roster (view), Schedule |
| **Player** | View own stats, team info | My Profile, Team Schedule |

---

## UI Component Comparison

### ✅ Shared Components (Reuse)

| Component | Use in Both | Notes |
|-----------|------------|-------|
| `LoginForm` | ✅ | Same auth system |
| `Navigation` | ✅ | Different menu items |
| `DataTable` | ✅ | Useful for lists |
| `Modal` | ✅ | Generic component |
| `Button` | ✅ | Generic component |
| `Form` | ✅ | Generic component |

### 🔴 Referee-Only Components

| Component | Purpose | Action |
|-----------|---------|--------|
| `AssignmentBoard` | Assignment drag-drop | ❌ Don't use |
| `RefereeCard` | Referee profile card | ❌ Don't use |
| `AvailabilityCalendar` | Referee availability | ❌ Don't use |
| `AssignmentMatchingEngine` | Auto-assignment | ❌ Don't use |

### 🟢 School-Only Components (Create)

| Component | Purpose | Priority |
|-----------|---------|----------|
| `PlayerCard` | Player profile card | 🔴 High |
| `CoachCard` | Coach profile card | 🔴 High |
| `RosterTable` | Team roster display | 🔴 High |
| `PlayerStatsChart` | Statistics visualization | 🟡 Medium |
| `TeamStatsChart` | Team statistics | 🟡 Medium |
| `PracticeScheduler` | Practice calendar | 🟢 Low |

---

## Recommended Implementation Order

### Phase 1: Foundation (Week 1)

```
1. Set up school project branch
2. Create basic database tables (players, coaches)
3. Set up environment with feature flags
4. Create basic API endpoints
```

### Phase 2: Core Features (Week 2-3)

```
5. Player management (CRUD)
6. Coach management (CRUD)
7. Team roster management
8. Basic team dashboard
9. Basic coach dashboard
10. Basic player dashboard
```

### Phase 3: Enhanced Features (Week 4)

```
11. Player statistics
12. Team statistics
13. Schedule view for teams
14. Player profile pages
15. Coach profile pages
```

### Phase 4: Polish (Week 5)

```
16. Team communications
17. Practice scheduling (if time)
18. Reports/analytics
19. Testing
20. Documentation
```

---

## Quick Reference: What to Focus On

### Must Have (Core Requirements) 🔴

- [ ] Player roster management
- [ ] Coach management
- [ ] Team dashboard
- [ ] Player profiles
- [ ] Coach profiles
- [ ] Team schedule view
- [ ] Basic statistics

### Should Have (Important but not critical) 🟡

- [ ] Player statistics tracking
- [ ] Team statistics
- [ ] Performance charts
- [ ] Team communications
- [ ] Search/filter functionality

### Nice to Have (If time permits) 🟢

- [ ] Practice scheduling
- [ ] Equipment tracking
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Notifications

---

## Decision Matrix

Use this to decide what to keep from the referee system:

| Feature/Code | Keep & Reuse | Adapt/Modify | Create New | Remove/Ignore |
|-------------|--------------|--------------|------------|---------------|
| Authentication | ✅ | | | |
| Database connection | ✅ | | | |
| User management | ✅ | ✅ | | |
| Teams table | ✅ | ✅ | | |
| Games table | ✅ | ✅ | | |
| Referees table | | | | ✅ |
| Assignments table | | | | ✅ |
| Roster management | | | ✅ | |
| Player stats | | | ✅ | |
| Assignment board | | | | ✅ |

---

## Summary

### For Your School Project:

**Keep:**
- Authentication system
- Database infrastructure
- Teams, Games, Leagues tables
- User management
- General UI components

**Disable/Ignore:**
- Referee profiles
- Assignment system
- Referee-specific tables
- Assignment board UI

**Create New:**
- Player management
- Coach management
- Enhanced team features
- Statistics tracking
- School-specific UI

**Approach:**
Use separate branch (`school/seng513-team-portal`) to keep your work isolated while reusing shared infrastructure.

---

*Use this document as a reference when deciding which parts of the codebase to use, modify, or ignore for your school project.*

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# git-workflow-instructions
This project uses git for version control. After making meaningful changes:
1. Always commit changes with descriptive commit messages
2. Use the format: Brief description + detailed explanation in commit body
3. Include "🤖 Generated with [Claude Code](https://claude.ai/code)" and "Co-Authored-By: Claude <noreply@anthropic.com>" in commit messages
4. Commit frequently - after completing features, bug fixes, or significant refactoring
5. Stage files with `git add` before committing
6. Use `git status` to check current state before committing

# database-schema-tracking
When making database schema changes (adding/removing tables, fields, relationships):
1. Document changes in `database-schema-changes.md` with date and description
2. Include affected tables/fields
3. An agent will update the database diagram every ~20 commits and clear this file

# project-status
✅ Initial setup complete with team/league restructuring
✅ Database schema migrated from JSON to proper entity relationships  
✅ Comprehensive unit tests created for new structure
✅ Git repository initialized and first commit made

# team-league-structure
The project has been restructured with proper entity relationships:
- **Leagues**: Organize teams by organization/age/gender/division/season
- **Teams**: Reusable entities that belong to specific leagues
- **Games**: Reference actual team IDs instead of JSON data
- **Benefits**: Better data integrity, performance, and query capabilities


Project Overview:

# Sports Management App – Development Notes

This document outlines the core features, design improvements, and pending decisions for the Referee Assignment and Sports League Management platform. The goal is to streamline assigning, scheduling, accounting, and league operations in an intuitive, mobile-compatible interface.

---

## Assignor View

### Games Table
- Improve table layout and spacing.
- Adjust column widths: Game # and Home Team currently take up excessive space.
- Vertical spacing is awkward; consider compacting rows or using cards.
- Remove "Select" button unless a future use case is defined.
- Card view for games is not rendering – investigate and restore if useful.

---

## Games Interface

- ✅ Add **Game Type** (e.g. Community, Club, Tournament, Private Tournament).
- Add support for **Evaluators/Mentors**:
  - Treated like referees in terms of game assignment.
  - Paid the full game fee.
  - Shown on the game details view as a distinct role.

---

## Referee Management

### Profile Fields
- Remove **Certifications**. Replace with **Roles**:
  - Roles are admin-defined (e.g. Referee, Evaluator, Mentor, Regional Lead).
- Eliminate "Preferred Positions".
- Update referee level system:
  - Replace "Elite", "Community", etc. with:
    - **Rookie**
    - **Junior**
    - **Senior**
  - For Rookie and Junior levels, add a **White Whistle** flag:
    - Display as a simple filled white whistle icon in their profile and assignments.

### Buttons
- Remove the "Select" button from referee lists if unused.

---

## Assigning Page

- **AI Assignment Suggestions**:
  - Use a lightweight LLM to suggest assignments based on:
    - Proximity, level, availability, comments, past games.
    - Allow user-defined assignment rules.
- **Repetition from Past Weeks**:
  - Automatically line up referees to repeat similar assignments as previous weeks (by day/location/time).
- **Game Chunks**:
  - Automatically group sequential games at the same location into a "Chunk".
  - Allow manual chunk creation/editing.
  - Include option for a **Lunch Break** between games (one-game gap).
  - LLM can help suggest optimal chunking.

---

## League Management

- Add filters for:
  - Game Type: Club, Community, Tournament, Private Tournament
  - Age Groups
  - Gender
  - Specific Teams

---

## Calendar View

- Show game days on calendar using colored highlights (similar to Google Calendar):
  - Colors based on game type (Community, Club, etc.)
- Display daily start/end time of games visually.
- Clicking on a day:
  - Switches to **List View** of games.
  - Ideal interface still under consideration (best practices research needed).
- Enable **drag-select** or **multi-select** days/games.
- Calendar Modes:
  - **Month View**, **Week View**, **Day View**
  - Data and counts should update dynamically as views change.

---

## Referee Profile Interface

- During registration, referees enter their **Postal Code**.
  - System calculates distances to facilities using:
    - **Google Maps API**
    - Or cheaper alternatives (Mapbox or OpenRouteService)
- **Calendar Sync**:
  - Provide referees a **Calendar Feed URL** (iCal format).
  - Consider open source options or hosted services (like CalDAV/iCal integration).
  - Evaluate if this can be installed via npm with a lightweight calendar-sharing library.

---

## Referee Availability

- Referees define their availability with flexible rules:
  - Date ranges
  - Days of the week
  - Specific time slots
- Referees can add **comments** to availability blocks:
  - Max # of games
  - Preferred locations
  - Preferred partners
  - Flexibility notes

*Backend support for this may already exist – confirm backend capabilities.*

---

## Accounting

### Referee View
- See current **pay period wage total**
- View **wage history** and **rate per game**
- View summary of games officiated per pay period

### Admin View
- See total payout by:
  - Pay Period
  - Referee
  - Game Type
  - League
- Filter and export data to **CSV/Excel**
- Useful for payroll, invoicing, or league audits

---

## Referee Calendar

- Each referee has a personalized calendar:
  - Views: Day / Week / Month
  - Shows only their assigned games

---

## Admin Dashboard

- Overview stats:
  - Total assigned games
  - Unassigned games
  - Number of turn backs / declined assignments
- Interactive modules TBD:
  - Charts, widgets, live notifications, etc.
- Can be enhanced as feature set grows

---

## Mobile Interface

- All features and views must be designed with **mobile-first** principles.
- Use responsive layouts and mobile-optimized controls.
- Avoid over-reliance on hover or complex multi-step UI interactions.

---

## Pending Questions

- Is there a preferred LLM backend for AI assignment suggestions?
- Should referees be allowed to request partners explicitly?
- Can we use an open calendar feed generator or should we build one?

---

## Notes

- Claude Code will be used for developing and iterating on the logic and workflows.
- This document can be imported or linked in Claude Code to serve as a system spec or working notes.

---

_Last updated: July 22, 2025_


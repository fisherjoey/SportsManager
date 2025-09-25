# Claude Assistant Instructions

## Version Control Guidelines

### Committing Changes
- Regularly commit changes after completing significant features or bug fixes
- Use descriptive commit messages that explain what was changed and why
- Commit before switching to a different feature or task
- If working on multiple unrelated changes, commit them separately

### Branch Management
- Create new feature branches when:
  - Starting work on a new feature
  - Making significant architectural changes
  - Working on experimental features
  - Fixing complex bugs that require multiple changes
- Branch naming convention: `feature/[description]` or `fix/[description]`
- Always ask before creating a new branch to ensure alignment with project workflow

## Testing Guidelines

### Games Management Page
- The games data comes from a PostgreSQL database with normalized structure
- Database uses `home_team_id` and `away_team_id` that reference the teams table
- Always test API endpoints directly when debugging data issues
- Frontend expects transformed data with nested team objects

## Common Commands

### Development
- Start backend: `cd backend && npm start` (may need DISABLE_REDIS=true)
- Start frontend: `npm run dev`
- Run tests: `npm test`

### Database
- Check database structure: Use custom scripts to verify table columns
- Games table has: id, home_team_id, away_team_id, date_time, field, etc.
- Teams table has: id, name, display_name, league_id, team_number

## Known Issues
- Backend may fail to start if Redis is not running - use DISABLE_REDIS=true
- Port conflicts may occur if both frontend and backend try to use the same port
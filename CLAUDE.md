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
# Agent Guidelines - Sports Management App

## 🎯 Mission Statement
All agents working on the Sports Management App must follow these guidelines to ensure code quality, testing standards, and deployment reliability.

## 📋 Before You Start Any Task

### 1. Read Required Documentation
- [ ] `QA-QC-PLAN.md` - Overall quality strategy
- [ ] `docs/TESTING-STANDARDS.md` - Detailed testing requirements
- [ ] `CLAUDE.md` - Feature roadmap and project status
- [ ] This document (`AGENT-GUIDELINES.md`)

### 2. Understand the Codebase
- [ ] Review the README files (main + backend)
- [ ] Examine existing test patterns
- [ ] Check current code structure
- [ ] Identify integration points

### 3. Plan Your Implementation
- [ ] Create a todo list using TodoWrite tool
- [ ] Identify required tests (unit, integration, E2E)
- [ ] Plan database changes (if any)
- [ ] Consider edge cases and error scenarios

## 🛠️ Development Workflow

### Step 1: Test-First Development
```bash
# 1. Write failing tests first
npm test -- --testNamePattern="your-feature"

# 2. Implement minimal code to pass
# 3. Refactor while keeping tests green
# 4. Add more comprehensive tests
```

### Step 2: Code Quality Checks
```bash
# Frontend
npm run lint
npm run build
npm test

# Backend  
cd backend
npm run lint
npm test
```

### Step 3: Integration Testing
- Test with real database connections
- Verify API endpoint integration
- Test frontend-backend communication

### Step 4: Git Workflow
```bash
# Before committing
git status
git add <files>

# Use conventional commit format
git commit -m "feat(games): add gameType filtering

- Add gameType column to database
- Update API endpoints with validation
- Add gameType dropdown to forms
- Include filtering in data table

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## ✅ Testing Requirements Checklist

### Backend Features
- [ ] **Unit Tests**: All functions and utilities (90% coverage)
- [ ] **Integration Tests**: API endpoints with database
- [ ] **Error Handling**: Invalid inputs, database failures
- [ ] **Validation Tests**: Joi schema validation
- [ ] **Authentication Tests**: Protected routes
- [ ] **Performance Tests**: Query optimization

### Frontend Features  
- [ ] **Component Tests**: React component rendering
- [ ] **User Interaction Tests**: Form submissions, clicks
- [ ] **State Management Tests**: Data flow
- [ ] **Error Boundary Tests**: Error handling
- [ ] **Accessibility Tests**: Screen reader compatibility

### Database Changes
- [ ] **Migration Tests**: Up and down migrations
- [ ] **Rollback Safety**: Test migration rollbacks
- [ ] **Data Integrity**: Constraint validation
- [ ] **Performance**: Index effectiveness

## 🚨 Quality Gates - DO NOT PROCEED WITHOUT PASSING

### Automated Gates (CI/CD)
1. **Linting**: Zero errors, warnings < 10
2. **Type Checking**: Zero TypeScript errors
3. **Unit Tests**: 80% coverage minimum
4. **Integration Tests**: All API endpoints tested
5. **Security Audit**: No high/critical vulnerabilities
6. **Build Success**: Frontend builds without errors

### Manual Review Gates
1. **Code Review**: 2 approvals required
2. **Feature Testing**: Manual verification of functionality
3. **Database Review**: Schema changes approved
4. **Performance Review**: No significant degradation

## 📝 Code Standards

### TypeScript/JavaScript
```typescript
// ✅ GOOD - Proper typing and error handling
interface GameRequest {
  gameType: 'Community' | 'Club' | 'Tournament' | 'Private Tournament';
  homeTeam: Team;
  awayTeam: Team;
}

async function createGame(data: GameRequest): Promise<ApiResponse<Game>> {
  try {
    const result = await gameService.create(data);
    return { success: true, data: result };
  } catch (error) {
    logger.error('Game creation failed:', error);
    return { success: false, error: 'Failed to create game' };
  }
}

// ❌ BAD - No typing, poor error handling
function createGame(data) {
  const result = gameService.create(data);
  return result;
}
```

### Database Operations
```javascript
// ✅ GOOD - Transaction safety
async function createGameWithAssignments(gameData, assignments) {
  const trx = await db.transaction();
  try {
    const game = await trx('games').insert(gameData).returning('*');
    await trx('game_assignments').insert(
      assignments.map(a => ({ ...a, game_id: game[0].id }))
    );
    await trx.commit();
    return game[0];
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

// ❌ BAD - No transaction safety
async function createGameWithAssignments(gameData, assignments) {
  const game = await db('games').insert(gameData).returning('*');
  await db('game_assignments').insert(assignments);
  return game[0];
}
```

### React Components
```tsx
// ✅ GOOD - Proper typing and error boundaries
interface GameFormProps {
  onSubmit: (data: GameData) => Promise<void>;
  initialData?: Partial<GameData>;
}

export function GameForm({ onSubmit, initialData }: GameFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: GameData) => {
    try {
      setLoading(true);
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (error) return <ErrorBoundary error={error} />;
  return <form onSubmit={handleSubmit}>...</form>;
}

// ❌ BAD - No error handling or typing
export function GameForm({ onSubmit }) {
  return <form onSubmit={onSubmit}>...</form>;
}
```

## 🔧 Required Tools & Commands

### Setup Commands (Run Once)
```bash
# Install dependencies
npm ci
cd backend && npm ci

# Setup database
cd backend && npm run migrate && npm run seed

# Setup git hooks
npx husky install
```

### Daily Development Commands
```bash
# Start development
npm run dev              # Frontend
cd backend && npm run dev # Backend

# Run tests
npm test                 # Frontend tests
npm run test:watch       # Watch mode
cd backend && npm test   # Backend tests

# Quality checks
npm run lint
npm run build
cd backend && npm run lint
```

### Pre-commit Commands (Mandatory)
```bash
# Run full test suite
npm test && cd backend && npm test

# Check code quality
npm run lint && cd backend && npm run lint

# Verify build
npm run build
```

## 🚀 Deployment Guidelines

### Staging Deployment (develop branch)
- Triggered automatically on push to `develop`
- Runs full test suite
- Deploys to staging environment
- Runs smoke tests post-deployment

### Production Deployment (main branch)
- Requires manual approval
- Full security audit
- Zero-downtime deployment strategy
- Comprehensive health checks
- Automatic rollback on failure

## 🆘 Troubleshooting Guide

### Common Issues

#### "Tests failing in CI but passing locally"
- Check environment variables
- Verify database connection
- Review CI logs for specific errors
- Ensure test isolation (no shared state)

#### "Database migration errors"
- Test rollback safety: `npx knex migrate:rollback`
- Check for constraint violations
- Verify seed data compatibility
- Review migration dependencies

#### "Build failures"
- Clear cache: `rm -rf .next node_modules && npm ci`
- Check TypeScript errors: `npx tsc --noEmit`
- Verify import paths
- Check environment variable usage

#### "Linting errors"
- Auto-fix: `npm run lint -- --fix`
- Review `.eslintrc.js` configuration
- Check for banned patterns
- Verify import organization

### Getting Help
1. **Check existing tests** for similar patterns
2. **Review documentation** in `/docs/` directory
3. **Examine CI logs** for specific error details
4. **Ask for code review** if unsure about approach

## 📊 Success Metrics

### Code Quality Metrics
- **Test Coverage**: Maintain >80% overall, >90% for critical paths
- **Build Success Rate**: >98% in CI/CD
- **Security Vulnerabilities**: Zero high/critical
- **Performance**: API responses <500ms

### Process Metrics
- **Code Review Time**: <24 hours average
- **Bug Escape Rate**: <5% to production
- **Deployment Frequency**: Daily to staging, weekly to production
- **Mean Time to Recovery**: <1 hour

## 🎯 Agent Success Checklist

Before marking any task as complete:
- [ ] All tests pass locally and in CI
- [ ] Code coverage meets thresholds
- [ ] No linting errors or warnings
- [ ] TypeScript compilation succeeds
- [ ] Manual testing completed
- [ ] Database migrations tested (if applicable)
- [ ] Security considerations reviewed
- [ ] Performance impact assessed
- [ ] Documentation updated (if needed)
- [ ] Git commit follows conventions
- [ ] Code review requested

## 📞 Escalation Path

### When to Escalate
- **Failing CI/CD** for >2 hours
- **Security vulnerabilities** discovered
- **Database migration issues** in production
- **Performance degradation** >20%
- **Breaking changes** affecting other agents

### How to Escalate
1. **Document the issue** with logs and screenshots
2. **Tag relevant team members** in GitHub issues
3. **Provide context** about what you've tried
4. **Suggest potential solutions** if possible

---

**Remember**: Quality is everyone's responsibility. These guidelines exist to ensure we deliver reliable, maintainable software that serves our users effectively.

*Last Updated: January 2025*
*Version: 1.0*
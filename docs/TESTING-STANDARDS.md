# Testing Standards for Agents

## 🎯 Overview
This document provides specific testing standards, templates, and examples that all agents must follow when contributing to the Sports Management App.

## 📋 Pre-Development Checklist

Before starting any feature, agents must:
- [ ] Read and understand the feature requirements
- [ ] Create a test plan with expected behaviors
- [ ] Set up test data requirements
- [ ] Identify edge cases and error scenarios
- [ ] Plan integration points with existing code

## 🧪 Test Categories & Requirements

### 1. Unit Tests (Mandatory)
**Coverage Requirement**: 90% minimum
**Location**: Same directory as source files with `.test.js` suffix

```javascript
// backend/src/routes/games.test.js
describe('Games API Routes', () => {
  describe('POST /api/games', () => {
    it('should create game with valid data', async () => {
      const gameData = {
        homeTeam: { organization: 'Calgary', ageGroup: 'U15', gender: 'Boys', rank: 1 },
        awayTeam: { organization: 'Okotoks', ageGroup: 'U15', gender: 'Boys', rank: 2 },
        date: '2025-02-01',
        time: '19:00',
        location: 'Arena 1',
        postalCode: 'T2P1A1',
        level: 'Competitive',
        gameType: 'Club',
        division: 'U15 Division 1',
        season: 'Winter 2025',
        payRate: 75.00
      };

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gameData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game.gameType).toBe('Club');
      expect(response.body.data.game.id).toBeDefined();
    });

    it('should reject invalid gameType', async () => {
      const invalidData = { /* valid data */, gameType: 'InvalidType' };
      
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('gameType');
    });

    it('should default to Community gameType when not provided', async () => {
      const dataWithoutGameType = { /* valid data without gameType */ };
      
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dataWithoutGameType)
        .expect(201);

      expect(response.body.data.game.gameType).toBe('Community');
    });
  });
});
```

### 2. Integration Tests (Required for API endpoints)
**Purpose**: Test complete request/response cycles with database

```javascript
// backend/tests/integration/games-integration.test.js
describe('Games Integration Tests', () => {
  beforeEach(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  afterEach(async () => {
    await db.migrate.rollback();
  });

  it('should create game and retrieve it with filtering', async () => {
    // Create game
    const createResponse = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(gameData);

    const gameId = createResponse.body.data.game.id;

    // Retrieve with filter
    const filterResponse = await request(app)
      .get('/api/games?game_type=Club')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const foundGame = filterResponse.body.data.games.find(g => g.id === gameId);
    expect(foundGame).toBeDefined();
    expect(foundGame.gameType).toBe('Club');
  });
});
```

### 3. Frontend Component Tests (Required for UI components)

```jsx
// components/__tests__/GameForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameForm } from '../GameForm';

describe('GameForm Component', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all form fields including gameType', () => {
    render(<GameForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Community')).toBeInTheDocument(); // default value
  });

  it('should submit form with selected gameType', async () => {
    const user = userEvent.setup();
    render(<GameForm onSubmit={mockOnSubmit} />);

    // Fill form
    await user.type(screen.getByLabelText(/home team/i), 'Calgary U15 Boys 1');
    await user.type(screen.getByLabelText(/away team/i), 'Okotoks U15 Boys 1');
    await user.selectOptions(screen.getByLabelText(/game type/i), 'Tournament');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /create game/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'Tournament'
        })
      );
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<GameForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /create game/i }));

    expect(screen.getByText(/home team is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

### 4. End-to-End Tests (Required for critical user flows)

```javascript
// cypress/e2e/game-management.cy.js
describe('Game Management E2E', () => {
  beforeEach(() => {
    cy.login('admin@refassign.com', 'password');
    cy.visit('/admin/games');
  });

  it('should create and filter games by type', () => {
    // Create game
    cy.get('[data-testid="create-game-button"]').click();
    cy.get('[data-testid="home-team-input"]').type('Calgary U15 Boys 1');
    cy.get('[data-testid="away-team-input"]').type('Okotoks U15 Boys 1');
    cy.get('[data-testid="game-type-select"]').select('Tournament');
    cy.get('[data-testid="submit-button"]').click();

    // Verify creation
    cy.contains('Game created successfully').should('be.visible');

    // Filter by game type
    cy.get('[data-testid="game-type-filter"]').select('Tournament');
    cy.get('[data-testid="games-table"]')
      .should('contain', 'Calgary U15 Boys 1')
      .should('contain', 'Tournament');
  });
});
```

## 🔧 Test Setup Requirements

### Database Test Setup
```javascript
// tests/setup.js - Required for all database tests
const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.test);

beforeAll(async () => {
  await db.migrate.latest();
});

beforeEach(async () => {
  await db.seed.run();
});

afterEach(async () => {
  // Clean up test data
  await db.raw('TRUNCATE TABLE games, game_assignments, referees CASCADE');
});

afterAll(async () => {
  await db.destroy();
});

module.exports = db;
```

### Mock Data Standards
```javascript
// tests/fixtures/gameData.js
export const validGameData = {
  homeTeam: {
    organization: 'Calgary',
    ageGroup: 'U15',
    gender: 'Boys',
    rank: 1
  },
  awayTeam: {
    organization: 'Okotoks', 
    ageGroup: 'U15',
    gender: 'Boys',
    rank: 2
  },
  date: '2025-02-01',
  time: '19:00',
  location: 'Test Arena',
  postalCode: 'T2P1A1',
  level: 'Competitive',
  gameType: 'Community',
  division: 'U15 Division 1',
  season: 'Winter 2025',
  payRate: 75.00
};

export const gameTypeVariations = [
  { ...validGameData, gameType: 'Community' },
  { ...validGameData, gameType: 'Club' },
  { ...validGameData, gameType: 'Tournament' },
  { ...validGameData, gameType: 'Private Tournament' }
];
```

## 🚨 Error Testing Requirements

### API Error Scenarios (Mandatory for all endpoints)
```javascript
describe('Error Handling', () => {
  it('should handle database connection errors', async () => {
    // Mock database failure
    jest.spyOn(db, 'insert').mockRejectedValue(new Error('Connection failed'));

    const response = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validGameData)
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Internal server error');
  });

  it('should handle validation errors gracefully', async () => {
    const invalidData = { ...validGameData, gameType: null };

    const response = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body.error).toContain('gameType');
  });
});
```

## 📊 Performance Testing Requirements

### Database Query Performance
```javascript
describe('Performance Tests', () => {
  it('should retrieve games with filtering in under 100ms', async () => {
    // Create 1000 test games
    const games = Array.from({ length: 1000 }, (_, i) => ({
      ...validGameData,
      homeTeam: { ...validGameData.homeTeam, rank: i },
      gameType: ['Community', 'Club', 'Tournament'][i % 3]
    }));
    
    await db('games').insert(games);

    const startTime = Date.now();
    
    const response = await request(app)
      .get('/api/games?game_type=Club&limit=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(100);
    expect(response.body.data.games.length).toBeLessThanOrEqual(50);
  });
});
```

## 🔍 Test Quality Gates

### Coverage Requirements
```json
// jest.config.js - Coverage thresholds
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "./backend/src/routes/": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

### Test Naming Conventions
```javascript
// ✅ GOOD - Descriptive test names
describe('GameType API', () => {
  describe('when creating a game', () => {
    it('should create game with Community type when not specified', () => {});
    it('should reject creation with invalid gameType value', () => {});
    it('should accept all valid gameType values', () => {});
  });
  
  describe('when filtering games', () => {
    it('should return only Community games when filtered by Community', () => {});
    it('should return empty array when no games match filter', () => {});
  });
});

// ❌ BAD - Vague test names  
describe('games', () => {
  it('should work', () => {});
  it('test game creation', () => {});
});
```

## 🛠️ Testing Tools & Commands

### Required NPM Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "cypress run"
  }
}
```

### Git Hooks for Testing
```bash
# .husky/pre-commit
#!/bin/sh
npm run test:unit
npm run lint
```

```bash
# .husky/pre-push  
#!/bin/sh
npm run test
npm run test:integration
```

## 🎓 Common Testing Patterns

### Testing Async Operations
```javascript
// ✅ GOOD - Proper async testing
it('should create game asynchronously', async () => {
  const promise = gameService.createGame(validGameData);
  
  await expect(promise).resolves.toMatchObject({
    success: true,
    data: expect.objectContaining({
      gameType: 'Community'
    })
  });
});

// ❌ BAD - Missing await
it('should create game', () => {
  const result = gameService.createGame(validGameData);
  expect(result.success).toBe(true); // This will fail
});
```

### Testing Database Transactions
```javascript
it('should rollback on error', async () => {
  const invalidData = { ...validGameData, level: null };
  
  await expect(gameService.createGame(invalidData)).rejects.toThrow();
  
  // Verify no partial data was saved
  const games = await db('games').where('location', validGameData.location);
  expect(games).toHaveLength(0);
});
```

## 📝 Test Documentation Requirements

Every test file must include:
```javascript
/**
 * @fileoverview Tests for Game Type functionality
 * @requires supertest
 * @requires ../setup
 * 
 * Test Coverage:
 * - Game creation with gameType
 * - Game filtering by gameType  
 * - Validation of gameType values
 * - Default gameType behavior
 * 
 * @author Agent Name
 * @date 2025-01-XX
 */
```

## ✅ Agent Testing Checklist

Before committing code, verify:
- [ ] All new functions have unit tests
- [ ] API endpoints have integration tests
- [ ] UI components have component tests
- [ ] Critical user flows have E2E tests
- [ ] Error scenarios are tested
- [ ] Performance requirements are met
- [ ] Test coverage meets thresholds
- [ ] Tests pass in CI environment
- [ ] No flaky tests (run 3 times locally)
- [ ] Test data is properly cleaned up

## 🆘 Getting Help

- **Stuck on testing**: Check existing test examples in `/tests/` directory
- **CI failures**: Review GitHub Actions logs and test outputs
- **Coverage issues**: Use `npm run test:coverage` to identify gaps
- **Mocking problems**: See `/tests/mocks/` for examples

---

*This document must be followed by all agents. Exceptions require approval from the QA team lead.*
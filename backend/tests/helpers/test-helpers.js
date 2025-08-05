/**
 * @fileoverview Test Helper Functions
 * Utilities for creating test data, tokens, and common test setup
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');

/**
 * Creates a JWT token for testing
 * @param {Object} payload - Token payload
 * @param {string} secret - JWT secret (defaults to test secret)
 * @param {Object} options - JWT options
 * @returns {string} JWT token
 */
function createAuthToken(payload, secret = 'test-secret-key', options = { expiresIn: '1h' }) {
  return jwt.sign(payload, secret, options);
}

/**
 * Creates admin auth token
 * @returns {string} Admin JWT token
 */
function createAdminToken() {
  return createAuthToken({
    userId: 'admin-123',
    email: 'admin@test.com',
    role: 'admin',
    roles: ['admin']
  });
}

/**
 * Creates referee auth token
 * @returns {string} Referee JWT token
 */
function createRefereeToken() {
  return createAuthToken({
    userId: 'referee-123',
    email: 'referee@test.com',
    role: 'referee',
    roles: ['referee']
  });
}

/**
 * Creates a test Express app with common middleware
 * @param {Object} routes - Routes to add to the app
 * @returns {Object} Express app
 */
function createTestApp(routes = {}) {
  const app = express();
  app.use(express.json());
  
  // Add auth middleware mock
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, 'test-secret-key');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  });

  // Add routes
  Object.keys(routes).forEach(path => {
    app.use(path, routes[path]);
  });

  return app;
}

/**
 * Creates test user data
 * @param {Object} overrides - Fields to override
 * @returns {Object} User data
 */
function createTestUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: bcrypt.hashSync('password123', 12),
    role: 'referee',
    name: 'Test User',
    phone: '(555) 123-4567',
    location: 'Test City',
    postal_code: 'T1S 1A1',
    max_distance: 25,
    is_available: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Creates test game data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Game data
 */
function createTestGame(overrides = {}) {
  return {
    id: 'game-123',
    home_team_id: 'team-1',
    away_team_id: 'team-2',
    game_date: '2024-12-01',
    game_time: '14:00:00',
    location: 'Test Stadium',
    postal_code: 'T1S 1A1',
    level: 'Recreational',
    status: 'unassigned',
    refs_needed: 2,
    wage_multiplier: 1.0,
    game_type: 'Community',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Creates test team data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Team data
 */
function createTestTeam(overrides = {}) {
  return {
    id: 'team-123',
    name: 'Test Team',
    location: 'Test Stadium',
    league_id: 'league-123',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Creates test league data
 * @param {Object} overrides - Fields to override
 * @returns {Object} League data
 */
function createTestLeague(overrides = {}) {
  return {
    id: 'league-123',
    organization: 'Test Organization',
    age_group: 'U15',
    gender: 'Boys',
    division: 'Division 1',
    season: '2024/25',
    level: 'Competitive',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Creates test assignment data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Assignment data
 */
function createTestAssignment(overrides = {}) {
  return {
    id: 'assignment-123',
    game_id: 'game-123',
    referee_id: 'referee-123',
    position_id: 'position-123',
    status: 'pending',
    calculated_wage: 45.00,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Creates test position data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Position data
 */
function createTestPosition(overrides = {}) {
  return {
    id: 'position-123',
    name: 'Referee 1',
    description: 'Primary Referee',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Creates test referee level data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Referee level data
 */
function createTestRefereeLevel(overrides = {}) {
  return {
    id: 'level-123',
    name: 'Recreational',
    wage_amount: 45.00,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Creates a complete test data set with relationships
 * @returns {Object} Complete test data
 */
function createTestData() {
  const refereeLevel = createTestRefereeLevel();
  const league = createTestLeague();
  const team1 = createTestTeam({ id: 'team-1', name: 'Team Alpha' });
  const team2 = createTestTeam({ id: 'team-2', name: 'Team Beta' });
  const game = createTestGame({
    home_team_id: team1.id,
    away_team_id: team2.id
  });
  const admin = createTestUser({
    id: 'admin-123',
    email: 'admin@test.com',
    role: 'admin'
  });
  const referee = createTestUser({
    id: 'referee-123',
    email: 'referee@test.com',
    role: 'referee',
    referee_level_id: refereeLevel.id
  });
  const position = createTestPosition();
  const assignment = createTestAssignment({
    game_id: game.id,
    referee_id: referee.id,
    position_id: position.id
  });

  return {
    refereeLevel,
    league,
    teams: [team1, team2],
    game,
    users: [admin, referee],
    position,
    assignment
  };
}

/**
 * Creates mock database response for successful operations
 * @param {*} data - Data to return
 * @returns {Object} Mock database response
 */
function createMockDbResponse(data) {
  return {
    rows: Array.isArray(data) ? data : [data],
    rowCount: Array.isArray(data) ? data.length : 1
  };
}

/**
 * Creates mock database error
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {Error} Mock database error
 */
function createMockDbError(message, code = '42000') {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Common test validation patterns
 */
const ValidationPatterns = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TIME: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  POSTAL_CODE: /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/
};

/**
 * Common test data generators
 */
const Generators = {
  uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }),
  
  email: (prefix = 'test') => `${prefix}+${Date.now()}@example.com`,
  
  phoneNumber: () => `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
  
  postalCode: () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    return `${letters[Math.floor(Math.random() * letters.length)]}${numbers[Math.floor(Math.random() * numbers.length)]}${letters[Math.floor(Math.random() * letters.length)]} ${numbers[Math.floor(Math.random() * numbers.length)]}${letters[Math.floor(Math.random() * letters.length)]}${numbers[Math.floor(Math.random() * numbers.length)]}`;
  },
  
  futureDate: (daysFromNow = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow));
    return date.toISOString().split('T')[0];
  },
  
  gameTime: () => {
    const hours = Math.floor(Math.random() * 12) + 8; // 8 AM to 7 PM
    const minutes = Math.random() < 0.5 ? '00' : '30';
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
};

/**
 * Common assertions for tests
 */
const Assertions = {
  isValidUUID: (value) => ValidationPatterns.UUID.test(value),
  isValidEmail: (value) => ValidationPatterns.EMAIL.test(value),
  isValidTime: (value) => ValidationPatterns.TIME.test(value),
  isValidDate: (value) => ValidationPatterns.DATE.test(value),
  isValidPostalCode: (value) => ValidationPatterns.POSTAL_CODE.test(value),
  
  hasRequiredGameFields: (game) => {
    const required = ['id', 'home_team_id', 'away_team_id', 'game_date', 'game_time', 'location', 'level', 'status'];
    return required.every(field => game.hasOwnProperty(field) && game[field] !== null);
  },
  
  hasRequiredUserFields: (user) => {
    const required = ['id', 'email', 'role', 'created_at', 'updated_at'];
    return required.every(field => user.hasOwnProperty(field) && user[field] !== null);
  }
};

/**
 * Edge case test data generators
 */
const EdgeCases = {
  // Long strings at various limits
  longString: (length) => 'A'.repeat(length),
  
  // Unicode test strings
  unicodeStrings: [
    'Malmö FF', // Swedish
    '北京国安', // Chinese
    'Спартак', // Russian
    'São Paulo', // Portuguese
    'Montréal', // French
    '😀⚽🏆' // Emojis
  ],
  
  // Special characters that might cause issues
  specialCharacters: [
    'O\'Reilly FC', // Apostrophe
    'Team "Quotes"', // Quotes
    'Team & Co.', // Ampersand
    'Team <Tag>', // HTML-like
    'Team; DROP TABLE', // SQL injection attempt
    'Team\nNewline', // Newline
    'Team\tTab' // Tab
  ],
  
  // Boundary values
  boundaries: {
    wageMultiplier: {
      min: 0.1,
      max: 5.0,
      invalid: [-1, 0, 10.0]
    },
    refsNeeded: {
      min: 1,
      max: 10,
      invalid: [0, -1, 15]
    },
    maxDistance: {
      min: 1,
      max: 200,
      invalid: [0, -1, 500]
    }
  }
};

module.exports = {
  createAuthToken,
  createAdminToken,
  createRefereeToken,
  createTestApp,
  createTestUser,
  createTestGame,
  createTestTeam,
  createTestLeague,
  createTestAssignment,
  createTestPosition,
  createTestRefereeLevel,
  createTestData,
  createMockDbResponse,
  createMockDbError,
  ValidationPatterns,
  Generators,
  Assertions,
  EdgeCases
};
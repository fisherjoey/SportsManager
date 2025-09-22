/**
 * @file ai-suggestions.test.ts
 * @description Comprehensive tests for AI suggestions route
 */

import request from 'supertest';
import express, { Express } from 'express';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock all dependencies first to avoid circular dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarning: jest.fn()
  }
}));

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn(),
  requireRole: jest.fn()
}));

jest.mock('../../services/aiServices', () => ({}));
jest.mock('../../utils/batching', () => ({}));
jest.mock('../../utils/security', () => ({
  generateRequestId: jest.fn()
}));

// Now import the route after mocking
import aiSuggestionsRoute from '../ai-suggestions';

const mockAuth = require('../../middleware/auth');
const mockDatabase = require('../../config/database');
const mockSecurity = require('../../utils/security');

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-suggestions', aiSuggestionsRoute);
  return app;
}

describe('AI Suggestions Route', () => {
  let app: Express;
  let testUser: any;
  let testGame: any;
  let testReferee: any;

  beforeEach(async () => {
    // Create test app
    app = createTestApp();

    // Mock authentication
    mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = { userId: 'test-user-id', role: 'admin' };
      next();
    });

    mockAuth.requireRole.mockImplementation((role: string) => (req: any, res: any, next: any) => next());

    // Mock security functions
    mockSecurity.generateRequestId.mockReturnValue('test-request-id');

    // Setup test data
    testUser = {
      userId: 'test-user-id',
      role: 'admin'
    };

    testGame = {
      id: 'game-1',
      game_date: '2024-01-15',
      game_time: '10:00:00',
      location: 'Test Arena',
      postal_code: 'M5V 3A8',
      level: 'Senior',
      home_team_id: 'team-1',
      away_team_id: 'team-2'
    };

    testReferee = {
      id: 'referee-1',
      user_id: 'user-1',
      name: 'John Doe',
      postal_code: 'M5V 3B2',
      level: 'Senior',
      is_available: true
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ai-suggestions - Generate suggestions', () => {
    test('should generate AI suggestions successfully', async () => {
      // Mock database queries for the full flow
      mockDatabase.pool.query
        .mockResolvedValueOnce({
          rows: [testGame] // Games query
        })
        .mockResolvedValueOnce({
          rows: [] // Conflicting assignments
        })
        .mockResolvedValueOnce({
          rows: [] // Daily workload conflicts
        })
        .mockResolvedValueOnce({
          rows: [] // Weekly workload conflicts
        })
        .mockResolvedValueOnce({
          rows: [] // Unavailable referees
        })
        .mockResolvedValueOnce({
          rows: [testReferee] // Available referees
        })
        .mockResolvedValue({
          rows: [] // All other queries
        });

      const requestBody = {
        game_ids: [testGame.id],
        factors: {
          proximity_weight: 0.3,
          availability_weight: 0.4,
          experience_weight: 0.2,
          performance_weight: 0.1
        }
      };

      const response = await request(app)
        .post('/api/ai-suggestions')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.generated_count).toBeGreaterThanOrEqual(0);
      expect(response.body.data.request_id).toBe('test-request-id');
    });

    test('should validate request body', async () => {
      const invalidBody = {
        game_ids: [], // Invalid: empty array
        factors: {
          proximity_weight: 1.5 // Invalid: > 1
        }
      };

      const response = await request(app)
        .post('/api/ai-suggestions')
        .send(invalidBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('game_ids');
    });

    test('should handle missing games', async () => {
      // Mock empty games result
      mockDatabase.pool.query.mockResolvedValueOnce({
        rows: []
      });

      const requestBody = {
        game_ids: ['non-existent-game'],
        factors: {}
      };

      const response = await request(app)
        .post('/api/ai-suggestions')
        .send(requestBody)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No games found for the provided IDs');
    });
  });

  describe('GET /api/ai-suggestions - Retrieve suggestions', () => {
    test('should retrieve suggestions with default pagination', async () => {
      const mockSuggestions = [{
        id: 'suggestion-1',
        game_id: testGame.id,
        referee_id: testReferee.id,
        confidence_score: 0.85,
        reasoning: 'Test reasoning',
        proximity_score: 0.9,
        availability_score: 0.8,
        experience_score: 0.9,
        performance_score: 0.8,
        historical_bonus: 0.1,
        status: 'pending',
        created_at: new Date(),
        game_date: testGame.game_date,
        game_time: testGame.game_time,
        location: testGame.location,
        level: testGame.level,
        home_team: 'Team A',
        away_team: 'Team B',
        referee_name: testReferee.name,
        referee_level: testReferee.level,
        referee_postal_code: testReferee.postal_code
      }];

      mockDatabase.pool.query
        .mockResolvedValueOnce({
          rows: mockSuggestions // Suggestions query
        })
        .mockResolvedValueOnce({
          rows: [{ total: '1' }] // Count query
        });

      const response = await request(app)
        .get('/api/ai-suggestions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      });
    });

    test('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/ai-suggestions?page=-1&limit=1000')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('page');
    });
  });

  describe('PUT /api/ai-suggestions/:id/accept - Accept suggestion', () => {
    test('should accept suggestion and create assignment', async () => {
      const suggestionId = 'suggestion-1';
      const mockSuggestion = {
        id: suggestionId,
        game_id: testGame.id,
        referee_id: testReferee.id,
        status: 'pending'
      };

      const mockAssignment = {
        id: 'assignment-1',
        game_id: testGame.id,
        user_id: testReferee.id,
        status: 'pending',
        assigned_at: new Date()
      };

      mockDatabase.pool.query
        .mockResolvedValueOnce({
          rows: [mockSuggestion] // Get suggestion
        })
        .mockResolvedValueOnce({
          rows: [] // Check existing assignment
        })
        .mockResolvedValueOnce({
          rows: [] // BEGIN transaction
        })
        .mockResolvedValueOnce({
          rows: [mockAssignment] // Insert assignment
        })
        .mockResolvedValueOnce({
          rows: [] // Update suggestion
        })
        .mockResolvedValueOnce({
          rows: [] // COMMIT transaction
        });

      const response = await request(app)
        .put(`/api/ai-suggestions/${suggestionId}/accept`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignment).toMatchObject({
        id: expect.any(String),
        game_id: testGame.id,
        referee_id: testReferee.id,
        status: 'pending'
      });
      expect(response.body.message).toBe('AI suggestion accepted and assignment created');
    });

    test('should handle non-existent suggestion', async () => {
      mockDatabase.pool.query.mockResolvedValueOnce({
        rows: [] // No suggestion found
      });

      const response = await request(app)
        .put('/api/ai-suggestions/non-existent/accept')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Suggestion not found');
    });
  });

  describe('PUT /api/ai-suggestions/:id/reject - Reject suggestion', () => {
    test('should reject suggestion with reason', async () => {
      const suggestionId = 'suggestion-1';
      const rejectionReason = 'Referee requested time off';

      mockDatabase.pool.query.mockResolvedValueOnce({
        rows: [{ id: suggestionId }] // Successful update
      });

      const response = await request(app)
        .put(`/api/ai-suggestions/${suggestionId}/reject`)
        .send({ reason: rejectionReason })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('AI suggestion rejected');
    });

    test('should validate rejection reason length', async () => {
      const suggestionId = 'suggestion-1';
      const longReason = 'x'.repeat(501); // Exceeds 500 character limit

      const response = await request(app)
        .put(`/api/ai-suggestions/${suggestionId}/reject`)
        .send({ reason: longReason })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('500');
    });
  });

  describe('Security and Authentication', () => {
    test('should require authentication', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/api/ai-suggestions')
        .send({ game_ids: [testGame.id] })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should require admin role', async () => {
      mockAuth.requireRole.mockImplementation((role: string) => (req: any, res: any, next: any) => {
        if (req.user.role !== 'admin') {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        next();
      });

      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id', role: 'user' };
        next();
      });

      const response = await request(app)
        .post('/api/ai-suggestions')
        .send({ game_ids: [testGame.id] })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Mock database error
      mockDatabase.pool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/ai-suggestions')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
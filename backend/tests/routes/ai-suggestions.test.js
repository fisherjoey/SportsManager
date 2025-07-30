const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');

describe('AI Suggestions Routes', () => {
  let adminToken, refereeToken, gameId, refereeUserId;

  beforeEach(async () => {
    // Get admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@refassign.com',
        password: 'password'
      });
    adminToken = adminLogin.body.data.token;

    // Get referee token and user ID
    const refereeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mike@referee.com',
        password: 'password'
      });
    refereeToken = refereeLogin.body.data.token;
    refereeUserId = refereeLogin.body.data.user.id;

    // Get an unassigned game ID
    const gamesResponse = await request(app)
      .get('/api/games?status=unassigned')
      .set('Authorization', `Bearer ${adminToken}`);
    gameId = gamesResponse.body.data.games[0]?.id;
  });

  describe('POST /api/assignments/ai-suggestions', () => {
    it('should generate AI suggestions for admin', async () => {
      const response = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: [gameId],
          factors: {
            proximity_weight: 0.3,
            availability_weight: 0.4,
            experience_weight: 0.2,
            performance_weight: 0.1
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);

      const suggestion = response.body.data.suggestions[0];
      expect(suggestion).toHaveProperty('id');
      expect(suggestion).toHaveProperty('game_id');
      expect(suggestion).toHaveProperty('referee_id');
      expect(suggestion).toHaveProperty('confidence_score');
      expect(suggestion).toHaveProperty('reasoning');
      expect(suggestion).toHaveProperty('factors');
      expect(suggestion.factors).toHaveProperty('proximity');
      expect(suggestion.factors).toHaveProperty('availability');
      expect(suggestion.factors).toHaveProperty('experience');
      expect(suggestion.factors).toHaveProperty('past_performance');

      // Confidence should be between 0 and 1
      expect(suggestion.confidence_score).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence_score).toBeLessThanOrEqual(1);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          game_ids: [gameId]
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('admin');
    });

    it('should validate game_ids parameter', async () => {
      const response = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('game_ids');
    });

    it('should handle empty game_ids array', async () => {
      const response = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least one game');
    });

    it('should handle invalid game IDs', async () => {
      const response = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: ['invalid-game-id']
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Game not found');
    });

    it('should accept custom factor weights', async () => {
      const customWeights = {
        proximity_weight: 0.5,
        availability_weight: 0.3,
        experience_weight: 0.15,
        performance_weight: 0.05
      };

      const response = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: [gameId],
          factors: customWeights
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
    });

    it('should filter out already assigned games', async () => {
      // First assign the referee to the game
      await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: gameId,
          user_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      const response = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: [gameId]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should have no suggestions for already assigned game
      expect(response.body.data.suggestions.length).toBe(0);
    });
  });

  describe('PUT /api/assignments/ai-suggestions/:id/accept', () => {
    let suggestionId;

    beforeEach(async () => {
      // Generate AI suggestions first
      const suggestionsResponse = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: [gameId]
        });
      
      suggestionId = suggestionsResponse.body.data.suggestions[0]?.id;
    });

    it('should accept AI suggestion and create assignment', async () => {
      const response = await request(app)
        .put(`/api/assignments/ai-suggestions/${suggestionId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignment).toBeDefined();
      expect(response.body.data.assignment.game_id).toBe(gameId);

      // Verify assignment was created
      const assignmentCheck = await db('game_assignments')
        .where({ game_id: gameId })
        .first();
      expect(assignmentCheck).toBeDefined();
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .put(`/api/assignments/ai-suggestions/${suggestionId}/accept`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid suggestion ID', async () => {
      const response = await request(app)
        .put('/api/assignments/ai-suggestions/invalid-id/accept')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Suggestion not found');
    });

    it('should prevent accepting expired suggestions', async () => {
      // Mark suggestion as expired by updating timestamp
      await db('ai_suggestions')
        .where({ id: suggestionId })
        .update({ 
          created_at: new Date(Date.now() - 3600000) // 1 hour ago
        });

      const response = await request(app)
        .put(`/api/assignments/ai-suggestions/${suggestionId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('PUT /api/assignments/ai-suggestions/:id/reject', () => {
    let suggestionId;

    beforeEach(async () => {
      // Generate AI suggestions first
      const suggestionsResponse = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: [gameId]
        });
      
      suggestionId = suggestionsResponse.body.data.suggestions[0]?.id;
    });

    it('should reject AI suggestion with reason', async () => {
      const response = await request(app)
        .put(`/api/assignments/ai-suggestions/${suggestionId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Referee requested time off'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected');

      // Verify suggestion was marked as rejected
      const suggestionCheck = await db('ai_suggestions')
        .where({ id: suggestionId })
        .first();
      expect(suggestionCheck.status).toBe('rejected');
      expect(suggestionCheck.rejection_reason).toBe('Referee requested time off');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .put(`/api/assignments/ai-suggestions/${suggestionId}/reject`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/assignments/ai-suggestions', () => {
    it('should get recent AI suggestions', async () => {
      // Generate some suggestions first
      await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: [gameId]
        });

      const response = await request(app)
        .get('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should filter suggestions by status', async () => {
      const response = await request(app)
        .get('/api/assignments/ai-suggestions?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.suggestions.forEach(suggestion => {
        expect(suggestion.status).toBe('pending');
      });
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
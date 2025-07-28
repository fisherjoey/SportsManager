const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');

describe('Historic Patterns Routes', () => {
  let adminToken, refereeToken, refereeUserId, gameId;

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

    // Get game ID for testing
    const gamesResponse = await request(app)
      .get('/api/games')
      .set('Authorization', `Bearer ${adminToken}`);
    gameId = gamesResponse.body.data.games[0]?.id;

    // Create some historic assignment data for pattern analysis
    await createHistoricAssignments();
  });

  async function createHistoricAssignments() {
    // Create assignments over several weeks to establish patterns
    const dates = [
      '2024-07-01', '2024-07-08', '2024-07-15', '2024-07-22', // Mondays
      '2024-07-06', '2024-07-13', '2024-07-20', '2024-07-27', // Saturdays
    ];

    for (let i = 0; i < dates.length; i++) {
      // Create a game for this date
      const gameResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: `Team A${i}`,
          away_team_name: `Team B${i}`,
          game_date: dates[i],
          game_time: i < 4 ? '19:00' : '10:00', // Evening vs morning
          location: i < 4 ? 'Downtown Complex' : 'Riverside Sports Center',
          level: 'Competitive',
          pay_rate: 75
        });

      if (gameResponse.body.success) {
        // Create assignment
        await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            game_id: gameResponse.body.data.game.id,
            user_id: refereeUserId,
            position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
          });

        // Mark assignment as completed
        const assignment = await db('game_assignments')
          .where({ 
            game_id: gameResponse.body.data.game.id,
            user_id: refereeUserId 
          })
          .first();

        if (assignment) {
          await db('game_assignments')
            .where({ id: assignment.id })
            .update({ 
              status: 'completed',
              updated_at: new Date()
            });
        }
      }
    }
  }

  describe('GET /api/assignments/patterns', () => {
    it('should get historic patterns for admin', async () => {
      const response = await request(app)
        .get('/api/assignments/patterns')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.patterns)).toBe(true);

      if (response.body.data.patterns.length > 0) {
        const pattern = response.body.data.patterns[0];
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('referee_id');
        expect(pattern).toHaveProperty('referee_name');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern.pattern).toHaveProperty('day_of_week');
        expect(pattern.pattern).toHaveProperty('location');
        expect(pattern.pattern).toHaveProperty('time_slot');
        expect(pattern.pattern).toHaveProperty('level');
        expect(pattern).toHaveProperty('frequency');
        expect(pattern).toHaveProperty('success_rate');
        expect(pattern).toHaveProperty('last_assigned');
      }
    });

    it('should filter patterns by referee', async () => {
      const response = await request(app)
        .get(`/api/assignments/patterns?referee_id=${refereeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.patterns.forEach(pattern => {
        expect(pattern.referee_id).toBe(refereeUserId);
      });
    });

    it('should filter patterns by minimum frequency', async () => {
      const response = await request(app)
        .get('/api/assignments/patterns?min_frequency=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.patterns.forEach(pattern => {
        expect(pattern.frequency).toBeGreaterThanOrEqual(3);
      });
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/assignments/patterns')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('admin');
    });

    it('should handle date range filtering', async () => {
      const response = await request(app)
        .get('/api/assignments/patterns?start_date=2024-07-01&end_date=2024-07-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.patterns)).toBe(true);
    });
  });

  describe('POST /api/assignments/patterns/apply', () => {
    let patternId;

    beforeEach(async () => {
      // Get a pattern first
      const patternsResponse = await request(app)
        .get('/api/assignments/patterns')
        .set('Authorization', `Bearer ${adminToken}`);
      
      patternId = patternsResponse.body.data.patterns[0]?.id;
    });

    it('should apply historic pattern to matching games', async () => {
      // Create a game that matches the pattern
      const gameResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: 'Pattern Test A',
          away_team_name: 'Pattern Test B',
          game_date: '2024-08-05', // Monday
          game_time: '19:00',
          location: 'Downtown Complex',
          level: 'Competitive',
          pay_rate: 75
        });

      const newGameId = gameResponse.body.data.game.id;

      const response = await request(app)
        .post('/api/assignments/patterns/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pattern_id: patternId,
          game_ids: [newGameId],
          override_conflicts: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignments_created).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data.assignments)).toBe(true);

      // Verify assignment was created
      const assignment = await db('game_assignments')
        .where({ game_id: newGameId })
        .first();
      expect(assignment).toBeDefined();
      expect(assignment.user_id).toBe(refereeUserId);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/assignments/patterns/apply')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          pattern_id: patternId,
          game_ids: [gameId]
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate pattern_id parameter', async () => {
      const response = await request(app)
        .post('/api/assignments/patterns/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: [gameId]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('pattern_id');
    });

    it('should validate game_ids parameter', async () => {
      const response = await request(app)
        .post('/api/assignments/patterns/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pattern_id: patternId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('game_ids');
    });

    it('should handle invalid pattern ID', async () => {
      const response = await request(app)
        .post('/api/assignments/patterns/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pattern_id: 'invalid-pattern-id',
          game_ids: [gameId]
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Pattern not found');
    });

    it('should detect and report conflicts', async () => {
      // Create an assignment that would conflict
      await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: gameId,
          user_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      const response = await request(app)
        .post('/api/assignments/patterns/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pattern_id: patternId,
          game_ids: [gameId],
          override_conflicts: false
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('conflict');
      expect(Array.isArray(response.body.data.conflicts)).toBe(true);
    });

    it('should override conflicts when requested', async () => {
      // Create an assignment that would conflict
      const conflictResponse = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: gameId,
          user_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      const response = await request(app)
        .post('/api/assignments/patterns/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pattern_id: patternId,
          game_ids: [gameId],
          override_conflicts: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conflicts_overridden).toBeGreaterThan(0);
    });
  });

  describe('POST /api/assignments/patterns/analyze', () => {
    it('should analyze assignment patterns and identify trends', async () => {
      const response = await request(app)
        .post('/api/assignments/patterns/analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          start_date: '2024-07-01',
          end_date: '2024-07-31',
          min_frequency: 2
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.analysis).toHaveProperty('total_assignments');
      expect(response.body.data.analysis).toHaveProperty('patterns_identified');
      expect(response.body.data.analysis).toHaveProperty('strongest_patterns');
      expect(Array.isArray(response.body.data.analysis.strongest_patterns)).toBe(true);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/assignments/patterns/analyze')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          referee_id: refereeUserId,
          start_date: '2024-07-01',
          end_date: '2024-07-31'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate date range', async () => {
      const response = await request(app)
        .post('/api/assignments/patterns/analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          start_date: '2024-07-31',
          end_date: '2024-07-01' // End before start
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('date range');
    });
  });

  describe('GET /api/assignments/patterns/:id', () => {
    let patternId;

    beforeEach(async () => {
      const patternsResponse = await request(app)
        .get('/api/assignments/patterns')
        .set('Authorization', `Bearer ${adminToken}`);
      
      patternId = patternsResponse.body.data.patterns[0]?.id;
    });

    it('should get specific pattern details', async () => {
      const response = await request(app)
        .get(`/api/assignments/patterns/${patternId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pattern).toBeDefined();
      expect(response.body.data.pattern.id).toBe(patternId);
      expect(response.body.data.pattern).toHaveProperty('assignments');
      expect(Array.isArray(response.body.data.pattern.assignments)).toBe(true);
    });

    it('should handle invalid pattern ID', async () => {
      const response = await request(app)
        .get('/api/assignments/patterns/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Pattern not found');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get(`/api/assignments/patterns/${patternId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/assignments/patterns/:id', () => {
    let patternId;

    beforeEach(async () => {
      const patternsResponse = await request(app)
        .get('/api/assignments/patterns')
        .set('Authorization', `Bearer ${adminToken}`);
      
      patternId = patternsResponse.body.data.patterns[0]?.id;
    });

    it('should delete pattern', async () => {
      const response = await request(app)
        .delete(`/api/assignments/patterns/${patternId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify pattern was deleted
      const checkResponse = await request(app)
        .get(`/api/assignments/patterns/${patternId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .delete(`/api/assignments/patterns/${patternId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
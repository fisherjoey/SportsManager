const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Referee Levels API', () => {
  let adminToken;
  let refereeToken;
  let testReferee;
  let testGame;
  let learningLevel;
  let teachingLevel;

  beforeAll(async () => {
    // Clean up and set up test data
    await db('game_assignments').del();
    await db('referees').del();
    await db('referee_levels').del();
    await db('games').del();
    await db('users').del();

    // Create referee levels
    [learningLevel] = await db('referee_levels').insert({
      name: 'Learning',
      wage_amount: 25.00,
      description: 'Rookie level',
      allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3'])
    }).returning('*');

    [teachingLevel] = await db('referee_levels').insert({
      name: 'Teaching',
      wage_amount: 45.00,
      description: 'Senior level',
      allowed_divisions: JSON.stringify(['U15-1', 'U18-2', 'U18-1'])
    }).returning('*');

    // Create admin user
    const [adminUser] = await db('users').insert({
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin'
    }).returning('*');

    // Create referee user
    const [refereeUser] = await db('users').insert({
      email: 'referee@test.com',
      password: 'hashedpassword',
      role: 'referee'
    }).returning('*');

    // Create referee profile
    [testReferee] = await db('referees').insert({
      name: 'Test Referee',
      email: 'referee@test.com',
      phone: '123-456-7890',
      location: 'Test City',
      postal_code: 'T1T1T1',
      max_distance: 25,
      is_available: true,
      wage_per_game: 0
    }).returning('*');

    // Link user to referee
    await db('users').where('id', refereeUser.id).update({ referee_id: testReferee.id });

    // Create test game
    [testGame] = await db('games').insert({
      home_team_name: 'Team A',
      away_team_name: 'Team B',
      game_date: '2024-12-25',
      game_time: '10:00:00',
      location: 'Test Arena',
      level: 'U13-3',
      refs_needed: 2,
      status: 'unassigned'
    }).returning('*');

    // Get auth tokens (simplified - in real app this would be proper JWT)
    adminToken = 'admin-token-' + adminUser.id;
    refereeToken = 'referee-token-' + refereeUser.id;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('GET /api/referee-levels', () => {
    it('should return all referee levels', async () => {
      const response = await request(app)
        .get('/api/referee-levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Learning');
      expect(response.body.data[0].wage_amount).toBe('25.00');
    });
  });

  describe('PUT /api/referee-levels/:refereeId/assign', () => {
    it('should assign referee to a level (admin only)', async () => {
      const response = await request(app)
        .put(`/api/referee-levels/${testReferee.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_level_id: learningLevel.id,
          years_experience: 1,
          evaluation_score: 15.5,
          notes: 'Promising new referee'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referee.wage_per_game).toBe('25.00');
      expect(response.body.message).toContain('Learning level');
    });

    it('should reject assignment from non-admin', async () => {
      await request(app)
        .put(`/api/referee-levels/${testReferee.id}/assign`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          referee_level_id: teachingLevel.id
        })
        .expect(403);
    });

    it('should return 404 for non-existent referee level', async () => {
      await request(app)
        .put(`/api/referee-levels/${testReferee.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_level_id: '99999999-9999-9999-9999-999999999999'
        })
        .expect(404);
    });
  });

  describe('GET /api/referee-levels/check-assignment/:gameId/:refereeId', () => {
    beforeEach(async () => {
      // Assign referee to learning level for these tests
      await db('referees').where('id', testReferee.id).update({
        referee_level_id: learningLevel.id,
        wage_per_game: 25.00
      });
    });

    it('should allow assignment for qualified referee', async () => {
      const response = await request(app)
        .get(`/api/referee-levels/check-assignment/${testGame.id}/${testReferee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.canAssign).toBe(true);
      expect(response.body.data.warning).toBeNull();
    });

    it('should warn for unqualified referee', async () => {
      // Create a high-level game
      const [highLevelGame] = await db('games').insert({
        home_team_name: 'Elite Team A',
        away_team_name: 'Elite Team B',
        game_date: '2024-12-26',
        game_time: '10:00:00',
        location: 'Elite Arena',
        level: 'U18-1',
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*');

      const response = await request(app)
        .get(`/api/referee-levels/check-assignment/${highLevelGame.id}/${testReferee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.canAssign).toBe(false);
      expect(response.body.data.warning).toContain('not qualified');
    });
  });
});
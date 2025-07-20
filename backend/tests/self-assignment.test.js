const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Self-Assignment API', () => {
  let refereeToken;
  let testReferee;
  let qualifiedGame;
  let unqualifiedGame;
  let learningLevel;
  let testPosition;

  beforeAll(async () => {
    // Clean up and set up test data
    await db('game_assignments').del();
    await db('referees').del();
    await db('referee_levels').del();
    await db('games').del();
    await db('positions').del();
    await db('users').del();

    // Create position
    [testPosition] = await db('positions').insert({
      name: 'Referee',
      description: 'Main referee position'
    }).returning('*');

    // Create referee level
    [learningLevel] = await db('referee_levels').insert({
      name: 'Learning',
      wage_amount: 25.00,
      description: 'Rookie level',
      allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3'])
    }).returning('*');

    // Create referee user
    const [refereeUser] = await db('users').insert({
      email: 'referee@test.com',
      password: 'hashedpassword',
      role: 'referee'
    }).returning('*');

    // Create referee profile with level
    [testReferee] = await db('referees').insert({
      name: 'Test Referee',
      email: 'referee@test.com',
      phone: '123-456-7890',
      location: 'Test City',
      postal_code: 'T1T1T1',
      max_distance: 25,
      is_available: true,
      wage_per_game: 25.00,
      referee_level_id: learningLevel.id
    }).returning('*');

    // Link user to referee
    await db('users').where('id', refereeUser.id).update({ referee_id: testReferee.id });

    // Create qualified game (within referee's level)
    [qualifiedGame] = await db('games').insert({
      home_team_name: 'Team A',
      away_team_name: 'Team B',
      game_date: '2024-12-25',
      game_time: '10:00:00',
      location: 'Test Arena',
      level: 'U13-3', // Learning level can referee this
      refs_needed: 2,
      status: 'unassigned'
    }).returning('*');

    // Create unqualified game (above referee's level)
    [unqualifiedGame] = await db('games').insert({
      home_team_name: 'Elite A',
      away_team_name: 'Elite B',
      game_date: '2024-12-26',
      game_time: '10:00:00',
      location: 'Elite Arena',
      level: 'U18-1', // Learning level cannot referee this
      refs_needed: 2,
      status: 'unassigned'
    }).returning('*');

    refereeToken = 'referee-token-' + refereeUser.id;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('GET /api/self-assignment/available', () => {
    it('should return only qualified games for referee', async () => {
      const response = await request(app)
        .get('/api/self-assignment/available')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.games).toHaveLength(1);
      expect(response.body.data.games[0].level).toBe('U13-3');
      expect(response.body.data.referee_level).toBe('Learning');
      expect(response.body.data.allowed_divisions).toContain('U13-3');
    });

    it('should return empty array for referee with no level', async () => {
      // Remove referee level
      await db('referees').where('id', testReferee.id).update({
        referee_level_id: null
      });

      const response = await request(app)
        .get('/api/self-assignment/available')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.games).toHaveLength(0);
      expect(response.body.message).toContain('No level assigned');

      // Restore referee level for other tests
      await db('referees').where('id', testReferee.id).update({
        referee_level_id: learningLevel.id
      });
    });
  });

  describe('POST /api/self-assignment', () => {
    it('should allow self-assignment to qualified game', async () => {
      const response = await request(app)
        .post('/api/self-assignment')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          game_id: qualifiedGame.id,
          position_id: testPosition.id
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignment.referee_id).toBe(testReferee.id);
      expect(response.body.data.assignment.status).toBe('pending');
      expect(response.body.message).toContain('Successfully self-assigned');
    });

    it('should reject self-assignment to unqualified game', async () => {
      const response = await request(app)
        .post('/api/self-assignment')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          game_id: unqualifiedGame.id,
          position_id: testPosition.id
        })
        .expect(403);

      expect(response.body.error).toContain('not qualified');
      expect(response.body.error).toContain('U18-1');
    });

    it('should reject duplicate self-assignment', async () => {
      // Try to assign to same game again
      const response = await request(app)
        .post('/api/self-assignment')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          game_id: qualifiedGame.id,
          position_id: testPosition.id
        })
        .expect(409);

      expect(response.body.error).toContain('already assigned');
    });

    it('should reject self-assignment when referee unavailable', async () => {
      // Make referee unavailable
      await db('referees').where('id', testReferee.id).update({
        is_available: false
      });

      // Create another qualified game
      const [anotherGame] = await db('games').insert({
        home_team_name: 'Team C',
        away_team_name: 'Team D',
        game_date: '2024-12-27',
        game_time: '10:00:00',
        location: 'Test Arena 2',
        level: 'U11-1',
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*');

      const response = await request(app)
        .post('/api/self-assignment')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          game_id: anotherGame.id,
          position_id: testPosition.id
        })
        .expect(400);

      expect(response.body.error).toContain('not currently available');

      // Restore availability
      await db('referees').where('id', testReferee.id).update({
        is_available: true
      });
    });

    it('should reject self-assignment for referee with no level', async () => {
      // Remove referee level
      await db('referees').where('id', testReferee.id).update({
        referee_level_id: null
      });

      // Create another qualified game
      const [anotherGame] = await db('games').insert({
        home_team_name: 'Team E',
        away_team_name: 'Team F',
        game_date: '2024-12-28',
        game_time: '10:00:00',
        location: 'Test Arena 3',
        level: 'U11-1',
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*');

      const response = await request(app)
        .post('/api/self-assignment')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          game_id: anotherGame.id,
          position_id: testPosition.id
        })
        .expect(403);

      expect(response.body.error).toContain('No level assigned');

      // Restore referee level
      await db('referees').where('id', testReferee.id).update({
        referee_level_id: learningLevel.id
      });
    });
  });
});
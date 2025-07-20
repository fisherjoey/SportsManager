const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Assignment Warnings API', () => {
  let adminToken;
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

    adminToken = 'admin-token-' + adminUser.id;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/assignments (Admin with warnings)', () => {
    it('should create assignment without warning for qualified referee', async () => {
      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: qualifiedGame.id,
          referee_id: testReferee.id,
          position_id: testPosition.id,
          assigned_by: 'admin'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.warning).toBeUndefined();
      expect(response.body.data.assignment.status).toBe('pending');
    });

    it('should create assignment with warning for unqualified referee', async () => {
      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: unqualifiedGame.id,
          referee_id: testReferee.id,
          position_id: testPosition.id,
          assigned_by: 'admin'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.warning).toContain('Warning');
      expect(response.body.warning).toContain('not typically qualified');
      expect(response.body.warning).toContain('U18-1');
      expect(response.body.data.assignment.status).toBe('pending');
    });

    it('should create assignment with warning for referee with no level', async () => {
      // Create referee without level
      const [noLevelReferee] = await db('referees').insert({
        name: 'No Level Referee',
        email: 'nolevel@test.com',
        phone: '123-456-7890',
        location: 'Test City',
        postal_code: 'T1T1T1',
        max_distance: 25,
        is_available: true,
        wage_per_game: 0,
        referee_level_id: null
      }).returning('*');

      // Create another game for this test
      const [testGame] = await db('games').insert({
        home_team_name: 'Team C',
        away_team_name: 'Team D',
        game_date: '2024-12-27',
        game_time: '10:00:00',
        location: 'Test Arena 2',
        level: 'U13-3',
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*');

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: testGame.id,
          referee_id: noLevelReferee.id,
          position_id: testPosition.id,
          assigned_by: 'admin'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.warning).toContain('no assigned level');
      expect(response.body.data.assignment.status).toBe('pending');
    });

    it('should reject assignment if referee unavailable', async () => {
      // Make referee unavailable
      await db('referees').where('id', testReferee.id).update({
        is_available: false
      });

      // Create another game
      const [testGame] = await db('games').insert({
        home_team_name: 'Team E',
        away_team_name: 'Team F',
        game_date: '2024-12-28',
        game_time: '10:00:00',
        location: 'Test Arena 3',
        level: 'U13-3',
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*');

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: testGame.id,
          referee_id: testReferee.id,
          position_id: testPosition.id,
          assigned_by: 'admin'
        })
        .expect(400);

      expect(response.body.error).toContain('not available');

      // Restore availability
      await db('referees').where('id', testReferee.id).update({
        is_available: true
      });
    });

    it('should reject assignment if position already filled', async () => {
      // The qualified game already has an assignment from first test
      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: qualifiedGame.id,
          referee_id: testReferee.id,
          position_id: testPosition.id,
          assigned_by: 'admin'
        })
        .expect(409);

      expect(response.body.error).toContain('already assigned');
    });

    it('should reject assignment if game refs limit reached', async () => {
      // Create a game that needs only 1 referee
      const [limitedGame] = await db('games').insert({
        home_team_name: 'Limited A',
        away_team_name: 'Limited B',
        game_date: '2024-12-29',
        game_time: '10:00:00',
        location: 'Limited Arena',
        level: 'U13-3',
        refs_needed: 1,
        status: 'unassigned'
      }).returning('*');

      // Create second position
      const [secondPosition] = await db('positions').insert({
        name: 'Linesman',
        description: 'Assistant referee'
      }).returning('*');

      // Assign first referee
      await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: limitedGame.id,
          referee_id: testReferee.id,
          position_id: testPosition.id,
          assigned_by: 'admin'
        })
        .expect(201);

      // Try to assign second referee (should fail)
      const [secondReferee] = await db('referees').insert({
        name: 'Second Referee',
        email: 'second@test.com',
        phone: '123-456-7890',
        location: 'Test City',
        postal_code: 'T1T1T1',
        max_distance: 25,
        is_available: true,
        wage_per_game: 25.00,
        referee_level_id: learningLevel.id
      }).returning('*');

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: limitedGame.id,
          referee_id: secondReferee.id,
          position_id: secondPosition.id,
          assigned_by: 'admin'
        })
        .expect(409);

      expect(response.body.error).toContain('maximum number of referees');
    });
  });
});
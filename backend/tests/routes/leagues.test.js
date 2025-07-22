const request = require('supertest');
const app = require('../../src/app');
const knex = require('../setup');
const bcrypt = require('bcryptjs');

describe('League Routes', () => {
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Create admin user for tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await knex('users').insert({
      email: 'admin@test.com',
      password_hash: hashedPassword,
      role: 'admin',
      name: 'Test Admin'
    }).returning('*')[0];

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });

    adminToken = loginResponse.body.token;
  });

  describe('GET /api/leagues', () => {
    beforeEach(async () => {
      // Create test leagues
      await knex('leagues').insert([
        {
          organization: 'Calgary',
          age_group: 'U11',
          gender: 'Boys',
          division: 'Division 1',
          season: 'Winter 2025',
          level: 'Recreational'
        },
        {
          organization: 'Calgary',
          age_group: 'U13',
          gender: 'Boys',
          division: 'Division 2',
          season: 'Winter 2025',
          level: 'Competitive'
        },
        {
          organization: 'Okotoks',
          age_group: 'U11',
          gender: 'Girls',
          division: 'Division 1',
          season: 'Winter 2025',
          level: 'Recreational'
        }
      ]);
    });

    test('should get all leagues with counts', async () => {
      const response = await request(app)
        .get('/api/leagues')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leagues).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();

      // Check structure includes counts
      response.body.data.leagues.forEach(league => {
        expect(league).toHaveProperty('team_count');
        expect(league).toHaveProperty('game_count');
        expect(typeof league.team_count).toBe('number');
        expect(typeof league.game_count).toBe('number');
      });
    });

    test('should filter leagues by organization', async () => {
      const response = await request(app)
        .get('/api/leagues')
        .query({ organization: 'Calgary' })
        .expect(200);

      expect(response.body.data.leagues).toHaveLength(2);
      response.body.data.leagues.forEach(league => {
        expect(league.organization).toBe('Calgary');
      });
    });

    test('should filter leagues by age group', async () => {
      const response = await request(app)
        .get('/api/leagues')
        .query({ age_group: 'U11' })
        .expect(200);

      expect(response.body.data.leagues).toHaveLength(2);
      response.body.data.leagues.forEach(league => {
        expect(league.age_group).toBe('U11');
      });
    });

    test('should filter leagues by gender', async () => {
      const response = await request(app)
        .get('/api/leagues')
        .query({ gender: 'Boys' })
        .expect(200);

      expect(response.body.data.leagues).toHaveLength(2);
      response.body.data.leagues.forEach(league => {
        expect(league.gender).toBe('Boys');
      });
    });

    test('should filter leagues by level', async () => {
      const response = await request(app)
        .get('/api/leagues')
        .query({ level: 'Recreational' })
        .expect(200);

      expect(response.body.data.leagues).toHaveLength(2);
      response.body.data.leagues.forEach(league => {
        expect(league.level).toBe('Recreational');
      });
    });

    test('should filter leagues by season', async () => {
      const response = await request(app)
        .get('/api/leagues')
        .query({ season: 'Winter 2025' })
        .expect(200);

      expect(response.body.data.leagues).toHaveLength(3);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/leagues')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data.leagues).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.pages).toBe(2);
    });

    test('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/leagues')
        .query({
          organization: 'Calgary',
          gender: 'Boys',
          level: 'Competitive'
        })
        .expect(200);

      expect(response.body.data.leagues).toHaveLength(1);
      const league = response.body.data.leagues[0];
      expect(league.organization).toBe('Calgary');
      expect(league.gender).toBe('Boys');
      expect(league.level).toBe('Competitive');
      expect(league.age_group).toBe('U13');
    });
  });

  describe('GET /api/leagues/:id', () => {
    let testLeague;

    beforeEach(async () => {
      testLeague = await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];
    });

    test('should get specific league with teams and games', async () => {
      const response = await request(app)
        .get(`/api/leagues/${testLeague.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.league.id).toBe(testLeague.id);
      expect(response.body.data.teams).toBeDefined();
      expect(response.body.data.games).toBeDefined();
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.team_count).toBe(0);
      expect(response.body.data.stats.game_count).toBe(0);
    });

    test('should return 404 for non-existent league', async () => {
      const response = await request(app)
        .get('/api/leagues/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.error).toBe('League not found');
    });
  });

  describe('POST /api/leagues', () => {
    test('should create a new league', async () => {
      const leagueData = {
        organization: 'Calgary',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Premier',
        season: 'Spring 2025',
        level: 'Elite'
      };

      const response = await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leagueData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.league.organization).toBe('Calgary');
      expect(response.body.data.league.age_group).toBe('U15');
      expect(response.body.data.league.gender).toBe('Boys');
      expect(response.body.data.league.division).toBe('Premier');
      expect(response.body.data.league.season).toBe('Spring 2025');
      expect(response.body.data.league.level).toBe('Elite');
      expect(response.body.message).toBe('League created successfully');
    });

    test('should require authentication', async () => {
      const leagueData = {
        organization: 'Calgary',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Premier',
        season: 'Spring 2025',
        level: 'Elite'
      };

      await request(app)
        .post('/api/leagues')
        .send(leagueData)
        .expect(401);
    });

    test('should validate required fields', async () => {
      await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organization: 'Calgary',
          age_group: 'U15'
          // Missing required fields
        })
        .expect(400);
    });

    test('should validate gender values', async () => {
      const leagueData = {
        organization: 'Calgary',
        age_group: 'U15',
        gender: 'Invalid', // Invalid gender
        division: 'Premier',
        season: 'Spring 2025',
        level: 'Elite'
      };

      await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leagueData)
        .expect(400);
    });

    test('should validate level values', async () => {
      const leagueData = {
        organization: 'Calgary',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Premier',
        season: 'Spring 2025',
        level: 'Invalid' // Invalid level
      };

      await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leagueData)
        .expect(400);
    });

    test('should prevent duplicate leagues', async () => {
      const leagueData = {
        organization: 'Calgary',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Premier',
        season: 'Spring 2025',
        level: 'Elite'
      };

      // Create first league
      await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leagueData)
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leagueData)
        .expect(409);
    });
  });

  describe('POST /api/leagues/bulk', () => {
    test('should create multiple leagues', async () => {
      const bulkData = {
        organization: 'Calgary',
        age_groups: ['U11', 'U13'],
        genders: ['Boys', 'Girls'],
        divisions: ['Division 1', 'Division 2'],
        season: 'Winter 2025',
        level: 'Recreational'
      };

      const response = await request(app)
        .post('/api/leagues/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(8); // 2 age groups × 2 genders × 2 divisions
      expect(response.body.data.duplicates).toHaveLength(0);
      expect(response.body.data.summary.requested).toBe(8);
      expect(response.body.data.summary.created).toBe(8);
      expect(response.body.data.summary.duplicates).toBe(0);
      expect(response.body.message).toContain('Created 8 leagues');
    });

    test('should handle partial duplicates', async () => {
      // Create existing league
      await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U11',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Recreational'
      });

      const bulkData = {
        organization: 'Calgary',
        age_groups: ['U11'],
        genders: ['Boys', 'Girls'],
        divisions: ['Division 1'],
        season: 'Winter 2025',
        level: 'Recreational'
      };

      const response = await request(app)
        .post('/api/leagues/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body.data.created).toHaveLength(1); // Only U11 Girls created
      expect(response.body.data.duplicates).toHaveLength(1); // U11 Boys was duplicate
      expect(response.body.data.summary.created).toBe(1);
      expect(response.body.data.summary.duplicates).toBe(1);
    });

    test('should require authentication', async () => {
      const bulkData = {
        organization: 'Calgary',
        age_groups: ['U11'],
        genders: ['Boys'],
        divisions: ['Division 1'],
        season: 'Winter 2025',
        level: 'Recreational'
      };

      await request(app)
        .post('/api/leagues/bulk')
        .send(bulkData)
        .expect(401);
    });

    test('should validate required fields', async () => {
      await request(app)
        .post('/api/leagues/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organization: 'Calgary'
          // Missing required arrays
        })
        .expect(400);
    });

    test('should require at least one option in each array', async () => {
      const bulkData = {
        organization: 'Calgary',
        age_groups: [], // Empty array
        genders: ['Boys'],
        divisions: ['Division 1'],
        season: 'Winter 2025',
        level: 'Recreational'
      };

      await request(app)
        .post('/api/leagues/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(400);
    });
  });

  describe('PUT /api/leagues/:id', () => {
    let testLeague;

    beforeEach(async () => {
      testLeague = await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];
    });

    test('should update league', async () => {
      const updateData = {
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Premier', // Changed
        season: 'Winter 2025',
        level: 'Elite' // Changed
      };

      const response = await request(app)
        .put(`/api/leagues/${testLeague.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.league.division).toBe('Premier');
      expect(response.body.data.league.level).toBe('Elite');
      expect(response.body.message).toBe('League updated successfully');
    });

    test('should require authentication', async () => {
      const updateData = {
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Premier',
        season: 'Winter 2025',
        level: 'Elite'
      };

      await request(app)
        .put(`/api/leagues/${testLeague.id}`)
        .send(updateData)
        .expect(401);
    });

    test('should return 404 for non-existent league', async () => {
      const updateData = {
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Premier',
        season: 'Winter 2025',
        level: 'Elite'
      };

      await request(app)
        .put('/api/leagues/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /api/leagues/:id', () => {
    let testLeague;

    beforeEach(async () => {
      testLeague = await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];
    });

    test('should delete league without teams or games', async () => {
      const response = await request(app)
        .delete(`/api/leagues/${testLeague.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('League deleted successfully');

      // Verify league was deleted
      const deletedLeague = await knex('leagues').where('id', testLeague.id).first();
      expect(deletedLeague).toBeUndefined();
    });

    test('should prevent deletion of league with teams', async () => {
      // Create a team in this league
      await knex('teams').insert({
        name: 'Test Team',
        league_id: testLeague.id,
        rank: 1
      });

      await request(app)
        .delete(`/api/leagues/${testLeague.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    test('should prevent deletion of league with games', async () => {
      // Create teams first
      const [team1, team2] = await knex('teams').insert([
        { name: 'Team 1', league_id: testLeague.id, rank: 1 },
        { name: 'Team 2', league_id: testLeague.id, rank: 2 }
      ]).returning('*');

      // Create a game in this league
      await knex('games').insert({
        home_team_id: team1.id,
        away_team_id: team2.id,
        league_id: testLeague.id,
        game_date: '2025-06-01',
        game_time: '10:00',
        location: 'Test Arena',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned',
        postal_code: 'T0T0T0'
      });

      const response = await request(app)
        .delete(`/api/leagues/${testLeague.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(response.body.error).toBe('Cannot delete league with existing teams or games');
      expect(response.body.details.teams).toBe(2);
      expect(response.body.details.games).toBe(1);
    });

    test('should require authentication', async () => {
      await request(app)
        .delete(`/api/leagues/${testLeague.id}`)
        .expect(401);
    });

    test('should return 404 for non-existent league', async () => {
      await request(app)
        .delete('/api/leagues/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/leagues/options/filters', () => {
    beforeEach(async () => {
      // Create test leagues with various options
      await knex('leagues').insert([
        {
          organization: 'Calgary',
          age_group: 'U11',
          gender: 'Boys',
          division: 'Division 1',
          season: 'Winter 2025',
          level: 'Recreational'
        },
        {
          organization: 'Okotoks',
          age_group: 'U13',
          gender: 'Girls',
          division: 'Premier',
          season: 'Spring 2025',
          level: 'Competitive'
        },
        {
          organization: 'Airdrie',
          age_group: 'U15',
          gender: 'Mixed',
          division: 'Elite',
          season: 'Fall 2024',
          level: 'Elite'
        }
      ]);
    });

    test('should return all filter options', async () => {
      const response = await request(app)
        .get('/api/leagues/options/filters')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.organizations).toEqual(
        expect.arrayContaining(['Airdrie', 'Calgary', 'Okotoks'])
      );
      expect(response.body.data.age_groups).toEqual(
        expect.arrayContaining(['U11', 'U13', 'U15'])
      );
      expect(response.body.data.genders).toEqual(
        expect.arrayContaining(['Boys', 'Girls', 'Mixed'])
      );
      expect(response.body.data.divisions).toEqual(
        expect.arrayContaining(['Division 1', 'Elite', 'Premier'])
      );
      expect(response.body.data.seasons).toEqual(
        expect.arrayContaining(['Fall 2024', 'Spring 2025', 'Winter 2025'])
      );
      expect(response.body.data.levels).toEqual(
        expect.arrayContaining(['Competitive', 'Elite', 'Recreational'])
      );
    });

    test('should return empty arrays when no leagues exist', async () => {
      // Clear all leagues
      await knex('leagues').del();

      const response = await request(app)
        .get('/api/leagues/options/filters')
        .expect(200);

      expect(response.body.data.organizations).toHaveLength(0);
      expect(response.body.data.age_groups).toHaveLength(0);
      expect(response.body.data.genders).toHaveLength(0);
      expect(response.body.data.divisions).toHaveLength(0);
      expect(response.body.data.seasons).toHaveLength(0);
      expect(response.body.data.levels).toHaveLength(0);
    });
  });
});
const request = require('supertest');
const app = require('../../src/app');
const knex = require('../setup');
const bcrypt = require('bcryptjs');

describe('Team Routes', () => {
  let adminUser;
  let adminToken;
  let testLeague;

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

  beforeEach(async () => {
    // Create test league
    testLeague = await knex('leagues').insert({
      organization: 'Calgary',
      age_group: 'U13',
      gender: 'Boys',
      division: 'Division 1',
      season: 'Winter 2025',
      level: 'Competitive'
    }).returning('*')[0];
  });

  describe('GET /api/teams', () => {
    beforeEach(async () => {
      // Create test teams
      await knex('teams').insert([
        {
          name: 'Calgary Flames',
          league_id: testLeague.id,
          rank: 1,
          location: 'Calgary, AB',
          contact_email: 'flames@test.com',
          contact_phone: '403-555-0123'
        },
        {
          name: 'Calgary Storm',
          league_id: testLeague.id,
          rank: 2,
          location: 'Calgary, AB',
          contact_email: 'storm@test.com',
          contact_phone: '403-555-0124'
        }
      ]);
    });

    test('should get all teams', async () => {
      const response = await request(app)
        .get('/api/teams')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.teams).toHaveLength(2);
      expect(response.body.data.teams[0].name).toBe('Calgary Flames');
      expect(response.body.data.teams[1].name).toBe('Calgary Storm');
    });

    test('should filter teams by league_id', async () => {
      // Create another league with a team
      const otherLeague = await knex('leagues').insert({
        organization: 'Okotoks',
        age_group: 'U11',
        gender: 'Girls',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Recreational'
      }).returning('*')[0];

      await knex('teams').insert({
        name: 'Okotoks Team',
        league_id: otherLeague.id,
        rank: 1,
        location: 'Okotoks, AB'
      });

      const response = await request(app)
        .get('/api/teams')
        .query({ league_id: testLeague.id })
        .expect(200);

      expect(response.body.data.teams).toHaveLength(2);
      response.body.data.teams.forEach(team => {
        expect(team.league_id).toBe(testLeague.id);
      });
    });

    test('should filter teams by organization', async () => {
      const response = await request(app)
        .get('/api/teams')
        .query({ organization: 'Calgary' })
        .expect(200);

      expect(response.body.data.teams).toHaveLength(2);
      response.body.data.teams.forEach(team => {
        expect(team.organization).toBe('Calgary');
      });
    });

    test('should search teams by name', async () => {
      const response = await request(app)
        .get('/api/teams')
        .query({ search: 'Flames' })
        .expect(200);

      expect(response.body.data.teams).toHaveLength(1);
      expect(response.body.data.teams[0].name).toBe('Calgary Flames');
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/teams')
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.data.teams).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.total).toBe(2);
    });
  });

  describe('GET /api/teams/:id', () => {
    let testTeam;

    beforeEach(async () => {
      testTeam = await knex('teams').insert({
        name: 'Calgary Flames',
        league_id: testLeague.id,
        rank: 1,
        location: 'Calgary, AB',
        contact_email: 'flames@test.com',
        contact_phone: '403-555-0123'
      }).returning('*')[0];
    });

    test('should get specific team', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.team.id).toBe(testTeam.id);
      expect(response.body.data.team.name).toBe('Calgary Flames');
      expect(response.body.data.games).toBeDefined();
      expect(response.body.data.stats).toBeDefined();
    });

    test('should return 404 for non-existent team', async () => {
      const response = await request(app)
        .get('/api/teams/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.error).toBe('Team not found');
    });
  });

  describe('POST /api/teams', () => {
    test('should create a new team', async () => {
      const teamData = {
        name: 'Calgary Flames',
        league_id: testLeague.id,
        rank: 1,
        location: 'Calgary, AB',
        contact_email: 'flames@test.com',
        contact_phone: '403-555-0123'
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teamData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.team.name).toBe('Calgary Flames');
      expect(response.body.data.team.league_id).toBe(testLeague.id);
      expect(response.body.data.team.rank).toBe(1);
      expect(response.body.message).toBe('Team created successfully');
    });

    test('should require authentication', async () => {
      const teamData = {
        name: 'Calgary Flames',
        league_id: testLeague.id,
        rank: 1
      };

      await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(401);
    });

    test('should validate required fields', async () => {
      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing required fields
          league_id: testLeague.id
        })
        .expect(400);
    });

    test('should validate league exists', async () => {
      const teamData = {
        name: 'Test Team',
        league_id: '00000000-0000-0000-0000-000000000000',
        rank: 1
      };

      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teamData)
        .expect(400);
    });

    test('should enforce unique team names within league', async () => {
      // Create first team
      await knex('teams').insert({
        name: 'Calgary Flames',
        league_id: testLeague.id,
        rank: 1
      });

      // Try to create duplicate
      const teamData = {
        name: 'Calgary Flames',
        league_id: testLeague.id,
        rank: 2
      };

      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teamData)
        .expect(409);
    });
  });

  describe('POST /api/teams/bulk', () => {
    test('should create multiple teams', async () => {
      const bulkData = {
        league_id: testLeague.id,
        teams: [
          {
            name: 'Team Alpha',
            rank: 1,
            location: 'Calgary, AB',
            contact_email: 'alpha@test.com',
            contact_phone: '403-555-0123'
          },
          {
            name: 'Team Beta',
            rank: 2,
            location: 'Calgary, AB',
            contact_email: 'beta@test.com',
            contact_phone: '403-555-0124'
          },
          {
            name: 'Team Gamma',
            rank: 3,
            location: 'Calgary, AB',
            contact_email: 'gamma@test.com',
            contact_phone: '403-555-0125'
          }
        ]
      };

      const response = await request(app)
        .post('/api/teams/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(3);
      expect(response.body.data.summary.created).toBe(3);
      expect(response.body.data.summary.duplicates).toBe(0);
      expect(response.body.message).toContain('Created 3 teams');
    });

    test('should handle duplicate team names', async () => {
      // Create existing team
      await knex('teams').insert({
        name: 'Existing Team',
        league_id: testLeague.id,
        rank: 1
      });

      const bulkData = {
        league_id: testLeague.id,
        teams: [
          {
            name: 'New Team',
            rank: 2
          },
          {
            name: 'Existing Team', // Duplicate
            rank: 3
          }
        ]
      };

      const response = await request(app)
        .post('/api/teams/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body.data.created).toHaveLength(1);
      expect(response.body.data.duplicates).toHaveLength(1);
      expect(response.body.data.summary.created).toBe(1);
      expect(response.body.data.summary.duplicates).toBe(1);
    });

    test('should require authentication', async () => {
      const bulkData = {
        league_id: testLeague.id,
        teams: [{ name: 'Test Team', rank: 1 }]
      };

      await request(app)
        .post('/api/teams/bulk')
        .send(bulkData)
        .expect(401);
    });

    test('should validate required fields', async () => {
      await request(app)
        .post('/api/teams/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing league_id and teams
        })
        .expect(400);
    });
  });

  describe('POST /api/teams/generate', () => {
    test('should generate teams with numbered pattern', async () => {
      const generateData = {
        league_id: testLeague.id,
        count: 5,
        name_pattern: 'Team {number}',
        location_base: 'Calgary Sports Complex',
        auto_rank: true
      };

      const response = await request(app)
        .post('/api/teams/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(generateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(5);
      expect(response.body.data.summary.created).toBe(5);

      // Check generated team names
      const teamNames = response.body.data.created.map(t => t.name);
      expect(teamNames).toContain('Team 1');
      expect(teamNames).toContain('Team 2');
      expect(teamNames).toContain('Team 3');
      expect(teamNames).toContain('Team 4');
      expect(teamNames).toContain('Team 5');

      // Check auto-ranking
      response.body.data.created.forEach((team, index) => {
        expect(team.rank).toBe(index + 1);
      });
    });

    test('should generate teams with custom pattern', async () => {
      const generateData = {
        league_id: testLeague.id,
        count: 3,
        name_pattern: 'Eagles {number}',
        location_base: 'East Calgary',
        auto_rank: false
      };

      const response = await request(app)
        .post('/api/teams/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(generateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(3);

      const teamNames = response.body.data.created.map(t => t.name);
      expect(teamNames).toContain('Eagles 1');
      expect(teamNames).toContain('Eagles 2');
      expect(teamNames).toContain('Eagles 3');
    });

    test('should require authentication', async () => {
      const generateData = {
        league_id: testLeague.id,
        count: 3
      };

      await request(app)
        .post('/api/teams/generate')
        .send(generateData)
        .expect(401);
    });

    test('should validate required fields', async () => {
      await request(app)
        .post('/api/teams/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing league_id and count
        })
        .expect(400);
    });

    test('should validate team count limits', async () => {
      const generateData = {
        league_id: testLeague.id,
        count: 0 // Invalid count
      };

      await request(app)
        .post('/api/teams/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(generateData)
        .expect(400);
    });
  });

  describe('PUT /api/teams/:id', () => {
    let testTeam;

    beforeEach(async () => {
      testTeam = await knex('teams').insert({
        name: 'Calgary Flames',
        league_id: testLeague.id,
        rank: 1,
        location: 'Calgary, AB'
      }).returning('*')[0];
    });

    test('should update team', async () => {
      const updateData = {
        name: 'Calgary Storm',
        rank: 2,
        location: 'Calgary, AB - Updated',
        contact_email: 'storm@test.com',
        contact_phone: '403-555-0999'
      };

      const response = await request(app)
        .put(`/api/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.team.name).toBe('Calgary Storm');
      expect(response.body.data.team.rank).toBe(2);
      expect(response.body.data.team.contact_email).toBe('storm@test.com');
    });

    test('should require authentication', async () => {
      const updateData = { name: 'Updated Team' };

      await request(app)
        .put(`/api/teams/${testTeam.id}`)
        .send(updateData)
        .expect(401);
    });

    test('should return 404 for non-existent team', async () => {
      const updateData = { name: 'Updated Team' };

      await request(app)
        .put('/api/teams/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /api/teams/:id', () => {
    let testTeam;

    beforeEach(async () => {
      testTeam = await knex('teams').insert({
        name: 'Calgary Flames',
        league_id: testLeague.id,
        rank: 1
      }).returning('*')[0];
    });

    test('should delete team without games', async () => {
      const response = await request(app)
        .delete(`/api/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team deleted successfully');

      // Verify team was deleted
      const deletedTeam = await knex('teams').where('id', testTeam.id).first();
      expect(deletedTeam).toBeUndefined();
    });

    test('should prevent deletion of team with games', async () => {
      // Create another team for the game
      const otherTeam = await knex('teams').insert({
        name: 'Other Team',
        league_id: testLeague.id,
        rank: 2
      }).returning('*')[0];

      // Create a game with this team
      await knex('games').insert({
        home_team_id: testTeam.id,
        away_team_id: otherTeam.id,
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

      await request(app)
        .delete(`/api/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    test('should require authentication', async () => {
      await request(app)
        .delete(`/api/teams/${testTeam.id}`)
        .expect(401);
    });

    test('should return 404 for non-existent team', async () => {
      await request(app)
        .delete('/api/teams/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/teams/league/:leagueId', () => {
    beforeEach(async () => {
      await knex('teams').insert([
        {
          name: 'Team A',
          league_id: testLeague.id,
          rank: 1
        },
        {
          name: 'Team B',
          league_id: testLeague.id,
          rank: 2
        }
      ]);
    });

    test('should get teams for specific league', async () => {
      const response = await request(app)
        .get(`/api/teams/league/${testLeague.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.league).toBeDefined();
      expect(response.body.data.teams).toHaveLength(2);
      expect(response.body.data.teams[0].name).toBe('Team A');
      expect(response.body.data.teams[1].name).toBe('Team B');
    });

    test('should return 404 for non-existent league', async () => {
      await request(app)
        .get('/api/teams/league/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    test('should return empty teams array for league with no teams', async () => {
      const emptyLeague = await knex('leagues').insert({
        organization: 'Empty Org',
        age_group: 'U15',
        gender: 'Girls',
        division: 'Division 1',
        season: 'Spring 2025',
        level: 'Recreational'
      }).returning('*')[0];

      const response = await request(app)
        .get(`/api/teams/league/${emptyLeague.id}`)
        .expect(200);

      expect(response.body.data.teams).toHaveLength(0);
    });
  });
});
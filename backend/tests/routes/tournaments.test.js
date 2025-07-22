const request = require('supertest');
const app = require('../../src/app');
const knex = require('../setup');
const bcrypt = require('bcryptjs');

describe('Tournament Routes', () => {
  let adminUser;
  let adminToken;
  let testLeague;
  let testTeams;

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

    // Create test teams
    const teamData = [
      { name: 'Team A', rank: 1 },
      { name: 'Team B', rank: 2 },
      { name: 'Team C', rank: 3 },
      { name: 'Team D', rank: 4 },
      { name: 'Team E', rank: 5 },
      { name: 'Team F', rank: 6 }
    ].map(team => ({
      ...team,
      league_id: testLeague.id,
      location: 'Test Location',
      contact_email: 'test@example.com',
      contact_phone: '403-555-0123'
    }));

    testTeams = await knex('teams').insert(teamData).returning('*');
  });

  describe('GET /api/tournaments/formats', () => {
    test('should return available tournament formats', async () => {
      const response = await request(app)
        .get('/api/tournaments/formats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.formats).toBeDefined();
      expect(Array.isArray(response.body.data.formats)).toBe(true);
      expect(response.body.data.formats.length).toBeGreaterThan(0);

      // Check format structure
      const format = response.body.data.formats[0];
      expect(format).toHaveProperty('id');
      expect(format).toHaveProperty('name');
      expect(format).toHaveProperty('description');
      expect(format).toHaveProperty('min_teams');
      expect(format).toHaveProperty('max_teams');
      expect(format).toHaveProperty('pros');
      expect(format).toHaveProperty('cons');
      expect(format).toHaveProperty('games_formula');
      expect(format).toHaveProperty('suitable_for');
    });

    test('should include all expected tournament formats', async () => {
      const response = await request(app)
        .get('/api/tournaments/formats')
        .expect(200);

      const formatIds = response.body.data.formats.map(f => f.id);
      expect(formatIds).toContain('round_robin');
      expect(formatIds).toContain('single_elimination');
      expect(formatIds).toContain('swiss_system');
      expect(formatIds).toContain('group_stage_playoffs');
    });
  });

  describe('GET /api/tournaments/estimate', () => {
    test('should estimate round robin tournament', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: 'round_robin',
          team_count: 4,
          games_per_day: 3
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estimate.total_games).toBe(6); // 4 choose 2
      expect(response.body.data.estimate.games_per_team).toBe(3);
      expect(response.body.data.estimate.estimated_days).toBe(2); // 6 games / 3 per day
    });

    test('should estimate single elimination tournament', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: 'single_elimination',
          team_count: 8
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estimate.total_games).toBe(7); // 8 - 1
      expect(response.body.data.estimate.rounds).toBe(3); // log2(8)
    });

    test('should estimate swiss system tournament', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: 'swiss_system',
          team_count: 6,
          rounds: 5
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estimate.total_games).toBe(15); // 6 * 5 / 2
      expect(response.body.data.estimate.games_per_team).toBe(5);
    });

    test('should estimate group stage playoffs tournament', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: 'group_stage_playoffs',
          team_count: 8,
          group_size: 4,
          advance_per_group: 2
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estimate.group_stage_games).toBe(12); // 2 groups * 6 games
      expect(response.body.data.estimate.playoff_games).toBe(3); // 4 teams = 3 games
    });

    test('should require tournament_type and team_count', async () => {
      await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: 'round_robin'
          // Missing team_count
        })
        .expect(400);

      await request(app)
        .get('/api/tournaments/estimate')
        .query({
          team_count: 4
          // Missing tournament_type
        })
        .expect(400);
    });
  });

  describe('POST /api/tournaments/generate', () => {
    test('should generate round robin tournament', async () => {
      const tournamentData = {
        name: 'Test Championship',
        league_id: testLeague.id,
        tournament_type: 'round_robin',
        team_ids: testTeams.slice(0, 4).map(t => t.id),
        start_date: '2025-06-01',
        venue: 'Test Arena',
        time_slots: ['10:00', '12:00', '14:00'],
        days_of_week: [6, 0],
        games_per_day: 3,
        seeding_method: 'ranked'
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament.name).toBe('Test Championship');
      expect(response.body.data.tournament.type).toBe('round_robin');
      expect(response.body.data.tournament.total_games).toBe(6);
      expect(response.body.data.tournament.teams).toHaveLength(4);
      expect(response.body.data.tournament.games).toHaveLength(6);
    });

    test('should generate single elimination tournament', async () => {
      const tournamentData = {
        name: 'Knockout Cup',
        league_id: testLeague.id,
        tournament_type: 'single_elimination',
        team_ids: testTeams.slice(0, 4).map(t => t.id),
        start_date: '2025-06-01',
        seeding_method: 'ranked'
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament.type).toBe('single_elimination');
      expect(response.body.data.tournament.total_games).toBe(3);
      expect(response.body.data.tournament.total_rounds).toBe(2);
    });

    test('should generate swiss system tournament', async () => {
      const tournamentData = {
        name: 'Swiss Tournament',
        league_id: testLeague.id,
        tournament_type: 'swiss_system',
        team_ids: testTeams.slice(0, 6).map(t => t.id),
        start_date: '2025-06-01',
        rounds: 5
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament.type).toBe('swiss_system');
      expect(response.body.data.tournament.total_games).toBe(15);
    });

    test('should generate group stage playoffs tournament', async () => {
      const tournamentData = {
        name: 'World Cup Style',
        league_id: testLeague.id,
        tournament_type: 'group_stage_playoffs',
        team_ids: testTeams.map(t => t.id), // All 6 teams
        start_date: '2025-06-01',
        group_size: 3,
        advance_per_group: 2
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament.type).toBe('group_stage_playoffs');
      expect(response.body.data.tournament.groups).toHaveLength(2);
    });

    test('should require authentication', async () => {
      const tournamentData = {
        name: 'Test Tournament',
        league_id: testLeague.id,
        tournament_type: 'round_robin',
        team_ids: testTeams.slice(0, 4).map(t => t.id),
        start_date: '2025-06-01'
      };

      await request(app)
        .post('/api/tournaments/generate')
        .send(tournamentData)
        .expect(401);
    });

    test('should validate required fields', async () => {
      await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing required fields
          tournament_type: 'round_robin'
        })
        .expect(400);
    });

    test('should validate minimum team count', async () => {
      const tournamentData = {
        name: 'Test Tournament',
        league_id: testLeague.id,
        tournament_type: 'round_robin',
        team_ids: [testTeams[0].id], // Only 1 team
        start_date: '2025-06-01'
      };

      await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData)
        .expect(400);
    });

    test('should validate league exists', async () => {
      const tournamentData = {
        name: 'Test Tournament',
        league_id: '00000000-0000-0000-0000-000000000000',
        tournament_type: 'round_robin',
        team_ids: testTeams.slice(0, 4).map(t => t.id),
        start_date: '2025-06-01'
      };

      await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData)
        .expect(404);
    });

    test('should validate teams belong to league', async () => {
      // Create another league with different teams
      const otherLeague = await knex('leagues').insert({
        organization: 'Okotoks',
        age_group: 'U11',
        gender: 'Girls',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Recreational'
      }).returning('*')[0];

      const otherTeam = await knex('teams').insert({
        name: 'Other Team',
        league_id: otherLeague.id,
        rank: 1,
        location: 'Other Location'
      }).returning('*')[0];

      const tournamentData = {
        name: 'Test Tournament',
        league_id: testLeague.id,
        tournament_type: 'round_robin',
        team_ids: [testTeams[0].id, otherTeam.id], // Mix teams from different leagues
        start_date: '2025-06-01'
      };

      await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData)
        .expect(400);
    });
  });

  describe('POST /api/tournaments/create-games', () => {
    test('should create games from tournament data', async () => {
      // First generate a tournament
      const tournamentData = {
        name: 'Test Championship',
        league_id: testLeague.id,
        tournament_type: 'round_robin',
        team_ids: testTeams.slice(0, 4).map(t => t.id),
        start_date: '2025-06-01',
        venue: 'Test Arena'
      };

      const tournamentResponse = await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData);

      const tournament = tournamentResponse.body.data.tournament;

      // Now create the games
      const response = await request(app)
        .post('/api/tournaments/create-games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          games: tournament.games,
          tournament_name: tournament.name
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(6); // 4 teams = 6 games
      expect(response.body.data.summary.created).toBe(6);

      // Verify games were actually created in database
      const createdGames = await knex('games')
        .where('league_id', testLeague.id);
      expect(createdGames).toHaveLength(6);
    });

    test('should skip placeholder/bye games', async () => {
      const gamesWithByes = [
        {
          home_team_id: testTeams[0].id,
          away_team_id: testTeams[1].id,
          game_date: '2025-06-01',
          game_time: '10:00',
          location: 'Test Arena',
          league_id: testLeague.id
        },
        {
          home_team_id: 'bye-1',
          away_team_id: testTeams[2].id,
          game_date: '2025-06-01',
          game_time: '12:00',
          location: 'Test Arena',
          league_id: testLeague.id
        },
        {
          home_team_id: 'winner-123-456',
          away_team_id: testTeams[3].id,
          game_date: '2025-06-01',
          game_time: '14:00',
          location: 'Test Arena',
          league_id: testLeague.id
        }
      ];

      const response = await request(app)
        .post('/api/tournaments/create-games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          games: gamesWithByes,
          tournament_name: 'Test Tournament'
        })
        .expect(201);

      expect(response.body.data.summary.created).toBe(1); // Only 1 real game
      expect(response.body.data.summary.skipped).toBe(2); // 2 placeholder games
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/tournaments/create-games')
        .send({
          games: [],
          tournament_name: 'Test'
        })
        .expect(401);
    });

    test('should validate games array', async () => {
      await request(app)
        .post('/api/tournaments/create-games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tournament_name: 'Test'
          // Missing games array
        })
        .expect(400);

      await request(app)
        .post('/api/tournaments/create-games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          games: [],
          tournament_name: 'Test'
        })
        .expect(400);
    });
  });

  describe('Tournament Integration', () => {
    test('should set correct pay rates based on league level', async () => {
      const tournamentData = {
        name: 'Elite Tournament',
        league_id: testLeague.id,
        tournament_type: 'round_robin',
        team_ids: testTeams.slice(0, 4).map(t => t.id),
        start_date: '2025-06-01'
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData);

      const tournament = response.body.data.tournament;
      
      // Competitive level should have $35 pay rate
      tournament.games.forEach(game => {
        expect(game.pay_rate).toBe(35);
      });
    });

    test('should set correct referee count based on league level', async () => {
      const tournamentData = {
        name: 'Test Tournament',
        league_id: testLeague.id,
        tournament_type: 'round_robin',
        team_ids: testTeams.slice(0, 4).map(t => t.id),
        start_date: '2025-06-01'
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tournamentData);

      const tournament = response.body.data.tournament;
      
      // Competitive level should need 2 referees
      tournament.games.forEach(game => {
        expect(game.refs_needed).toBe(2);
      });
    });
  });
});
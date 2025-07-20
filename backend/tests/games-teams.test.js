const knex = require('../tests/setup');
const bcrypt = require('bcryptjs');

describe('Games with Team References', () => {
  let adminUser;
  let testLeague;
  let homeTeam;
  let awayTeam;
  let testGame;

  beforeEach(async () => {
    // Create admin user for tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await knex('users').insert({
      email: 'admin@test.com',
      password_hash: hashedPassword,
      role: 'admin',
      name: 'Test Admin'
    }).returning('*')[0];

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
    const teams = await knex('teams').insert([
      {
        name: 'Calgary Storm',
        league_id: testLeague.id,
        rank: 1,
        location: 'Calgary Sports Complex',
        contact_email: 'storm@calgary.com',
        contact_phone: '403-555-0101'
      },
      {
        name: 'Calgary Thunder',
        league_id: testLeague.id,
        rank: 2,
        location: 'Calgary Arena',
        contact_email: 'thunder@calgary.com',
        contact_phone: '403-555-0102'
      }
    ]).returning('*');

    homeTeam = teams[0];
    awayTeam = teams[1];
  });

  describe('Game Creation with Team References', () => {
    test('should create a game with team ID references', async () => {
      testGame = await knex('games').insert({
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        league_id: testLeague.id,
        game_date: '2025-01-15',
        game_time: '19:00',
        location: 'Calgary Sports Complex',
        postal_code: 'T2P3M5',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned',
        wage_multiplier: 1.0,
        wage_multiplier_reason: null
      }).returning('*')[0];

      expect(testGame).toBeDefined();
      expect(testGame.id).toBeDefined();
      expect(testGame.home_team_id).toBe(homeTeam.id);
      expect(testGame.away_team_id).toBe(awayTeam.id);
      expect(testGame.league_id).toBe(testLeague.id);
      expect(testGame.game_date).toBe('2025-01-15');
      expect(testGame.game_time).toBe('19:00');
      expect(testGame.level).toBe('Competitive');
      expect(testGame.pay_rate).toBe(35);
      expect(testGame.refs_needed).toBe(2);
      expect(testGame.status).toBe('unassigned');
      expect(testGame.wage_multiplier).toBe(1.0);
    });

    test('should enforce foreign key constraint for home_team_id', async () => {
      const fakeTeamId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        knex('games').insert({
          home_team_id: fakeTeamId,
          away_team_id: awayTeam.id,
          league_id: testLeague.id,
          game_date: '2025-01-15',
          game_time: '19:00',
          location: 'Test Location',
          postal_code: 'T2P3M5',
          level: 'Competitive',
          pay_rate: 35,
          refs_needed: 2,
          status: 'unassigned'
        })
      ).rejects.toThrow();
    });

    test('should enforce foreign key constraint for away_team_id', async () => {
      const fakeTeamId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        knex('games').insert({
          home_team_id: homeTeam.id,
          away_team_id: fakeTeamId,
          league_id: testLeague.id,
          game_date: '2025-01-15',
          game_time: '19:00',
          location: 'Test Location',
          postal_code: 'T2P3M5',
          level: 'Competitive',
          pay_rate: 35,
          refs_needed: 2,
          status: 'unassigned'
        })
      ).rejects.toThrow();
    });

    test('should enforce foreign key constraint for league_id', async () => {
      const fakeLeagueId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        knex('games').insert({
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          league_id: fakeLeagueId,
          game_date: '2025-01-15',
          game_time: '19:00',
          location: 'Test Location',
          postal_code: 'T2P3M5',
          level: 'Competitive',
          pay_rate: 35,
          refs_needed: 2,
          status: 'unassigned'
        })
      ).rejects.toThrow();
    });

    test('should allow same teams to play multiple games', async () => {
      // Create first game
      const game1 = await knex('games').insert({
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        league_id: testLeague.id,
        game_date: '2025-01-15',
        game_time: '19:00',
        location: 'Calgary Sports Complex',
        postal_code: 'T2P3M5',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*')[0];

      // Create second game with same teams (should work)
      const game2 = await knex('games').insert({
        home_team_id: awayTeam.id, // Reversed
        away_team_id: homeTeam.id, // Reversed
        league_id: testLeague.id,
        game_date: '2025-01-22',
        game_time: '19:00',
        location: 'Calgary Arena',
        postal_code: 'T2P3M5',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*')[0];

      expect(game1).toBeDefined();
      expect(game2).toBeDefined();
      expect(game1.home_team_id).toBe(homeTeam.id);
      expect(game2.home_team_id).toBe(awayTeam.id);
    });
  });

  describe('Game-Team-League Joins', () => {
    beforeEach(async () => {
      // Create additional league and teams
      const league2 = await knex('leagues').insert({
        organization: 'Okotoks',
        age_group: 'U11',
        gender: 'Girls',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Recreational'
      }).returning('*')[0];

      const okotoksTeams = await knex('teams').insert([
        {
          name: 'Okotoks Eagles',
          league_id: league2.id,
          rank: 1,
          location: 'Okotoks Center'
        },
        {
          name: 'Okotoks Hawks',
          league_id: league2.id,
          rank: 2,
          location: 'Okotoks Arena'
        }
      ]).returning('*');

      // Create games
      await knex('games').insert([
        {
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          league_id: testLeague.id,
          game_date: '2025-01-15',
          game_time: '19:00',
          location: 'Calgary Sports Complex',
          postal_code: 'T2P3M5',
          level: 'Competitive',
          pay_rate: 35,
          refs_needed: 2,
          status: 'unassigned'
        },
        {
          home_team_id: okotoksTeams[0].id,
          away_team_id: okotoksTeams[1].id,
          league_id: league2.id,
          game_date: '2025-01-16',
          game_time: '15:00',
          location: 'Okotoks Center',
          postal_code: 'T1S2A1',
          level: 'Recreational',
          pay_rate: 25,
          refs_needed: 2,
          status: 'unassigned'
        }
      ]);
    });

    test('should join games with home and away team information', async () => {
      const gamesWithTeams = await knex('games')
        .join('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .join('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .join('leagues', 'games.league_id', 'leagues.id')
        .select(
          'games.*',
          'home_teams.name as home_team_name',
          'home_teams.rank as home_team_rank',
          'away_teams.name as away_team_name', 
          'away_teams.rank as away_team_rank',
          'leagues.organization',
          'leagues.age_group',
          'leagues.gender',
          'leagues.division'
        );

      expect(gamesWithTeams).toHaveLength(2);

      const calgaryGame = gamesWithTeams.find(g => g.organization === 'Calgary');
      expect(calgaryGame).toBeDefined();
      expect(calgaryGame.home_team_name).toBe('Calgary Storm');
      expect(calgaryGame.away_team_name).toBe('Calgary Thunder');
      expect(calgaryGame.home_team_rank).toBe(1);
      expect(calgaryGame.away_team_rank).toBe(2);
      expect(calgaryGame.level).toBe('Competitive');

      const okotoksGame = gamesWithTeams.find(g => g.organization === 'Okotoks');
      expect(okotoksGame).toBeDefined();
      expect(okotoksGame.home_team_name).toBe('Okotoks Eagles');
      expect(okotoksGame.away_team_name).toBe('Okotoks Hawks');
      expect(okotoksGame.level).toBe('Recreational');
    });

    test('should filter games by league organization', async () => {
      const calgaryGames = await knex('games')
        .join('leagues', 'games.league_id', 'leagues.id')
        .where('leagues.organization', 'Calgary')
        .select('games.*');

      expect(calgaryGames).toHaveLength(1);
      expect(calgaryGames[0].level).toBe('Competitive');
    });

    test('should filter games by team', async () => {
      const stormGames = await knex('games')
        .join('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .join('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .where('home_teams.name', 'Calgary Storm')
        .orWhere('away_teams.name', 'Calgary Storm')
        .select('games.*');

      expect(stormGames).toHaveLength(1);
      expect(stormGames[0].home_team_id).toBe(homeTeam.id);
    });

    test('should get all games for a specific league', async () => {
      const leagueGames = await knex('games')
        .where('league_id', testLeague.id)
        .join('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .join('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .select(
          'games.*',
          'home_teams.name as home_team_name',
          'away_teams.name as away_team_name'
        );

      expect(leagueGames).toHaveLength(1);
      expect(leagueGames[0].home_team_name).toBe('Calgary Storm');
      expect(leagueGames[0].away_team_name).toBe('Calgary Thunder');
    });
  });

  describe('Game Cascade Deletion', () => {
    beforeEach(async () => {
      testGame = await knex('games').insert({
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        league_id: testLeague.id,
        game_date: '2025-01-15',
        game_time: '19:00',
        location: 'Calgary Sports Complex',
        postal_code: 'T2P3M5',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*')[0];
    });

    test('should delete games when home team is deleted', async () => {
      // Verify game exists
      const gamesBefore = await knex('games').where('id', testGame.id);
      expect(gamesBefore).toHaveLength(1);

      // Delete home team
      await knex('teams').where('id', homeTeam.id).del();

      // Verify game was deleted
      const gamesAfter = await knex('games').where('id', testGame.id);
      expect(gamesAfter).toHaveLength(0);
    });

    test('should delete games when away team is deleted', async () => {
      // Verify game exists
      const gamesBefore = await knex('games').where('id', testGame.id);
      expect(gamesBefore).toHaveLength(1);

      // Delete away team
      await knex('teams').where('id', awayTeam.id).del();

      // Verify game was deleted
      const gamesAfter = await knex('games').where('id', testGame.id);
      expect(gamesAfter).toHaveLength(0);
    });

    test('should delete games when league is deleted', async () => {
      // Verify game exists
      const gamesBefore = await knex('games').where('id', testGame.id);
      expect(gamesBefore).toHaveLength(1);

      // Delete league (this will cascade to teams and then games)
      await knex('leagues').where('id', testLeague.id).del();

      // Verify game was deleted
      const gamesAfter = await knex('games').where('id', testGame.id);
      expect(gamesAfter).toHaveLength(0);

      // Verify teams were also deleted
      const teamsAfter = await knex('teams').where('league_id', testLeague.id);
      expect(teamsAfter).toHaveLength(0);
    });
  });

  describe('Game Complex Queries', () => {
    beforeEach(async () => {
      // Create additional test data for complex queries
      const league2 = await knex('leagues').insert({
        organization: 'Okotoks',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Premier',
        season: 'Winter 2025',
        level: 'Elite'
      }).returning('*')[0];

      const eliteTeams = await knex('teams').insert([
        {
          name: 'Okotoks Elite',
          league_id: league2.id,
          rank: 1,
          location: 'Okotoks Championship Center'
        },
        {
          name: 'Calgary Elite',
          league_id: league2.id,
          rank: 2,
          location: 'Calgary Championship Arena'
        }
      ]).returning('*');

      await knex('games').insert([
        {
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          league_id: testLeague.id,
          game_date: '2025-01-15',
          game_time: '19:00',
          location: 'Calgary Sports Complex',
          postal_code: 'T2P3M5',
          level: 'Competitive',
          pay_rate: 35,
          refs_needed: 2,
          status: 'unassigned',
          wage_multiplier: 1.0
        },
        {
          home_team_id: eliteTeams[0].id,
          away_team_id: eliteTeams[1].id,
          league_id: league2.id,
          game_date: '2025-01-20',
          game_time: '18:00',
          location: 'Okotoks Championship Center',
          postal_code: 'T1S2A1',
          level: 'Elite',
          pay_rate: 50,
          refs_needed: 3,
          status: 'unassigned',
          wage_multiplier: 1.5
        }
      ]);
    });

    test('should get games by league level', async () => {
      const eliteGames = await knex('games')
        .join('leagues', 'games.league_id', 'leagues.id')
        .where('leagues.level', 'Elite')
        .select('games.*');

      expect(eliteGames).toHaveLength(1);
      expect(eliteGames[0].pay_rate).toBe(50);
      expect(eliteGames[0].refs_needed).toBe(3);
    });

    test('should get games by age group', async () => {
      const u13Games = await knex('games')
        .join('leagues', 'games.league_id', 'leagues.id')
        .where('leagues.age_group', 'U13')
        .select('games.*');

      expect(u13Games).toHaveLength(1);
      expect(u13Games[0].level).toBe('Competitive');
    });

    test('should calculate total games per team', async () => {
      const teamGameCounts = await knex('teams')
        .select('teams.name')
        .count('games.id as game_count')
        .leftJoin('games', function() {
          this.on('teams.id', '=', 'games.home_team_id')
              .orOn('teams.id', '=', 'games.away_team_id');
        })
        .groupBy('teams.id', 'teams.name')
        .orderBy('teams.name');

      expect(teamGameCounts).toHaveLength(4);
      
      // Each team should have 1 game
      teamGameCounts.forEach(team => {
        expect(parseInt(team.game_count)).toBe(1);
      });
    });
  });

  describe('Game Validation', () => {
    test('should require home_team_id', async () => {
      await expect(
        knex('games').insert({
          away_team_id: awayTeam.id,
          league_id: testLeague.id,
          game_date: '2025-01-15',
          game_time: '19:00',
          location: 'Test Location',
          postal_code: 'T2P3M5',
          level: 'Competitive',
          pay_rate: 35,
          refs_needed: 2,
          status: 'unassigned'
        })
      ).rejects.toThrow();
    });

    test('should require away_team_id', async () => {
      await expect(
        knex('games').insert({
          home_team_id: homeTeam.id,
          league_id: testLeague.id,
          game_date: '2025-01-15',
          game_time: '19:00',
          location: 'Test Location',
          postal_code: 'T2P3M5',
          level: 'Competitive',
          pay_rate: 35,
          refs_needed: 2,
          status: 'unassigned'
        })
      ).rejects.toThrow();
    });

    test('should require league_id', async () => {
      await expect(
        knex('games').insert({
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          game_date: '2025-01-15',
          game_time: '19:00',
          location: 'Test Location',
          postal_code: 'T2P3M5',
          level: 'Competitive',
          pay_rate: 35,
          refs_needed: 2,
          status: 'unassigned'
        })
      ).rejects.toThrow();
    });
  });
});
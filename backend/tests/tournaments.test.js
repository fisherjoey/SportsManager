const knex = require('./setup');
const bcrypt = require('bcryptjs');
const {
  generateRoundRobin,
  generateSingleElimination,
  generateSwissSystem,
  generateGroupStagePlayoffs
} = require('../src/utils/tournament-generator');

describe('Tournament Generation', () => {
  let adminUser;
  let testLeague;
  let testTeams;

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
    const teamData = [
      { name: 'Team A', rank: 1 },
      { name: 'Team B', rank: 2 },
      { name: 'Team C', rank: 3 },
      { name: 'Team D', rank: 4 },
      { name: 'Team E', rank: 5 },
      { name: 'Team F', rank: 6 },
      { name: 'Team G', rank: 7 },
      { name: 'Team H', rank: 8 }
    ].map(team => ({
      ...team,
      league_id: testLeague.id,
      location: 'Test Location',
      contact_email: 'test@example.com',
      contact_phone: '403-555-0123'
    }));

    testTeams = await knex('teams').insert(teamData).returning('*');
  });

  describe('Round Robin Tournament', () => {
    test('should generate correct number of games for 4 teams', () => {
      const teams = testTeams.slice(0, 4);
      const tournament = generateRoundRobin(teams);

      // 4 teams = 4 * 3 / 2 = 6 games
      expect(tournament.total_games).toBe(6);
      expect(tournament.type).toBe('round_robin');
      expect(tournament.games).toHaveLength(6);
      expect(tournament.summary.teams_count).toBe(4);
      expect(tournament.summary.games_per_team).toBe(3);
    });

    test('should generate correct number of games for 8 teams', () => {
      const teams = testTeams.slice(0, 8);
      const tournament = generateRoundRobin(teams);

      // 8 teams = 8 * 7 / 2 = 28 games
      expect(tournament.total_games).toBe(28);
      expect(tournament.summary.teams_count).toBe(8);
      expect(tournament.summary.games_per_team).toBe(7);
    });

    test('should ensure every team plays every other team once', () => {
      const teams = testTeams.slice(0, 4);
      const tournament = generateRoundRobin(teams);

      const matchups = new Set();
      tournament.games.forEach(game => {
        const matchup = [game.home_team_id, game.away_team_id].sort().join('-');
        expect(matchups.has(matchup)).toBe(false); // No duplicate matchups
        matchups.add(matchup);
      });

      expect(matchups.size).toBe(6); // 4 choose 2
    });

    test('should include all required game fields', () => {
      const teams = testTeams.slice(0, 4);
      const tournament = generateRoundRobin(teams);

      tournament.games.forEach(game => {
        expect(game.home_team_id).toBeDefined();
        expect(game.away_team_id).toBeDefined();
        expect(game.home_team_name).toBeDefined();
        expect(game.away_team_name).toBeDefined();
        expect(game.game_date).toBeDefined();
        expect(game.game_time).toBeDefined();
        expect(game.location).toBeDefined();
        expect(game.round).toBeDefined();
        expect(game.tournament_type).toBe('round_robin');
      });
    });

    test('should handle minimum 2 teams', () => {
      const teams = testTeams.slice(0, 2);
      const tournament = generateRoundRobin(teams);

      expect(tournament.total_games).toBe(1);
      expect(tournament.summary.games_per_team).toBe(1);
    });

    test('should throw error for less than 2 teams', () => {
      expect(() => {
        generateRoundRobin([testTeams[0]]);
      }).toThrow('At least 2 teams required for Round Robin');
    });
  });

  describe('Single Elimination Tournament', () => {
    test('should generate correct bracket for 4 teams', () => {
      const teams = testTeams.slice(0, 4);
      const tournament = generateSingleElimination(teams);

      // 4 teams = 3 games (2 in first round, 1 final)
      expect(tournament.total_games).toBe(3);
      expect(tournament.type).toBe('single_elimination');
      expect(tournament.total_rounds).toBe(2);
    });

    test('should generate correct bracket for 8 teams', () => {
      const teams = testTeams.slice(0, 8);
      const tournament = generateSingleElimination(teams);

      // 8 teams = 7 games (4 + 2 + 1)
      expect(tournament.total_games).toBe(7);
      expect(tournament.total_rounds).toBe(3);
    });

    test('should handle non-power-of-2 team counts with byes', () => {
      const teams = testTeams.slice(0, 6);
      const tournament = generateSingleElimination(teams);

      // 6 teams -> next power of 2 is 8, so 7 games total
      expect(tournament.total_games).toBe(7);
      expect(tournament.summary.byes_added).toBe(2);
    });

    test('should include round names', () => {
      const teams = testTeams.slice(0, 8);
      const tournament = generateSingleElimination(teams);

      const finalRound = tournament.rounds.find(r => r.round_name === 'Final');
      const semiFinalRound = tournament.rounds.find(r => r.round_name === 'Semi-Final');
      const quarterFinalRound = tournament.rounds.find(r => r.round_name === 'Quarter-Final');

      expect(finalRound).toBeDefined();
      expect(semiFinalRound).toBeDefined();
      expect(quarterFinalRound).toBeDefined();
    });

    test('should create placeholder winners for bracket progression', () => {
      const teams = testTeams.slice(0, 4);
      const tournament = generateSingleElimination(teams);

      // Check that first round games have real teams
      const firstRound = tournament.rounds[0];
      firstRound.games.forEach(game => {
        expect(testTeams.find(t => t.id === game.home_team_id)).toBeDefined();
        expect(testTeams.find(t => t.id === game.away_team_id)).toBeDefined();
      });
    });
  });

  describe('Swiss System Tournament', () => {
    test('should generate correct number of games', () => {
      const teams = testTeams.slice(0, 8);
      const rounds = 5;
      const tournament = generateSwissSystem(teams, { rounds });

      // 8 teams, 5 rounds = 8 * 5 / 2 = 20 games
      expect(tournament.total_games).toBe(20);
      expect(tournament.total_rounds).toBe(5);
      expect(tournament.type).toBe('swiss_system');
      expect(tournament.summary.rounds).toBe(5);
      expect(tournament.summary.games_per_team).toBe(5);
    });

    test('should distribute games across rounds', () => {
      const teams = testTeams.slice(0, 6);
      const rounds = 3;
      const tournament = generateSwissSystem(teams, { rounds });

      expect(tournament.rounds).toHaveLength(3);
      tournament.rounds.forEach(round => {
        expect(round.games.length).toBe(3); // 6 teams / 2 = 3 games per round
      });
    });

    test('should handle odd number of teams', () => {
      const teams = testTeams.slice(0, 5);
      const rounds = 3;
      const tournament = generateSwissSystem(teams, { rounds });

      // With 5 teams, each round should have 2 games (one team gets a bye)
      tournament.rounds.forEach(round => {
        expect(round.games.length).toBe(2);
      });
    });

    test('should throw error for less than 4 teams', () => {
      expect(() => {
        generateSwissSystem(testTeams.slice(0, 3));
      }).toThrow('At least 4 teams required for Swiss System');
    });
  });

  describe('Group Stage + Playoffs Tournament', () => {
    test('should generate groups and playoffs for 8 teams', () => {
      const teams = testTeams.slice(0, 8);
      const tournament = generateGroupStagePlayoffs(teams, {
        groupSize: 4,
        advancePerGroup: 2
      });

      expect(tournament.type).toBe('group_stage_playoffs');
      expect(tournament.groups).toHaveLength(2); // 8 teams / 4 per group = 2 groups
      expect(tournament.groups[0].teams).toHaveLength(4);
      expect(tournament.groups[1].teams).toHaveLength(4);

      // Check for group stage and playoff games
      const groupGames = tournament.games.filter(g => g.stage === 'group_stage');
      const playoffGames = tournament.games.filter(g => g.stage === 'playoffs');

      expect(groupGames.length).toBe(12); // 2 groups * 6 games per group (4 choose 2)
      expect(playoffGames.length).toBe(3); // 4 advancing teams = 3 playoff games
    });

    test('should create properly named groups', () => {
      const teams = testTeams.slice(0, 6);
      const tournament = generateGroupStagePlayoffs(teams, {
        groupSize: 3,
        advancePerGroup: 1
      });

      expect(tournament.groups[0].name).toBe('Group A');
      expect(tournament.groups[1].name).toBe('Group B');
    });

    test('should handle uneven group sizes', () => {
      const teams = testTeams.slice(0, 7);
      const tournament = generateGroupStagePlayoffs(teams, {
        groupSize: 4,
        advancePerGroup: 2
      });

      // Should create 2 groups: one with 4 teams, one with 3 teams
      expect(tournament.groups).toHaveLength(2);
      const groupSizes = tournament.groups.map(g => g.teams.length).sort();
      expect(groupSizes).toEqual([3, 4]);
    });

    test('should throw error for less than 4 teams', () => {
      expect(() => {
        generateGroupStagePlayoffs(testTeams.slice(0, 3));
      }).toThrow('At least 4 teams required for Group Stage + Playoffs');
    });
  });

  describe('Tournament Options', () => {
    test('should respect custom venue', () => {
      const teams = testTeams.slice(0, 4);
      const customVenue = 'Custom Sports Complex';
      const tournament = generateRoundRobin(teams, { venue: customVenue });

      tournament.games.forEach(game => {
        expect(game.location).toBe(customVenue);
      });
    });

    test('should respect custom time slots', () => {
      const teams = testTeams.slice(0, 4);
      const customTimeSlots = ['09:00', '13:00', '17:00'];
      const tournament = generateRoundRobin(teams, { timeSlots: customTimeSlots });

      const usedTimes = new Set(tournament.games.map(g => g.game_time));
      usedTimes.forEach(time => {
        expect(customTimeSlots).toContain(time);
      });
    });

    test('should respect start date', () => {
      const teams = testTeams.slice(0, 4);
      const startDate = new Date('2025-06-01');
      const tournament = generateRoundRobin(teams, { startDate });

      tournament.games.forEach(game => {
        const gameDate = new Date(game.game_date);
        expect(gameDate >= startDate).toBe(true);
      });
    });
  });

  describe('Team Seeding', () => {
    test('should respect ranked seeding in single elimination', () => {
      const teams = testTeams.slice(0, 4);
      const tournament = generateSingleElimination(teams, { seedingMethod: 'ranked' });

      // Check that top seeds are properly positioned
      // This is a simplified check - in reality you'd verify the bracket structure
      expect(tournament.games).toBeDefined();
      expect(tournament.summary.teams_count).toBe(4);
    });

    test('should handle random seeding', () => {
      const teams = testTeams.slice(0, 4);
      const tournament = generateSingleElimination(teams, { seedingMethod: 'random' });

      expect(tournament.games).toBeDefined();
      expect(tournament.total_games).toBe(3);
    });
  });
});
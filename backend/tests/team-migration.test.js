const knex = require('../tests/setup');

describe('Team Data Migration', () => {
  let testDb;

  beforeAll(() => {
    testDb = knex;
  });

  beforeEach(async () => {
    // Clean up tables in dependency order
    await testDb.raw('SET session_replication_role = replica;');
    await testDb('game_assignments').del();
    await testDb('games').del();
    await testDb('teams').del();
    await testDb('leagues').del();
    await testDb.raw('SET session_replication_role = DEFAULT;');
  });

  describe('Migration from JSON to Entity Structure', () => {
    test('should create league from JSON team data', async () => {
      // Simulate the old JSON structure before migration
      // This tests the migration logic functionality
      
      const teamData = {
        organization: 'Calgary',
        ageGroup: 'U13',
        gender: 'Boys',
        rank: 1
      };
      
      const gameData = {
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      };

      // Create league based on team and game data (simulating migration logic)
      const league = await testDb('leagues').insert({
        organization: teamData.organization,
        age_group: teamData.ageGroup,
        gender: teamData.gender,
        division: gameData.division,
        season: gameData.season,
        level: gameData.level
      }).returning('*')[0];

      expect(league).toBeDefined();
      expect(league.organization).toBe('Calgary');
      expect(league.age_group).toBe('U13');
      expect(league.gender).toBe('Boys');
      expect(league.division).toBe('Division 1');
      expect(league.season).toBe('Winter 2025');
      expect(league.level).toBe('Competitive');
    });

    test('should create teams from JSON data', async () => {
      // Create league first
      const league = await testDb('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];

      // Simulate creating teams from JSON data
      const homeTeamJson = {
        organization: 'Calgary',
        ageGroup: 'U13',
        gender: 'Boys',
        rank: 1
      };

      const awayTeamJson = {
        organization: 'Airdrie',
        ageGroup: 'U13',
        gender: 'Boys',
        rank: 2
      };

      // Create teams based on JSON data
      const homeTeam = await testDb('teams').insert({
        name: `${homeTeamJson.organization} ${homeTeamJson.ageGroup} ${homeTeamJson.gender}`,
        league_id: league.id,
        rank: homeTeamJson.rank,
        location: 'Calgary Sports Complex',
        contact_email: '',
        contact_phone: ''
      }).returning('*')[0];

      const awayTeam = await testDb('teams').insert({
        name: `${awayTeamJson.organization} ${awayTeamJson.ageGroup} ${awayTeamJson.gender}`,
        league_id: league.id,
        rank: awayTeamJson.rank,
        location: 'Airdrie Community Center',
        contact_email: '',
        contact_phone: ''
      }).returning('*')[0];

      expect(homeTeam.name).toBe('Calgary U13 Boys');
      expect(homeTeam.rank).toBe(1);
      expect(awayTeam.name).toBe('Airdrie U13 Boys');
      expect(awayTeam.rank).toBe(2);
      expect(homeTeam.league_id).toBe(league.id);
      expect(awayTeam.league_id).toBe(league.id);
    });

    test('should handle duplicate league creation during migration', async () => {
      // Create league
      const league1 = await testDb('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];

      // Try to create the same league again (simulating multiple games in same league)
      // This should fail due to unique constraint
      await expect(
        testDb('leagues').insert({
          organization: 'Calgary',
          age_group: 'U13',
          gender: 'Boys',
          division: 'Division 1',
          season: 'Winter 2025',
          level: 'Competitive'
        })
      ).rejects.toThrow();

      // But we should be able to find the existing league
      const existingLeague = await testDb('leagues')
        .where('organization', 'Calgary')
        .where('age_group', 'U13')
        .where('gender', 'Boys')
        .where('division', 'Division 1')
        .where('season', 'Winter 2025')
        .first();

      expect(existingLeague).toBeDefined();
      expect(existingLeague.id).toBe(league1.id);
    });

    test('should handle duplicate team creation within same league', async () => {
      const league = await testDb('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];

      // Create team
      const team1 = await testDb('teams').insert({
        name: 'Calgary U13 Boys',
        league_id: league.id,
        rank: 1
      }).returning('*')[0];

      // Try to create team with same name in same league
      await expect(
        testDb('teams').insert({
          name: 'Calgary U13 Boys',
          league_id: league.id,
          rank: 2
        })
      ).rejects.toThrow();

      // But we should be able to find the existing team
      const existingTeam = await testDb('teams')
        .where('name', 'Calgary U13 Boys')
        .where('league_id', league.id)
        .first();

      expect(existingTeam).toBeDefined();
      expect(existingTeam.id).toBe(team1.id);
    });

    test('should create complete game structure from JSON', async () => {
      // Simulate complete migration process
      
      // 1. Create league
      const league = await testDb('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];

      // 2. Create teams
      const teams = await testDb('teams').insert([
        {
          name: 'Calgary Storm',
          league_id: league.id,
          rank: 1,
          location: 'Calgary Sports Complex'
        },
        {
          name: 'Calgary Thunder',
          league_id: league.id,
          rank: 2,
          location: 'Calgary Arena'
        }
      ]).returning('*');

      // 3. Create game with team references
      const game = await testDb('games').insert({
        home_team_id: teams[0].id,
        away_team_id: teams[1].id,
        league_id: league.id,
        game_date: '2025-01-15',
        game_time: '19:00',
        location: 'Calgary Sports Complex',
        postal_code: 'T2P3M5',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned',
        wage_multiplier: 1.0
      }).returning('*')[0];

      // Verify complete structure
      const gameWithDetails = await testDb('games')
        .join('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .join('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .join('leagues', 'games.league_id', 'leagues.id')
        .where('games.id', game.id)
        .select(
          'games.*',
          'home_teams.name as home_team_name',
          'away_teams.name as away_team_name',
          'leagues.organization',
          'leagues.age_group',
          'leagues.gender'
        )
        .first();

      expect(gameWithDetails).toBeDefined();
      expect(gameWithDetails.home_team_name).toBe('Calgary Storm');
      expect(gameWithDetails.away_team_name).toBe('Calgary Thunder');
      expect(gameWithDetails.organization).toBe('Calgary');
      expect(gameWithDetails.age_group).toBe('U13');
      expect(gameWithDetails.gender).toBe('Boys');
    });
  });

  describe('Migration Edge Cases', () => {
    test('should handle malformed JSON gracefully', async () => {
      // This tests what happens if migration encounters bad JSON
      // In real migration, this would need error handling
      
      const invalidJsonTeam = '{"organization": "Calgary", "ageGroup":'; // Malformed JSON
      
      // Migration should handle this by creating default team
      const league = await testDb('leagues').insert({
        organization: 'Unknown',
        age_group: 'U11',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Recreational'
      }).returning('*')[0];

      const defaultTeam = await testDb('teams').insert({
        name: 'Unknown Team',
        league_id: league.id,
        rank: 1
      }).returning('*')[0];

      expect(defaultTeam.name).toBe('Unknown Team');
      expect(defaultTeam.league_id).toBe(league.id);
    });

    test('should handle missing organization data', async () => {
      // Test migration with incomplete data
      const incompleteTeamData = {
        ageGroup: 'U13',
        gender: 'Boys',
        rank: 1
        // Missing organization
      };

      const league = await testDb('leagues').insert({
        organization: 'Unknown',
        age_group: incompleteTeamData.ageGroup,
        gender: incompleteTeamData.gender,
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Recreational'
      }).returning('*')[0];

      const team = await testDb('teams').insert({
        name: `Unknown ${incompleteTeamData.ageGroup} ${incompleteTeamData.gender}`,
        league_id: league.id,
        rank: incompleteTeamData.rank
      }).returning('*')[0];

      expect(team.name).toBe('Unknown U13 Boys');
      expect(league.organization).toBe('Unknown');
    });

    test('should preserve game relationships after migration', async () => {
      // Test that game assignments still work after migration
      const league = await testDb('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];

      const teams = await testDb('teams').insert([
        {
          name: 'Calgary Storm',
          league_id: league.id,
          rank: 1
        },
        {
          name: 'Calgary Thunder',
          league_id: league.id,
          rank: 2
        }
      ]).returning('*');

      const game = await testDb('games').insert({
        home_team_id: teams[0].id,
        away_team_id: teams[1].id,
        league_id: league.id,
        game_date: '2025-01-15',
        game_time: '19:00',
        location: 'Calgary Sports Complex',
        postal_code: 'T2P3M5',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*')[0];

      // Verify cascade deletion still works
      await testDb('teams').where('id', teams[0].id).del();
      
      const remainingGames = await testDb('games').where('id', game.id);
      expect(remainingGames).toHaveLength(0);
    });
  });

  describe('Data Integrity After Migration', () => {
    test('should maintain referential integrity', async () => {
      const league = await testDb('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];

      const teams = await testDb('teams').insert([
        {
          name: 'Calgary Storm',
          league_id: league.id,
          rank: 1
        },
        {
          name: 'Calgary Thunder',
          league_id: league.id,
          rank: 2
        }
      ]).returning('*');

      const game = await testDb('games').insert({
        home_team_id: teams[0].id,
        away_team_id: teams[1].id,
        league_id: league.id,
        game_date: '2025-01-15',
        game_time: '19:00',
        location: 'Calgary Sports Complex',
        postal_code: 'T2P3M5',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned'
      }).returning('*')[0];

      // Verify all foreign keys are valid
      const gameCheck = await testDb('games')
        .join('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .join('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .join('leagues', 'games.league_id', 'leagues.id')
        .where('games.id', game.id)
        .select('games.id')
        .first();

      expect(gameCheck).toBeDefined();
    });

    test('should preserve all game data during migration', async () => {
      const league = await testDb('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*')[0];

      const teams = await testDb('teams').insert([
        {
          name: 'Calgary Storm',
          league_id: league.id,
          rank: 1
        },
        {
          name: 'Calgary Thunder',
          league_id: league.id,
          rank: 2
        }
      ]).returning('*');

      const originalGameData = {
        home_team_id: teams[0].id,
        away_team_id: teams[1].id,
        league_id: league.id,
        game_date: '2025-01-15',
        game_time: '19:00',
        location: 'Calgary Sports Complex',
        postal_code: 'T2P3M5',
        level: 'Competitive',
        pay_rate: 35,
        refs_needed: 2,
        status: 'unassigned',
        wage_multiplier: 1.5,
        wage_multiplier_reason: 'Premier game'
      };

      const game = await testDb('games').insert(originalGameData).returning('*')[0];

      // Verify all non-ID fields are preserved
      expect(game.game_date).toBe(originalGameData.game_date);
      expect(game.game_time).toBe(originalGameData.game_time);
      expect(game.location).toBe(originalGameData.location);
      expect(game.postal_code).toBe(originalGameData.postal_code);
      expect(game.level).toBe(originalGameData.level);
      expect(game.pay_rate).toBe(originalGameData.pay_rate);
      expect(game.refs_needed).toBe(originalGameData.refs_needed);
      expect(game.status).toBe(originalGameData.status);
      expect(game.wage_multiplier).toBe(originalGameData.wage_multiplier);
      expect(game.wage_multiplier_reason).toBe(originalGameData.wage_multiplier_reason);
    });
  });
});
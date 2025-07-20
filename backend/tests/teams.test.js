const knex = require('../tests/setup');
const bcrypt = require('bcryptjs');

describe('Teams', () => {
  let adminUser;
  let testLeague1;
  let testLeague2;
  let testTeam;

  beforeEach(async () => {
    // Create admin user for tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await knex('users').insert({
      email: 'admin@test.com',
      password_hash: hashedPassword,
      role: 'admin',
      name: 'Test Admin'
    }).returning('*')[0];

    // Create test leagues
    const leagues = await knex('leagues').insert([
      {
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
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
    ]).returning('*');

    testLeague1 = leagues[0];
    testLeague2 = leagues[1];
  });

  describe('Team Creation', () => {
    test('should create a team with all required fields', async () => {
      testTeam = await knex('teams').insert({
        name: 'Calgary Storm',
        league_id: testLeague1.id,
        rank: 1,
        location: 'Calgary Sports Complex',
        contact_email: 'storm@calgary.com',
        contact_phone: '403-555-0101'
      }).returning('*')[0];

      expect(testTeam).toBeDefined();
      expect(testTeam.id).toBeDefined();
      expect(testTeam.name).toBe('Calgary Storm');
      expect(testTeam.league_id).toBe(testLeague1.id);
      expect(testTeam.rank).toBe(1);
      expect(testTeam.location).toBe('Calgary Sports Complex');
      expect(testTeam.contact_email).toBe('storm@calgary.com');
      expect(testTeam.contact_phone).toBe('403-555-0101');
      expect(testTeam.created_at).toBeDefined();
      expect(testTeam.updated_at).toBeDefined();
    });

    test('should create team with minimal required fields', async () => {
      testTeam = await knex('teams').insert({
        name: 'Okotoks Eagles',
        league_id: testLeague2.id,
        rank: 2
      }).returning('*')[0];

      expect(testTeam).toBeDefined();
      expect(testTeam.name).toBe('Okotoks Eagles');
      expect(testTeam.league_id).toBe(testLeague2.id);
      expect(testTeam.rank).toBe(2);
    });

    test('should enforce unique team name within league', async () => {
      // Create first team
      await knex('teams').insert({
        name: 'Calgary Thunder',
        league_id: testLeague1.id,
        rank: 1
      });

      // Try to create team with same name in same league
      await expect(
        knex('teams').insert({
          name: 'Calgary Thunder',
          league_id: testLeague1.id,
          rank: 2
        })
      ).rejects.toThrow();
    });

    test('should allow same team name in different leagues', async () => {
      // Create team in first league
      await knex('teams').insert({
        name: 'Eagles',
        league_id: testLeague1.id,
        rank: 1
      });

      // Create team with same name in different league (should work)
      const team2 = await knex('teams').insert({
        name: 'Eagles',
        league_id: testLeague2.id,
        rank: 1
      }).returning('*')[0];

      expect(team2).toBeDefined();
      expect(team2.name).toBe('Eagles');
      expect(team2.league_id).toBe(testLeague2.id);
    });

    test('should enforce foreign key constraint for league_id', async () => {
      const fakeLeagueId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        knex('teams').insert({
          name: 'Invalid Team',
          league_id: fakeLeagueId,
          rank: 1
        })
      ).rejects.toThrow();
    });

    test('should set default rank to 1', async () => {
      testTeam = await knex('teams').insert({
        name: 'Default Rank Team',
        league_id: testLeague1.id
      }).returning('*')[0];

      expect(testTeam.rank).toBe(1);
    });
  });

  describe('Team-League Relationships', () => {
    beforeEach(async () => {
      // Create teams in different leagues
      await knex('teams').insert([
        {
          name: 'Calgary Storm',
          league_id: testLeague1.id,
          rank: 1,
          location: 'Calgary Sports Complex'
        },
        {
          name: 'Calgary Thunder',
          league_id: testLeague1.id,
          rank: 2,
          location: 'Calgary Arena'
        },
        {
          name: 'Okotoks Lightning',
          league_id: testLeague2.id,
          rank: 1,
          location: 'Okotoks Center'
        }
      ]);
    });

    test('should join teams with their league information', async () => {
      const teamsWithLeagues = await knex('teams')
        .join('leagues', 'teams.league_id', 'leagues.id')
        .select(
          'teams.*',
          'leagues.organization',
          'leagues.age_group',
          'leagues.gender',
          'leagues.division',
          'leagues.season',
          'leagues.level'
        );

      expect(teamsWithLeagues).toHaveLength(3);
      
      const calgaryTeams = teamsWithLeagues.filter(t => t.organization === 'Calgary');
      expect(calgaryTeams).toHaveLength(2);
      calgaryTeams.forEach(team => {
        expect(team.organization).toBe('Calgary');
        expect(team.age_group).toBe('U13');
        expect(team.gender).toBe('Boys');
        expect(team.level).toBe('Competitive');
      });

      const okotoksTeams = teamsWithLeagues.filter(t => t.organization === 'Okotoks');
      expect(okotoksTeams).toHaveLength(1);
      expect(okotoksTeams[0].organization).toBe('Okotoks');
      expect(okotoksTeams[0].age_group).toBe('U11');
      expect(okotoksTeams[0].gender).toBe('Girls');
      expect(okotoksTeams[0].level).toBe('Recreational');
    });

    test('should filter teams by league criteria', async () => {
      const competitiveTeams = await knex('teams')
        .join('leagues', 'teams.league_id', 'leagues.id')
        .where('leagues.level', 'Competitive')
        .select('teams.*');

      expect(competitiveTeams).toHaveLength(2);
      competitiveTeams.forEach(team => {
        expect(['Calgary Storm', 'Calgary Thunder']).toContain(team.name);
      });
    });

    test('should get teams by organization', async () => {
      const calgaryTeams = await knex('teams')
        .join('leagues', 'teams.league_id', 'leagues.id')
        .where('leagues.organization', 'Calgary')
        .select('teams.*');

      expect(calgaryTeams).toHaveLength(2);
      expect(calgaryTeams.map(t => t.name).sort()).toEqual(['Calgary Storm', 'Calgary Thunder']);
    });

    test('should get teams by age group and gender', async () => {
      const u11GirlsTeams = await knex('teams')
        .join('leagues', 'teams.league_id', 'leagues.id')
        .where('leagues.age_group', 'U11')
        .where('leagues.gender', 'Girls')
        .select('teams.*');

      expect(u11GirlsTeams).toHaveLength(1);
      expect(u11GirlsTeams[0].name).toBe('Okotoks Lightning');
    });
  });

  describe('Team Cascade Deletion', () => {
    test('should delete teams when league is deleted', async () => {
      // Create team
      await knex('teams').insert({
        name: 'Test Team',
        league_id: testLeague1.id,
        rank: 1
      });

      // Verify team exists
      const teamsBefore = await knex('teams').where('league_id', testLeague1.id);
      expect(teamsBefore).toHaveLength(1);

      // Delete league
      await knex('leagues').where('id', testLeague1.id).del();

      // Verify team was deleted
      const teamsAfter = await knex('teams').where('league_id', testLeague1.id);
      expect(teamsAfter).toHaveLength(0);
    });
  });

  describe('Team Queries and Sorting', () => {
    beforeEach(async () => {
      await knex('teams').insert([
        {
          name: 'Team Alpha',
          league_id: testLeague1.id,
          rank: 3
        },
        {
          name: 'Team Beta',
          league_id: testLeague1.id,
          rank: 1
        },
        {
          name: 'Team Gamma',
          league_id: testLeague1.id,
          rank: 2
        }
      ]);
    });

    test('should sort teams by rank within league', async () => {
      const sortedTeams = await knex('teams')
        .where('league_id', testLeague1.id)
        .orderBy('rank', 'asc');

      expect(sortedTeams).toHaveLength(3);
      expect(sortedTeams[0].name).toBe('Team Beta');
      expect(sortedTeams[0].rank).toBe(1);
      expect(sortedTeams[1].name).toBe('Team Gamma');
      expect(sortedTeams[1].rank).toBe(2);
      expect(sortedTeams[2].name).toBe('Team Alpha');
      expect(sortedTeams[2].rank).toBe(3);
    });

    test('should filter teams by rank', async () => {
      const topTeams = await knex('teams')
        .where('league_id', testLeague1.id)
        .where('rank', '<=', 2)
        .orderBy('rank', 'asc');

      expect(topTeams).toHaveLength(2);
      expect(topTeams[0].name).toBe('Team Beta');
      expect(topTeams[1].name).toBe('Team Gamma');
    });
  });

  describe('Team Validation', () => {
    test('should require team name', async () => {
      await expect(
        knex('teams').insert({
          league_id: testLeague1.id,
          rank: 1
        })
      ).rejects.toThrow();
    });

    test('should require league_id', async () => {
      await expect(
        knex('teams').insert({
          name: 'Test Team',
          rank: 1
        })
      ).rejects.toThrow();
    });
  });
});
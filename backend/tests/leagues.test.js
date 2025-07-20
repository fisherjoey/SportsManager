const knex = require('../tests/setup');
const bcrypt = require('bcryptjs');

describe('Leagues', () => {
  let adminUser;
  let testLeague;

  beforeEach(async () => {
    // Create admin user for tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await knex('users').insert({
      email: 'admin@test.com',
      password_hash: hashedPassword,
      role: 'admin',
      name: 'Test Admin'
    }).returning('*')[0];
  });

  describe('League Creation', () => {
    test('should create a league with all required fields', async () => {
      const [league] = await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*');
      testLeague = league;

      expect(testLeague).toBeDefined();
      expect(testLeague.id).toBeDefined();
      expect(testLeague.organization).toBe('Calgary');
      expect(testLeague.age_group).toBe('U13');
      expect(testLeague.gender).toBe('Boys');
      expect(testLeague.division).toBe('Division 1');
      expect(testLeague.season).toBe('Winter 2025');
      expect(testLeague.level).toBe('Competitive');
      expect(testLeague.created_at).toBeDefined();
      expect(testLeague.updated_at).toBeDefined();
    });

    test('should enforce unique constraint on league combination', async () => {
      // Create first league
      await knex('leagues').insert({
        organization: 'Okotoks',
        age_group: 'U11',
        gender: 'Girls',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Recreational'
      });

      // Try to create duplicate league
      await expect(
        knex('leagues').insert({
          organization: 'Okotoks',
          age_group: 'U11',
          gender: 'Girls',
          division: 'Division 1',
          season: 'Winter 2025',
          level: 'Recreational'
        })
      ).rejects.toThrow();
    });

    test('should allow same organization/age/gender in different seasons', async () => {
      // Create Winter league
      await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      });

      // Create Spring league (should work)
      const [springLeague] = await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Spring 2025',
        level: 'Competitive'
      }).returning('*');

      expect(springLeague).toBeDefined();
      expect(springLeague.season).toBe('Spring 2025');
    });

    test('should allow same organization/age/gender in different divisions', async () => {
      // Create Division 1 league
      await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 1',
        season: 'Winter 2025',
        level: 'Competitive'
      });

      // Create Division 2 league (should work)
      const [div2League] = await knex('leagues').insert({
        organization: 'Calgary',
        age_group: 'U13',
        gender: 'Boys',
        division: 'Division 2',
        season: 'Winter 2025',
        level: 'Competitive'
      }).returning('*');

      expect(div2League).toBeDefined();
      expect(div2League.division).toBe('Division 2');
    });
  });

  describe('League Queries', () => {
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
        },
        {
          organization: 'Calgary',
          age_group: 'U15',
          gender: 'Boys',
          division: 'Premier',
          season: 'Winter 2025',
          level: 'Elite'
        }
      ]);
    });

    test('should filter leagues by organization', async () => {
      const calgaryLeagues = await knex('leagues')
        .where('organization', 'Calgary');

      expect(calgaryLeagues).toHaveLength(3);
      calgaryLeagues.forEach(league => {
        expect(league.organization).toBe('Calgary');
      });
    });

    test('should filter leagues by age group', async () => {
      const u11Leagues = await knex('leagues')
        .where('age_group', 'U11');

      expect(u11Leagues).toHaveLength(2);
      u11Leagues.forEach(league => {
        expect(league.age_group).toBe('U11');
      });
    });

    test('should filter leagues by level', async () => {
      const recreationalLeagues = await knex('leagues')
        .where('level', 'Recreational');

      expect(recreationalLeagues).toHaveLength(2);
      recreationalLeagues.forEach(league => {
        expect(league.level).toBe('Recreational');
      });
    });

    test('should filter leagues by season', async () => {
      const winterLeagues = await knex('leagues')
        .where('season', 'Winter 2025');

      expect(winterLeagues).toHaveLength(4);
      winterLeagues.forEach(league => {
        expect(league.season).toBe('Winter 2025');
      });
    });

    test('should filter leagues by multiple criteria', async () => {
      const specificLeagues = await knex('leagues')
        .where('organization', 'Calgary')
        .where('gender', 'Boys')
        .where('level', 'Competitive');

      expect(specificLeagues).toHaveLength(1);
      expect(specificLeagues[0].age_group).toBe('U13');
      expect(specificLeagues[0].division).toBe('Division 2');
    });
  });

  describe('League Validation', () => {
    test('should require all mandatory fields', async () => {
      await expect(
        knex('leagues').insert({
          organization: 'Calgary',
          age_group: 'U13',
          gender: 'Boys'
          // Missing division, season, level
        })
      ).rejects.toThrow();
    });
  });
});
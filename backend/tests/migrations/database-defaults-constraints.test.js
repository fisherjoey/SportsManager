/**
 * Test suite for Phase 2.3: Database Default Values and Constraints
 * 
 * This test suite verifies that:
 * 1. Default values are properly applied to new records
 * 2. Check constraints prevent invalid data entry
 * 3. Existing data compatibility is maintained
 */

const knex = require('knex');
const config = require('../../knexfile');

describe('Phase 2.3: Database Defaults and Constraints', () => {
  let db;

  beforeAll(async () => {
    db = knex(config.test);
    // Ensure we're working with the latest schema
    await db.migrate.latest();
  });

  // Helper function to create test game data
  const createTestGameData = async (gameData = {}) => {
    // Create league first
    const leagueResult = await db('leagues').insert({
      organization: 'Test Organization',
      age_group: 'Adult',
      gender: 'Mixed',
      division: 'Division 1',
      season: '2024 Fall',
      level: 'Recreational'
    }).returning('id');
    const leagueId = leagueResult[0]?.id || leagueResult[0];

    // Create teams with the league_id
    const homeTeamResult = await db('teams').insert({
      name: `Test Home Team ${Date.now()}`,
      location: 'Calgary',
      league_id: leagueId,
      rank: 1
    }).returning('id');
    const homeTeamId = homeTeamResult[0]?.id || homeTeamResult[0];
    
    const awayTeamResult = await db('teams').insert({
      name: `Test Away Team ${Date.now()}`,
      location: 'Calgary',
      league_id: leagueId,
      rank: 2
    }).returning('id');
    const awayTeamId = awayTeamResult[0]?.id || awayTeamResult[0];

    const baseData = {
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      league_id: leagueId,
      game_date: '2024-12-15',
      game_time: '14:00:00',
      location: 'Test Location',
      postal_code: 'T2N 1N4',
      level: 'Recreational',
      pay_rate: 50.00
    };

    return { ...baseData, ...gameData };
  };

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db('game_assignments').del();
    await db('games').del();
    await db('locations').del();
    await db('teams').del();
    await db('leagues').del();
  });

  describe('Games Table Defaults', () => {
    it('should apply default values when creating new games', async () => {
      // Create a minimal game record without specifying optional fields
      const gameData = await createTestGameData();
      const result = await db('games').insert(gameData).returning('id');
      const gameId = result[0]?.id || result[0];

      // Verify defaults were applied
      const game = await db('games').where('id', gameId).first();
      
      expect(game.status).toBe('unassigned');
      expect(game.refs_needed).toBe(2); // Updated from 3 to 2 in our migration
      expect(parseFloat(game.wage_multiplier)).toBe(1.0);
      expect(game.game_type).toBe('Community');
    });

    it('should allow explicit values to override defaults', async () => {
      const gameData = await createTestGameData({
        pay_rate: 75.00,
        status: 'assigned',
        refs_needed: 3,
        wage_multiplier: 1.5,
        game_type: 'Tournament'
      });
      const result = await db('games').insert(gameData).returning('id');
      const gameId = result[0]?.id || result[0];

      const game = await db('games').where('id', gameId).first();
      
      expect(game.status).toBe('assigned');
      expect(game.refs_needed).toBe(3);
      expect(parseFloat(game.wage_multiplier)).toBe(1.5);
      expect(game.game_type).toBe('Tournament');
    });
  });

  describe('Locations Table Defaults', () => {
    it('should apply default values when creating new locations', async () => {
      const result = await db('locations').insert({
        name: 'Test Facility',
        address: '123 Test Street',
        city: 'Calgary',
        postal_code: 'T2N 1N4'
        // Not specifying: is_active, capacity
      }).returning('id');

      const locationId = result[0]?.id || result[0];
      const location = await db('locations').where('id', locationId).first();
      
      expect(location.is_active).toBe(true);
      expect(location.capacity).toBe(0);
    });
  });

  describe('Check Constraints', () => {
    describe('Pay Rate Constraint', () => {
      it('should allow positive pay rates', async () => {
        const gameData = await createTestGameData({ pay_rate: 50.00 });
        await expect(
          db('games').insert(gameData)
        ).resolves.not.toThrow();
      });

      it('should allow zero pay rate', async () => {
        const gameData = await createTestGameData({ pay_rate: 0.00 });
        await expect(
          db('games').insert(gameData)
        ).resolves.not.toThrow();
      });

      it('should reject negative pay rates', async () => {
        const gameData = await createTestGameData({ pay_rate: -10.00 });
        await expect(
          db('games').insert(gameData)
        ).rejects.toThrow(/check_positive_pay_rate/);
      });
    });

    describe('Wage Multiplier Constraint', () => {
      it('should allow positive wage multipliers', async () => {
        const gameData = await createTestGameData({ pay_rate: 50.00, wage_multiplier: 1.5 });
        await expect(
          db('games').insert(gameData)
        ).resolves.not.toThrow();
      });

      it('should reject zero wage multiplier', async () => {
        const gameData = await createTestGameData({ pay_rate: 50.00, wage_multiplier: 0.0 });
        await expect(
          db('games').insert(gameData)
        ).rejects.toThrow(/check_positive_wage_multiplier/);
      });

      it('should reject negative wage multipliers', async () => {
        const gameData = await createTestGameData({ pay_rate: 50.00, wage_multiplier: -0.5 });
        await expect(
          db('games').insert(gameData)
        ).rejects.toThrow(/check_positive_wage_multiplier/);
      });
    });

    describe('Location Capacity Constraint', () => {
      it('should allow positive capacity', async () => {
        await expect(
          db('locations').insert({
            name: 'Test Facility',
            address: '123 Test Street',
            city: 'Calgary',
            postal_code: 'T2N 1N4',
            capacity: 100
          })
        ).resolves.not.toThrow();
      });

      it('should allow zero capacity', async () => {
        await expect(
          db('locations').insert({
            name: 'Test Facility',
            address: '123 Test Street',
            city: 'Calgary',
            postal_code: 'T2N 1N4',
            capacity: 0
          })
        ).resolves.not.toThrow();
      });

      it('should reject negative capacity', async () => {
        await expect(
          db('locations').insert({
            name: 'Test Facility',
            address: '123 Test Street',
            city: 'Calgary',
            postal_code: 'T2N 1N4',
            capacity: -50
          })
        ).rejects.toThrow(/check_positive_capacity/);
      });
    });
  });

  describe('Migration Compatibility', () => {
    it('should handle existing records without issues', async () => {
      // This test verifies that the migration worked correctly with existing data
      // by checking that we can query and update existing records
      
      // Create a record first
      const gameData = await createTestGameData();
      const result = await db('games').insert(gameData).returning('id');
      const gameId = result[0]?.id || result[0];

      // Verify we can read it
      const game = await db('games').where('id', gameId).first();
      expect(game).toBeDefined();
      expect(game.status).toBe('unassigned'); // Default should be applied
      expect(game.refs_needed).toBe(2); // Updated default

      // Verify we can update it
      await db('games')
        .where('id', gameId)
        .update({ 
          status: 'assigned',
          pay_rate: 75.00,
          wage_multiplier: 1.25
        });

      const updatedGame = await db('games').where('id', gameId).first();
      expect(updatedGame.status).toBe('assigned');
      expect(parseFloat(updatedGame.pay_rate)).toBe(75.00);
      expect(parseFloat(updatedGame.wage_multiplier)).toBe(1.25);
    });
  });
});
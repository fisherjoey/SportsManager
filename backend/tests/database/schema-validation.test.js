/**
 * @fileoverview Database Schema Validation Tests
 * These tests ensure the database schema remains consistent and validates all required tables,
 * columns, constraints, and relationships. Critical for preventing regression during refactoring.
 */

const knex = require('knex');
const config = require('../../knexfile');

// Use test database configuration
const testDb = knex(config.test);

describe('Database Schema Validation', () => {
  beforeAll(async () => {
    // Ensure test database is migrated to latest
    await testDb.migrate.latest();
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  describe('Core Tables Exist', () => {
    const requiredTables = [
      'users',
      'positions', 
      'referee_levels',
      'leagues',
      'teams',
      'games',
      'game_assignments',
      'referee_availability',
      'invitations'
    ];

    test.each(requiredTables)('Table %s should exist', async (tableName) => {
      const exists = await testDb.schema.hasTable(tableName);
      expect(exists).toBe(true);
    });
  });

  describe('Users Table Schema', () => {
    let userColumns;

    beforeAll(async () => {
      userColumns = await testDb('information_schema.columns')
        .where('table_name', 'users')
        .select('column_name', 'data_type', 'is_nullable', 'column_default');
    });

    const requiredUserColumns = [
      { name: 'id', type: 'uuid', nullable: 'NO' },
      { name: 'email', type: 'character varying', nullable: 'NO' },
      { name: 'password_hash', type: 'character varying', nullable: 'NO' },
      { name: 'role', type: 'character varying', nullable: 'NO' },
      { name: 'name', type: 'character varying', nullable: 'YES' },
      { name: 'phone', type: 'character varying', nullable: 'YES' },
      { name: 'location', type: 'character varying', nullable: 'YES' },
      { name: 'postal_code', type: 'character varying', nullable: 'YES' },
      { name: 'max_distance', type: 'integer', nullable: 'YES' },
      { name: 'is_available', type: 'boolean', nullable: 'YES' },
      { name: 'referee_level_id', type: 'uuid', nullable: 'YES' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: 'NO' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: 'NO' }
    ];

    test.each(requiredUserColumns)('Users table should have column $name with correct type', async ({ name, type, nullable }) => {
      const column = userColumns.find(col => col.column_name === name);
      expect(column).toBeDefined();
      expect(column.data_type).toBe(type);
      expect(column.is_nullable).toBe(nullable);
    });

    it('should have unique constraint on email', async () => {
      const constraints = await testDb.raw(`
        SELECT conname, contype 
        FROM pg_constraint 
        WHERE conrelid = 'users'::regclass 
        AND contype = 'u'
      `);
      
      const emailUnique = constraints.rows.some(c => c.conname.includes('email'));
      expect(emailUnique).toBe(true);
    });
  });

  describe('Games Table Schema', () => {
    let gameColumns;

    beforeAll(async () => {
      gameColumns = await testDb('information_schema.columns')
        .where('table_name', 'games')
        .select('column_name', 'data_type', 'is_nullable');
    });

    const requiredGameColumns = [
      { name: 'id', type: 'uuid', nullable: 'NO' },
      { name: 'home_team_id', type: 'uuid', nullable: 'NO' },
      { name: 'away_team_id', type: 'uuid', nullable: 'NO' },
      { name: 'game_date', type: 'date', nullable: 'NO' },
      { name: 'game_time', type: 'time without time zone', nullable: 'NO' },
      { name: 'location', type: 'character varying', nullable: 'NO' },
      { name: 'postal_code', type: 'character varying', nullable: 'NO' },
      { name: 'level', type: 'character varying', nullable: 'NO' },
      { name: 'status', type: 'character varying', nullable: 'NO' },
      { name: 'refs_needed', type: 'integer', nullable: 'NO' },
      { name: 'wage_multiplier', type: 'numeric', nullable: 'YES' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: 'NO' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: 'NO' }
    ];

    test.each(requiredGameColumns)('Games table should have column $name with correct type', async ({ name, type, nullable }) => {
      const column = gameColumns.find(col => col.column_name === name);
      expect(column).toBeDefined();
      expect(column.data_type).toBe(type);
      expect(column.is_nullable).toBe(nullable);
    });

    it('should have foreign key constraints', async () => {
      const constraints = await testDb.raw(`
        SELECT
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'games'
      `);
      
      const homeTeamFK = constraints.rows.some(c => 
        c.column_name === 'home_team_id' && c.foreign_table_name === 'teams'
      );
      const awayTeamFK = constraints.rows.some(c => 
        c.column_name === 'away_team_id' && c.foreign_table_name === 'teams'
      );
      
      expect(homeTeamFK).toBe(true);
      expect(awayTeamFK).toBe(true);
    });
  });

  describe('Teams and Leagues Relationship', () => {
    it('should have proper foreign key relationship between teams and leagues', async () => {
      const constraints = await testDb.raw(`
        SELECT
          tc.constraint_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'teams'
        AND kcu.column_name = 'league_id'
      `);
      
      expect(constraints.rows.length).toBeGreaterThan(0);
      expect(constraints.rows[0].foreign_table_name).toBe('leagues');
      expect(constraints.rows[0].foreign_column_name).toBe('id');
    });
  });

  describe('Game Assignments Relationships', () => {
    it('should have all required foreign keys', async () => {
      const constraints = await testDb.raw(`
        SELECT
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'game_assignments'
      `);
      
      const expectedFKs = [
        { column: 'game_id', references: 'games' },
        { column: 'referee_id', references: 'referees' },
        { column: 'position_id', references: 'positions' }
      ];
      
      expectedFKs.forEach(({ column, references }) => {
        const fk = constraints.rows.find(c => 
          c.column_name === column && c.foreign_table_name === references
        );
        expect(fk).toBeDefined();
      });
    });
  });

  describe('Database Constraints and Indexes', () => {
    it('should have unique constraint on user email', async () => {
      // Try to insert duplicate email - should fail
      await testDb('users').insert({
        email: 'test@unique.com',
        password_hash: 'hash123',
        role: 'admin',
        name: 'Test User'
      });

      await expect(
        testDb('users').insert({
          email: 'test@unique.com', // Duplicate email
          password_hash: 'hash456',
          role: 'referee',
          name: 'Another User'
        })
      ).rejects.toThrow();

      // Cleanup
      await testDb('users').where('email', 'test@unique.com').del();
    });

    it('should enforce not-null constraints', async () => {
      // Missing required fields should fail
      await expect(
        testDb('users').insert({
          // Missing email, password_hash, role
          name: 'Incomplete User'
        })
      ).rejects.toThrow();
    });

    it('should have proper cascade behavior for game deletions', async () => {
      // Create test data
      const [league] = await testDb('leagues').insert({
        organization: 'Test Org',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Division 1',
        season: '2024/25',
        level: 'Competitive'
      }).returning('*');

      const [team1, team2] = await testDb('teams').insert([
        { name: 'Team A', location: 'Stadium A', league_id: league.id },
        { name: 'Team B', location: 'Stadium B', league_id: league.id }
      ]).returning('*');

      const [game] = await testDb('games').insert({
        home_team_id: team1.id,
        away_team_id: team2.id,
        game_date: '2024-12-01',
        game_time: '14:00',
        location: 'Test Stadium',
        postal_code: 'T1S 1A1',
        level: 'Competitive',
        status: 'unassigned',
        refs_needed: 2
      }).returning('*');

      // Insert assignment
      const [user] = await testDb('users').insert({
        email: 'test.ref@example.com',
        password_hash: 'hash123',
        role: 'referee',
        name: 'Test Referee'
      }).returning('*');

      const [referee] = await testDb('referees').insert({
        user_id: user.id
      }).returning('*');

      const [position] = await testDb('positions').insert({
        name: 'Referee 1',
        description: 'Primary Referee'
      }).returning('*');

      await testDb('game_assignments').insert({
        game_id: game.id,
        referee_id: referee.id,
        position_id: position.id,
        status: 'pending'
      });

      // Delete game - assignments should cascade
      await testDb('games').where('id', game.id).del();

      const assignments = await testDb('game_assignments').where('game_id', game.id);
      expect(assignments.length).toBe(0);

      // Cleanup
      await testDb('referees').where('id', referee.id).del();
      await testDb('users').where('id', user.id).del();
      await testDb('positions').where('id', position.id).del();
      await testDb('teams').whereIn('id', [team1.id, team2.id]).del();
      await testDb('leagues').where('id', league.id).del();
    });
  });

  describe('Data Type Validations', () => {
    it('should enforce proper UUID format', async () => {
      await expect(
        testDb('users').insert({
          id: 'not-a-uuid', // Invalid UUID
          email: 'test@example.com',
          password_hash: 'hash123',
          role: 'referee',
          name: 'Test User'
        })
      ).rejects.toThrow();
    });

    it('should enforce date format constraints', async () => {
      const [league] = await testDb('leagues').insert({
        organization: 'Test Org',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Division 1',
        season: '2024/25',
        level: 'Competitive'
      }).returning('*');

      const [team1, team2] = await testDb('teams').insert([
        { name: 'Team A', location: 'Stadium A', league_id: league.id },
        { name: 'Team B', location: 'Stadium B', league_id: league.id }
      ]).returning('*');

      await expect(
        testDb('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: 'invalid-date', // Invalid date
          game_time: '14:00',
          location: 'Test Stadium',
          postal_code: 'T1S 1A1',
          level: 'Competitive',
          status: 'unassigned',
          refs_needed: 2
        })
      ).rejects.toThrow();

      // Cleanup
      await testDb('teams').whereIn('id', [team1.id, team2.id]).del();
      await testDb('leagues').where('id', league.id).del();
    });

    it('should enforce time format constraints', async () => {
      const [league] = await testDb('leagues').insert({
        organization: 'Test Org',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Division 1',
        season: '2024/25',
        level: 'Competitive'
      }).returning('*');

      const [team1, team2] = await testDb('teams').insert([
        { name: 'Team A', location: 'Stadium A', league_id: league.id },
        { name: 'Team B', location: 'Stadium B', league_id: league.id }
      ]).returning('*');

      await expect(
        testDb('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: '2024-12-01',
          game_time: '25:00', // Invalid time
          location: 'Test Stadium',
          postal_code: 'T1S 1A1',
          level: 'Competitive',
          status: 'unassigned',
          refs_needed: 2
        })
      ).rejects.toThrow();

      // Cleanup
      await testDb('teams').whereIn('id', [team1.id, team2.id]).del();
      await testDb('leagues').where('id', league.id).del();
    });
  });
});
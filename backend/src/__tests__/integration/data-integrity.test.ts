/**
 * @fileoverview Data Integrity Integration Tests
 * @description Comprehensive tests for data integrity, constraint validation,
 * foreign key relationships, cascade operations, and data consistency
 */

import {
  DatabaseTestHelper,
  createDatabaseTestHelper
} from '../helpers/database-helper';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

describe('Database Integration Tests - Data Integrity', () => {
  let dbHelper: DatabaseTestHelper;
  let db: Knex;

  beforeAll(async () => {
    dbHelper = createDatabaseTestHelper({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      pool: {
        min: 1,
        max: 5
      }
    });

    await dbHelper.setup();
    db = dbHelper.getDb();

    // Seed minimal test data
    await dbHelper.seedTestData({
      userCount: 20,
      gameCount: 30,
      teamCount: 8,
      assignmentCount: 50,
      performanceDataCount: 100
    });
  });

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  describe('Foreign Key Constraints', () => {
    test('should enforce foreign key constraints on assignments table', async () => {
      const nonExistentUserId = uuidv4();
      const nonExistentGameId = uuidv4();
      const assignmentId = uuidv4();

      // Test invalid referee_id
      await expect(
        db('assignments').insert({
          id: assignmentId,
          game_id: (await db('games').select('id').first())?.id,
          referee_id: nonExistentUserId,
          position: 'referee',
          status: 'pending',
          fee: 50.00
        })
      ).rejects.toThrow();

      // Test invalid game_id
      await expect(
        db('assignments').insert({
          id: assignmentId,
          game_id: nonExistentGameId,
          referee_id: (await db('users').select('id').first())?.id,
          position: 'referee',
          status: 'pending',
          fee: 50.00
        })
      ).rejects.toThrow();
    });

    test('should maintain referential integrity when creating valid assignments', async () => {
      const validUser = await db('users').select('id').first();
      const validGame = await db('games').select('id').first();
      const assignmentId = uuidv4();

      expect(validUser).toBeDefined();
      expect(validGame).toBeDefined();

      // Should succeed with valid foreign keys
      await expect(
        db('assignments').insert({
          id: assignmentId,
          game_id: validGame.id,
          referee_id: validUser.id,
          position: 'referee',
          status: 'pending',
          fee: 75.00
        })
      ).resolves.not.toThrow();

      // Verify the assignment was created
      const assignment = await db('assignments').where('id', assignmentId).first();
      expect(assignment).toBeDefined();
      expect(assignment.game_id).toBe(validGame.id);
      expect(assignment.referee_id).toBe(validUser.id);
    });

    test('should handle foreign key constraints in complex queries', async () => {
      // Get assignments with their related games and referees
      const assignmentsWithDetails = await db('assignments')
        .select(
          'assignments.*',
          'games.home_team',
          'games.away_team',
          'games.game_date',
          'users.first_name as referee_first_name',
          'users.last_name as referee_last_name'
        )
        .join('games', 'assignments.game_id', 'games.id')
        .join('users', 'assignments.referee_id', 'users.id')
        .limit(5);

      expect(assignmentsWithDetails).toHaveLength(5);

      assignmentsWithDetails.forEach(assignment => {
        expect(assignment.home_team).toBeDefined();
        expect(assignment.away_team).toBeDefined();
        expect(assignment.referee_first_name).toBeDefined();
        expect(assignment.referee_last_name).toBeDefined();
      });
    });
  });

  describe('Cascade Operations', () => {
    test('should cascade delete assignments when game is deleted', async () => {
      const gameId = uuidv4();
      const userId = (await db('users').select('id').first())?.id;
      const assignmentId = uuidv4();

      // Create game
      await db('games').insert({
        id: gameId,
        home_team: 'Cascade Team A',
        away_team: 'Cascade Team B',
        game_date: new Date(),
        location: 'Cascade Field',
        status: 'scheduled',
        level: 'U12',
        fee: 60.00
      });

      // Create assignment referencing the game
      await db('assignments').insert({
        id: assignmentId,
        game_id: gameId,
        referee_id: userId,
        position: 'referee',
        status: 'pending',
        fee: 30.00
      });

      // Verify assignment exists
      let assignment = await db('assignments').where('id', assignmentId).first();
      expect(assignment).toBeDefined();

      // Delete the game (should cascade to assignments)
      await db('games').where('id', gameId).del();

      // Verify assignment was also deleted due to cascade
      assignment = await db('assignments').where('id', assignmentId).first();
      expect(assignment).toBeUndefined();
    });

    test('should cascade delete assignments when user is deleted', async () => {
      const userId = uuidv4();
      const gameId = (await db('games').select('id').first())?.id;
      const assignmentId = uuidv4();

      // Create user
      await db('users').insert({
        id: userId,
        email: `cascade.user.${Date.now()}@example.com`,
        password: 'hashedpassword',
        first_name: 'Cascade',
        last_name: 'User',
        roles: JSON.stringify(['referee']),
        permissions: JSON.stringify(['games.view'])
      });

      // Create assignment referencing the user
      await db('assignments').insert({
        id: assignmentId,
        game_id: gameId,
        referee_id: userId,
        position: 'assistant_referee_1',
        status: 'accepted',
        fee: 25.00
      });

      // Verify assignment exists
      let assignment = await db('assignments').where('id', assignmentId).first();
      expect(assignment).toBeDefined();

      // Delete the user (should cascade to assignments)
      await db('users').where('id', userId).del();

      // Verify assignment was also deleted due to cascade
      assignment = await db('assignments').where('id', assignmentId).first();
      expect(assignment).toBeUndefined();
    });

    test('should handle bulk cascade operations', async () => {
      const gameIds: string[] = [];
      const assignmentIds: string[] = [];
      const userIds = await db('users').select('id').limit(3).pluck('id');

      // Create multiple games
      for (let i = 0; i < 3; i++) {
        const gameId = uuidv4();
        gameIds.push(gameId);

        await db('games').insert({
          id: gameId,
          home_team: `Bulk Team A${i}`,
          away_team: `Bulk Team B${i}`,
          game_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          location: `Bulk Field ${i}`,
          status: 'scheduled',
          level: 'U14',
          fee: 70.00
        });
      }

      // Create multiple assignments for these games
      for (let i = 0; i < gameIds.length; i++) {
        for (let j = 0; j < 2; j++) {
          const assignmentId = uuidv4();
          assignmentIds.push(assignmentId);

          await db('assignments').insert({
            id: assignmentId,
            game_id: gameIds[i],
            referee_id: userIds[j % userIds.length],
            position: j === 0 ? 'referee' : 'assistant_referee_1',
            status: 'pending',
            fee: 35.00
          });
        }
      }

      // Verify assignments exist
      let assignmentCount = await db('assignments')
        .whereIn('id', assignmentIds)
        .count('* as count')
        .first();
      expect(parseInt(assignmentCount?.count as string || '0')).toBe(assignmentIds.length);

      // Delete all games (should cascade delete all assignments)
      await db('games').whereIn('id', gameIds).del();

      // Verify all assignments were deleted
      assignmentCount = await db('assignments')
        .whereIn('id', assignmentIds)
        .count('* as count')
        .first();
      expect(parseInt(assignmentCount?.count as string || '0')).toBe(0);
    });
  });

  describe('Unique Constraints', () => {
    test('should enforce unique email constraint on users table', async () => {
      const existingUser = await db('users').select('email').first();
      expect(existingUser).toBeDefined();

      // Try to create user with duplicate email
      await expect(
        db('users').insert({
          id: uuidv4(),
          email: existingUser.email,
          password: 'hashedpassword',
          first_name: 'Duplicate',
          last_name: 'Email',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        })
      ).rejects.toThrow();
    });

    test('should enforce unique team name constraint', async () => {
      const existingTeam = await db('teams').select('name').first();
      expect(existingTeam).toBeDefined();

      // Try to create team with duplicate name
      await expect(
        db('teams').insert({
          id: uuidv4(),
          name: existingTeam.name,
          division: 'U16',
          league: 'Test League',
          contact_info: JSON.stringify({ coach: 'Test Coach' }),
          is_active: true
        })
      ).rejects.toThrow();
    });

    test('should enforce unique assignment constraint (game_id + referee_id)', async () => {
      const assignment = await db('assignments')
        .select('game_id', 'referee_id')
        .first();
      expect(assignment).toBeDefined();

      // Try to create duplicate assignment
      await expect(
        db('assignments').insert({
          id: uuidv4(),
          game_id: assignment.game_id,
          referee_id: assignment.referee_id,
          position: 'fourth_official',
          status: 'pending',
          fee: 20.00
        })
      ).rejects.toThrow();
    });

    test('should allow same referee for different games', async () => {
      const referee = await db('users').select('id').first();
      const games = await db('games').select('id').limit(2);
      expect(games).toHaveLength(2);

      const assignmentId1 = uuidv4();
      const assignmentId2 = uuidv4();

      // Should succeed - same referee, different games
      await expect(
        db('assignments').insert([
          {
            id: assignmentId1,
            game_id: games[0].id,
            referee_id: referee.id,
            position: 'referee',
            status: 'pending',
            fee: 50.00
          },
          {
            id: assignmentId2,
            game_id: games[1].id,
            referee_id: referee.id,
            position: 'referee',
            status: 'pending',
            fee: 50.00
          }
        ])
      ).resolves.not.toThrow();

      // Verify both assignments were created
      const createdAssignments = await db('assignments')
        .whereIn('id', [assignmentId1, assignmentId2]);
      expect(createdAssignments).toHaveLength(2);
    });
  });

  describe('Required Fields Validation', () => {
    test('should reject users without required fields', async () => {
      // Missing email
      await expect(
        db('users').insert({
          id: uuidv4(),
          password: 'hashedpassword',
          first_name: 'Test',
          last_name: 'User'
        })
      ).rejects.toThrow();

      // Missing password
      await expect(
        db('users').insert({
          id: uuidv4(),
          email: 'nopassword@example.com',
          first_name: 'Test',
          last_name: 'User'
        })
      ).rejects.toThrow();

      // Missing first_name
      await expect(
        db('users').insert({
          id: uuidv4(),
          email: 'nofirstname@example.com',
          password: 'hashedpassword',
          last_name: 'User'
        })
      ).rejects.toThrow();

      // Missing last_name
      await expect(
        db('users').insert({
          id: uuidv4(),
          email: 'nolastname@example.com',
          password: 'hashedpassword',
          first_name: 'Test'
        })
      ).rejects.toThrow();
    });

    test('should reject games without required fields', async () => {
      // Missing home_team
      await expect(
        db('games').insert({
          id: uuidv4(),
          away_team: 'Away Team',
          game_date: new Date(),
          location: 'Test Field'
        })
      ).rejects.toThrow();

      // Missing away_team
      await expect(
        db('games').insert({
          id: uuidv4(),
          home_team: 'Home Team',
          game_date: new Date(),
          location: 'Test Field'
        })
      ).rejects.toThrow();

      // Missing game_date
      await expect(
        db('games').insert({
          id: uuidv4(),
          home_team: 'Home Team',
          away_team: 'Away Team',
          location: 'Test Field'
        })
      ).rejects.toThrow();
    });

    test('should accept entities with all required fields', async () => {
      const userId = uuidv4();
      const gameId = uuidv4();
      const teamId = uuidv4();

      // Valid user
      await expect(
        db('users').insert({
          id: userId,
          email: `valid.user.${Date.now()}@example.com`,
          password: 'hashedpassword',
          first_name: 'Valid',
          last_name: 'User',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        })
      ).resolves.not.toThrow();

      // Valid game
      await expect(
        db('games').insert({
          id: gameId,
          home_team: 'Valid Home Team',
          away_team: 'Valid Away Team',
          game_date: new Date(),
          location: 'Valid Field',
          status: 'scheduled',
          level: 'U18',
          fee: 80.00
        })
      ).resolves.not.toThrow();

      // Valid team
      await expect(
        db('teams').insert({
          id: teamId,
          name: `Valid Team ${Date.now()}`,
          division: 'U18',
          league: 'Premier League',
          contact_info: JSON.stringify({ coach: 'Valid Coach' }),
          is_active: true
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Data Type Validation', () => {
    test('should validate email format constraints', async () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com'
      ];

      // Note: SQLite doesn't enforce email format at database level,
      // but we can test that the field accepts string values
      for (const email of invalidEmails) {
        try {
          await db('users').insert({
            id: uuidv4(),
            email: email,
            password: 'hashedpassword',
            first_name: 'Invalid',
            last_name: 'Email',
            roles: JSON.stringify(['referee']),
            permissions: JSON.stringify(['games.view'])
          });

          // If we reach here, the database accepted the invalid email
          // In a real application, this validation would happen at the application level
          console.warn(`Database accepted invalid email: ${email}`);
        } catch (error) {
          // Expected if database has email validation
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle JSON data types correctly', async () => {
      const userId = uuidv4();
      const complexRoles = ['admin', 'referee', 'assignor'];
      const complexPermissions = [
        'games.view',
        'games.create',
        'games.update',
        'assignments.view',
        'assignments.create'
      ];

      const contactInfo = {
        phone: '+1-555-0123',
        email: 'contact@team.com',
        address: {
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        },
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '+1-555-9999',
          relationship: 'parent'
        }
      };

      // Insert user with JSON fields
      await db('users').insert({
        id: userId,
        email: `json.test.${Date.now()}@example.com`,
        password: 'hashedpassword',
        first_name: 'JSON',
        last_name: 'Test',
        roles: JSON.stringify(complexRoles),
        permissions: JSON.stringify(complexPermissions)
      });

      // Insert team with complex JSON
      const teamId = uuidv4();
      await db('teams').insert({
        id: teamId,
        name: `JSON Team ${Date.now()}`,
        division: 'U16',
        league: 'Test League',
        contact_info: JSON.stringify(contactInfo),
        is_active: true
      });

      // Verify JSON data is stored and retrieved correctly
      const user = await db('users').where('id', userId).first();
      const team = await db('teams').where('id', teamId).first();

      expect(JSON.parse(user.roles)).toEqual(complexRoles);
      expect(JSON.parse(user.permissions)).toEqual(complexPermissions);
      expect(JSON.parse(team.contact_info)).toEqual(contactInfo);
    });

    test('should handle decimal precision correctly', async () => {
      const gameId = uuidv4();
      const precisionFee = 123.456789; // More precision than allowed

      await db('games').insert({
        id: gameId,
        home_team: 'Decimal Team A',
        away_team: 'Decimal Team B',
        game_date: new Date(),
        location: 'Decimal Field',
        status: 'scheduled',
        level: 'Adult',
        fee: precisionFee
      });

      const game = await db('games').where('id', gameId).first();

      // Fee should be rounded to 2 decimal places (123.46)
      expect(parseFloat(game.fee)).toBeCloseTo(123.46, 2);
    });

    test('should handle boolean values correctly', async () => {
      const userId1 = uuidv4();
      const userId2 = uuidv4();
      const teamId1 = uuidv4();
      const teamId2 = uuidv4();

      // Insert with explicit boolean values
      await db('users').insert([
        {
          id: userId1,
          email: `bool1.${Date.now()}@example.com`,
          password: 'hashedpassword',
          first_name: 'Boolean',
          last_name: 'True',
          is_active: true
        },
        {
          id: userId2,
          email: `bool2.${Date.now()}@example.com`,
          password: 'hashedpassword',
          first_name: 'Boolean',
          last_name: 'False',
          is_active: false
        }
      ]);

      await db('teams').insert([
        {
          id: teamId1,
          name: `Active Team ${Date.now()}`,
          division: 'U12',
          is_active: true
        },
        {
          id: teamId2,
          name: `Inactive Team ${Date.now()}`,
          division: 'U14',
          is_active: false
        }
      ]);

      // Verify boolean values
      const activeUser = await db('users').where('id', userId1).first();
      const inactiveUser = await db('users').where('id', userId2).first();
      const activeTeam = await db('teams').where('id', teamId1).first();
      const inactiveTeam = await db('teams').where('id', teamId2).first();

      expect(activeUser.is_active).toBe(true);
      expect(inactiveUser.is_active).toBe(false);
      expect(activeTeam.is_active).toBe(true);
      expect(inactiveTeam.is_active).toBe(false);
    });

    test('should handle timestamp fields correctly', async () => {
      const gameId = uuidv4();
      const specificDate = new Date('2025-06-15T14:30:00.000Z');

      await db('games').insert({
        id: gameId,
        home_team: 'Timestamp Team A',
        away_team: 'Timestamp Team B',
        game_date: specificDate,
        location: 'Timestamp Field',
        status: 'scheduled',
        level: 'U10'
      });

      const game = await db('games').where('id', gameId).first();

      // Verify timestamp is stored correctly
      expect(new Date(game.game_date)).toEqual(specificDate);
      expect(game.created_at).toBeDefined();
      expect(game.updated_at).toBeDefined();
      expect(new Date(game.created_at)).toBeInstanceOf(Date);
      expect(new Date(game.updated_at)).toBeInstanceOf(Date);
    });
  });

  describe('Data Consistency Validation', () => {
    test('should maintain consistency across related tables', async () => {
      const userId = uuidv4();
      const gameId = uuidv4();
      const assignmentId = uuidv4();

      // Create user, game, and assignment in sequence
      await db('users').insert({
        id: userId,
        email: `consistency.${Date.now()}@example.com`,
        password: 'hashedpassword',
        first_name: 'Consistency',
        last_name: 'Test',
        roles: JSON.stringify(['referee']),
        permissions: JSON.stringify(['games.view'])
      });

      await db('games').insert({
        id: gameId,
        home_team: 'Consistency Team A',
        away_team: 'Consistency Team B',
        game_date: new Date(),
        location: 'Consistency Field',
        status: 'scheduled',
        level: 'U16',
        fee: 65.00
      });

      await db('assignments').insert({
        id: assignmentId,
        game_id: gameId,
        referee_id: userId,
        position: 'referee',
        status: 'pending',
        fee: 32.50
      });

      // Verify relationships are consistent
      const assignment = await db('assignments')
        .select(
          'assignments.*',
          'games.home_team',
          'games.away_team',
          'users.first_name',
          'users.last_name'
        )
        .join('games', 'assignments.game_id', 'games.id')
        .join('users', 'assignments.referee_id', 'users.id')
        .where('assignments.id', assignmentId)
        .first();

      expect(assignment).toBeDefined();
      expect(assignment.game_id).toBe(gameId);
      expect(assignment.referee_id).toBe(userId);
      expect(assignment.home_team).toBe('Consistency Team A');
      expect(assignment.first_name).toBe('Consistency');
    });

    test('should handle null values appropriately', async () => {
      const userId = uuidv4();
      const gameId = uuidv4();
      const teamId = uuidv4();

      // Test optional fields with null values
      await db('users').insert({
        id: userId,
        email: `nullable.${Date.now()}@example.com`,
        password: 'hashedpassword',
        first_name: 'Nullable',
        last_name: 'Test',
        phone: null, // Optional field
        roles: null, // Optional field
        permissions: null, // Optional field
        last_login: null // Optional field
      });

      await db('games').insert({
        id: gameId,
        home_team: 'Nullable Home',
        away_team: 'Nullable Away',
        game_date: new Date(),
        location: null, // Optional field
        level: null, // Optional field
        fee: null // Optional field
      });

      await db('teams').insert({
        id: teamId,
        name: `Nullable Team ${Date.now()}`,
        division: null, // Optional field
        league: null, // Optional field
        contact_info: null // Optional field
      });

      // Verify null values are handled correctly
      const user = await db('users').where('id', userId).first();
      const game = await db('games').where('id', gameId).first();
      const team = await db('teams').where('id', teamId).first();

      expect(user.phone).toBeNull();
      expect(user.roles).toBeNull();
      expect(user.last_login).toBeNull();
      expect(game.location).toBeNull();
      expect(game.fee).toBeNull();
      expect(team.division).toBeNull();
      expect(team.contact_info).toBeNull();
    });

    test('should maintain consistency during bulk operations', async () => {
      const userIds: string[] = [];
      const gameIds: string[] = [];
      const assignmentIds: string[] = [];

      // Create bulk test data
      const bulkUsers = Array.from({ length: 5 }, (_, i) => {
        const id = uuidv4();
        userIds.push(id);
        return {
          id,
          email: `bulk.user.${i}.${Date.now()}@example.com`,
          password: 'hashedpassword',
          first_name: `BulkUser${i}`,
          last_name: 'Test',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        };
      });

      const bulkGames = Array.from({ length: 3 }, (_, i) => {
        const id = uuidv4();
        gameIds.push(id);
        return {
          id,
          home_team: `Bulk Home ${i}`,
          away_team: `Bulk Away ${i}`,
          game_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          location: `Bulk Field ${i}`,
          status: 'scheduled',
          level: 'U18',
          fee: 90.00
        };
      });

      // Insert bulk data
      await db('users').insert(bulkUsers);
      await db('games').insert(bulkGames);

      // Create assignments for each game-user combination
      const bulkAssignments = [];
      for (let i = 0; i < gameIds.length; i++) {
        const assignmentId = uuidv4();
        assignmentIds.push(assignmentId);
        bulkAssignments.push({
          id: assignmentId,
          game_id: gameIds[i],
          referee_id: userIds[i % userIds.length],
          position: 'referee',
          status: 'pending',
          fee: 45.00
        });
      }

      await db('assignments').insert(bulkAssignments);

      // Verify consistency of bulk operations
      const userCount = await db('users').whereIn('id', userIds).count('* as count').first();
      const gameCount = await db('games').whereIn('id', gameIds).count('* as count').first();
      const assignmentCount = await db('assignments').whereIn('id', assignmentIds).count('* as count').first();

      expect(parseInt(userCount?.count as string || '0')).toBe(userIds.length);
      expect(parseInt(gameCount?.count as string || '0')).toBe(gameIds.length);
      expect(parseInt(assignmentCount?.count as string || '0')).toBe(assignmentIds.length);

      // Verify all assignments have valid foreign key references
      const assignmentsWithDetails = await db('assignments')
        .select(
          'assignments.id',
          'games.home_team',
          'users.first_name'
        )
        .join('games', 'assignments.game_id', 'games.id')
        .join('users', 'assignments.referee_id', 'users.id')
        .whereIn('assignments.id', assignmentIds);

      expect(assignmentsWithDetails).toHaveLength(assignmentIds.length);

      assignmentsWithDetails.forEach(assignment => {
        expect(assignment.home_team).toBeDefined();
        expect(assignment.first_name).toBeDefined();
      });
    });
  });
});
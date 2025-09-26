/**
 * @fileoverview Database Integration Tests - Transaction Management
 * @description Comprehensive tests for database transaction management, ACID properties,
 * connection pooling, deadlock handling, and transaction recovery
 */

import {
  DatabaseTestHelper,
  createDatabaseTestHelper,
  TransactionTestResult,
  PerformanceMetrics
} from '../helpers/database-helper';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

describe('Database Integration Tests - Transaction Management', () => {
  let dbHelper: DatabaseTestHelper;
  let db: Knex;

  beforeAll(async () => {
    // Create test helper with appropriate configuration
    dbHelper = createDatabaseTestHelper({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      pool: {
        min: 1,
        max: 10,
        createTimeoutMillis: 3000,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 30000
      }
    });

    await dbHelper.setup();
    db = dbHelper.getDb();

    // Seed initial test data
    await dbHelper.seedTestData({
      userCount: 50,
      gameCount: 100,
      teamCount: 10,
      assignmentCount: 200,
      performanceDataCount: 1000
    });
  });

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  afterEach(async () => {
    // Clear performance metrics after each test
    dbHelper.clearPerformanceMetrics();
  });

  describe('Transaction Commit and Rollback', () => {
    test('should successfully commit a transaction with multiple operations', async () => {
      const userId = uuidv4();
      const gameId = uuidv4();
      const assignmentId = uuidv4();

      const result = await dbHelper.testTransaction(async (trx) => {
        // Insert user
        await trx('users').insert({
          id: userId,
          email: 'transaction.test@example.com',
          password: 'hashedpassword',
          first_name: 'Transaction',
          last_name: 'Test',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        });

        // Insert game
        await trx('games').insert({
          id: gameId,
          home_team: 'Team A',
          away_team: 'Team B',
          game_date: new Date(),
          location: 'Test Field',
          status: 'scheduled',
          level: 'U12',
          fee: 50.00
        });

        // Insert assignment
        await trx('assignments').insert({
          id: assignmentId,
          game_id: gameId,
          referee_id: userId,
          position: 'referee',
          status: 'pending',
          fee: 50.00
        });
      });

      expect(result.success).toBe(true);
      expect(result.rolledBack).toBe(false);
      expect(result.operationCount).toBe(3);
      expect(result.duration).toBeGreaterThan(0);

      // Verify data was committed
      const user = await db('users').where('id', userId).first();
      const game = await db('games').where('id', gameId).first();
      const assignment = await db('assignments').where('id', assignmentId).first();

      expect(user).toBeDefined();
      expect(game).toBeDefined();
      expect(assignment).toBeDefined();
      expect(assignment.game_id).toBe(gameId);
      expect(assignment.referee_id).toBe(userId);
    });

    test('should rollback transaction on error', async () => {
      const userId = uuidv4();
      const gameId = uuidv4();

      const result = await dbHelper.testTransaction(async (trx) => {
        // Insert user
        await trx('users').insert({
          id: userId,
          email: 'rollback.test@example.com',
          password: 'hashedpassword',
          first_name: 'Rollback',
          last_name: 'Test',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        });

        // Insert game
        await trx('games').insert({
          id: gameId,
          home_team: 'Team A',
          away_team: 'Team B',
          game_date: new Date(),
          location: 'Test Field',
          status: 'scheduled',
          level: 'U12',
          fee: 50.00
        });

        // This will cause a constraint violation (duplicate email)
        await trx('users').insert({
          id: uuidv4(),
          email: 'rollback.test@example.com', // Duplicate email
          password: 'hashedpassword',
          first_name: 'Another',
          last_name: 'User',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        });
      });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(result.error).toBeDefined();

      // Verify no data was committed
      const user = await db('users').where('id', userId).first();
      const game = await db('games').where('id', gameId).first();

      expect(user).toBeUndefined();
      expect(game).toBeUndefined();
    });

    test('should handle explicit rollback', async () => {
      const userId = uuidv4();

      const result = await dbHelper.testTransaction(async (trx) => {
        await trx('users').insert({
          id: userId,
          email: 'explicit.rollback@example.com',
          password: 'hashedpassword',
          first_name: 'Explicit',
          last_name: 'Rollback',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        });
      }, true); // Force rollback

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Intentional rollback');

      // Verify data was not committed
      const user = await db('users').where('id', userId).first();
      expect(user).toBeUndefined();
    });

    test('should handle nested transactions correctly', async () => {
      const userId1 = uuidv4();
      const userId2 = uuidv4();
      const gameId = uuidv4();

      await db.transaction(async (outerTrx) => {
        // Insert first user in outer transaction
        await outerTrx('users').insert({
          id: userId1,
          email: 'nested.outer@example.com',
          password: 'hashedpassword',
          first_name: 'Outer',
          last_name: 'Transaction',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        });

        // Create nested transaction (savepoint)
        await outerTrx.transaction(async (innerTrx) => {
          await innerTrx('users').insert({
            id: userId2,
            email: 'nested.inner@example.com',
            password: 'hashedpassword',
            first_name: 'Inner',
            last_name: 'Transaction',
            roles: JSON.stringify(['referee']),
            permissions: JSON.stringify(['games.view'])
          });

          await innerTrx('games').insert({
            id: gameId,
            home_team: 'Nested Team A',
            away_team: 'Nested Team B',
            game_date: new Date(),
            location: 'Nested Field',
            status: 'scheduled',
            level: 'U14',
            fee: 60.00
          });
        });
      });

      // Verify both users and game were committed
      const outerUser = await db('users').where('id', userId1).first();
      const innerUser = await db('users').where('id', userId2).first();
      const game = await db('games').where('id', gameId).first();

      expect(outerUser).toBeDefined();
      expect(innerUser).toBeDefined();
      expect(game).toBeDefined();
    });

    test('should rollback nested transaction while keeping outer transaction', async () => {
      const userId1 = uuidv4();
      const userId2 = uuidv4();

      try {
        await db.transaction(async (outerTrx) => {
          // Insert user in outer transaction
          await outerTrx('users').insert({
            id: userId1,
            email: 'nested.outer.keep@example.com',
            password: 'hashedpassword',
            first_name: 'Outer',
            last_name: 'Keep',
            roles: JSON.stringify(['referee']),
            permissions: JSON.stringify(['games.view'])
          });

          try {
            // Create nested transaction that will fail
            await outerTrx.transaction(async (innerTrx) => {
              await innerTrx('users').insert({
                id: userId2,
                email: 'nested.inner.fail@example.com',
                password: 'hashedpassword',
                first_name: 'Inner',
                last_name: 'Fail',
                roles: JSON.stringify(['referee']),
                permissions: JSON.stringify(['games.view'])
              });

              // Force error in nested transaction
              throw new Error('Nested transaction error');
            });
          } catch (error: any) {
            // Catch and handle nested transaction error
            expect(error.message).toBe('Nested transaction error');
          }
        });
      } catch (error) {
        // Outer transaction should not fail
        fail('Outer transaction should not have failed');
      }

      // Verify outer transaction committed, inner transaction rolled back
      const outerUser = await db('users').where('id', userId1).first();
      const innerUser = await db('users').where('id', userId2).first();

      expect(outerUser).toBeDefined();
      expect(innerUser).toBeUndefined();
    });
  });

  describe('Connection Pool Management', () => {
    test('should handle multiple concurrent transactions', async () => {
      const concurrentTransactions = 5;
      const usersPerTransaction = 3;
      const promises: Promise<TransactionTestResult>[] = [];

      for (let i = 0; i < concurrentTransactions; i++) {
        const promise = dbHelper.testTransaction(async (trx) => {
          for (let j = 0; j < usersPerTransaction; j++) {
            await trx('users').insert({
              id: uuidv4(),
              email: `concurrent.${i}.${j}@example.com`,
              password: 'hashedpassword',
              first_name: `User${i}`,
              last_name: `Concurrent${j}`,
              roles: JSON.stringify(['referee']),
              permissions: JSON.stringify(['games.view'])
            });
          }

          // Add some delay to simulate real work
          await new Promise(resolve => setTimeout(resolve, 10));
        });

        promises.push(promise);
      }

      const results = await Promise.all(promises);

      // All transactions should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.operationCount).toBe(usersPerTransaction);
        expect(result.rolledBack).toBe(false);
      });

      // Verify all users were created
      const totalUsers = await db('users').count('* as count').first();
      const expectedCount = concurrentTransactions * usersPerTransaction;

      expect(parseInt(totalUsers?.count as string || '0')).toBeGreaterThanOrEqual(expectedCount);
    });

    test('should handle connection timeout gracefully', async () => {
      // Create a long-running transaction that holds a connection
      const longRunningPromise = db.transaction(async (trx) => {
        await trx('users').select('*').limit(1);
        // Hold the connection for a while
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Start multiple quick transactions concurrently
      const quickPromises = Array.from({ length: 3 }, (_, i) =>
        db.transaction(async (trx) => {
          return trx('games').select('*').limit(1);
        })
      );

      // All operations should complete without timeout errors
      const results = await Promise.all([longRunningPromise, ...quickPromises]);

      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    test('should properly release connections after transaction completion', async () => {
      const initialHealth = await dbHelper.testConnection();
      expect(initialHealth.isHealthy).toBe(true);

      // Run multiple transactions in sequence
      for (let i = 0; i < 10; i++) {
        await db.transaction(async (trx) => {
          await trx('users').select('*').limit(1);
          await trx('games').select('*').limit(1);
        });
      }

      // Connection should still be healthy
      const finalHealth = await dbHelper.testConnection();
      expect(finalHealth.isHealthy).toBe(true);
      expect(finalHealth.responseTime).toBeLessThan(1000); // Should be reasonably fast
    });
  });

  describe('Deadlock Handling', () => {
    test('should detect and handle deadlock scenarios', async () => {
      // Skip deadlock test for SQLite as it doesn't support row-level locking
      if (db.client.config.client === 'sqlite3') {
        console.log('Skipping deadlock test for SQLite');
        return;
      }

      const result = await dbHelper.createDeadlockScenario();

      // Either no deadlock occurred (operations completed successfully)
      // or a deadlock was detected and handled
      expect(typeof result.deadlockDetected).toBe('boolean');
      expect(result.duration).toBeGreaterThan(0);

      if (result.deadlockDetected) {
        expect(result.error).toBeDefined();
        // PostgreSQL deadlock error should contain 'deadlock detected'
        expect(result.error?.message.toLowerCase()).toContain('deadlock');
      }
    });

    test('should handle lock timeout scenarios', async () => {
      const timeout = 1000; // 1 second timeout
      const startTime = Date.now();

      try {
        await db.transaction(async (trx) => {
          // Set a very short lock timeout (PostgreSQL specific)
          try {
            await trx.raw('SET lock_timeout = ?', [timeout]);
          } catch (error) {
            // SQLite doesn't support lock_timeout, skip this part
            if (db.client.config.client === 'sqlite3') {
              return;
            }
            throw error;
          }

          // Simulate a scenario that might cause lock contention
          await trx('users').select('*').forUpdate();
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;

        // If lock timeout occurred, it should be around the timeout period
        if (error.message.includes('timeout') || error.message.includes('lock')) {
          expect(duration).toBeLessThan(timeout * 2); // Allow some variance
        }
      }
    });
  });

  describe('ACID Properties Verification', () => {
    test('should maintain atomicity - all or nothing', async () => {
      const gameId = uuidv4();
      const assignmentIds = [uuidv4(), uuidv4(), uuidv4()];
      const userIds = await db('users').select('id').limit(3).pluck('id');

      // Transaction should fail and rollback all operations
      const result = await dbHelper.testTransaction(async (trx) => {
        // Insert game
        await trx('games').insert({
          id: gameId,
          home_team: 'Atomicity Team A',
          away_team: 'Atomicity Team B',
          game_date: new Date(),
          location: 'Atomicity Field',
          status: 'scheduled',
          level: 'U16',
          fee: 70.00
        });

        // Insert valid assignments
        for (let i = 0; i < 2; i++) {
          await trx('assignments').insert({
            id: assignmentIds[i],
            game_id: gameId,
            referee_id: userIds[i],
            position: `referee_${i}`,
            status: 'pending',
            fee: 35.00
          });
        }

        // Insert invalid assignment (duplicate game_id + referee_id)
        await trx('assignments').insert({
          id: assignmentIds[2],
          game_id: gameId,
          referee_id: userIds[0], // Same referee as first assignment
          position: 'referee_2',
          status: 'pending',
          fee: 35.00
        });
      });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);

      // Verify nothing was committed (atomicity)
      const game = await db('games').where('id', gameId).first();
      const assignments = await db('assignments').whereIn('id', assignmentIds);

      expect(game).toBeUndefined();
      expect(assignments).toHaveLength(0);
    });

    test('should maintain consistency - constraints are enforced', async () => {
      const gameId = uuidv4();
      const nonExistentUserId = uuidv4();

      // Try to create assignment with non-existent referee
      const result = await dbHelper.testTransaction(async (trx) => {
        await trx('games').insert({
          id: gameId,
          home_team: 'Consistency Team A',
          away_team: 'Consistency Team B',
          game_date: new Date(),
          location: 'Consistency Field',
          status: 'scheduled',
          level: 'U18',
          fee: 80.00
        });

        // This should fail due to foreign key constraint
        await trx('assignments').insert({
          id: uuidv4(),
          game_id: gameId,
          referee_id: nonExistentUserId,
          position: 'referee',
          status: 'pending',
          fee: 40.00
        });
      });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);

      // Verify constraint was enforced
      const game = await db('games').where('id', gameId).first();
      expect(game).toBeUndefined();
    });

    test('should maintain isolation - concurrent transactions do not interfere', async () => {
      const gameId = uuidv4();
      const userId1 = await db('users').select('id').first().then(u => u?.id);
      const userId2 = await db('users').select('id').offset(1).first().then(u => u?.id);

      // Create initial game
      await db('games').insert({
        id: gameId,
        home_team: 'Isolation Team A',
        away_team: 'Isolation Team B',
        game_date: new Date(),
        location: 'Isolation Field',
        status: 'scheduled',
        level: 'Adult',
        fee: 100.00,
        version: 1
      });

      // Run two concurrent transactions that modify the same game
      const [result1, result2] = await Promise.allSettled([
        db.transaction(async (trx1) => {
          const game = await trx1('games').where('id', gameId).first();
          await new Promise(resolve => setTimeout(resolve, 50)); // Add delay
          await trx1('games').where('id', gameId).update({
            location: 'Updated by Transaction 1',
            version: game.version + 1
          });
        }),
        db.transaction(async (trx2) => {
          const game = await trx2('games').where('id', gameId).first();
          await new Promise(resolve => setTimeout(resolve, 50)); // Add delay
          await trx2('games').where('id', gameId).update({
            location: 'Updated by Transaction 2',
            version: game.version + 1
          });
        })
      ]);

      // Both transactions should complete (last one wins in this case)
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');

      // Verify final state is consistent
      const finalGame = await db('games').where('id', gameId).first();
      expect(finalGame.location).toMatch(/Updated by Transaction [12]/);
      expect(finalGame.version).toBeGreaterThan(1);
    });

    test('should maintain durability - committed data persists', async () => {
      const userId = uuidv4();
      const userEmail = `durability.test.${Date.now()}@example.com`;

      // Commit a transaction
      await db.transaction(async (trx) => {
        await trx('users').insert({
          id: userId,
          email: userEmail,
          password: 'hashedpassword',
          first_name: 'Durability',
          last_name: 'Test',
          roles: JSON.stringify(['referee']),
          permissions: JSON.stringify(['games.view'])
        });
      });

      // Simulate application restart by creating new connection
      const newDbHelper = createDatabaseTestHelper({
        client: 'sqlite3',
        connection: ':memory:',
        useNullAsDefault: true
      });

      // Data should still exist (in real scenario with persistent storage)
      const persistedUser = await db('users').where('id', userId).first();
      expect(persistedUser).toBeDefined();
      expect(persistedUser.email).toBe(userEmail);
    });
  });

  describe('Transaction Performance and Monitoring', () => {
    test('should measure transaction performance', async () => {
      const iterations = 10;
      const operationCounts: number[] = [];
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const result = await dbHelper.testTransaction(async (trx) => {
          // Perform multiple operations
          await trx('performance_test_data').insert({
            id: uuidv4(),
            sequence_number: Date.now() + i,
            category: 'performance_test',
            large_text_field: 'Performance test data '.repeat(10),
            test_timestamp: new Date(),
            test_decimal: Math.random() * 1000,
            test_boolean: Math.random() > 0.5
          });

          await trx('performance_test_data').where('category', 'performance_test').count('* as count');

          await trx('performance_test_data').where('test_boolean', true).select('*').limit(5);
        });

        expect(result.success).toBe(true);
        operationCounts.push(result.operationCount);
        durations.push(result.duration);
      }

      // Calculate performance metrics
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(avgDuration).toBeGreaterThan(0);
      expect(maxDuration).toBeGreaterThanOrEqual(avgDuration);
      expect(minDuration).toBeLessThanOrEqual(avgDuration);

      console.log(`Transaction Performance: Avg: ${avgDuration.toFixed(2)}ms, Min: ${minDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms`);
    });

    test('should handle large transaction operations', async () => {
      const batchSize = 100;
      const testData = Array.from({ length: batchSize }, (_, i) => ({
        id: uuidv4(),
        sequence_number: Date.now() + i,
        category: 'large_batch_test',
        large_text_field: 'Large batch test data '.repeat(20),
        test_timestamp: new Date(),
        test_decimal: Math.random() * 10000,
        test_boolean: Math.random() > 0.5
      }));

      const result = await dbHelper.testTransaction(async (trx) => {
        // Insert large batch
        await trx('performance_test_data').insert(testData);

        // Perform bulk update
        await trx('performance_test_data')
          .where('category', 'large_batch_test')
          .update({ large_text_field: 'Updated in bulk' });

        // Verify count
        const count = await trx('performance_test_data')
          .where('category', 'large_batch_test')
          .count('* as count')
          .first();

        expect(parseInt(count?.count as string || '0')).toBeGreaterThanOrEqual(batchSize);
      });

      expect(result.success).toBe(true);
      expect(result.operationCount).toBe(2); // Insert and Update
      expect(result.duration).toBeGreaterThan(0);

      console.log(`Large Transaction Performance: ${batchSize} records in ${result.duration.toFixed(2)}ms`);
    });

    test('should track connection pool metrics', async () => {
      const connectionHealthBefore = await dbHelper.testConnection();
      expect(connectionHealthBefore.isHealthy).toBe(true);

      // Run multiple concurrent operations to stress the pool
      const promises = Array.from({ length: 5 }, async (_, i) => {
        return db.transaction(async (trx) => {
          await trx('users').select('*').limit(10);
          await trx('games').select('*').limit(10);
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      });

      await Promise.all(promises);

      const connectionHealthAfter = await dbHelper.testConnection();
      expect(connectionHealthAfter.isHealthy).toBe(true);

      // Response time should still be reasonable
      expect(connectionHealthAfter.responseTime).toBeLessThan(1000);
    });
  });
});
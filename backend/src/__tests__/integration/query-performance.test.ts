/**
 * @fileoverview Query Performance Integration Tests
 * @description Comprehensive tests for query performance, index usage, JOIN operations,
 * large dataset handling, query optimization, and connection timeouts
 */

import {
  DatabaseTestHelper,
  createDatabaseTestHelper,
  PerformanceMetrics,
  ConcurrencyTestConfig
} from '../helpers/database-helper';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

describe('Database Integration Tests - Query Performance', () => {
  let dbHelper: DatabaseTestHelper;
  let db: Knex;

  beforeAll(async () => {
    dbHelper = createDatabaseTestHelper({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
      pool: {
        min: 2,
        max: 10,
        createTimeoutMillis: 3000,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 30000
      }
    });

    await dbHelper.setup();
    db = dbHelper.getDb();

    // Seed larger dataset for performance testing
    await dbHelper.seedTestData({
      userCount: 200,
      gameCount: 1000,
      teamCount: 50,
      assignmentCount: 2000,
      performanceDataCount: 10000
    });
  }, 60000); // Increase timeout for seeding

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  afterEach(() => {
    dbHelper.clearPerformanceMetrics();
  });

  describe('Index Usage and Query Optimization', () => {
    test('should perform efficiently with indexed columns', async () => {
      const iterations = 50;

      // Test query using indexed email field
      const emailResults = await dbHelper.benchmarkQuery(
        (db) => db('users').select('*').where('email', 'like', '%@%').limit(10),
        iterations
      );

      // Test query using indexed game_date field
      const dateResults = await dbHelper.benchmarkQuery(
        (db) => db('games').select('*').where('game_date', '>', new Date('2025-01-01')).limit(10),
        iterations
      );

      // Test query using indexed status field
      const statusResults = await dbHelper.benchmarkQuery(
        (db) => db('assignments').select('*').where('status', 'pending').limit(10),
        iterations
      );

      expect(emailResults.averageTime).toBeLessThan(100); // Should be fast with index
      expect(dateResults.averageTime).toBeLessThan(100);
      expect(statusResults.averageTime).toBeLessThan(100);

      expect(emailResults.operationsPerSecond).toBeGreaterThan(10);
      expect(dateResults.operationsPerSecond).toBeGreaterThan(10);
      expect(statusResults.operationsPerSecond).toBeGreaterThan(10);

      console.log('Index Performance Results:');
      console.log(`Email queries: ${emailResults.averageTime.toFixed(2)}ms avg, ${emailResults.operationsPerSecond.toFixed(1)} ops/sec`);
      console.log(`Date queries: ${dateResults.averageTime.toFixed(2)}ms avg, ${dateResults.operationsPerSecond.toFixed(1)} ops/sec`);
      console.log(`Status queries: ${statusResults.averageTime.toFixed(2)}ms avg, ${statusResults.operationsPerSecond.toFixed(1)} ops/sec`);
    });

    test('should demonstrate performance difference between indexed and non-indexed queries', async () => {
      const iterations = 30;

      // Query using indexed field (email)
      const indexedResults = await dbHelper.benchmarkQuery(
        (db) => db('users').select('*').where('email', 'like', 'user1%').limit(10),
        iterations
      );

      // Query using non-indexed field (phone)
      const nonIndexedResults = await dbHelper.benchmarkQuery(
        (db) => db('users').select('*').where('phone', 'like', '555-%').limit(10),
        iterations
      );

      // Indexed query should generally be faster, though with small datasets the difference might be minimal
      console.log('Index vs Non-Index Performance:');
      console.log(`Indexed (email): ${indexedResults.averageTime.toFixed(2)}ms avg`);
      console.log(`Non-indexed (phone): ${nonIndexedResults.averageTime.toFixed(2)}ms avg`);

      expect(indexedResults.averageTime).toBeGreaterThan(0);
      expect(nonIndexedResults.averageTime).toBeGreaterThan(0);
    });

    test('should perform complex queries with composite indexes efficiently', async () => {
      const iterations = 25;

      // Query using composite index (game_date + status)
      const compositeIndexResults = await dbHelper.benchmarkQuery(
        (db) => db('games')
          .select('*')
          .where('game_date', '>', new Date('2025-01-01'))
          .andWhere('status', 'scheduled')
          .limit(20),
        iterations
      );

      // Query using composite index (level + status)
      const levelStatusResults = await dbHelper.benchmarkQuery(
        (db) => db('games')
          .select('*')
          .where('level', 'U12')
          .andWhere('status', 'scheduled')
          .limit(20),
        iterations
      );

      expect(compositeIndexResults.averageTime).toBeLessThan(200);
      expect(levelStatusResults.averageTime).toBeLessThan(200);

      console.log('Composite Index Performance:');
      console.log(`Date + Status: ${compositeIndexResults.averageTime.toFixed(2)}ms avg`);
      console.log(`Level + Status: ${levelStatusResults.averageTime.toFixed(2)}ms avg`);
    });
  });

  describe('JOIN Operations Performance', () => {
    test('should perform simple JOINs efficiently', async () => {
      const iterations = 20;

      // Simple INNER JOIN between assignments and games
      const simpleJoinResults = await dbHelper.benchmarkQuery(
        (db) => db('assignments')
          .select(
            'assignments.id',
            'assignments.position',
            'assignments.status',
            'games.home_team',
            'games.away_team',
            'games.game_date'
          )
          .join('games', 'assignments.game_id', 'games.id')
          .limit(50),
        iterations
      );

      expect(simpleJoinResults.averageTime).toBeLessThan(300);
      expect(simpleJoinResults.operationsPerSecond).toBeGreaterThan(3);

      console.log(`Simple JOIN Performance: ${simpleJoinResults.averageTime.toFixed(2)}ms avg`);
    });

    test('should perform complex multi-table JOINs efficiently', async () => {
      const iterations = 15;

      // Complex JOIN across all main tables
      const complexJoinResults = await dbHelper.benchmarkQuery(
        (db) => db('assignments')
          .select(
            'assignments.id as assignment_id',
            'assignments.position',
            'assignments.status',
            'assignments.fee as assignment_fee',
            'games.home_team',
            'games.away_team',
            'games.game_date',
            'games.location',
            'games.level',
            'games.fee as game_fee',
            'users.first_name',
            'users.last_name',
            'users.email'
          )
          .join('games', 'assignments.game_id', 'games.id')
          .join('users', 'assignments.referee_id', 'users.id')
          .where('assignments.status', 'pending')
          .orderBy('games.game_date')
          .limit(30),
        iterations
      );

      expect(complexJoinResults.averageTime).toBeLessThan(500);
      expect(complexJoinResults.operationsPerSecond).toBeGreaterThan(2);

      console.log(`Complex JOIN Performance: ${complexJoinResults.averageTime.toFixed(2)}ms avg`);
    });

    test('should handle LEFT JOINs with null values efficiently', async () => {
      const iterations = 20;

      // Create some games without assignments for testing LEFT JOIN
      const gamesWithoutAssignments = Array.from({ length: 10 }, (_, i) => ({
        id: uuidv4(),
        home_team: `No Assignment Home ${i}`,
        away_team: `No Assignment Away ${i}`,
        game_date: new Date(Date.now() + (i + 30) * 24 * 60 * 60 * 1000),
        location: `Unassigned Field ${i}`,
        status: 'scheduled',
        level: 'U8',
        fee: 40.00
      }));

      await db('games').insert(gamesWithoutAssignments);

      const leftJoinResults = await dbHelper.benchmarkQuery(
        (db) => db('games')
          .select(
            'games.id',
            'games.home_team',
            'games.away_team',
            'games.game_date',
            'assignments.id as assignment_id',
            'assignments.position',
            'assignments.status as assignment_status'
          )
          .leftJoin('assignments', 'games.id', 'assignments.game_id')
          .where('games.status', 'scheduled')
          .limit(100),
        iterations
      );

      expect(leftJoinResults.averageTime).toBeLessThan(400);

      console.log(`LEFT JOIN Performance: ${leftJoinResults.averageTime.toFixed(2)}ms avg`);
    });

    test('should perform aggregation with JOINs efficiently', async () => {
      const iterations = 15;

      // COUNT aggregation with JOIN
      const countResults = await dbHelper.benchmarkQuery(
        (db) => db('games')
          .select(
            'games.level',
            db.raw('COUNT(assignments.id) as assignment_count'),
            db.raw('AVG(assignments.fee) as avg_assignment_fee')
          )
          .leftJoin('assignments', 'games.id', 'assignments.game_id')
          .groupBy('games.level'),
        iterations
      );

      // SUM aggregation with JOIN
      const sumResults = await dbHelper.benchmarkQuery(
        (db) => db('users')
          .select(
            'users.id',
            'users.first_name',
            'users.last_name',
            db.raw('COUNT(assignments.id) as total_assignments'),
            db.raw('SUM(assignments.fee) as total_earnings')
          )
          .leftJoin('assignments', 'users.id', 'assignments.referee_id')
          .groupBy('users.id', 'users.first_name', 'users.last_name')
          .having(db.raw('COUNT(assignments.id)'), '>', 0)
          .limit(20),
        iterations
      );

      expect(countResults.averageTime).toBeLessThan(300);
      expect(sumResults.averageTime).toBeLessThan(400);

      console.log(`COUNT Aggregation with JOIN: ${countResults.averageTime.toFixed(2)}ms avg`);
      console.log(`SUM Aggregation with JOIN: ${sumResults.averageTime.toFixed(2)}ms avg`);
    });
  });

  describe('Large Dataset Handling', () => {
    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();

      // Query large result set
      const largeResults = await db('performance_test_data')
        .select('*')
        .limit(5000);

      const queryTime = Date.now() - startTime;

      expect(largeResults).toHaveLength(5000);
      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Large dataset query (5000 records): ${queryTime}ms`);
    });

    test('should paginate large datasets efficiently', async () => {
      const pageSize = 100;
      const totalPages = 10;
      const pageTimes: number[] = [];

      for (let page = 0; page < totalPages; page++) {
        const startTime = Date.now();

        const pageResults = await db('performance_test_data')
          .select('id', 'sequence_number', 'category', 'test_timestamp')
          .orderBy('sequence_number')
          .limit(pageSize)
          .offset(page * pageSize);

        const pageTime = Date.now() - startTime;
        pageTimes.push(pageTime);

        expect(pageResults).toHaveLength(pageSize);
        expect(pageTime).toBeLessThan(500); // Each page should load quickly
      }

      const avgPageTime = pageTimes.reduce((a, b) => a + b, 0) / pageTimes.length;
      console.log(`Average pagination time: ${avgPageTime.toFixed(2)}ms per ${pageSize} records`);
    });

    test('should handle bulk operations efficiently', async () => {
      const batchSize = 1000;
      const testData = Array.from({ length: batchSize }, (_, i) => ({
        id: uuidv4(),
        sequence_number: Date.now() + i + 50000, // Avoid conflicts
        category: 'bulk_test',
        large_text_field: `Bulk test data ${i}`,
        test_timestamp: new Date(),
        test_decimal: Math.random() * 1000,
        test_boolean: i % 2 === 0
      }));

      // Test bulk INSERT
      const insertStart = Date.now();
      await db('performance_test_data').insert(testData);
      const insertTime = Date.now() - insertStart;

      // Test bulk UPDATE
      const updateStart = Date.now();
      await db('performance_test_data')
        .where('category', 'bulk_test')
        .update({ large_text_field: 'Updated in bulk operation' });
      const updateTime = Date.now() - updateStart;

      // Test bulk DELETE
      const deleteStart = Date.now();
      const deletedCount = await db('performance_test_data')
        .where('category', 'bulk_test')
        .del();
      const deleteTime = Date.now() - deleteStart;

      expect(insertTime).toBeLessThan(2000);
      expect(updateTime).toBeLessThan(1000);
      expect(deleteTime).toBeLessThan(1000);
      expect(deletedCount).toBe(batchSize);

      console.log(`Bulk Operations Performance (${batchSize} records):`);
      console.log(`INSERT: ${insertTime}ms`);
      console.log(`UPDATE: ${updateTime}ms`);
      console.log(`DELETE: ${deleteTime}ms`);
    });

    test('should perform complex queries on large datasets efficiently', async () => {
      const iterations = 5;

      // Complex query with WHERE, JOIN, GROUP BY, HAVING, ORDER BY
      const complexQueryResults = await dbHelper.benchmarkQuery(
        (db) => db('performance_test_data')
          .select(
            'category',
            db.raw('COUNT(*) as record_count'),
            db.raw('AVG(test_decimal) as avg_decimal'),
            db.raw('MIN(test_timestamp) as earliest_timestamp'),
            db.raw('MAX(test_timestamp) as latest_timestamp')
          )
          .where('test_boolean', true)
          .andWhere('test_decimal', '>', 100)
          .groupBy('category')
          .having(db.raw('COUNT(*)'), '>', 10)
          .orderBy('record_count', 'desc'),
        iterations
      );

      expect(complexQueryResults.averageTime).toBeLessThan(1000);

      console.log(`Complex query on large dataset: ${complexQueryResults.averageTime.toFixed(2)}ms avg`);
    });
  });

  describe('Connection Timeouts and Reliability', () => {
    test('should handle connection timeout gracefully', async () => {
      // Test connection health before stress test
      const healthBefore = await dbHelper.testConnection();
      expect(healthBefore.isHealthy).toBe(true);

      // Create multiple long-running queries
      const longRunningPromises = Array.from({ length: 3 }, async (_, i) => {
        return db('performance_test_data')
          .select('*')
          .where('sequence_number', '>', i * 1000)
          .limit(1000);
      });

      const results = await Promise.all(longRunningPromises);

      // All queries should complete successfully
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      // Test connection health after stress test
      const healthAfter = await dbHelper.testConnection();
      expect(healthAfter.isHealthy).toBe(true);
      expect(healthAfter.responseTime).toBeLessThan(1000);
    });

    test('should handle concurrent query load efficiently', async () => {
      const concurrencyConfig: ConcurrencyTestConfig = {
        concurrentConnections: 5,
        operationsPerConnection: 10,
        operationType: 'read',
        timeout: 10000
      };

      const concurrencyResults = await dbHelper.testConcurrency(concurrencyConfig);

      expect(concurrencyResults.success).toBe(true);
      expect(concurrencyResults.failedOperations).toBe(0);
      expect(concurrencyResults.completedOperations).toBe(
        concurrencyConfig.concurrentConnections * concurrencyConfig.operationsPerConnection
      );
      expect(concurrencyResults.averageResponseTime).toBeLessThan(1000);

      console.log(`Concurrency Test Results:`);
      console.log(`Completed: ${concurrencyResults.completedOperations} operations`);
      console.log(`Failed: ${concurrencyResults.failedOperations} operations`);
      console.log(`Average response time: ${concurrencyResults.averageResponseTime.toFixed(2)}ms`);
    });

    test('should handle mixed read/write concurrent operations', async () => {
      const mixedConfig: ConcurrencyTestConfig = {
        concurrentConnections: 3,
        operationsPerConnection: 5,
        operationType: 'mixed',
        timeout: 15000
      };

      const mixedResults = await dbHelper.testConcurrency(mixedConfig);

      expect(mixedResults.success).toBe(true);
      expect(mixedResults.failedOperations).toBeLessThan(3); // Allow for some occasional failures
      expect(mixedResults.averageResponseTime).toBeLessThan(2000);

      console.log(`Mixed Operations Test Results:`);
      console.log(`Completed: ${mixedResults.completedOperations} operations`);
      console.log(`Failed: ${mixedResults.failedOperations} operations`);
      console.log(`Average response time: ${mixedResults.averageResponseTime.toFixed(2)}ms`);
    });

    test('should maintain performance under sustained load', async () => {
      const sustainedLoadDuration = 5000; // 5 seconds
      const startTime = Date.now();
      const queryTimes: number[] = [];

      while (Date.now() - startTime < sustainedLoadDuration) {
        const queryStart = Date.now();

        await db('users')
          .select('id', 'first_name', 'last_name', 'email')
          .where('is_active', true)
          .limit(20);

        const queryTime = Date.now() - queryStart;
        queryTimes.push(queryTime);

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxQueryTime = Math.max(...queryTimes);
      const totalQueries = queryTimes.length;

      expect(avgQueryTime).toBeLessThan(200);
      expect(maxQueryTime).toBeLessThan(1000);
      expect(totalQueries).toBeGreaterThan(10);

      console.log(`Sustained Load Test (${sustainedLoadDuration}ms):`);
      console.log(`Total queries: ${totalQueries}`);
      console.log(`Average query time: ${avgQueryTime.toFixed(2)}ms`);
      console.log(`Max query time: ${maxQueryTime.toFixed(2)}ms`);
      console.log(`Queries per second: ${(totalQueries / (sustainedLoadDuration / 1000)).toFixed(1)}`);
    });
  });

  describe('Query Optimization Strategies', () => {
    test('should demonstrate query optimization techniques', async () => {
      const iterations = 10;

      // Inefficient query - SELECT * with no WHERE clause
      const inefficientResults = await dbHelper.benchmarkQuery(
        (db) => db('performance_test_data').select('*').limit(100),
        iterations
      );

      // Optimized query - SELECT only needed columns with WHERE clause
      const optimizedResults = await dbHelper.benchmarkQuery(
        (db) => db('performance_test_data')
          .select('id', 'category', 'test_timestamp')
          .where('test_boolean', true)
          .limit(100),
        iterations
      );

      // Further optimized with index usage
      const indexOptimizedResults = await dbHelper.benchmarkQuery(
        (db) => db('performance_test_data')
          .select('id', 'category')
          .where('category', 'category_a')
          .orderBy('test_timestamp')
          .limit(100),
        iterations
      );

      console.log('Query Optimization Comparison:');
      console.log(`Inefficient (SELECT *): ${inefficientResults.averageTime.toFixed(2)}ms avg`);
      console.log(`Optimized (SELECT specific): ${optimizedResults.averageTime.toFixed(2)}ms avg`);
      console.log(`Index optimized: ${indexOptimizedResults.averageTime.toFixed(2)}ms avg`);

      // All queries should complete, optimized ones should generally be faster
      expect(inefficientResults.averageTime).toBeGreaterThan(0);
      expect(optimizedResults.averageTime).toBeGreaterThan(0);
      expect(indexOptimizedResults.averageTime).toBeGreaterThan(0);
    });

    test('should show benefits of proper WHERE clause ordering', async () => {
      const iterations = 10;

      // WHERE clause with selective condition first (better)
      const optimizedWhereResults = await dbHelper.benchmarkQuery(
        (db) => db('performance_test_data')
          .select('*')
          .where('category', 'category_a') // Selective condition first
          .andWhere('test_boolean', true)
          .limit(50),
        iterations
      );

      // WHERE clause with less selective condition first
      const unoptimizedWhereResults = await dbHelper.benchmarkQuery(
        (db) => db('performance_test_data')
          .select('*')
          .where('test_boolean', true) // Less selective condition first
          .andWhere('category', 'category_a')
          .limit(50),
        iterations
      );

      console.log('WHERE Clause Ordering:');
      console.log(`Optimized WHERE: ${optimizedWhereResults.averageTime.toFixed(2)}ms avg`);
      console.log(`Unoptimized WHERE: ${unoptimizedWhereResults.averageTime.toFixed(2)}ms avg`);

      expect(optimizedWhereResults.averageTime).toBeGreaterThan(0);
      expect(unoptimizedWhereResults.averageTime).toBeGreaterThan(0);
    });

    test('should demonstrate benefits of LIMIT in subqueries', async () => {
      const iterations = 5;

      // Query without LIMIT in subquery (less efficient)
      const noLimitResults = await dbHelper.benchmarkQuery(
        (db) => db('assignments')
          .select('*')
          .whereIn('referee_id',
            db('users').select('id').where('is_active', true)
          )
          .limit(20),
        iterations
      );

      // Query with LIMIT in subquery (more efficient)
      const withLimitResults = await dbHelper.benchmarkQuery(
        (db) => db('assignments')
          .select('*')
          .whereIn('referee_id',
            db('users').select('id').where('is_active', true).limit(50)
          )
          .limit(20),
        iterations
      );

      console.log('Subquery LIMIT Comparison:');
      console.log(`Without subquery LIMIT: ${noLimitResults.averageTime.toFixed(2)}ms avg`);
      console.log(`With subquery LIMIT: ${withLimitResults.averageTime.toFixed(2)}ms avg`);

      expect(noLimitResults.averageTime).toBeGreaterThan(0);
      expect(withLimitResults.averageTime).toBeGreaterThan(0);
    });
  });
});
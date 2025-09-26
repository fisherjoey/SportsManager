/**
 * @fileoverview Advanced Database Integration Test Helper
 * @description Provides comprehensive database testing utilities with transaction management,
 * concurrency testing, performance benchmarking, and realistic test data handling
 */

import { Knex } from 'knex';
import knex from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';

export interface DatabaseTestConfig {
  client: string;
  connection: any;
  pool?: {
    min: number;
    max: number;
    createTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
    idleTimeoutMillis?: number;
  };
  migrations?: {
    directory: string;
    tableName?: string;
  };
}

export interface PerformanceMetrics {
  operationType: string;
  duration: number;
  queryCount: number;
  connectionTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
}

export interface TransactionTestResult {
  success: boolean;
  duration: number;
  rolledBack: boolean;
  error?: Error;
  operationCount: number;
}

export interface ConcurrencyTestConfig {
  concurrentConnections: number;
  operationsPerConnection: number;
  operationType: 'read' | 'write' | 'mixed';
  timeout: number;
}

export class DatabaseTestHelper {
  private db: Knex;
  private testDbName: string;
  private performanceMetrics: PerformanceMetrics[] = [];
  private isSetup: boolean = false;

  constructor(private config: DatabaseTestConfig) {
    this.testDbName = `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Setup test database with fresh schema
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      await this.cleanup();
    }

    // Create test database instance
    this.db = knex({
      ...this.config,
      connection: {
        ...this.config.connection,
        database: this.testDbName
      }
    });

    // Create database if using PostgreSQL
    if (this.config.client === 'postgresql') {
      await this.createTestDatabase();
    }

    // Run migrations
    if (this.config.migrations) {
      await this.db.migrate.latest({
        directory: this.config.migrations.directory,
        tableName: this.config.migrations.tableName || 'knex_migrations'
      });
    } else {
      await this.createBasicSchema();
    }

    this.isSetup = true;
  }

  /**
   * Create test database (PostgreSQL specific)
   */
  private async createTestDatabase(): Promise<void> {
    const adminDb = knex({
      ...this.config,
      connection: {
        ...this.config.connection,
        database: 'postgres' // Connect to postgres database to create test db
      }
    });

    try {
      await adminDb.raw(`CREATE DATABASE "${this.testDbName}"`);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    } finally {
      await adminDb.destroy();
    }
  }

  /**
   * Create basic schema for testing
   */
  private async createBasicSchema(): Promise<void> {
    // Users table with comprehensive fields
    await this.db.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(this.db.raw('gen_random_uuid()'));
      table.string('email').unique().notNullable().index();
      table.string('password').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('phone').nullable();
      table.json('roles').nullable();
      table.json('permissions').nullable();
      table.boolean('is_active').defaultTo(true).index();
      table.timestamp('last_login').nullable();
      table.integer('login_count').defaultTo(0);
      table.timestamps(true, true);

      // Indexes for performance testing
      table.index(['first_name', 'last_name'], 'idx_users_name');
      table.index(['created_at'], 'idx_users_created');
    });

    // Games table with foreign key constraints
    await this.db.schema.createTable('games', (table) => {
      table.uuid('id').primary().defaultTo(this.db.raw('gen_random_uuid()'));
      table.string('home_team').notNullable().index();
      table.string('away_team').notNullable().index();
      table.datetime('game_date').notNullable().index();
      table.string('location').nullable();
      table.string('status').defaultTo('scheduled').index();
      table.string('level').nullable().index();
      table.decimal('fee', 10, 2).nullable();
      table.json('metadata').nullable();
      table.integer('version').defaultTo(1); // For optimistic locking
      table.timestamps(true, true);

      // Composite indexes for complex queries
      table.index(['game_date', 'status'], 'idx_games_date_status');
      table.index(['level', 'status'], 'idx_games_level_status');
    });

    // Teams table
    await this.db.schema.createTable('teams', (table) => {
      table.uuid('id').primary().defaultTo(this.db.raw('gen_random_uuid()'));
      table.string('name').notNullable().unique();
      table.string('division').nullable().index();
      table.string('league').nullable().index();
      table.json('contact_info').nullable();
      table.boolean('is_active').defaultTo(true).index();
      table.timestamps(true, true);
    });

    // Assignments table with foreign key constraints
    await this.db.schema.createTable('assignments', (table) => {
      table.uuid('id').primary().defaultTo(this.db.raw('gen_random_uuid()'));
      table.uuid('game_id').notNullable().references('id').inTable('games').onDelete('CASCADE');
      table.uuid('referee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('position').notNullable();
      table.string('status').defaultTo('pending').index();
      table.decimal('fee', 10, 2).nullable();
      table.datetime('accepted_at').nullable();
      table.timestamps(true, true);

      // Unique constraint to prevent duplicate assignments
      table.unique(['game_id', 'referee_id'], 'uk_assignment_game_referee');

      // Indexes for performance
      table.index(['referee_id', 'status'], 'idx_assignments_referee_status');
      table.index(['game_id', 'status'], 'idx_assignments_game_status');
    });

    // Audit log table for transaction testing
    await this.db.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(this.db.raw('gen_random_uuid()'));
      table.string('table_name').notNullable().index();
      table.uuid('record_id').notNullable().index();
      table.string('operation').notNullable(); // INSERT, UPDATE, DELETE
      table.json('old_values').nullable();
      table.json('new_values').nullable();
      table.uuid('user_id').nullable().references('id').inTable('users');
      table.timestamp('created_at').defaultTo(this.db.fn.now()).index();

      // Composite index for audit queries
      table.index(['table_name', 'record_id', 'created_at'], 'idx_audit_table_record_date');
    });

    // Performance test table for large dataset operations
    await this.db.schema.createTable('performance_test_data', (table) => {
      table.uuid('id').primary().defaultTo(this.db.raw('gen_random_uuid()'));
      table.integer('sequence_number').notNullable().unique();
      table.string('category').notNullable().index();
      table.text('large_text_field').nullable();
      table.json('json_data').nullable();
      table.timestamp('test_timestamp').defaultTo(this.db.fn.now()).index();
      table.decimal('test_decimal', 15, 4).nullable();
      table.boolean('test_boolean').defaultTo(false).index();

      // Multiple indexes for performance testing
      table.index(['category', 'test_timestamp'], 'idx_perf_category_time');
      table.index(['sequence_number', 'category'], 'idx_perf_seq_category');
    });
  }

  /**
   * Seed realistic test data with configurable volume
   */
  async seedTestData(config: {
    userCount?: number;
    gameCount?: number;
    teamCount?: number;
    assignmentCount?: number;
    performanceDataCount?: number;
  } = {}): Promise<void> {
    const {
      userCount = 100,
      gameCount = 500,
      teamCount = 20,
      assignmentCount = 1000,
      performanceDataCount = 10000
    } = config;

    const startTime = performance.now();

    // Seed users
    const users = this.generateUsers(userCount);
    await this.db('users').insert(users);

    // Seed teams
    const teams = this.generateTeams(teamCount);
    await this.db('teams').insert(teams);

    // Seed games
    const games = this.generateGames(gameCount, teams);
    await this.db('games').insert(games);

    // Seed assignments
    const assignments = this.generateAssignments(assignmentCount, users, games);
    await this.db('assignments').insert(assignments);

    // Seed performance test data
    const perfData = this.generatePerformanceTestData(performanceDataCount);
    await this.db('performance_test_data').insert(perfData);

    const duration = performance.now() - startTime;
    this.recordMetrics('seed_data', duration, 5, 0);

    console.log(`✅ Seeded test data: ${userCount} users, ${gameCount} games, ${teamCount} teams, ${assignmentCount} assignments, ${performanceDataCount} performance records in ${duration.toFixed(2)}ms`);
  }

  /**
   * Generate realistic user test data
   */
  private generateUsers(count: number): any[] {
    const roles = ['admin', 'referee', 'assignor', 'coach'];
    const users = [];

    for (let i = 0; i < count; i++) {
      users.push({
        id: uuidv4(),
        email: `user${i}@test.com`,
        password: '$2b$10$YKxDrUwDPUuCPyM8uFVFyOxGmXr6EomQl8KqBVNYPpH7fKGUqGKNy',
        first_name: `FirstName${i}`,
        last_name: `LastName${i}`,
        phone: `555-${String(i).padStart(4, '0')}`,
        roles: JSON.stringify([roles[i % roles.length]]),
        permissions: JSON.stringify(['games.view', 'assignments.view']),
        is_active: Math.random() > 0.1, // 90% active
        login_count: Math.floor(Math.random() * 100),
        last_login: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Last 30 days
        created_at: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)), // Last year
        updated_at: new Date()
      });
    }

    return users;
  }

  /**
   * Generate team test data
   */
  private generateTeams(count: number): any[] {
    const divisions = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Adult'];
    const leagues = ['Premier', 'Division 1', 'Division 2', 'Recreation'];
    const teams = [];

    for (let i = 0; i < count; i++) {
      teams.push({
        id: uuidv4(),
        name: `Team ${String.fromCharCode(65 + i)}`,
        division: divisions[i % divisions.length],
        league: leagues[i % leagues.length],
        contact_info: JSON.stringify({
          coach: `Coach ${i}`,
          email: `coach${i}@team.com`,
          phone: `555-${String(i + 1000).padStart(4, '0')}`
        }),
        is_active: Math.random() > 0.05, // 95% active
        created_at: new Date(Date.now() - Math.floor(Math.random() * 180 * 24 * 60 * 60 * 1000)), // Last 6 months
        updated_at: new Date()
      });
    }

    return teams;
  }

  /**
   * Generate game test data
   */
  private generateGames(count: number, teams: any[]): any[] {
    const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'];
    const levels = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Adult'];
    const games = [];

    for (let i = 0; i < count; i++) {
      const homeTeam = teams[Math.floor(Math.random() * teams.length)];
      let awayTeam = teams[Math.floor(Math.random() * teams.length)];

      // Ensure different teams
      while (awayTeam.id === homeTeam.id) {
        awayTeam = teams[Math.floor(Math.random() * teams.length)];
      }

      games.push({
        id: uuidv4(),
        home_team: homeTeam.name,
        away_team: awayTeam.name,
        game_date: new Date(Date.now() + Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)), // Next 90 days
        location: `Field ${(i % 10) + 1}`,
        status: statuses[i % statuses.length],
        level: levels[i % levels.length],
        fee: Math.floor(Math.random() * 100) + 50,
        metadata: JSON.stringify({
          weather: Math.random() > 0.5 ? 'sunny' : 'cloudy',
          difficulty: Math.floor(Math.random() * 5) + 1
        }),
        version: 1,
        created_at: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Last 30 days
        updated_at: new Date()
      });
    }

    return games;
  }

  /**
   * Generate assignment test data
   */
  private generateAssignments(count: number, users: any[], games: any[]): any[] {
    const positions = ['referee', 'assistant_referee_1', 'assistant_referee_2', 'fourth_official'];
    const statuses = ['pending', 'accepted', 'declined', 'cancelled'];
    const assignments = [];
    const usedCombinations = new Set();

    for (let i = 0; i < count; i++) {
      let gameId, refereeId, combination;
      let attempts = 0;

      do {
        const game = games[Math.floor(Math.random() * games.length)];
        const referee = users[Math.floor(Math.random() * users.length)];
        gameId = game.id;
        refereeId = referee.id;
        combination = `${gameId}-${refereeId}`;
        attempts++;
      } while (usedCombinations.has(combination) && attempts < 100);

      if (attempts >= 100) break; // Avoid infinite loop

      usedCombinations.add(combination);

      assignments.push({
        id: uuidv4(),
        game_id: gameId,
        referee_id: refereeId,
        position: positions[i % positions.length],
        status: statuses[i % statuses.length],
        fee: Math.floor(Math.random() * 50) + 25,
        accepted_at: Math.random() > 0.5 ? new Date() : null,
        created_at: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)), // Last 14 days
        updated_at: new Date()
      });
    }

    return assignments;
  }

  /**
   * Generate performance test data
   */
  private generatePerformanceTestData(count: number): any[] {
    const categories = ['category_a', 'category_b', 'category_c', 'category_d', 'category_e'];
    const data = [];

    for (let i = 0; i < count; i++) {
      data.push({
        id: uuidv4(),
        sequence_number: i + 1,
        category: categories[i % categories.length],
        large_text_field: 'Lorem ipsum '.repeat(Math.floor(Math.random() * 100) + 50),
        json_data: JSON.stringify({
          nested_field: `value_${i}`,
          array_field: Array.from({length: 5}, (_, j) => `item_${j}`),
          timestamp: Date.now()
        }),
        test_timestamp: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
        test_decimal: Math.random() * 10000,
        test_boolean: Math.random() > 0.5
      });
    }

    return data;
  }

  /**
   * Test database transaction with rollback capability
   */
  async testTransaction(
    operations: (trx: Knex.Transaction) => Promise<void>,
    shouldRollback: boolean = false
  ): Promise<TransactionTestResult> {
    const startTime = performance.now();
    let operationCount = 0;
    let rolledBack = false;
    let error: Error | undefined;

    try {
      await this.db.transaction(async (trx) => {
        // Wrap operations to count them
        const originalInsert = trx.insert;
        const originalUpdate = trx.update;
        const originalDelete = trx.del;

        trx.insert = function(...args: any[]) {
          operationCount++;
          return originalInsert.apply(this, args);
        };
        trx.update = function(...args: any[]) {
          operationCount++;
          return originalUpdate.apply(this, args);
        };
        trx.del = function(...args: any[]) {
          operationCount++;
          return originalDelete.apply(this, args);
        };

        await operations(trx);

        if (shouldRollback) {
          rolledBack = true;
          throw new Error('Intentional rollback');
        }
      });

      return {
        success: true,
        duration: performance.now() - startTime,
        rolledBack,
        operationCount
      };
    } catch (err: any) {
      error = err;
      rolledBack = true;
      return {
        success: false,
        duration: performance.now() - startTime,
        rolledBack,
        error,
        operationCount
      };
    }
  }

  /**
   * Test concurrent database operations
   */
  async testConcurrency(config: ConcurrencyTestConfig): Promise<{
    success: boolean;
    completedOperations: number;
    failedOperations: number;
    averageResponseTime: number;
    errors: Error[];
  }> {
    const promises: Promise<any>[] = [];
    const errors: Error[] = [];
    const responseTimes: number[] = [];

    for (let i = 0; i < config.concurrentConnections; i++) {
      for (let j = 0; j < config.operationsPerConnection; j++) {
        const operation = this.createConcurrentOperation(config.operationType, i, j);
        const timedOperation = this.timeOperation(operation);

        promises.push(
          timedOperation.then(
            (result) => {
              responseTimes.push(result.duration);
              return result.data;
            },
            (error) => {
              errors.push(error);
              return null;
            }
          )
        );
      }
    }

    await Promise.allSettled(promises);

    return {
      success: errors.length === 0,
      completedOperations: responseTimes.length,
      failedOperations: errors.length,
      averageResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
      errors
    };
  }

  /**
   * Create concurrent operation based on type
   */
  private async createConcurrentOperation(
    type: 'read' | 'write' | 'mixed',
    connectionId: number,
    operationId: number
  ): Promise<any> {
    switch (type) {
      case 'read':
        return this.db('users').select('*').limit(10);

      case 'write':
        return this.db('performance_test_data').insert({
          id: uuidv4(),
          sequence_number: Date.now() + connectionId * 1000 + operationId,
          category: `concurrent_test_${connectionId}`,
          large_text_field: `Concurrent operation ${connectionId}-${operationId}`,
          test_timestamp: new Date(),
          test_decimal: Math.random() * 1000,
          test_boolean: Math.random() > 0.5
        });

      case 'mixed':
        if (Math.random() > 0.5) {
          return this.db('games').select('*').where('status', 'scheduled').limit(5);
        } else {
          return this.db('assignments').update({ updated_at: new Date() })
            .where('id', '=', this.db.raw('(SELECT id FROM assignments ORDER BY RANDOM() LIMIT 1)'));
        }

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Time an operation
   */
  private async timeOperation<T>(operation: Promise<T>): Promise<{ data: T; duration: number }> {
    const startTime = performance.now();
    const data = await operation;
    const duration = performance.now() - startTime;
    return { data, duration };
  }

  /**
   * Benchmark query performance
   */
  async benchmarkQuery(
    query: (db: Knex) => Knex.QueryBuilder,
    iterations: number = 100
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    operationsPerSecond: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await query(this.db);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const operationsPerSecond = 1000 / averageTime;

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
      operationsPerSecond
    };
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(
    operationType: string,
    duration: number,
    queryCount: number,
    connectionTime: number
  ): void {
    this.performanceMetrics.push({
      operationType,
      duration,
      queryCount,
      connectionTime,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Get database instance
   */
  getDb(): Knex {
    return this.db;
  }

  /**
   * Test database connection health
   */
  async testConnection(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = performance.now();

    try {
      await this.db.raw('SELECT 1 as health_check');
      const responseTime = performance.now() - startTime;

      return {
        isHealthy: true,
        responseTime
      };
    } catch (error: any) {
      return {
        isHealthy: false,
        responseTime: performance.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Cleanup test database and connections
   */
  async cleanup(): Promise<void> {
    if (!this.db) return;

    try {
      // Clear all data
      const tables = ['audit_logs', 'performance_test_data', 'assignments', 'games', 'teams', 'users'];
      for (const table of tables) {
        await this.db(table).del();
      }

      // Close connections
      await this.db.destroy();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }

    this.isSetup = false;
  }

  /**
   * Create a deadlock scenario for testing
   */
  async createDeadlockScenario(): Promise<{
    deadlockDetected: boolean;
    error?: Error;
    duration: number;
  }> {
    const startTime = performance.now();

    try {
      // Create two transactions that will access resources in opposite order
      const [result1, result2] = await Promise.allSettled([
        this.db.transaction(async (trx1) => {
          await trx1('users').select('*').where('id', this.db.raw('(SELECT id FROM users LIMIT 1)')).forUpdate();
          await new Promise(resolve => setTimeout(resolve, 100)); // Add delay
          await trx1('games').select('*').where('id', this.db.raw('(SELECT id FROM games LIMIT 1)')).forUpdate();
        }),
        this.db.transaction(async (trx2) => {
          await trx2('games').select('*').where('id', this.db.raw('(SELECT id FROM games LIMIT 1)')).forUpdate();
          await new Promise(resolve => setTimeout(resolve, 100)); // Add delay
          await trx2('users').select('*').where('id', this.db.raw('(SELECT id FROM users LIMIT 1)')).forUpdate();
        })
      ]);

      const hasDeadlock = result1.status === 'rejected' || result2.status === 'rejected';
      const error = result1.status === 'rejected' ? result1.reason :
                   result2.status === 'rejected' ? result2.reason : undefined;

      return {
        deadlockDetected: hasDeadlock,
        error,
        duration: performance.now() - startTime
      };
    } catch (error: any) {
      return {
        deadlockDetected: true,
        error,
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * Test optimistic locking
   */
  async testOptimisticLocking(): Promise<{
    success: boolean;
    conflictDetected: boolean;
    error?: Error;
  }> {
    try {
      // Create a game with version 1
      const [gameId] = await this.db('games').insert({
        id: uuidv4(),
        home_team: 'Test Team A',
        away_team: 'Test Team B',
        game_date: new Date(),
        location: 'Test Field',
        status: 'scheduled',
        version: 1
      }).returning('id');

      // Simulate two concurrent updates
      const game1 = await this.db('games').where('id', gameId).first();
      const game2 = await this.db('games').where('id', gameId).first();

      // First update (should succeed)
      await this.db('games')
        .where('id', gameId)
        .where('version', game1.version)
        .update({
          location: 'Updated Field 1',
          version: game1.version + 1,
          updated_at: new Date()
        });

      // Second update (should fail due to version mismatch)
      const result = await this.db('games')
        .where('id', gameId)
        .where('version', game2.version)
        .update({
          location: 'Updated Field 2',
          version: game2.version + 1,
          updated_at: new Date()
        });

      return {
        success: true,
        conflictDetected: result === 0, // No rows updated means conflict
        error: undefined
      };
    } catch (error: any) {
      return {
        success: false,
        conflictDetected: false,
        error
      };
    }
  }
}

/**
 * Factory function to create database test helper
 */
export const createDatabaseTestHelper = (config?: Partial<DatabaseTestConfig>): DatabaseTestHelper => {
  const defaultConfig: DatabaseTestConfig = {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    },
    pool: {
      min: 1,
      max: 5,
      createTimeoutMillis: 3000,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000
    },
    migrations: {
      directory: './src/migrations',
      tableName: 'knex_migrations'
    }
  };

  return new DatabaseTestHelper({ ...defaultConfig, ...config });
};

// Export types for use in tests
export type { ConcurrencyTestConfig, PerformanceMetrics, TransactionTestResult };
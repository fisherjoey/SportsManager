const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Budget System Concurrent Access Tests', () => {
  let adminToken;
  let testOrgId;
  let testPeriodId;
  let testCategoryId;
  let testBudgetId;

  beforeAll(async () => {
    // Create test organization and user
    const [org] = await db('users').insert({
      email: 'concurrent-test-org@test.com',
      password: '$2b$10$test',
      role: 'admin',
      name: 'Concurrent Test Org'
    }).returning('*');
    testOrgId = org.id;

    // Get authentication token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'concurrent-test-org@test.com', password: 'password123' });
    adminToken = adminLogin.body.token || 'test-token'; // Fallback for test

    // Create test budget period
    const [period] = await db('budget_periods').insert({
      name: 'Concurrent Test Period 2024',
      description: 'Test period for concurrent access testing',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      organization_id: testOrgId,
      created_by: org.id,
      status: 'active'
    }).returning('*');
    testPeriodId = period.id;

    // Create test budget category
    const [category] = await db('budget_categories').insert({
      name: 'Concurrent Test Operations',
      code: 'CONCURRENT-OPS',
      category_type: 'operating_expenses',
      description: 'Test category for concurrent operations',
      organization_id: testOrgId,
      color_code: '#0088FE',
      sort_order: 1
    }).returning('*');
    testCategoryId = category.id;

    // Create initial test budget
    const [budget] = await db('budgets').insert({
      organization_id: testOrgId,
      budget_period_id: testPeriodId,
      category_id: testCategoryId,
      name: 'Concurrent Test Budget',
      allocated_amount: 10000.00,
      owner_id: org.id,
      status: 'active'
    }).returning('*');
    testBudgetId = budget.id;
  });

  afterAll(async () => {
    // Clean up all test data
    await db('budget_allocations').whereIn('budget_id', 
      db('budgets').select('id').where('organization_id', testOrgId)
    ).del();
    await db('budgets').where('organization_id', testOrgId).del();
    await db('budget_categories').where('organization_id', testOrgId).del();
    await db('budget_periods').where('organization_id', testOrgId).del();
    await db('users').where('id', testOrgId).del();
  });

  describe('Concurrent Budget Updates', () => {
    test('should handle multiple simultaneous budget updates correctly', async () => {
      const updatePromises = [];
      const numberOfUpdates = 5;
      
      // Create multiple concurrent update requests
      for (let i = 0; i < numberOfUpdates; i++) {
        const updateData = {
          budget_period_id: testPeriodId,
          category_id: testCategoryId,
          name: `Concurrent Update ${i}`,
          allocated_amount: 10000 + (i * 1000), // Different amounts
          description: `Update attempt ${i}`
        };

        updatePromises.push(
          request(app)
            .put(`/api/budgets/${testBudgetId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateData)
        );
      }

      // Execute all updates simultaneously
      const responses = await Promise.all(updatePromises);

      // All requests should succeed (last write wins)
      responses.forEach(response => {
        expect([200, 409]).toContain(response.status); // 200 success or 409 conflict
      });

      // Verify final budget state is consistent
      const finalBudget = await db('budgets')
        .where('id', testBudgetId)
        .first();
      
      expect(finalBudget).toBeDefined();
      expect(finalBudget.allocated_amount).toBeGreaterThan(10000);

      // Verify allocations are consistent with final budget amount
      const allocations = await db('budget_allocations')
        .where('budget_id', testBudgetId);
      
      const totalAllocated = allocations.reduce((sum, alloc) => 
        sum + parseFloat(alloc.allocated_amount), 0);
      
      expect(Math.abs(totalAllocated - parseFloat(finalBudget.allocated_amount))).toBeLessThan(0.01);
    });

    test('should prevent race conditions in budget creation', async () => {
      const numberOfCreations = 3;
      const createPromises = [];

      // Try to create multiple budgets with same category/period simultaneously
      for (let i = 0; i < numberOfCreations; i++) {
        const budgetData = {
          budget_period_id: testPeriodId,
          category_id: testCategoryId,
          name: `Race Condition Test Budget ${i}`,
          allocated_amount: 5000.00
        };

        createPromises.push(
          request(app)
            .post('/api/budgets')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(budgetData)
        );
      }

      const responses = await Promise.all(createPromises);

      // Only one should succeed due to unique constraints
      const successfulResponses = responses.filter(r => r.status === 201);
      const duplicateResponses = responses.filter(r => r.status === 409);

      expect(successfulResponses.length).toBe(1);
      expect(duplicateResponses.length).toBe(numberOfCreations - 1);

      // Clean up created budget
      if (successfulResponses.length > 0) {
        await db('budget_allocations').where('budget_id', successfulResponses[0].body.budget.id).del();
        await db('budgets').where('id', successfulResponses[0].body.budget.id).del();
      }
    });
  });

  describe('Concurrent Allocation Updates', () => {
    test('should handle simultaneous allocation updates to same budget', async () => {
      const allocationPromises = [];
      const numberOfAllocations = 4;

      // Create multiple allocation updates for different months simultaneously
      for (let month = 1; month <= numberOfAllocations; month++) {
        const allocationData = {
          allocation_year: 2024,
          allocation_month: month,
          allocated_amount: 1000.00 + (month * 100),
          notes: `Concurrent allocation for month ${month}`
        };

        allocationPromises.push(
          request(app)
            .post(`/api/budgets/${testBudgetId}/allocations`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(allocationData)
        );
      }

      const responses = await Promise.all(allocationPromises);

      // All should succeed since they're for different months
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all allocations were created
      const allocations = await db('budget_allocations')
        .where('budget_id', testBudgetId)
        .where('allocation_year', 2024)
        .whereIn('allocation_month', [1, 2, 3, 4]);

      expect(allocations.length).toBe(numberOfAllocations);
    });

    test('should handle concurrent updates to same allocation correctly', async () => {
      const month = 6;
      const year = 2024;
      const numberOfUpdates = 3;
      const updatePromises = [];

      // Create multiple updates to the same allocation
      for (let i = 0; i < numberOfUpdates; i++) {
        const allocationData = {
          allocation_year: year,
          allocation_month: month,
          allocated_amount: 2000.00 + (i * 500), // Different amounts
          notes: `Concurrent update ${i}`
        };

        updatePromises.push(
          request(app)
            .post(`/api/budgets/${testBudgetId}/allocations`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(allocationData)
        );
      }

      const responses = await Promise.all(updatePromises);

      // All should succeed (upsert behavior)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should only have one allocation for that month/year
      const allocations = await db('budget_allocations')
        .where('budget_id', testBudgetId)
        .where('allocation_year', year)
        .where('allocation_month', month);

      expect(allocations.length).toBe(1);
      expect(parseFloat(allocations[0].allocated_amount)).toBeGreaterThan(2000);
    });
  });

  describe('Read Operations Under Concurrent Load', () => {
    test('should handle multiple simultaneous read requests efficiently', async () => {
      const numberOfReads = 10;
      const readPromises = [];
      const startTime = Date.now();

      // Create multiple simultaneous read requests
      for (let i = 0; i < numberOfReads; i++) {
        readPromises.push(
          request(app)
            .get(`/api/budgets/${testBudgetId}`)
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      const responses = await Promise.all(readPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All reads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.budget.id).toBe(testBudgetId);
      });

      // Should complete reasonably quickly (less than 10 seconds for 10 reads)
      expect(totalTime).toBeLessThan(10000);

      // All responses should be consistent
      const firstResponse = responses[0];
      responses.forEach(response => {
        expect(response.body.budget.allocated_amount)
          .toBe(firstResponse.body.budget.allocated_amount);
      });
    });

    test('should handle list operations with concurrent filtering', async () => {
      const filterPromises = [];
      const filters = [
        { period_id: testPeriodId },
        { category_id: testCategoryId },
        { status: 'active' },
        { include_summary: true },
        { page: 1, limit: 50 }
      ];

      // Create concurrent list requests with different filters
      filters.forEach(filter => {
        filterPromises.push(
          request(app)
            .get('/api/budgets')
            .query(filter)
            .set('Authorization', `Bearer ${adminToken}`)
        );
      });

      const responses = await Promise.all(filterPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);  
        expect(response.body).toHaveProperty('budgets');
        expect(response.body).toHaveProperty('pagination');
      });
    });
  });

  describe('Mixed Read/Write Operations', () => {
    test('should handle mixed concurrent read and write operations', async () => {
      const operations = [];

      // Mix of read and write operations
      operations.push(
        // Read operations
        request(app)
          .get(`/api/budgets/${testBudgetId}`)
          .set('Authorization', `Bearer ${adminToken}`),
        
        request(app)
          .get('/api/budgets')
          .set('Authorization', `Bearer ${adminToken}`),

        // Write operations
        request(app)
          .put(`/api/budgets/${testBudgetId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            budget_period_id: testPeriodId,
            category_id: testCategoryId,
            name: 'Mixed Operations Test',
            allocated_amount: 15000.00
          }),

        request(app)
          .post(`/api/budgets/${testBudgetId}/allocations`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            allocation_year: 2024,
            allocation_month: 8,
            allocated_amount: 1500.00
          })
      );

      const responses = await Promise.all(operations);

      // All operations should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });

      // Verify final state is consistent
      const finalBudget = await db('budgets')
        .where('id', testBudgetId)
        .first();
      
      expect(finalBudget.name).toBe('Mixed Operations Test');
      expect(parseFloat(finalBudget.allocated_amount)).toBe(15000.00);
    });
  });

  describe('Database Transaction Integrity', () => {
    test('should maintain data integrity under concurrent operations', async () => {
      // Record initial state
      const initialBudget = await db('budgets')
        .where('id', testBudgetId)
        .first();
      
      const initialAllocations = await db('budget_allocations')
        .where('budget_id', testBudgetId);

      // Perform multiple concurrent operations that could affect data integrity
      const operations = [
        // Update budget amount
        request(app)
          .put(`/api/budgets/${testBudgetId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            budget_period_id: testPeriodId,
            category_id: testCategoryId,
            name: 'Integrity Test Budget',
            allocated_amount: 20000.00
          }),

        // Add multiple allocations
        request(app)
          .post(`/api/budgets/${testBudgetId}/allocations`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            allocation_year: 2024,
            allocation_month: 9,
            allocated_amount: 2000.00
          }),

        request(app)
          .post(`/api/budgets/${testBudgetId}/allocations`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            allocation_year: 2024,
            allocation_month: 10,
            allocated_amount: 2500.00
          })
      ];

      const responses = await Promise.all(operations);

      // All operations should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });

      // Verify final state
      const finalBudget = await db('budgets')
        .where('id', testBudgetId)
        .first();

      const finalAllocations = await db('budget_allocations')
        .where('budget_id', testBudgetId);

      // Basic integrity checks
      expect(finalBudget).toBeDefined();
      expect(finalBudget.name).toBe('Integrity Test Budget');
      expect(finalAllocations.length).toBeGreaterThan(initialAllocations.length);

      // Verify no orphaned records
      const orphanedAllocations = await db('budget_allocations')
        .whereNotIn('budget_id', db('budgets').select('id'));
      
      expect(orphanedAllocations.length).toBe(0);
    });

    test('should handle transaction rollbacks correctly under failure conditions', async () => {
      // This test would simulate a failure during a transaction
      // and verify that partial changes are rolled back
      
      // For this test, we'll create a scenario where an operation might fail
      // and verify the database remains in a consistent state
      
      const initialBudgetCount = await db('budgets')
        .where('organization_id', testOrgId)
        .count('id as count');

      // Try to create a budget with invalid data that should cause rollback
      try {
        await request(app)
          .post('/api/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            budget_period_id: testPeriodId,
            category_id: 'invalid-uuid-that-will-fail',
            name: 'Rollback Test Budget',
            allocated_amount: 5000.00
          });
      } catch (error) {
        // Expected to fail
      }

      // Verify no partial data was left behind
      const finalBudgetCount = await db('budgets')
        .where('organization_id', testOrgId)
        .count('id as count');

      expect(parseInt(finalBudgetCount[0].count))
        .toBe(parseInt(initialBudgetCount[0].count));
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain acceptable performance under concurrent load', async () => {
      const numberOfOperations = 20;
      const operations = [];
      const startTime = Date.now();

      // Create a mix of operations to simulate real load
      for (let i = 0; i < numberOfOperations; i++) {
        if (i % 3 === 0) {
          // Read operation
          operations.push(
            request(app)
              .get('/api/budgets')
              .query({ limit: 10 })
              .set('Authorization', `Bearer ${adminToken}`)
          );
        } else if (i % 3 === 1) {
          // Allocation update
          operations.push(
            request(app)
              .post(`/api/budgets/${testBudgetId}/allocations`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({
                allocation_year: 2024,
                allocation_month: (i % 12) + 1,
                allocated_amount: 1000 + i
              })
          );
        } else {
          // Budget read
          operations.push(
            request(app)
              .get(`/api/budgets/${testBudgetId}`)
              .set('Authorization', `Bearer ${adminToken}`)
          );
        }
      }

      const responses = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All operations should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });

      // Should complete within reasonable time (less than 30 seconds for 20 ops)
      expect(totalTime).toBeLessThan(30000);

      // Average response time should be reasonable
      const avgResponseTime = totalTime / numberOfOperations;
      expect(avgResponseTime).toBeLessThan(1500); // Less than 1.5 seconds per operation
    });
  });
});
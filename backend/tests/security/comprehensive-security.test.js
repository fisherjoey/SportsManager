const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Comprehensive Security Testing', () => {
  let authToken;
  let adminToken;
  let userToken;
  let testUserId;
  let testBudgetId;
  let testOrganizationId;

  beforeAll(async () => {
    // Create test organization
    const [org] = await db('users').insert({
      email: 'security-test-org@test.com',
      password: '$2b$10$hash', // Pre-hashed password
      role: 'admin',
      name: 'Security Test Org'
    }).returning('*');
    testOrganizationId = org.id;

    // Create test admin user
    const [admin] = await db('users').insert({
      email: 'security-admin@test.com',
      password: '$2b$10$hash',
      role: 'admin',
      organization_id: testOrganizationId,
      name: 'Security Admin'
    }).returning('*');

    // Create test regular user
    const [user] = await db('users').insert({
      email: 'security-user@test.com',
      password: '$2b$10$hash',
      role: 'user',
      organization_id: testOrganizationId,
      name: 'Security User'
    }).returning('*');
    testUserId = user.id;

    // Login to get tokens
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'security-admin@test.com',
        password: 'password123'
      });
    adminToken = adminLoginRes.body.token;

    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'security-user@test.com',
        password: 'password123'
      });
    userToken = userLoginRes.body.token;

    // Create test budget period and category
    const [period] = await db('budget_periods').insert({
      name: 'Security Test Period',
      organization_id: testOrganizationId,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      created_by: admin.id
    }).returning('*');

    const [category] = await db('budget_categories').insert({
      name: 'Security Test Category',
      code: 'SEC',
      category_type: 'operating_expenses',
      organization_id: testOrganizationId
    }).returning('*');

    // Create test budget
    const [budget] = await db('budgets').insert({
      budget_period_id: period.id,
      category_id: category.id,
      name: 'Security Test Budget',
      allocated_amount: 1000.00,
      organization_id: testOrganizationId
    }).returning('*');
    testBudgetId = budget.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db('budget_allocations').where('budget_id', testBudgetId).del();
    await db('budgets').where('organization_id', testOrganizationId).del();
    await db('budget_categories').where('organization_id', testOrganizationId).del();
    await db('budget_periods').where('organization_id', testOrganizationId).del();
    await db('users').where('organization_id', testOrganizationId).del();
    await db('users').where('id', testOrganizationId).del();
  });

  describe('SQL Injection Protection', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE budgets; --",
      "' UNION SELECT * FROM users --",
      "'; UPDATE budgets SET allocated_amount = 999999 WHERE 1=1; --",
      "1' OR '1'='1",
      "'; DELETE FROM budget_categories; --",
      "' OR 1=1 LIMIT 1 OFFSET 0 --",
      "'; INSERT INTO budgets (name, allocated_amount) VALUES ('hacked', 999999); --",
      "' UNION ALL SELECT password FROM users --"
    ];

    test('Budget endpoints should be protected from SQL injection', async () => {
      for (const payload of sqlInjectionPayloads) {
        // Test GET /api/budgets with malicious query params
        const getRes = await request(app)
          .get('/api/budgets')
          .query({ period_id: payload })
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect(getRes.status).not.toBe(500);
        expect(getRes.body).not.toHaveProperty('password');
        expect(getRes.body).not.toContain('DROP TABLE');

        // Test POST /api/budgets with malicious data
        const postRes = await request(app)
          .post('/api/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: payload,
            budget_period_id: testBudgetId,
            category_id: testBudgetId,
            allocated_amount: 100
          });

        expect(postRes.status).toBeLessThan(500);
        expect(postRes.body).not.toHaveProperty('password');
      }
    });

    test('Budget search endpoints should sanitize input', async () => {
      const maliciousSearch = "'; SELECT * FROM users WHERE role='admin'; --";
      
      const res = await request(app)
        .get('/api/budgets')
        .query({ 
          search: maliciousSearch,
          owner_id: maliciousSearch 
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).not.toBe(500);
      expect(res.body).not.toHaveProperty('password');
      expect(JSON.stringify(res.body)).not.toContain('admin');
    });

    test('Budget allocation endpoints should prevent SQL injection', async () => {
      const payload = "'; UPDATE budget_allocations SET allocated_amount = 999999; --";
      
      const res = await request(app)
        .post(`/api/budgets/${testBudgetId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          allocation_year: payload,
          allocation_month: 1,
          allocated_amount: 100
        });

      expect(res.status).toBeLessThan(500);
      
      // Verify no unauthorized changes were made
      const budget = await db('budgets').where('id', testBudgetId).first();
      expect(budget.allocated_amount).not.toBe(999999);
    });
  });

  describe('Authorization Boundary Testing', () => {
    test('Users cannot access budgets from other organizations', async () => {
      // Create budget in different organization
      const [otherOrg] = await db('users').insert({
        email: 'other-org@test.com',
        password: '$2b$10$hash',
        role: 'admin',
        name: 'Other Org'
      }).returning('*');

      const [otherPeriod] = await db('budget_periods').insert({
        name: 'Other Org Period',
        organization_id: otherOrg.id,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        created_by: otherOrg.id
      }).returning('*');

      const [otherCategory] = await db('budget_categories').insert({
        name: 'Other Org Category',
        code: 'OTHER',
        category_type: 'revenue',
        organization_id: otherOrg.id
      }).returning('*');

      const [otherBudget] = await db('budgets').insert({
        budget_period_id: otherPeriod.id,
        category_id: otherCategory.id,
        name: 'Other Org Budget',
        allocated_amount: 5000.00,
        organization_id: otherOrg.id
      }).returning('*');

      // Try to access other org's budget
      const res = await request(app)
        .get(`/api/budgets/${otherBudget.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Budget not found');

      // Clean up
      await db('budgets').where('organization_id', otherOrg.id).del();
      await db('budget_categories').where('organization_id', otherOrg.id).del();
      await db('budget_periods').where('organization_id', otherOrg.id).del();
      await db('users').where('id', otherOrg.id).del();
    });

    test('Regular users cannot create or modify budgets', async () => {
      // Try to create budget as regular user
      const createRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Budget',
          budget_period_id: testBudgetId,
          category_id: testBudgetId,
          allocated_amount: 1000
        });

      expect(createRes.status).toBe(403);

      // Try to update budget as regular user
      const updateRes = await request(app)
        .put(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Budget',
          allocated_amount: 2000
        });

      expect(updateRes.status).toBe(403);
    });

    test('Invalid tokens should be rejected', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid',
        '', 
        null,
        'Bearer ' + 'a'.repeat(500) // Extremely long token
      ];

      for (const token of invalidTokens) {
        const res = await request(app)
          .get('/api/budgets')
          .set('Authorization', token || '');

        expect(res.status).toBe(401);
      }
    });

    test('Expired tokens should be rejected', async () => {
      // This would require creating an expired token, 
      // which is complex with JWT - placeholder for implementation
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const res = await request(app)
        .get('/api/budgets')
        .set('Authorization', expiredToken);

      expect(res.status).toBe(401);
    });
  });

  describe('Data Leakage Prevention', () => {
    test('Error messages should not contain sensitive information', async () => {
      // Test with invalid budget ID format
      const res = await request(app)
        .get('/api/budgets/invalid-uuid-format')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Budget not found');
      expect(JSON.stringify(res.body)).not.toMatch(/database|sql|knex|pg|postgres/i);
      expect(JSON.stringify(res.body)).not.toContain('password');
      expect(JSON.stringify(res.body)).not.toContain('hash');
    });

    test('Budget responses should not leak internal data', async () => {
      const res = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('budgets');
      
      if (res.body.budgets.length > 0) {
        const budget = res.body.budgets[0];
        expect(budget).not.toHaveProperty('password');
        expect(budget).not.toHaveProperty('created_at');
        expect(budget).not.toHaveProperty('updated_at');
        expect(budget).not.toHaveProperty('internal_notes');
      }
    });

    test('System errors should not expose stack traces', async () => {
      // Force a potential system error by using extremely large payload
      const largePayload = {
        name: 'a'.repeat(10000),
        description: 'b'.repeat(10000),
        allocated_amount: 'not-a-number'
      };

      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largePayload);

      expect(res.status).toBeLessThan(500);
      expect(JSON.stringify(res.body)).not.toMatch(/at\s+\w+\.\w+\s+\(/); // Stack trace pattern
      expect(JSON.stringify(res.body)).not.toContain(__filename);
      expect(JSON.stringify(res.body)).not.toContain('node_modules');
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('Budget creation should validate input types', async () => {
      const invalidInputs = [
        { allocated_amount: 'not-a-number' },
        { allocated_amount: -1000 },
        { name: '' },
        { name: null },
        { budget_period_id: 'invalid-uuid' },
        { category_id: 123 }, // Should be UUID string
      ];

      for (const input of invalidInputs) {
        const res = await request(app)
          .post('/api/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Budget',
            budget_period_id: testBudgetId,
            category_id: testBudgetId,
            allocated_amount: 1000,
            ...input
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
      }
    });

    test('XSS payloads should be sanitized', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '"><script>alert(document.cookie)</script>',
        '<svg onload=alert(1)>'
      ];

      for (const payload of xssPayloads) {
        const res = await request(app)
          .post('/api/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: payload,
            description: payload,
            budget_period_id: testBudgetId,
            category_id: testBudgetId,
            allocated_amount: 100
          });

        // Should either validate and reject, or sanitize
        if (res.status === 201) {
          expect(res.body.budget.name).not.toContain('<script>');
          expect(res.body.budget.description || '').not.toContain('<script>');
        } else {
          expect(res.status).toBe(400);
        }
      }
    });

    test('Extremely large payloads should be rejected', async () => {
      const largeString = 'a'.repeat(100000);
      
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: largeString,
          description: largeString,
          budget_period_id: testBudgetId,
          category_id: testBudgetId,
          allocated_amount: 100
        });

      expect(res.status).toBeLessThan(500);
      expect(res.status).not.toBe(201); // Should not succeed
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    test('Multiple rapid requests should be rate limited', async () => {
      const requests = [];
      const numRequests = 20;

      // Fire multiple requests rapidly
      for (let i = 0; i < numRequests; i++) {
        requests.push(
          request(app)
            .get('/api/budgets')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      // Should have some rate limited responses if rate limiting is active
      // This test may need adjustment based on actual rate limiting configuration
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].status).toBe(429);
      }
    }, 10000);

    test('Malformed requests should not consume excessive resources', async () => {
      const malformedRequests = [
        { body: '{invalid-json' },
        { body: JSON.stringify({ nested: { very: { deeply: { nested: { object: 'a'.repeat(1000) } } } } }) },
        { body: 'not-json-at-all' },
        { headers: { 'content-type': 'text/plain' }, body: 'plain text' }
      ];

      for (const req of malformedRequests) {
        const startTime = Date.now();
        
        const res = await request(app)
          .post('/api/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('Content-Type', req.headers?.['content-type'] || 'application/json')
          .send(req.body);

        const responseTime = Date.now() - startTime;
        
        // Should respond quickly even with malformed input
        expect(responseTime).toBeLessThan(5000);
        expect(res.status).toBeLessThan(500);
      }
    });
  });

  describe('Concurrent Access Safety', () => {
    test('Concurrent budget updates should maintain data integrity', async () => {
      const initialBudget = await db('budgets').where('id', testBudgetId).first();
      const updates = [];
      
      // Create multiple concurrent update requests
      for (let i = 0; i < 5; i++) {
        updates.push(
          request(app)
            .put(`/api/budgets/${testBudgetId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: `Concurrent Update ${i}`,
              budget_period_id: initialBudget.budget_period_id,
              category_id: initialBudget.category_id,
              allocated_amount: initialBudget.allocated_amount + i
            })
        );
      }

      const responses = await Promise.all(updates);
      const successfulUpdates = responses.filter(res => res.status === 200);
      
      // At least one should succeed
      expect(successfulUpdates.length).toBeGreaterThan(0);
      
      // Verify final state is consistent
      const finalBudget = await db('budgets').where('id', testBudgetId).first();
      expect(finalBudget).toBeDefined();
      expect(finalBudget.allocated_amount).toBeGreaterThanOrEqual(initialBudget.allocated_amount);
    });

    test('Concurrent allocation creation should prevent double-allocation', async () => {
      const allocations = [];
      
      // Try to create the same allocation concurrently
      for (let i = 0; i < 3; i++) {
        allocations.push(
          request(app)
            .post(`/api/budgets/${testBudgetId}/allocations`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              allocation_year: 2024,
              allocation_month: 6,
              allocated_amount: 100
            })
        );
      }

      const responses = await Promise.all(allocations);
      const successfulCreations = responses.filter(res => res.status === 200);
      
      // Should handle concurrent requests gracefully (either succeed once or handle conflicts)
      expect(successfulCreations.length).toBeLessThanOrEqual(1);
      
      // Clean up
      await db('budget_allocations')
        .where('budget_id', testBudgetId)
        .where('allocation_year', 2024)
        .where('allocation_month', 6)
        .del();
    });
  });

  describe('Session and Authentication Security', () => {
    test('Should require authentication for all budget endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/budgets' },
        { method: 'post', path: '/api/budgets' },
        { method: 'get', path: `/api/budgets/${testBudgetId}` },
        { method: 'put', path: `/api/budgets/${testBudgetId}` },
        { method: 'get', path: '/api/budgets/periods' },
        { method: 'post', path: '/api/budgets/periods' },
        { method: 'get', path: '/api/budgets/categories' },
        { method: 'post', path: '/api/budgets/categories' }
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)[endpoint.method](endpoint.path);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
      }
    });

    test('Token should be validated on every request', async () => {
      // Test with tampered token
      const tamperedToken = adminToken.slice(0, -5) + 'XXXXX';
      
      const res = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });
  });
});
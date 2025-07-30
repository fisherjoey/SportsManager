const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const { createAuditLogsTable } = require('../../src/middleware/auditTrail');

describe('Security Enhancements', () => {
  let authToken;
  let adminToken;

  beforeAll(async () => {
    // Ensure audit logs table exists
    try {
      await createAuditLogsTable();
    } catch (error) {
      // Table might already exist, that's okay
    }

    // Create test admin user and get token
    const adminUser = {
      email: 'security-admin@test.com',
      password: 'securePassword123',
      role: 'admin'
    };

    const adminRegResponse = await request(app)
      .post('/api/auth/register')
      .send(adminUser);

    adminToken = adminRegResponse.body.token;

    // Create test referee user and get token
    const refereeUser = {
      email: 'security-referee@test.com',
      password: 'securePassword123',
      role: 'referee',
      referee_data: {
        name: 'Security Test Referee',
        level: 'Recreational',
        postal_code: 'T2N 1N4',
        max_distance: 25
      }
    };

    const refereeRegResponse = await request(app)
      .post('/api/auth/register')
      .send(refereeUser);

    authToken = refereeRegResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await db('audit_logs').where('user_email', 'like', '%security-%').del();
    await db('users').where('email', 'like', '%security-%').del();
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting on login endpoint', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      };

      // Make 6 rapid login attempts (limit is 5)
      const promises = Array(6).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);

    test('should enforce rate limiting on registration endpoint', async () => {
      const registrationData = {
        email: 'ratelimit-test@test.com',
        password: 'password123',
        role: 'referee',
        referee_data: {
          name: 'Rate Limit Test',
          level: 'Recreational',
          postal_code: 'T2N 1N4'
        }
      };

      // Make multiple rapid registration attempts
      const promises = Array(7).fill().map((_, index) =>
        request(app)
          .post('/api/auth/register')
          .send({
            ...registrationData,
            email: `ratelimit-test-${index}@test.com`
          })
      );

      const responses = await Promise.all(promises);
      
      // Some should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Input Sanitization', () => {
    test('should sanitize XSS attempts in request body', async () => {
      const maliciousData = {
        email: 'test@test.com',
        password: 'password123',
        role: 'referee',
        referee_data: {
          name: '<script>alert("xss")</script>Malicious Name',
          level: 'Recreational',
          postal_code: 'T2N 1N4'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData);

      // Should still process the request but sanitize the input
      if (response.status === 201) {
        expect(response.body.user).toBeDefined();
        // The script tag should be removed
        expect(response.body.user.name).not.toContain('<script>');
      }
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/games?status=invalid_status&page=not_a_number')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid query parameters');
    });

    test('should reject suspicious SQL injection patterns', async () => {
      const response = await request(app)
        .get('/api/games?status=assigned; DROP TABLE games;')
        .set('Authorization', `Bearer ${authToken}`);

      // Should be blocked by security monitoring
      expect([400, 403]).toContain(response.status);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for games endpoint', async () => {
      const response = await request(app)
        .get('/api/games');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Access token required');
    });

    test('should require authentication for assignments endpoint', async () => {
      const response = await request(app)
        .get('/api/assignments');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Access token required');
    });

    test('should allow authenticated access to games endpoint', async () => {
      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });

    test('should validate JWT token format', async () => {
      const response = await request(app)
        .get('/api/games')
        .set('Authorization', 'Bearer invalid-token-format');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Invalid or expired token');
    });
  });

  describe('Error Handling', () => {
    test('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Route not found');
      expect(response.body.stack).toBeUndefined(); // Should not leak stack traces in production mode
    });

    test('should handle database errors gracefully', async () => {
      // This would normally cause a database error
      const response = await request(app)
        .get('/api/games?page=999999999999999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).not.toContain('database');
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/games')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should reject unauthorized CORS origins', async () => {
      const response = await request(app)
        .get('/api/games')
        .set('Origin', 'http://malicious-site.com')
        .set('Authorization', `Bearer ${authToken}`);

      // Should either be blocked or not include CORS headers
      if (response.status === 403) {
        expect(response.body.error).toContain('CORS');
      } else {
        expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
      }
    });
  });

  describe('Audit Trail', () => {
    test('should log authentication attempts', async () => {
      const loginData = {
        email: 'security-admin@test.com',
        password: 'securePassword123'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // Check if audit log was created
      const auditLog = await db('audit_logs')
        .where('event_type', 'auth.login.success')
        .where('user_email', 'security-admin@test.com')
        .orderBy('created_at', 'desc')
        .first();

      expect(auditLog).toBeDefined();
      expect(auditLog.success).toBe(true);
    });

    test('should log failed authentication attempts', async () => {
      const loginData = {
        email: 'security-admin@test.com',
        password: 'wrongpassword'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // Check if audit log was created
      const auditLog = await db('audit_logs')
        .where('event_type', 'auth.login.failure')
        .where('user_email', 'security-admin@test.com')
        .orderBy('created_at', 'desc')
        .first();

      expect(auditLog).toBeDefined();
      expect(auditLog.success).toBe(false);
    });

    test('should log API requests from authenticated users', async () => {
      await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${authToken}`);

      // Check if audit log was created for API access
      const auditLog = await db('audit_logs')
        .where('request_path', '/api/games')
        .where('request_method', 'GET')
        .orderBy('created_at', 'desc')
        .first();

      expect(auditLog).toBeDefined();
    });
  });

  describe('Content Security Policy', () => {
    test('should include CSP headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Request Size Limits', () => {
    test('should reject oversized requests', async () => {
      const largePayload = {
        email: 'test@test.com',
        password: 'password123',
        largeField: 'x'.repeat(50 * 1024 * 1024) // 50MB string
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(largePayload);

      expect([413, 400]).toContain(response.status);
    });
  });
});

describe('Security Configuration', () => {
  test('should validate environment variables on startup', () => {
    // This test ensures that environment validation works
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  test('should use secure defaults for security configuration', () => {
    const { getSecurityConfig } = require('../../src/middleware/security');
    const config = getSecurityConfig();
    
    expect(config.noSniff).toBe(true);
    expect(config.xssFilter).toBe(true);
    expect(config.contentSecurityPolicy).toBeDefined();
  });
});
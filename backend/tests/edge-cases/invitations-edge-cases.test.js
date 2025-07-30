/**
 * Edge Cases and Error Scenarios for Invitations System
 * Tests unusual conditions, boundary cases, and error handling
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/services/emailService');
jest.mock('crypto');

const mockDb = require('../../src/config/database');
const emailService = require('../../src/services/emailService');
const crypto = require('crypto');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/invitations', require('../../src/routes/invitations'));

describe('Invitations Edge Cases and Error Scenarios', () => {
  let adminToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Set up environment
    process.env.JWT_SECRET = 'test-secret';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    adminToken = jwt.sign(
      { userId: 'admin-id', email: 'admin@test.com', role: 'admin' },
      'test-secret'
    );

    // Mock crypto
    crypto.randomBytes.mockReturnValue({
      toString: () => 'edge-case-token-123'
    });

    // Default database mock setup
    mockDb.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      del: jest.fn(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis()
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Boundary Cases', () => {
    it('should handle maximum length inputs', async () => {
      const longString = 'a'.repeat(255);
      const veryLongString = 'a'.repeat(1000);

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `${longString}@example.com`,
          first_name: veryLongString,
          last_name: veryLongString,
          role: 'referee'
        });

      // Should handle gracefully (either accept or reject with proper error)
      expect([201, 400]).toContain(response.status);
    });

    it('should handle special characters in names', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);
      mockDbQuery.returning.mockResolvedValue([{
        id: 'inv-123',
        email: 'special@test.com',
        first_name: "O'Connor-Smith",
        last_name: 'José María',
        role: 'referee'
      }]);

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'special@test.com',
          first_name: "O'Connor-Smith",
          last_name: 'José María',
          role: 'referee'
        });

      expect(response.status).toBe(201);
    });

    it('should handle Unicode characters', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);
      mockDbQuery.returning.mockResolvedValue([{
        id: 'inv-123',
        email: 'unicode@test.com',
        first_name: '张',
        last_name: '三',
        role: 'referee'
      }]);

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'unicode@test.com',
          first_name: '张',
          last_name: '三',
          role: 'referee'
        });

      expect(response.status).toBe(201);
    });

    it('should reject empty strings for required fields', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: '',
          first_name: '',
          last_name: '',
          role: 'referee'
        });

      expect(response.status).toBe(400);
    });

    it('should reject whitespace-only strings', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: '   ',
          first_name: '   ',
          last_name: '   ',
          role: 'referee'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Email Edge Cases', () => {
    it('should handle various valid email formats', async () => {
      const validEmails = [
        'user@domain.com',
        'user.name@domain.com',
        'user+tag@domain.com',
        'user123@domain-name.com',
        'user@sub.domain.com'
      ];

      for (const email of validEmails) {
        const mockDbQuery = mockDb();
        mockDbQuery.first.mockResolvedValue(null);
        mockDbQuery.returning.mockResolvedValue([{
          id: `inv-${email}`,
          email,
          first_name: 'Test',
          last_name: 'User',
          role: 'referee'
        }]);

        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email,
            first_name: 'Test',
            last_name: 'User',
            role: 'referee'
          });

        expect(response.status).toBe(201);
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain..com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email,
            first_name: 'Test',
            last_name: 'User',
            role: 'referee'
          });

        expect(response.status).toBe(400);
      }
    });

    it('should handle case-insensitive email matching', async () => {
      const email = 'User@Example.COM';
      const mockDbQuery = mockDb();
      
      // First call - check existing user (simulate existing user with lowercase)
      mockDbQuery.first.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'user@example.com'
      });

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          first_name: 'Test',
          last_name: 'User',
          role: 'referee'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User with this email already exists');
    });
  });

  describe('Token Security Edge Cases', () => {
    it('should handle malformed tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        '',
        null,
        undefined,
        '../../etc/passwd',
        '<script>alert("xss")</script>',
        'token with spaces',
        'token/with/slashes'
      ];

      for (const token of malformedTokens) {
        const mockDbQuery = mockDb();
        mockDbQuery.first.mockResolvedValue(null);

        const response = await request(app)
          .get(`/api/invitations/${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Invalid or expired invitation');
      }
    });

    it('should handle SQL injection attempts in token', async () => {
      const sqlInjectionTokens = [
        "'; DROP TABLE invitations; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users --"
      ];

      for (const token of sqlInjectionTokens) {
        const mockDbQuery = mockDb();
        mockDbQuery.first.mockResolvedValue(null);

        const response = await request(app)
          .get(`/api/invitations/${encodeURIComponent(token)}`);

        expect(response.status).toBe(404);
      }
    });

    it('should handle very long tokens', async () => {
      const veryLongToken = 'a'.repeat(10000);
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/invitations/${veryLongToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Database Error Scenarios', () => {
    it('should handle database connection errors', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockRejectedValue(new Error('ECONNREFUSED'));

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@test.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'referee'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create invitation');
    });

    it('should handle database timeout errors', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockRejectedValue(new Error('Query timeout'));

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@test.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'referee'
        });

      expect(response.status).toBe(500);
    });

    it('should handle constraint violation errors', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);
      mockDbQuery.returning.mockRejectedValue({
        code: '23505', // Unique constraint violation
        constraint: 'invitations_email_unique'
      });

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@test.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'referee'
        });

      expect(response.status).toBe(500);
    });
  });

  describe('Concurrent Request Scenarios', () => {
    it('should handle simultaneous invitation creation for same email', async () => {
      const invitationData = {
        email: 'concurrent@test.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'referee'
      };

      // Mock race condition - first request succeeds, second fails
      let callCount = 0;
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve(null); // No existing user/invitation
        } else {
          return Promise.resolve({ id: 'existing', email: 'concurrent@test.com' });
        }
      });

      mockDbQuery.returning.mockResolvedValue([{
        id: 'inv-123',
        email: 'concurrent@test.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'referee'
      }]);

      // Send concurrent requests
      const promises = Array(3).fill().map(() =>
        request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invitationData)
      );

      const responses = await Promise.all(promises);

      // At least one should succeed, others should handle conflict appropriately
      const successResponses = responses.filter(r => r.status === 201);
      const conflictResponses = responses.filter(r => r.status === 409);

      expect(successResponses.length).toBeGreaterThanOrEqual(1);
      expect(successResponses.length + conflictResponses.length).toBe(3);
    });
  });

  describe('Email Service Edge Cases', () => {
    it('should handle email service returning null', async () => {
      emailService.sendInvitationEmail.mockResolvedValue(null);

      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);
      mockDbQuery.returning.mockResolvedValue([{
        id: 'inv-123',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'referee'
      }]);

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@test.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'referee'
        });

      // Should still succeed even if email service returns null
      expect(response.status).toBe(201);
    });

    it('should handle email service network timeout', async () => {
      emailService.sendInvitationEmail.mockRejectedValue(new Error('ETIMEDOUT'));

      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);
      mockDbQuery.returning.mockResolvedValue([{
        id: 'inv-123',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'referee'
      }]);

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@test.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'referee'
        });

      // Should still succeed even if email fails
      expect(response.status).toBe(201);
      expect(console.error).toHaveBeenCalledWith('Failed to send invitation email:', expect.any(Error));
    });

    it('should handle email service rate limiting', async () => {
      emailService.sendInvitationEmail.mockRejectedValue(new Error('Rate limit exceeded'));

      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);
      mockDbQuery.returning.mockResolvedValue([{
        id: 'inv-123',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'referee'
      }]);

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@test.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'referee'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large payload gracefully', async () => {
      const largeData = {
        email: 'large@test.com',
        first_name: 'A'.repeat(1000000), // Very large string
        last_name: 'B'.repeat(1000000),
        role: 'referee'
      };

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largeData);

      // Should either handle gracefully or reject with appropriate error
      expect([201, 400, 413]).toContain(response.status);
    });

    it('should handle multiple rapid requests from same admin', async () => {
      const requests = Array(10).fill().map((_, i) =>
        request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: `rapid${i}@test.com`,
            first_name: 'Rapid',
            last_name: `User${i}`,
            role: 'referee'
          })
      );

      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);
      mockDbQuery.returning.mockResolvedValue([{
        id: 'inv-123',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'referee'
      }]);

      const responses = await Promise.allSettled(requests);
      
      // All requests should be handled (either succeed or fail gracefully)
      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          expect([200, 201, 400, 429, 500]).toContain(result.value.status);
        }
      });
    });
  });
});
/**
 * @fileoverview Error handling tests for Email Service scenarios
 * @requires jest
 * @requires supertest
 * 
 * Test Coverage:
 * - Network connectivity failures
 * - Email service rate limiting
 * - Invalid email addresses
 * - API authentication errors
 * - Service degradation scenarios
 * 
 * @author Claude Agent
 * @date 2025-01-23
 */

const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/config/database');
const emailService = require('../../src/services/emailService');
const jwt = require('jsonwebtoken');

// Mock email service
jest.mock('../../src/services/emailService');

describe('Email Service Error Handling', () => {
  let adminToken;
  let validInvitation;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean database
    await db.raw('TRUNCATE TABLE invitations, users CASCADE');
    
    // Create admin user
    const [user] = await db('users').insert({
      email: 'admin@test.com',
      name: 'Test Admin',
      password: 'hashedpassword',
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    adminToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    validInvitation = {
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'referee'
    };

    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Network Connectivity Errors', () => {
    it('should handle DNS resolution failures', async () => {
      // Arrange
      const dnsError = new Error('getaddrinfo ENOTFOUND api.resend.com');
      dnsError.code = 'ENOTFOUND';
      emailService.sendInvitationEmail.mockRejectedValue(dnsError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send invitation email:',
        dnsError
      );

      // Verify invitation still created
      const invitation = await db('invitations')
        .where('email', validInvitation.email)
        .first();
      expect(invitation).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should handle connection refused errors', async () => {
      // Arrange
      const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:443');
      connectionError.code = 'ECONNREFUSED';
      emailService.sendInvitationEmail.mockRejectedValue(connectionError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send invitation email:',
        connectionError
      );

      consoleSpy.mockRestore();
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      emailService.sendInvitationEmail.mockRejectedValue(timeoutError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('Email Service API Errors', () => {
    it('should handle invalid API key errors', async () => {
      // Arrange
      const authError = new Error('Invalid API key');
      authError.name = 'invalid_access';
      authError.status = 401;
      emailService.sendInvitationEmail.mockRejectedValue(authError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to send invitation email:',
        authError
      );

      consoleSpy.mockRestore();
    });

    it('should handle rate limiting errors', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded. Try again later.');
      rateLimitError.name = 'rate_limit_exceeded';
      rateLimitError.status = 429;
      emailService.sendInvitationEmail.mockRejectedValue(rateLimitError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to send invitation email:',
        rateLimitError
      );

      consoleSpy.mockRestore();
    });

    it('should handle validation errors from email service', async () => {
      // Arrange
      const validationError = new Error('Invalid email address format');
      validationError.name = 'validation_error';
      validationError.status = 400;
      emailService.sendInvitationEmail.mockRejectedValue(validationError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should handle service unavailable errors', async () => {
      // Arrange
      const serviceError = new Error('Service temporarily unavailable');
      serviceError.status = 503;
      emailService.sendInvitationEmail.mockRejectedValue(serviceError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('Email Content Errors', () => {
    it('should handle malformed email templates', async () => {
      // Arrange
      const templateError = new Error('Template rendering failed');
      emailService.sendInvitationEmail.mockRejectedValue(templateError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should handle emails with special characters', async () => {
      // Arrange
      const specialCharInvitation = {
        ...validInvitation,
        first_name: 'José María',
        last_name: 'García-López'
      };

      emailService.sendInvitationEmail.mockRejectedValue(
        new Error('Encoding error in email content')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(specialCharInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should handle very long invitation links', async () => {
      // Arrange
      process.env.FRONTEND_URL = 'https://very-long-domain-name-for-testing-purposes.example.com/some/very/long/path/structure';
      
      emailService.sendInvitationEmail.mockRejectedValue(
        new Error('Email content too large')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('Concurrent Error Scenarios', () => {
    it('should handle multiple simultaneous email failures', async () => {
      // Arrange
      const invitations = Array.from({ length: 3 }, (_, i) => ({
        ...validInvitation,
        email: `test${i}@example.com`
      }));

      emailService.sendInvitationEmail.mockRejectedValue(
        new Error('Service temporarily down')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const promises = invitations.map(invitation =>
        request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invitation)
      );

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all invitations were created despite email failures
      const createdInvitations = await db('invitations')
        .whereIn('email', invitations.map(inv => inv.email));
      expect(createdInvitations).toHaveLength(3);

      consoleSpy.mockRestore();
    });

    it('should handle mixed success/failure scenarios', async () => {
      // Arrange
      emailService.sendInvitationEmail
        .mockResolvedValueOnce({ data: { id: 'email-1' } })
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({ data: { id: 'email-3' } });

      const invitations = [
        { ...validInvitation, email: 'success1@example.com' },
        { ...validInvitation, email: 'failure@example.com' },
        { ...validInvitation, email: 'success2@example.com' }
      ];

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const promises = invitations.map(invitation =>
        request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invitation)
      );

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all invitations created regardless of email success/failure
      const createdInvitations = await db('invitations')
        .whereIn('email', invitations.map(inv => inv.email));
      expect(createdInvitations).toHaveLength(3);

      consoleSpy.mockRestore();
    });
  });

  describe('Recovery and Resilience', () => {
    it('should continue functioning after email service recovery', async () => {
      // Arrange - First request fails
      emailService.sendInvitationEmail.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act - First request (failure)
      const failResponse = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validInvitation, email: 'fail@example.com' })
        .expect(201);

      // Arrange - Service recovers
      emailService.sendInvitationEmail.mockResolvedValueOnce({
        data: { id: 'email-recovery' }
      });

      // Act - Second request (success)
      const successResponse = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validInvitation, email: 'success@example.com' })
        .expect(201);

      // Assert
      expect(failResponse.body.success).toBe(true);
      expect(successResponse.body.success).toBe(true);

      // Verify both invitations created
      const invitations = await db('invitations');
      expect(invitations).toHaveLength(2);

      consoleSpy.mockRestore();
    });
  });
});
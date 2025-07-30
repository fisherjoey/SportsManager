/**
 * @fileoverview Integration tests for Invitations API with Email Service
 * @requires supertest
 * @requires jest
 * @requires ../setup
 * 
 * Test Coverage:
 * - Complete invitation flow with email sending
 * - Database integration with email service
 * - Error scenarios and rollback behavior
 * - Email service failure handling
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

describe('Invitations Integration Tests with Email Service', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    // Setup test database
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean database
    await db.raw('TRUNCATE TABLE invitations, users CASCADE');
    
    // Create admin user for authentication
    const [user] = await db('users').insert({
      email: 'admin@test.com',
      name: 'Test Admin',
      password: 'hashedpassword',
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    adminUser = user;
    
    // Generate admin token
    adminToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Reset email service mock
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/invitations - Email Integration', () => {
    const validInvitation = {
      email: 'newreferee@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'referee'
    };

    it('should create invitation and send email successfully', async () => {
      // Arrange
      emailService.sendInvitationEmail.mockResolvedValue({
        data: { id: 'email-123' }
      });

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert API response
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(`Invitation sent to ${validInvitation.email}`);
      expect(response.body.data.invitation).toMatchObject({
        email: validInvitation.email,
        first_name: validInvitation.first_name,
        last_name: validInvitation.last_name,
        role: validInvitation.role
      });

      // Assert database record
      const invitation = await db('invitations')
        .where('email', validInvitation.email)
        .first();
      
      expect(invitation).toBeDefined();
      expect(invitation.email).toBe(validInvitation.email);
      expect(invitation.used).toBe(false);
      expect(invitation.invited_by).toBe(adminUser.id);
      expect(invitation.token).toBeDefined();
      expect(invitation.expires_at).toBeDefined();

      // Assert email service called correctly
      expect(emailService.sendInvitationEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendInvitationEmail).toHaveBeenCalledWith({
        email: validInvitation.email,
        firstName: validInvitation.first_name,
        lastName: validInvitation.last_name,
        role: validInvitation.role,
        invitationLink: expect.stringContaining('/complete-signup?token='),
        invitedBy: adminUser.name
      });
    });

    it('should create invitation even when email service fails', async () => {
      // Arrange
      emailService.sendInvitationEmail.mockRejectedValue(new Error('Email service unavailable'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      
      // Verify invitation still created in database
      const invitation = await db('invitations')
        .where('email', validInvitation.email)
        .first();
      expect(invitation).toBeDefined();

      // Verify error logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send invitation email:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should include inviter name in email when available', async () => {
      // Arrange
      emailService.sendInvitationEmail.mockResolvedValue({ data: { id: 'email-123' } });

      // Act
      await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation);

      // Assert
      expect(emailService.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          invitedBy: adminUser.name
        })
      );
    });

    it('should use fallback inviter name when user not found', async () => {
      // Arrange
      // Create token with non-existent user ID
      const invalidToken = jwt.sign(
        { userId: 99999, email: 'fake@test.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
      emailService.sendInvitationEmail.mockResolvedValue({ data: { id: 'email-123' } });

      // Act
      await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(validInvitation);

      // Assert
      expect(emailService.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          invitedBy: 'System Administrator'
        })
      );
    });

    it('should generate correct invitation link format', async () => {
      // Arrange
      process.env.FRONTEND_URL = 'https://myapp.com';
      emailService.sendInvitationEmail.mockResolvedValue({ data: { id: 'email-123' } });

      // Act
      await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation);

      // Assert
      const emailCall = emailService.sendInvitationEmail.mock.calls[0][0];
      expect(emailCall.invitationLink).toMatch(/^https:\/\/myapp\.com\/complete-signup\?token=[a-f0-9]{64}$/);
    });

    it('should prevent duplicate invitations', async () => {
      // Arrange
      emailService.sendInvitationEmail.mockResolvedValue({ data: { id: 'email-123' } });
      
      // Create first invitation
      await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation);

      // Act - Try to create duplicate
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(409);

      // Assert
      expect(response.body.error).toBe('Invitation already sent to this email');
      expect(emailService.sendInvitationEmail).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should prevent inviting existing users', async () => {
      // Arrange
      // Create existing user
      await db('users').insert({
        email: validInvitation.email,
        name: 'Existing User',
        password: 'password',
        role: 'referee'
      });

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(409);

      // Assert
      expect(response.body.error).toBe('User with this email already exists');
      expect(emailService.sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('should handle various email service error types', async () => {
      // Test different error scenarios
      const errorTypes = [
        new Error('Rate limit exceeded'),
        new Error('Invalid API key'),
        new Error('Network timeout'),
        new Error('Invalid email address')
      ];

      for (const error of errorTypes) {
        // Arrange
        jest.clearAllMocks();
        emailService.sendInvitationEmail.mockRejectedValue(error);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Use different email for each test
        const testInvitation = {
          ...validInvitation,
          email: `test${errorTypes.indexOf(error)}@example.com`
        };

        // Act
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(testInvitation)
          .expect(201);

        // Assert
        expect(response.body.success).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to send invitation email:',
          error
        );

        consoleSpy.mockRestore();
      }
    });
  });

  describe('Performance Tests', () => {
    it('should create invitation and send email in under 2 seconds', async () => {
      // Arrange
      emailService.sendInvitationEmail.mockResolvedValue({ data: { id: 'email-123' } });
      const startTime = Date.now();

      // Act
      await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(201);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent invitation requests', async () => {
      // Arrange
      emailService.sendInvitationEmail.mockResolvedValue({ data: { id: 'email-123' } });
      
      const invitations = Array.from({ length: 5 }, (_, i) => ({
        ...validInvitation,
        email: `concurrent${i}@test.com`
      }));

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

      expect(emailService.sendInvitationEmail).toHaveBeenCalledTimes(5);
    });
  });

  describe('Database Transaction Tests', () => {
    it('should rollback invitation creation on database constraint violation', async () => {
      // Arrange
      emailService.sendInvitationEmail.mockResolvedValue({ data: { id: 'email-123' } });

      // Mock database constraint violation
      const originalInsert = db.insert;
      jest.spyOn(db, 'insert').mockImplementation(() => {
        throw new Error('Database constraint violation');
      });

      // Act
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitation)
        .expect(500);

      // Assert
      expect(response.body.error).toBe('Failed to create invitation');
      
      // Verify no invitation was created
      const invitation = await db('invitations')
        .where('email', validInvitation.email)
        .first();
      expect(invitation).toBeUndefined();

      // Restore original method
      db.insert = originalInsert;
    });
  });
});
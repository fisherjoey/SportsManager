const request = require('supertest');
const express = require('express');

// Mock dependencies before importing
jest.mock('../../src/config/database');
jest.mock('../../src/services/emailService');
jest.mock('crypto');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

const mockDb = require('../../src/config/database');
const emailService = require('../../src/services/emailService');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/invitations', require('../../src/routes/invitations'));

describe('Invitations API', () => {
  let adminToken, refereeToken;
  let mockTransaction;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock JWT methods
    jwt.sign.mockReturnValue('mock-jwt-token');
    jwt.verify.mockImplementation((token, secret, callback) => {
      if (token === 'admin-token') {
        callback(null, { userId: 'admin-id', email: 'admin@test.com', role: 'admin' });
      } else if (token === 'referee-token') {
        callback(null, { userId: 'referee-id', email: 'referee@test.com', role: 'referee' });
      } else {
        callback(new Error('Invalid token'));
      }
    });

    // Create test tokens
    adminToken = 'admin-token';
    refereeToken = 'referee-token';

    // Mock environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    // Mock crypto
    crypto.randomBytes.mockReturnValue({
      toString: () => 'mock-token-123'
    });

    // Mock database transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
    mockDb.transaction = jest.fn().mockResolvedValue(mockTransaction);

    // Mock database queries
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

    // Mock email service
    emailService.sendInvitationEmail.mockResolvedValue({ data: { id: 'email-123' } });

    // Mock bcrypt
    bcrypt.hash.mockResolvedValue('hashed-password');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/invitations', () => {
    const validInvitationData = {
      email: 'newuser@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'referee'
    };

    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/invitations')
          .send(validInvitationData);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Access token required');
      });

      it('should require admin role', async () => {
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${refereeToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Insufficient permissions');
      });
    });

    describe('Input Validation', () => {
      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      });

      it('should validate email format', async () => {
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            email: 'invalid-email'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      });

      it('should validate role values', async () => {
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            role: 'invalid-role'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('role');
      });

      it('should require first_name and last_name', async () => {
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'test@test.com',
            role: 'referee'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/first_name|last_name/);
      });
    });

    describe('Business Logic', () => {
      beforeEach(() => {
        // Mock successful database operations
        const mockDbQuery = mockDb();
        mockDbQuery.first.mockResolvedValue(null); // No existing user
        mockDbQuery.returning.mockResolvedValue([{
          id: 'invitation-123',
          email: 'newuser@test.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'referee',
          expires_at: new Date()
        }]);

        // Mock inviter lookup
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({
            id: 'admin-id',
            name: 'Admin User',
            email: 'admin@test.com'
          })
        });
      });

      it('should create invitation successfully', async () => {
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.invitation.email).toBe('newuser@test.com');
        expect(response.body.message).toContain('Invitation sent to newuser@test.com');

        // Verify email was sent
        expect(emailService.sendInvitationEmail).toHaveBeenCalledWith({
          email: 'newuser@test.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'referee',
          invitationLink: expect.stringContaining('complete-signup?token=mock-token-123'),
          invitedBy: 'Admin User'
        });
      });

      it('should reject invitation for existing user', async () => {
        const mockDbQuery = mockDb();
        mockDbQuery.first.mockResolvedValueOnce({
          id: 'existing-user',
          email: 'newuser@test.com'
        });

        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('User with this email already exists');
      });

      it('should reject duplicate pending invitation', async () => {
        const mockDbQuery = mockDb();
        // First call - no existing user
        mockDbQuery.first.mockResolvedValueOnce(null);
        // Second call - existing pending invitation
        mockDbQuery.first.mockResolvedValueOnce({
          id: 'existing-invitation',
          email: 'newuser@test.com',
          used: false,
          expires_at: new Date(Date.now() + 86400000) // Future date
        });

        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Invitation already sent to this email');
      });

      it('should handle email service failure gracefully', async () => {
        emailService.sendInvitationEmail.mockRejectedValue(new Error('Email failed'));

        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        // Should still succeed even if email fails
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(console.error).toHaveBeenCalledWith('Failed to send invitation email:', expect.any(Error));
      });

      it('should use default inviter name when user not found', async () => {
        // Mock inviter lookup returning null
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(null)
        });

        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(201);
        expect(emailService.sendInvitationEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            invitedBy: 'System Administrator'
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        const mockDbQuery = mockDb();
        mockDbQuery.first.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to create invitation');
        expect(console.error).toHaveBeenCalledWith('Error creating invitation:', expect.any(Error));
      });
    });
  });

  describe('GET /api/invitations', () => {
    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(response.status).toBe(403);
    });

    it('should return all invitations', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@test.com',
          first_name: 'User',
          last_name: 'One',
          role: 'referee',
          used: false,
          expires_at: new Date(),
          invited_by_email: 'admin@test.com'
        }
      ];

      const mockDbQuery = mockDb();
      mockDbQuery.limit.mockResolvedValue(mockInvitations);

      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toEqual(mockInvitations);
    });

    it('should filter by status', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.limit.mockResolvedValue([]);

      await request(app)
        .get('/api/invitations?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(mockDbQuery.where).toHaveBeenCalledWith('invitations.used', false);
    });
  });

  describe('GET /api/invitations/:token', () => {
    it('should return invitation by valid token', async () => {
      const mockInvitation = {
        id: 'inv-1',
        email: 'user@test.com',
        first_name: 'User',
        last_name: 'Test',
        role: 'referee',
        used: false,
        expires_at: new Date(Date.now() + 86400000)
      };

      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(mockInvitation);

      const response = await request(app)
        .get('/api/invitations/valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invitation.email).toBe('user@test.com');
    });

    it('should return 404 for invalid token', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/invitations/invalid-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Invalid or expired invitation');
    });
  });

  describe('POST /api/invitations/:token/complete', () => {
    const completeData = {
      password: 'newpassword123',
      phone: '555-0123',
      location: 'Calgary',
      postal_code: 'T2P 1J9',
      level: 'Recreational',
      max_distance: 30
    };

    const mockInvitation = {
      id: 'inv-1',
      email: 'newuser@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'referee',
      used: false,
      expires_at: new Date(Date.now() + 86400000)
    };

    beforeEach(() => {
      // Mock successful database operations
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(mockInvitation);
      
      // Mock transaction methods
      mockTransaction.insert = jest.fn().mockReturnThis();
      mockTransaction.returning = jest.fn().mockResolvedValue([{
        id: 'user-123',
        email: 'newuser@test.com',
        role: 'referee'
      }]);
      mockTransaction.update = jest.fn().mockReturnThis();
      
      // Make mockTransaction callable
      Object.assign(mockTransaction, {
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{
          id: 'user-123',
          email: 'newuser@test.com',
          role: 'referee'
        }]),
        update: jest.fn().mockReturnThis()
      });
    });

    it('should complete invitation successfully', async () => {
      // Mock bcrypt
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');

      const response = await request(app)
        .post('/api/invitations/valid-token/complete')
        .send(completeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@test.com');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/invitations/valid-token/complete')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    });

    it('should return 404 for invalid token', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/invitations/invalid-token/complete')
        .send(completeData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Invalid or expired invitation');
    });

    it('should handle database transaction errors', async () => {
      mockTransaction.returning.mockRejectedValue(new Error('Transaction failed'));

      const response = await request(app)
        .post('/api/invitations/valid-token/complete')
        .send(completeData);

      expect(response.status).toBe(500);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/invitations/:id', () => {
    it('should require admin role', async () => {
      const response = await request(app)
        .delete('/api/invitations/inv-123')
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(response.status).toBe(403);
    });

    it('should cancel invitation successfully', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue({
        id: 'inv-123',
        used: false
      });
      mockDbQuery.del.mockResolvedValue(1);

      const response = await request(app)
        .delete('/api/invitations/inv-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation cancelled successfully');
    });

    it('should return 404 for non-existent invitation', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/invitations/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Invitation not found');
    });

    it('should reject cancelling used invitation', async () => {
      const mockDbQuery = mockDb();
      mockDbQuery.first.mockResolvedValue({
        id: 'inv-123',
        used: true
      });

      const response = await request(app)
        .delete('/api/invitations/inv-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot cancel used invitation');
    });
  });
});
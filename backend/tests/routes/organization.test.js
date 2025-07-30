const request = require('supertest');
const express = require('express');
const organizationRoutes = require('../../src/routes/organization');

// Mock dependencies
jest.mock('../../src/db', () => ({
  query: jest.fn()
}));

jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'admin-user-id', role: 'admin' };
    next();
  }),
  requireRole: jest.fn((roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  })
}));

jest.mock('../../src/utils/organization-settings', () => ({
  clearSettingsCache: jest.fn()
}));

const pool = require('../../src/db');
const { clearSettingsCache } = require('../../src/utils/organization-settings');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/organization', organizationRoutes);

describe('Organization Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/organization/settings', () => {
    test('should return existing organization settings', async () => {
      const mockSettings = {
        id: '123',
        organization_name: 'Test Sports League',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const response = await request(app)
        .get('/api/organization/settings')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSettings
      });
    });

    test('should create default settings if none exist', async () => {
      const mockDefaultSettings = {
        id: '456',
        organization_name: 'Sports Organization',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockDefaultSettings] });

      const response = await request(app)
        .get('/api/organization/settings')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockDefaultSettings
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT'));
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/organization/settings')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to fetch organization settings'
      });
    });
  });

  describe('PUT /api/organization/settings', () => {
    test('should update existing organization settings', async () => {
      const updateData = {
        organization_name: 'Updated Sports League',
        payment_model: 'FLAT_RATE',
        default_game_rate: 150
      };

      const mockExistingSettings = { id: '123' };
      const mockUpdatedSettings = {
        id: '123',
        organization_name: 'Updated Sports League',
        payment_model: 'FLAT_RATE',
        default_game_rate: 150,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockExistingSettings] })
        .mockResolvedValueOnce({ rows: [mockUpdatedSettings] });

      const response = await request(app)
        .put('/api/organization/settings')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedSettings,
        message: 'Organization settings updated successfully'
      });

      expect(clearSettingsCache).toHaveBeenCalled();
    });

    test('should create new settings if none exist', async () => {
      const updateData = {
        organization_name: 'New Sports League',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null
      };

      const mockNewSettings = {
        id: '456',
        organization_name: 'New Sports League',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockNewSettings] });

      const response = await request(app)
        .put('/api/organization/settings')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockNewSettings,
        message: 'Organization settings updated successfully'
      });

      expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT'));
    });

    test('should validate required fields', async () => {
      const invalidData = {
        payment_model: 'FLAT_RATE'
        // Missing organization_name
      };

      const response = await request(app)
        .put('/api/organization/settings')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Organization name and payment model are required'
      });
    });

    test('should validate payment model values', async () => {
      const invalidData = {
        organization_name: 'Test League',
        payment_model: 'INVALID_MODEL'
      };

      const response = await request(app)
        .put('/api/organization/settings')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Payment model must be either INDIVIDUAL or FLAT_RATE'
      });
    });

    test('should require default_game_rate for FLAT_RATE model', async () => {
      const invalidData = {
        organization_name: 'Test League',
        payment_model: 'FLAT_RATE'
        // Missing default_game_rate
      };

      const response = await request(app)
        .put('/api/organization/settings')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Default game rate is required and must be positive for FLAT_RATE model'
      });
    });

    test('should require positive default_game_rate for FLAT_RATE model', async () => {
      const invalidData = {
        organization_name: 'Test League',
        payment_model: 'FLAT_RATE',
        default_game_rate: -50
      };

      const response = await request(app)
        .put('/api/organization/settings')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Default game rate is required and must be positive for FLAT_RATE model'
      });
    });

    test('should handle database errors during update', async () => {
      const updateData = {
        organization_name: 'Test League',
        payment_model: 'INDIVIDUAL'
      };

      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/organization/settings')
        .send(updateData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to update organization settings'
      });
    });
  });
});
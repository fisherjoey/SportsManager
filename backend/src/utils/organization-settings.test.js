const { getOrganizationSettings, clearSettingsCache } = require('./organization-settings');

// Mock the database pool
jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');

describe('Organization Settings Utils', () => {
  beforeEach(() => {
    clearSettingsCache();
    jest.clearAllMocks();
  });

  describe('getOrganizationSettings', () => {
    test('should return existing settings', async () => {
      const mockSettings = {
        id: '123',
        organization_name: 'Test Organization',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      pool.query.mockResolvedValueOnce({
        rows: [mockSettings]
      });

      const result = await getOrganizationSettings();
      
      expect(result).toEqual(mockSettings);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    test('should create default settings when none exist', async () => {
      const mockDefaultSettings = {
        id: '456',
        organization_name: 'Sports Organization',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // First query returns no results
      pool.query.mockResolvedValueOnce({ rows: [] });
      // Second query returns the inserted default
      pool.query.mockResolvedValueOnce({ rows: [mockDefaultSettings] });

      const result = await getOrganizationSettings();
      
      expect(result).toEqual(mockDefaultSettings);
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT'));
    });

    test('should return cached settings on subsequent calls', async () => {
      const mockSettings = {
        id: '123',
        organization_name: 'Test Organization',
        payment_model: 'FLAT_RATE',
        default_game_rate: 150,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      // First call
      const result1 = await getOrganizationSettings();
      // Second call (should use cache)
      const result2 = await getOrganizationSettings();
      
      expect(result1).toEqual(mockSettings);
      expect(result2).toEqual(mockSettings);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test('should return default settings on database error', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await getOrganizationSettings();
      
      expect(result).toEqual({
        id: 'default',
        organization_name: 'Sports Organization',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
    });

    test('should refresh cache after clearSettingsCache is called', async () => {
      const mockSettings1 = {
        id: '123',
        organization_name: 'First Organization',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      const mockSettings2 = {
        id: '123',
        organization_name: 'Updated Organization',
        payment_model: 'FLAT_RATE',
        default_game_rate: 200,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockSettings1] })
        .mockResolvedValueOnce({ rows: [mockSettings2] });

      // First call
      const result1 = await getOrganizationSettings();
      expect(result1).toEqual(mockSettings1);

      // Clear cache
      clearSettingsCache();

      // Second call should fetch fresh data
      const result2 = await getOrganizationSettings();
      expect(result2).toEqual(mockSettings2);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearSettingsCache', () => {
    test('should clear the internal cache', async () => {
      const mockSettings = {
        id: '123',
        organization_name: 'Test Organization',
        payment_model: 'INDIVIDUAL',
        default_game_rate: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      pool.query.mockResolvedValue({ rows: [mockSettings] });

      // First call to populate cache
      await getOrganizationSettings();
      expect(pool.query).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await getOrganizationSettings();
      expect(pool.query).toHaveBeenCalledTimes(1);

      // Clear cache
      clearSettingsCache();

      // Third call should query database again
      await getOrganizationSettings();
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });
});
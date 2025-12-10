import { ApiClient } from '../lib/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Data Transformations', () => {
  let apiClient;

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:3001/api');
    fetch.mockClear();
  });

  describe('getReferees data transformation', () => {
    test('transforms backend referee data to frontend format correctly', async () => {
      const mockBackendResponse = {
        data: [
          {
            id: 'ref-1',
            name: 'Mike Johnson',
            email: 'mike.johnson@cmba.ca',
            phone: '(403) 123-4567',
            level: 'Elite',
            location: 'Northwest Calgary',
            is_available: true,
            certifications: [
              'NCCP Level 3 Basketball',
              'Basketball Canada Certified',
            ],
            preferred_positions: ['Lead Official', 'Center Official'],
            wage_per_game: '85.00',
            notes:
              '3 years officiating basketball in Northwest Basketball Association',
            max_distance: 15,
            postal_code: 'T2J 5W7',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 50 },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await apiClient.getReferees();

      expect(result).toEqual({
        success: true,
        data: {
          referees: [
            {
              id: 'ref-1',
              name: 'Mike Johnson',
              email: 'mike.johnson@cmba.ca',
              phone: '(403) 123-4567',
              role: 'referee',
              certificationLevel: 'Elite',
              location: 'Northwest Calgary',
              isAvailable: true,
              certifications: [
                'NCCP Level 3 Basketball',
                'Basketball Canada Certified',
              ],
              preferredPositions: ['Lead Official', 'Center Official'],
              wagePerGame: '85.00',
              notes:
                '3 years officiating basketball in Northwest Basketball Association',
              maxDistance: 15,
              postalCode: 'T2J 5W7',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
          pagination: { page: 1, limit: 50 },
        },
      });
    });

    test('handles missing optional fields gracefully', async () => {
      const mockBackendResponse = {
        data: [
          {
            id: 'ref-2',
            name: 'Sarah Connor',
            email: 'sarah.connor@cmba.ca',
            phone: null,
            level: 'Recreational',
            location: 'Northeast Calgary',
            is_available: false,
            certifications: null,
            preferred_positions: null,
            wage_per_game: null,
            notes: null,
            max_distance: null,
            postal_code: null,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 50 },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await apiClient.getReferees();

      expect(result.data.referees[0]).toEqual(
        expect.objectContaining({
          certifications: [],
          preferredPositions: [],
          wagePerGame: null,
          notes: null,
          maxDistance: null,
          postalCode: null,
        })
      );
    });

    test('transforms search and filter parameters correctly', async () => {
      const mockBackendResponse = {
        data: [],
        pagination: { page: 1, limit: 50 },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      await apiClient.getReferees({
        certificationLevel: 'Elite',
        available: true,
        search: 'Mike',
        page: 2,
        limit: 25,
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/referees?level=Elite&available=true&search=Mike&page=2&limit=25',
        expect.any(Object)
      );
    });
  });

  describe('getSingleReferee data transformation', () => {
    test('transforms single referee response correctly', async () => {
      const mockBackendResponse = {
        success: true,
        data: {
          referee: {
            id: 'ref-1',
            name: 'Mike Johnson',
            email: 'mike.johnson@cmba.ca',
            phone: '(403) 123-4567',
            level: 'Elite',
            location: 'Northwest Calgary',
            is_available: true,
            certifications: ['NCCP Level 3 Basketball'],
            preferred_positions: ['Lead Official'],
            wage_per_game: '85.00',
            notes: 'Experienced referee',
            max_distance: 15,
            postal_code: 'T2J 5W7',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await apiClient.getReferee('ref-1');

      expect(result).toEqual({
        success: true,
        data: {
          referee: {
            id: 'ref-1',
            name: 'Mike Johnson',
            email: 'mike.johnson@cmba.ca',
            phone: '(403) 123-4567',
            role: 'referee',
            certificationLevel: 'Elite',
            location: 'Northwest Calgary',
            isAvailable: true,
            certifications: ['NCCP Level 3 Basketball'],
            preferredPositions: ['Lead Official'],
            wagePerGame: '85.00',
            notes: 'Experienced referee',
            maxDistance: 15,
            postalCode: 'T2J 5W7',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      });
    });
  });

  describe('getAvailableReferees data transformation', () => {
    test('transforms available referees list correctly', async () => {
      const mockBackendResponse = [
        {
          id: 'ref-1',
          name: 'Mike Johnson',
          email: 'mike.johnson@cmba.ca',
          phone: '(403) 123-4567',
          level: 'Elite',
          location: 'Northwest Calgary',
          is_available: true,
          certifications: ['NCCP Level 3 Basketball'],
          preferred_positions: ['Lead Official'],
          wage_per_game: '85.00',
          notes: 'Available for elite games',
          max_distance: 15,
          postal_code: 'T2J 5W7',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await apiClient.getAvailableReferees('game-1');

      expect(result).toEqual([
        {
          id: 'ref-1',
          name: 'Mike Johnson',
          email: 'mike.johnson@cmba.ca',
          phone: '(403) 123-4567',
          role: 'referee',
          certificationLevel: 'Elite',
          location: 'Northwest Calgary',
          isAvailable: true,
          certifications: ['NCCP Level 3 Basketball'],
          preferredPositions: ['Lead Official'],
          wagePerGame: '85.00',
          notes: 'Available for elite games',
          maxDistance: 15,
          postalCode: 'T2J 5W7',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ]);
    });
  });

  describe('error handling', () => {
    test('handles API errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      await expect(apiClient.getReferees()).rejects.toThrow();
    });

    test('handles network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.getReferees()).rejects.toThrow('Network error');
    });
  });
});

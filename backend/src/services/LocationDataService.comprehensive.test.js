const LocationDataService = require('./LocationDataService');
const knex = require('../config/database');

// Mock external dependencies
jest.mock('../../../lib/address-service', () => ({
  createAddressService: jest.fn(() => ({
    searchAddresses: jest.fn()
  }))
}));

jest.mock('../../../lib/maps', () => ({
  geocodeAddress: jest.fn()
}));

describe('LocationDataService - Comprehensive Unit Tests', () => {
  let service;
  let testUsers = [];
  let addressServiceMock;
  let geocodeAddressMock;

  // Test data fixtures
  const mockAddressServiceResponse = [
    {
      id: 'test-1',
      displayName: '123 Main St, Calgary, AB T2P 1M1, Canada',
      streetNumber: '123',
      streetName: 'Main St',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T2P 1M1',
      country: 'Canada',
      coordinates: { lat: 51.0447, lng: -114.0719 },
      confidence: 0.95,
      type: 'street_address'
    }
  ];

  const mockGeocodingResponse = {
    lat: 51.0447,
    lng: -114.0719
  };

  beforeAll(async () => {
    service = new LocationDataService();
    
    // Get mocked dependencies
    const { createAddressService } = require('../../../lib/address-service');
    const { geocodeAddress } = require('../../../lib/maps');
    
    addressServiceMock = createAddressService();
    geocodeAddressMock = geocodeAddress;
  });

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock responses
    addressServiceMock.searchAddresses.mockResolvedValue(mockAddressServiceResponse);
    geocodeAddressMock.mockResolvedValue(mockGeocodingResponse);
    
    // Clean up any test data
    await knex('user_location_distances').del();
    await knex('user_locations').del();
    await knex('users').where('email', 'like', 'test-%').del();
    testUsers = [];
  });

  afterAll(async () => {
    // Clean up test data
    for (const user of testUsers) {
      await knex('user_location_distances').where('user_id', user.id).del();
      await knex('user_locations').where('user_id', user.id).del();
      await knex('users').where('id', user.id).del();
    }
  });

  /**
   * Helper function to create test users
   */
  const createTestUser = async (overrides = {}) => {
    const userData = {
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password_hash: 'test-hash',
      role: 'referee',
      name: 'Test User',
      postal_code: 'T2P 1M1',
      location: 'Calgary, AB',
      ...overrides
    };

    const [user] = await knex('users').insert(userData).returning('*');
    testUsers.push(user);
    return user;
  };

  describe('createOrUpdateUserLocation', () => {
    test('should create new user location with valid address', async () => {
      const user = await createTestUser();
      
      const result = await service.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB');
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe(user.id);
      expect(result.full_address).toBe('123 Main St, Calgary, AB T2P 1M1, Canada');
      expect(result.street_number).toBe('123');
      expect(result.street_name).toBe('Main St');
      expect(result.city).toBe('Calgary');
      expect(result.province).toBe('AB');
      expect(result.postal_code).toBe('T2P 1M1');
      expect(result.country).toBe('Canada');
      expect(result.latitude).toBe('51.0447');
      expect(result.longitude).toBe('-114.0719');
      expect(result.geocoding_confidence).toBe(0.95);
      expect(result.address_type).toBe('street_address');

      // Verify it's in the database
      const dbRecord = await knex('user_locations').where('user_id', user.id).first();
      expect(dbRecord).toBeDefined();
      expect(dbRecord.city).toBe('Calgary');
    });

    test('should update existing user location', async () => {
      const user = await createTestUser();
      
      // Create initial location
      await service.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB');
      
      // Update with new address
      const newAddress = 'Edmonton, AB T5K 2P6';
      addressServiceMock.searchAddresses.mockResolvedValueOnce([{
        ...mockAddressServiceResponse[0],
        displayName: '456 Edmonton St, Edmonton, AB T5K 2P6, Canada',
        city: 'Edmonton',
        postalCode: 'T5K 2P6',
        coordinates: { lat: 53.5461, lng: -113.4938 }
      }]);

      const result = await service.createOrUpdateUserLocation(user.id, newAddress);
      
      expect(result.city).toBe('Edmonton');
      expect(result.postal_code).toBe('T5K 2P6');
      
      // Verify only one record exists in database
      const records = await knex('user_locations').where('user_id', user.id);
      expect(records).toHaveLength(1);
    });

    test('should handle address service returning no results', async () => {
      const user = await createTestUser();
      addressServiceMock.searchAddresses.mockResolvedValueOnce([]);
      
      await expect(service.createOrUpdateUserLocation(user.id, 'INVALID_ADDRESS'))
        .rejects.toThrow('No location data found for address: INVALID_ADDRESS');
    });

    test('should fallback to geocoding when coordinates missing from address service', async () => {
      const user = await createTestUser();
      
      // Mock address service without coordinates
      addressServiceMock.searchAddresses.mockResolvedValueOnce([{
        ...mockAddressServiceResponse[0],
        coordinates: null
      }]);
      
      const result = await service.createOrUpdateUserLocation(user.id, 'T2P 1M1');
      
      expect(geocodeAddressMock).toHaveBeenCalledWith('T2P 1M1');
      expect(result.latitude).toBe('51.0447');
      expect(result.longitude).toBe('-114.0719');
    });

    test('should handle geocoding failure gracefully', async () => {
      const user = await createTestUser();
      
      // Mock address service without coordinates and geocoding failure
      addressServiceMock.searchAddresses.mockResolvedValueOnce([{
        ...mockAddressServiceResponse[0],
        coordinates: null
      }]);
      geocodeAddressMock.mockResolvedValueOnce(null);
      
      const result = await service.createOrUpdateUserLocation(user.id, 'T2P 1M1');
      
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });

    test('should extract postal code from address when not provided by service', async () => {
      const user = await createTestUser();
      
      addressServiceMock.searchAddresses.mockResolvedValueOnce([{
        ...mockAddressServiceResponse[0],
        postalCode: null
      }]);
      
      const result = await service.createOrUpdateUserLocation(user.id, '123 Main St, Calgary, AB T2P 1M1');
      
      expect(result.postal_code).toBe('T2P 1M1');
    });

    test('should set default values for missing address components', async () => {
      const user = await createTestUser();
      
      addressServiceMock.searchAddresses.mockResolvedValueOnce([{
        id: 'test-minimal',
        displayName: 'Minimal Address',
        city: null,
        province: null,
        country: null
      }]);
      
      const result = await service.createOrUpdateUserLocation(user.id, 'Minimal Address');
      
      expect(result.city).toBe('');
      expect(result.province).toBe('AB');
      expect(result.country).toBe('Canada');
    });

    test('should handle address service throwing error', async () => {
      const user = await createTestUser();
      
      addressServiceMock.searchAddresses.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(service.createOrUpdateUserLocation(user.id, 'T2P 1M1'))
        .rejects.toThrow('Failed to process location data for user');
    });
  });

  describe('getUserLocation', () => {
    test('should return user location data', async () => {
      const user = await createTestUser();
      await service.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB');
      
      const result = await service.getUserLocation(user.id);
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe(user.id);
      expect(result.city).toBe('Calgary');
    });

    test('should return null for non-existent user', async () => {
      const result = await service.getUserLocation('non-existent-id');
      
      expect(result).toBeUndefined();
    });

    test('should handle database error', async () => {
      // Mock database error
      jest.spyOn(knex('user_locations'), 'where').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      await expect(service.getUserLocation('user-id'))
        .rejects.toThrow('Failed to fetch location data for user user-id');
    });
  });

  describe('geocodeAddress', () => {
    test('should successfully geocode address', async () => {
      const result = await service.geocodeAddress('Calgary, AB');
      
      expect(geocodeAddressMock).toHaveBeenCalledWith('Calgary, AB');
      expect(result).toEqual(mockGeocodingResponse);
    });

    test('should handle geocoding error gracefully', async () => {
      geocodeAddressMock.mockRejectedValueOnce(new Error('Geocoding failed'));
      
      const result = await service.geocodeAddress('Invalid Address');
      
      expect(result).toBeNull();
    });
  });

  describe('extractPostalCode', () => {
    test('should extract valid Canadian postal codes', () => {
      expect(service.extractPostalCode('123 Main St, Calgary, AB T2P 1M1')).toBe('T2P 1M1');
      expect(service.extractPostalCode('T2P1M1')).toBe('T2P 1M1');
      expect(service.extractPostalCode('K1A 0A6')).toBe('K1A 0A6');
      expect(service.extractPostalCode('v6b2w5')).toBe('V6B 2W5');
    });

    test('should handle addresses without postal codes', () => {
      expect(service.extractPostalCode('123 Main St, Calgary, AB')).toBe('');
      expect(service.extractPostalCode('No postal code here')).toBe('');
    });

    test('should handle malformed postal codes', () => {
      expect(service.extractPostalCode('123A4B')).toBe('');
      expect(service.extractPostalCode('12345')).toBe('');
    });
  });

  describe('determineProvider', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should return google when valid Google API key is set', () => {
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'valid-google-key';
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'your_mapbox_token_here_optional';
      
      expect(service.determineProvider()).toBe('google');
    });

    test('should return mapbox when valid Mapbox token is set', () => {
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'your_google_places_api_key_here_optional';
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'valid-mapbox-token';
      
      expect(service.determineProvider()).toBe('mapbox');
    });

    test('should return nominatim as default fallback', () => {
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'your_google_places_api_key_here_optional';
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'your_mapbox_token_here_optional';
      
      expect(service.determineProvider()).toBe('nominatim');
    });

    test('should handle missing environment variables', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
      delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      
      expect(service.determineProvider()).toBe('nominatim');
    });
  });

  describe('batchCreateUserLocations', () => {
    test('should process multiple user addresses successfully', async () => {
      const user1 = await createTestUser({ postal_code: 'T2P 1M1' });
      const user2 = await createTestUser({ postal_code: 'T5K 2P6' });
      
      const userAddresses = [
        { userId: user1.id, address: 'T2P 1M1, Calgary, AB' },
        { userId: user2.id, address: 'T5K 2P6, Edmonton, AB' }
      ];

      // Mock different responses for each address
      addressServiceMock.searchAddresses
        .mockResolvedValueOnce([mockAddressServiceResponse[0]])
        .mockResolvedValueOnce([{
          ...mockAddressServiceResponse[0],
          city: 'Edmonton',
          postalCode: 'T5K 2P6'
        }]);

      const result = await service.batchCreateUserLocations(userAddresses);
      
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(2);
      
      // Verify both locations were created
      const locations = await knex('user_locations').whereIn('user_id', [user1.id, user2.id]);
      expect(locations).toHaveLength(2);
    });

    test('should handle partial failures in batch processing', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      const userAddresses = [
        { userId: user1.id, address: 'Valid Address' },
        { userId: user2.id, address: 'Invalid Address' }
      ];

      // Mock success for first, failure for second
      addressServiceMock.searchAddresses
        .mockResolvedValueOnce([mockAddressServiceResponse[0]])
        .mockResolvedValueOnce([]);

      const result = await service.batchCreateUserLocations(userAddresses);
      
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].userId).toBe(user2.id);
      expect(result.failed[0].error).toContain('No location data found');
      expect(result.totalProcessed).toBe(2);
    });

    test('should apply rate limiting delay between requests', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      const userAddresses = [
        { userId: user1.id, address: 'Address 1' },
        { userId: user2.id, address: 'Address 2' }
      ];

      // Spy on delay method
      const delaySpy = jest.spyOn(service, 'delay');
      delaySpy.mockResolvedValue();

      await service.batchCreateUserLocations(userAddresses);
      
      expect(delaySpy).toHaveBeenCalledWith(100);
      expect(delaySpy).toHaveBeenCalledTimes(2); // Once per address
      
      delaySpy.mockRestore();
    });
  });

  describe('updateLocationWithCoordinates', () => {
    test('should skip update if coordinates already exist', async () => {
      const user = await createTestUser();
      await service.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB');
      
      const result = await service.updateLocationWithCoordinates(user.id);
      
      expect(result).toBeDefined();
      expect(result.latitude).toBe('51.0447');
      expect(result.longitude).toBe('-114.0719');
      
      // Geocoding should not have been called again
      expect(geocodeAddressMock).toHaveBeenCalledTimes(0);
    });

    test('should update coordinates for location without them', async () => {
      const user = await createTestUser();
      
      // Create location without coordinates
      await knex('user_locations').insert({
        user_id: user.id,
        full_address: 'Calgary, AB',
        city: 'Calgary',
        province: 'AB',
        postal_code: 'T2P 1M1',
        country: 'Canada',
        latitude: null,
        longitude: null,
        geocoding_provider: 'test'
      });

      const result = await service.updateLocationWithCoordinates(user.id);
      
      expect(geocodeAddressMock).toHaveBeenCalledWith('Calgary, AB');
      expect(result.latitude).toBe('51.0447');
      expect(result.longitude).toBe('-114.0719');
    });

    test('should fallback to postal code if full address geocoding fails', async () => {
      const user = await createTestUser();
      
      await knex('user_locations').insert({
        user_id: user.id,
        full_address: 'Invalid Address',
        postal_code: 'T2P 1M1',
        latitude: null,
        longitude: null,
        geocoding_provider: 'test'
      });

      // Mock geocoding to fail for full address, succeed for postal code
      geocodeAddressMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockGeocodingResponse);

      const result = await service.updateLocationWithCoordinates(user.id);
      
      expect(geocodeAddressMock).toHaveBeenCalledWith('Invalid Address');
      expect(geocodeAddressMock).toHaveBeenCalledWith('T2P 1M1');
      expect(result.latitude).toBe('51.0447');
    });

    test('should return null for non-existent user location', async () => {
      const result = await service.updateLocationWithCoordinates('non-existent-id');
      
      expect(result).toBeNull();
    });

    test('should handle complete geocoding failure', async () => {
      const user = await createTestUser();
      
      await knex('user_locations').insert({
        user_id: user.id,
        full_address: 'Invalid Address',
        postal_code: 'INVALID',
        latitude: null,
        longitude: null,
        geocoding_provider: 'test'
      });

      geocodeAddressMock.mockResolvedValue(null);

      const result = await service.updateLocationWithCoordinates(user.id);
      
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });

  describe('getUsersNeedingLocationData', () => {
    test('should find users missing location data', async () => {
      const userWithLocation = await createTestUser({ postal_code: 'T2P 1M1' });
      const userWithoutLocation = await createTestUser({ 
        postal_code: 'T5K 2P6',
        email: 'no-location@test.com' 
      });
      
      // Create location data for first user only
      await service.createOrUpdateUserLocation(userWithLocation.id, 'T2P 1M1');
      
      const result = await service.getUsersNeedingLocationData();
      
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(userWithoutLocation.id);
      expect(result[0].address).toBe('T5K 2P6');
    });

    test('should exclude non-referee users', async () => {
      await createTestUser({ 
        role: 'admin', 
        postal_code: 'T2P 1M1',
        email: 'admin@test.com'
      });
      
      const result = await service.getUsersNeedingLocationData();
      
      expect(result).toHaveLength(0);
    });

    test('should exclude users without postal codes', async () => {
      await createTestUser({ 
        postal_code: null,
        email: 'no-postal@test.com'
      });
      
      const result = await service.getUsersNeedingLocationData();
      
      expect(result).toHaveLength(0);
    });

    test('should prefer location over postal_code for address', async () => {
      const user = await createTestUser({ 
        postal_code: 'T2P 1M1',
        location: 'Calgary, AB T2P 1M1',
        email: 'prefer-location@test.com'
      });
      
      const result = await service.getUsersNeedingLocationData();
      
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('Calgary, AB T2P 1M1');
    });
  });

  describe('delay', () => {
    test('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await service.delay(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some variance
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle database connection errors', async () => {
      const user = await createTestUser();
      
      // Mock database error
      const originalKnex = require('../config/database');
      jest.spyOn(originalKnex, 'transaction').mockRejectedValueOnce(new Error('Database connection failed'));
      
      await expect(service.createOrUpdateUserLocation(user.id, 'T2P 1M1'))
        .rejects.toThrow('Failed to process location data');
    });

    test('should handle malformed JSON in raw_geocoding_data', async () => {
      const user = await createTestUser();
      
      const malformedData = { circular: {} };
      malformedData.circular.ref = malformedData;
      
      addressServiceMock.searchAddresses.mockResolvedValueOnce([{
        ...mockAddressServiceResponse[0],
        malformedData
      }]);
      
      // Should not throw error even with circular reference
      const result = await service.createOrUpdateUserLocation(user.id, 'T2P 1M1');
      expect(result).toBeDefined();
    });

    test('should handle concurrent updates to same user location', async () => {
      const user = await createTestUser();
      
      // Simulate concurrent updates
      const promises = [
        service.createOrUpdateUserLocation(user.id, 'Address 1'),
        service.createOrUpdateUserLocation(user.id, 'Address 2')
      ];
      
      addressServiceMock.searchAddresses
        .mockResolvedValueOnce([{ ...mockAddressServiceResponse[0], city: 'Calgary' }])
        .mockResolvedValueOnce([{ ...mockAddressServiceResponse[0], city: 'Edmonton' }]);
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(2);
      
      // Should have only one record in database
      const records = await knex('user_locations').where('user_id', user.id);
      expect(records).toHaveLength(1);
    });
  });
});
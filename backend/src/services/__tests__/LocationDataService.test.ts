/**
 * @fileoverview LocationDataService Unit Tests
 *
 * Comprehensive test suite for LocationDataService covering location data management,
 * geocoding, address parsing, and batch operations
 */

import { jest } from '@jest/globals';

// Mock external dependencies
const mockCreateAddressService = jest.fn();
const mockGeocodeAddress = jest.fn();

// Mock external modules
jest.mock('../../../../lib/address-service', () => ({
  createAddressService: mockCreateAddressService,
}));

jest.mock('../../../../lib/maps', () => ({
  geocodeAddress: mockGeocodeAddress,
}));

// Create mock database
const mockDb = {
  where: jest.fn(),
  leftJoin: jest.fn(),
  join: jest.fn(),
  select: jest.fn(),
  first: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  returning: jest.fn(),
  whereNull: jest.fn(),
  whereNotNull: jest.fn(),
  fn: {
    now: jest.fn(() => 'NOW()')
  }
};

// Configure chaining
Object.keys(mockDb).forEach(key => {
  if (typeof mockDb[key as keyof typeof mockDb] === 'function' && key !== 'fn') {
    (mockDb[key as keyof typeof mockDb] as jest.Mock).mockReturnValue(mockDb);
  }
});


describe('LocationDataService', () => {
  let LocationDataService: any;
  let locationDataService: any;

  beforeAll(async () => {
    // Import the service after mocks are set up
    const module = await import('../LocationDataService');
    LocationDataService = module.default;
  });

  beforeEach(() => {
    locationDataService = new LocationDataService(mockDb);

    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock chains
    Object.keys(mockDb).forEach(key => {
      if (typeof mockDb[key as keyof typeof mockDb] === 'function' && key !== 'fn') {
        (mockDb[key as keyof typeof mockDb] as jest.Mock).mockReturnValue(mockDb);
      }
    });

    // Setup default mock implementations
    const mockAddressService = {
      searchAddresses: jest.fn().mockResolvedValue([
        {
          displayName: '123 Main St, Calgary, AB T1Y 1A1, Canada',
          streetNumber: '123',
          streetName: 'Main St',
          city: 'Calgary',
          province: 'AB',
          postalCode: 'T1Y 1A1',
          country: 'Canada',
          confidence: 0.9,
          type: 'address',
          coordinates: { lat: 51.0447, lng: -114.0719 }
        }
      ])
    };

    mockCreateAddressService.mockReturnValue(mockAddressService);
    mockGeocodeAddress.mockResolvedValue({ lat: 51.0447, lng: -114.0719 });

    // Setup environment variables
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'test_google_key';
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'test_mapbox_token';
  });

  describe('Constructor', () => {
    it('should create instance with database connection', () => {
      expect(locationDataService).toBeDefined();
    });

    it('should work with dependency injection', () => {
      const customDb = { ...mockDb };
      const service = new LocationDataService(customDb);
      expect(service).toBeDefined();
    });
  });

  describe('extractPostalCode', () => {
    it('should extract valid Canadian postal codes', () => {
      expect(locationDataService.extractPostalCode('123 Main St, Calgary T1Y 1A1')).toBe('T1Y 1A1');
      expect(locationDataService.extractPostalCode('T1Y1A1')).toBe('T1Y 1A1');
      expect(locationDataService.extractPostalCode('Address with T2P 1B2 postal code')).toBe('T2P 1B2');
    });

    it('should return empty string for invalid postal codes', () => {
      expect(locationDataService.extractPostalCode('No postal code here')).toBe('');
      expect(locationDataService.extractPostalCode('123456')).toBe('');
      expect(locationDataService.extractPostalCode('')).toBe('');
    });

    it('should handle lowercase postal codes', () => {
      expect(locationDataService.extractPostalCode('t1y 1a1')).toBe('T1Y 1A1');
      expect(locationDataService.extractPostalCode('t1y1a1')).toBe('T1Y 1A1');
    });
  });

  describe('determineProvider', () => {
    beforeEach(() => {
      // Clear environment variables
      delete process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
      delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    });

    it('should return google when Google API key is provided', () => {
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'valid_google_key';

      const result = locationDataService.determineProvider();
      expect(result).toBe('google');
    });

    it('should return mapbox when Mapbox token is provided and no Google key', () => {
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'valid_mapbox_token';

      const result = locationDataService.determineProvider();
      expect(result).toBe('mapbox');
    });

    it('should return nominatim when no valid keys are provided', () => {
      const result = locationDataService.determineProvider();
      expect(result).toBe('nominatim');
    });

    it('should ignore default placeholder values', () => {
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'your_google_places_api_key_here_optional';
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'your_mapbox_token_here_optional';

      const result = locationDataService.determineProvider();
      expect(result).toBe('nominatim');
    });
  });

  describe('geocodeAddress', () => {
    it('should successfully geocode an address', async () => {
      const coordinates = { lat: 51.0447, lng: -114.0719 };
      mockGeocodeAddress.mockResolvedValue(coordinates);

      const result = await locationDataService.geocodeAddress('123 Main St, Calgary');

      expect(mockGeocodeAddress).toHaveBeenCalledWith('123 Main St, Calgary');
      expect(result).toEqual(coordinates);
    });

    it('should return null when geocoding fails', async () => {
      mockGeocodeAddress.mockRejectedValue(new Error('Geocoding failed'));

      const result = await locationDataService.geocodeAddress('Invalid Address');

      expect(result).toBeNull();
    });
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      jest.useFakeTimers();
      const delayPromise = locationDataService.delay(1000);

      jest.advanceTimersByTime(1000);
      await delayPromise;

      jest.useRealTimers();
      // Test passes if no timeout occurs
    });
  });

  describe('createOrUpdateUserLocation', () => {
    const mockLocationData = {
      id: 1,
      user_id: 'user-1',
      full_address: '123 Main St, Calgary, AB T1Y 1A1, Canada',
      street_number: '123',
      street_name: 'Main St',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T1Y 1A1',
      country: 'Canada',
      latitude: 51.0447,
      longitude: -114.0719,
      geocoding_provider: 'google',
      geocoding_confidence: 0.9,
      address_type: 'address'
    };

    beforeEach(() => {
      mockDb.first.mockResolvedValue(null); // No existing location by default
      mockDb.returning.mockResolvedValue([mockLocationData]);
    });

    it('should create new location data for user', async () => {
      const result = await locationDataService.createOrUpdateUserLocation('user-1', '123 Main St, Calgary, AB');

      expect(mockCreateAddressService).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          full_address: '123 Main St, Calgary, AB T1Y 1A1, Canada',
          city: 'Calgary',
          province: 'AB',
          postal_code: 'T1Y 1A1',
          latitude: 51.0447,
          longitude: -114.0719
        })
      );
      expect(result).toEqual(mockLocationData);
    });

    it('should update existing location data for user', async () => {
      const existingLocation = { id: 1, user_id: 'user-1' };
      mockDb.first.mockResolvedValue(existingLocation);

      const result = await locationDataService.createOrUpdateUserLocation('user-1', '456 New St, Edmonton, AB');

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          updated_at: 'NOW()'
        })
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(result).toEqual(mockLocationData);
    });

    it('should handle address with postal code only', async () => {
      const addressService = {
        searchAddresses: jest.fn().mockResolvedValue([
          {
            displayName: 'T1Y 1A1, Calgary, AB, Canada',
            city: 'Calgary',
            province: 'AB',
            postalCode: 'T1Y 1A1',
            country: 'Canada',
            type: 'postal_code'
          }
        ])
      };
      mockCreateAddressService.mockReturnValue(addressService);

      const result = await locationDataService.createOrUpdateUserLocation('user-1', 'T1Y 1A1');

      expect(addressService.searchAddresses).toHaveBeenCalledWith('T1Y 1A1');
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          postal_code: 'T1Y 1A1',
          address_type: 'postal_code'
        })
      );
    });

    it('should geocode address when coordinates not provided', async () => {
      const addressService = {
        searchAddresses: jest.fn().mockResolvedValue([
          {
            displayName: '123 Main St, Calgary, AB',
            city: 'Calgary',
            province: 'AB'
            // No coordinates provided
          }
        ])
      };
      mockCreateAddressService.mockReturnValue(addressService);

      await locationDataService.createOrUpdateUserLocation('user-1', '123 Main St');

      expect(mockGeocodeAddress).toHaveBeenCalledWith('123 Main St');
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 51.0447,
          longitude: -114.0719
        })
      );
    });

    it('should throw error when no address suggestions found', async () => {
      const addressService = {
        searchAddresses: jest.fn().mockResolvedValue([])
      };
      mockCreateAddressService.mockReturnValue(addressService);

      await expect(
        locationDataService.createOrUpdateUserLocation('user-1', 'Invalid Address')
      ).rejects.toThrow('No location data found for address: Invalid Address');
    });
  });

  describe('getUserLocation', () => {
    const mockLocationData = {
      id: 1,
      user_id: 'user-1',
      full_address: '123 Main St, Calgary, AB',
      latitude: 51.0447,
      longitude: -114.0719
    };

    it('should return user location data when found', async () => {
      mockDb.first.mockResolvedValue(mockLocationData);

      const result = await locationDataService.getUserLocation('user-1');

      expect(mockDb.where).toHaveBeenCalledWith('user_id', 'user-1');
      expect(result).toEqual(mockLocationData);
    });

    it('should return null when user location not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await locationDataService.getUserLocation('nonexistent-user');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      await expect(
        locationDataService.getUserLocation('user-1')
      ).rejects.toThrow('Failed to fetch location data for user user-1');
    });
  });

  describe('batchCreateUserLocations', () => {
    const userAddresses = [
      { userId: 'user-1', address: '123 Main St, Calgary' },
      { userId: 'user-2', address: '456 Oak Ave, Edmonton' },
      { userId: 'user-3', address: 'T1Y 1A1' }
    ];

    it('should process all user addresses successfully', async () => {
      jest.spyOn(locationDataService, 'createOrUpdateUserLocation')
        .mockResolvedValueOnce({ id: 1, user_id: 'user-1' })
        .mockResolvedValueOnce({ id: 2, user_id: 'user-2' })
        .mockResolvedValueOnce({ id: 3, user_id: 'user-3' });

      jest.spyOn(locationDataService, 'delay').mockResolvedValue(undefined);

      const result = await locationDataService.batchCreateUserLocations(userAddresses);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(3);
      expect(locationDataService.createOrUpdateUserLocation).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      jest.spyOn(locationDataService, 'createOrUpdateUserLocation')
        .mockResolvedValueOnce({ id: 1, user_id: 'user-1' })
        .mockRejectedValueOnce(new Error('Geocoding failed'))
        .mockResolvedValueOnce({ id: 3, user_id: 'user-3' });

      jest.spyOn(locationDataService, 'delay').mockResolvedValue(undefined);

      const result = await locationDataService.batchCreateUserLocations(userAddresses);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toMatchObject({
        userId: 'user-2',
        address: '456 Oak Ave, Edmonton',
        error: 'Geocoding failed'
      });
      expect(result.totalProcessed).toBe(3);
    });

    it('should respect API rate limits with delays', async () => {
      const delaySpy = jest.spyOn(locationDataService, 'delay').mockResolvedValue(undefined);
      jest.spyOn(locationDataService, 'createOrUpdateUserLocation').mockResolvedValue({ id: 1 });

      await locationDataService.batchCreateUserLocations(userAddresses);

      expect(delaySpy).toHaveBeenCalledTimes(3);
      expect(delaySpy).toHaveBeenCalledWith(100);
    });
  });

  describe('updateLocationWithCoordinates', () => {
    const mockLocationWithoutCoords = {
      id: 1,
      user_id: 'user-1',
      full_address: '123 Main St, Calgary',
      latitude: null,
      longitude: null,
      postal_code: 'T1Y 1A1'
    };

    const mockLocationWithCoords = {
      ...mockLocationWithoutCoords,
      latitude: 51.0447,
      longitude: -114.0719
    };

    it('should return null when user has no location data', async () => {
      jest.spyOn(locationDataService, 'getUserLocation').mockResolvedValue(null);

      const result = await locationDataService.updateLocationWithCoordinates('user-1');

      expect(result).toBeNull();
    });

    it('should return existing location when coordinates already present', async () => {
      jest.spyOn(locationDataService, 'getUserLocation').mockResolvedValue(mockLocationWithCoords);

      const result = await locationDataService.updateLocationWithCoordinates('user-1');

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockLocationWithCoords);
    });

    it('should geocode full address and update coordinates', async () => {
      jest.spyOn(locationDataService, 'getUserLocation').mockResolvedValue(mockLocationWithoutCoords);
      mockGeocodeAddress.mockResolvedValue({ lat: 51.0447, lng: -114.0719 });
      mockDb.returning.mockResolvedValue([mockLocationWithCoords]);

      const result = await locationDataService.updateLocationWithCoordinates('user-1');

      expect(mockGeocodeAddress).toHaveBeenCalledWith('123 Main St, Calgary');
      expect(mockDb.update).toHaveBeenCalledWith({
        latitude: 51.0447,
        longitude: -114.0719,
        updated_at: 'NOW()'
      });
      expect(result).toEqual(mockLocationWithCoords);
    });

    it('should fallback to postal code when full address geocoding fails', async () => {
      jest.spyOn(locationDataService, 'getUserLocation').mockResolvedValue(mockLocationWithoutCoords);
      mockGeocodeAddress
        .mockResolvedValueOnce(null) // Full address fails
        .mockResolvedValueOnce({ lat: 51.0447, lng: -114.0719 }); // Postal code succeeds
      mockDb.returning.mockResolvedValue([mockLocationWithCoords]);

      const result = await locationDataService.updateLocationWithCoordinates('user-1');

      expect(mockGeocodeAddress).toHaveBeenCalledWith('123 Main St, Calgary');
      expect(mockGeocodeAddress).toHaveBeenCalledWith('T1Y 1A1');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should return original location when geocoding completely fails', async () => {
      jest.spyOn(locationDataService, 'getUserLocation').mockResolvedValue(mockLocationWithoutCoords);
      mockGeocodeAddress.mockResolvedValue(null);

      const result = await locationDataService.updateLocationWithCoordinates('user-1');

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockLocationWithoutCoords);
    });
  });

  describe('getUsersNeedingLocationData', () => {
    const mockUsers = [
      {
        userId: 'user-1',
        postal_code: 'T1Y 1A1',
        location: '123 Main St',
        name: 'John Doe'
      },
      {
        userId: 'user-2',
        postal_code: 'T2P 1B2',
        location: null,
        name: 'Jane Smith'
      }
    ];

    it('should return users needing location data', async () => {
      mockDb.select.mockResolvedValue(mockUsers);

      const result = await locationDataService.getUsersNeedingLocationData();

      expect(mockDb.leftJoin).toHaveBeenCalledWith('user_locations', 'users.id', 'user_locations.user_id');
      expect(mockDb.where).toHaveBeenCalledWith('users.role', 'referee');
      expect(mockDb.whereNotNull).toHaveBeenCalledWith('users.postal_code');
      expect(mockDb.whereNull).toHaveBeenCalledWith('user_locations.id');

      expect(result).toEqual([
        {
          userId: 'user-1',
          address: '123 Main St',
          name: 'John Doe'
        },
        {
          userId: 'user-2',
          address: 'T2P 1B2',
          name: 'Jane Smith'
        }
      ]);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockRejectedValue(new Error('Database error'));

      await expect(locationDataService.getUsersNeedingLocationData())
        .rejects.toThrow('Database error');
    });
  });
});
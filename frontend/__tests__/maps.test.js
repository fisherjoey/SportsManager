import {
  calculateDistanceAndDriveTime,
  geocodeAddress,
  generateGoogleMapsURL,
  formatDriveTime,
  getCurrentLocation,
  buildFullAddress,
} from '../lib/maps';

// Mock fetch globally
global.fetch = jest.fn();

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('maps.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('geocodeAddress', () => {
    it('should successfully geocode an address', async () => {
      const mockResponse = [
        {
          lat: '51.0447',
          lon: '-114.0719',
          display_name: '555 Saddledome Rise SE, Calgary, AB, Canada',
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await geocodeAddress(
        '555 Saddledome Rise SE, Calgary, AB'
      );

      expect(result).toEqual({
        lat: 51.0447,
        lng: -114.0719,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org/search'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'Sports-Management-App/1.0',
          },
        })
      );
    });

    it('should return null when address is not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await geocodeAddress('nonexistent address');

      expect(result).toBeNull();
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await geocodeAddress('test address');

      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await geocodeAddress('test address');

      expect(result).toBeNull();
    });
  });

  describe('calculateDistanceAndDriveTime', () => {
    it('should calculate distance between two coordinates', async () => {
      const mockRouteResponse = {
        routes: [
          {
            summary: {
              distance: 15.5, // km
              duration: 1200, // seconds (20 minutes)
            },
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      });

      const origin = { lat: 51.0447, lng: -114.0719 };
      const destination = { lat: 51.0534, lng: -114.064 };

      const result = await calculateDistanceAndDriveTime(origin, destination);

      expect(result).toEqual({
        distance: '15.5 km',
        duration: '20m',
        distanceValue: 15500,
        durationValue: 1200,
      });
    });

    it('should calculate distance with addresses by geocoding first', async () => {
      // Mock geocoding responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lat: '51.0447', lon: '-114.0719' }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lat: '51.0534', lon: '-114.0640' }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            routes: [
              {
                summary: {
                  distance: 5.2,
                  duration: 780,
                },
              },
            ],
          }),
        });

      const result = await calculateDistanceAndDriveTime(
        'Calgary Saddledome',
        'Calgary Tower'
      );

      expect(result).toEqual({
        distance: '5.2 km',
        duration: '13m',
        distanceValue: 5200,
        durationValue: 780,
      });

      expect(fetch).toHaveBeenCalledTimes(3); // 2 geocoding + 1 routing
    });

    it('should handle short distances in meters', async () => {
      const mockRouteResponse = {
        routes: [
          {
            summary: {
              distance: 0.5, // km
              duration: 120, // seconds (2 minutes)
            },
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      });

      const origin = { lat: 51.0447, lng: -114.0719 };
      const destination = { lat: 51.045, lng: -114.072 };

      const result = await calculateDistanceAndDriveTime(origin, destination);

      expect(result).toEqual({
        distance: '500 m',
        duration: '2m',
        distanceValue: 500,
        durationValue: 120,
      });
    });

    it('should format long durations with hours', async () => {
      const mockRouteResponse = {
        routes: [
          {
            summary: {
              distance: 150.0,
              duration: 5400, // 1.5 hours
            },
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      });

      const origin = { lat: 51.0447, lng: -114.0719 };
      const destination = { lat: 52.1332, lng: -106.67 };

      const result = await calculateDistanceAndDriveTime(origin, destination);

      expect(result.duration).toBe('1h 30m');
    });

    it('should include API key in headers when provided', async () => {
      const mockRouteResponse = {
        routes: [
          {
            summary: {
              distance: 10.0,
              duration: 900,
            },
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      });

      const origin = { lat: 51.0447, lng: -114.0719 };
      const destination = { lat: 51.0534, lng: -114.064 };
      const apiKey = 'test-api-key';

      await calculateDistanceAndDriveTime(origin, destination, apiKey);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openrouteservice.org/v2/directions/driving-car',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-api-key',
          }),
        })
      );
    });

    it('should return null when geocoding fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [], // Empty geocoding result
      });

      const result = await calculateDistanceAndDriveTime(
        'nonexistent address',
        'Calgary Tower'
      );

      expect(result).toBeNull();
    });

    it('should return null when routing fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const origin = { lat: 51.0447, lng: -114.0719 };
      const destination = { lat: 51.0534, lng: -114.064 };

      const result = await calculateDistanceAndDriveTime(origin, destination);

      expect(result).toBeNull();
    });

    it('should return null when no routes found', async () => {
      const mockRouteResponse = {
        routes: [],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      });

      const origin = { lat: 51.0447, lng: -114.0719 };
      const destination = { lat: 51.0534, lng: -114.064 };

      const result = await calculateDistanceAndDriveTime(origin, destination);

      expect(result).toBeNull();
    });
  });

  describe('generateGoogleMapsURL', () => {
    it('should generate search URL for destination string', () => {
      const url = generateGoogleMapsURL('Calgary Saddledome');

      expect(url).toBe(
        'https://www.google.com/maps/search/?q=Calgary+Saddledome'
      );
    });

    it('should generate directions URL with string origin and destination', () => {
      const url = generateGoogleMapsURL('Calgary Saddledome', 'Calgary Tower');

      expect(url).toBe(
        'https://www.google.com/maps/dir/?q=Calgary+Saddledome&saddr=Calgary+Tower&daddr=Calgary+Saddledome'
      );
    });

    it('should generate URL with coordinate destination', () => {
      const destination = { lat: 51.0447, lng: -114.0719 };
      const url = generateGoogleMapsURL(destination);

      expect(url).toBe(
        'https://www.google.com/maps/search/?q=51.0447%2C-114.0719'
      );
    });

    it('should generate directions URL with coordinate origin and destination', () => {
      const origin = { lat: 51.0534, lng: -114.064 };
      const destination = { lat: 51.0447, lng: -114.0719 };
      const url = generateGoogleMapsURL(destination, origin);

      expect(url).toBe(
        'https://www.google.com/maps/dir/?q=51.0447%2C-114.0719&saddr=51.0534%2C-114.064&daddr=51.0447%2C-114.0719'
      );
    });

    it('should generate directions URL with mixed string and coordinate', () => {
      const origin = 'Calgary Tower';
      const destination = { lat: 51.0447, lng: -114.0719 };
      const url = generateGoogleMapsURL(destination, origin);

      expect(url).toBe(
        'https://www.google.com/maps/dir/?q=51.0447%2C-114.0719&saddr=Calgary+Tower&daddr=51.0447%2C-114.0719'
      );
    });
  });

  describe('formatDriveTime', () => {
    it('should format hour and minute text', () => {
      expect(formatDriveTime('1 hour 30 minutes')).toBe('1h 30m');
      expect(formatDriveTime('2 hours 15 mins')).toBe('2h 15m');
      expect(formatDriveTime('1 hour 45 minutes')).toBe('1h 45m');
    });

    it('should format minutes only', () => {
      expect(formatDriveTime('30 minutes')).toBe('30m');
      expect(formatDriveTime('45 mins')).toBe('45m');
      expect(formatDriveTime('5 min')).toBe('5m');
    });

    it('should handle hours only', () => {
      expect(formatDriveTime('2 hours')).toBe('2h');
      expect(formatDriveTime('1 hour')).toBe('1h');
    });

    it('should handle multiple spaces', () => {
      expect(formatDriveTime('1  hour   30   minutes')).toBe('1h 30m');
    });

    it('should handle empty or whitespace strings', () => {
      expect(formatDriveTime('')).toBe('');
      expect(formatDriveTime('   ')).toBe('');
    });
  });

  describe('getCurrentLocation', () => {
    it('should return current position when geolocation succeeds', async () => {
      const mockPosition = {
        coords: {
          latitude: 51.0447,
          longitude: -114.0719,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await getCurrentLocation();

      expect(result).toEqual({
        lat: 51.0447,
        lng: -114.0719,
      });
    });

    it('should return null when geolocation is not available', async () => {
      // Temporarily remove geolocation
      const originalGeolocation = global.navigator.geolocation;
      global.navigator.geolocation = undefined;

      const result = await getCurrentLocation();

      expect(result).toBeNull();

      // Restore geolocation
      global.navigator.geolocation = originalGeolocation;
    });

    it('should return null when geolocation fails', async () => {
      const mockError = new Error('Geolocation error');

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error(mockError);
        }
      );

      const result = await getCurrentLocation();

      expect(result).toBeNull();
    });
  });

  describe('buildFullAddress', () => {
    it('should build address with all components', () => {
      const result = buildFullAddress(
        '555 Saddledome Rise SE',
        'Calgary',
        'AB',
        'T2G 2W1'
      );

      expect(result).toBe('555 Saddledome Rise SE, Calgary, AB, T2G 2W1');
    });

    it('should build address without province', () => {
      const result = buildFullAddress(
        '123 Main St',
        'Calgary',
        undefined,
        'T2P 1P1'
      );

      expect(result).toBe('123 Main St, Calgary, T2P 1P1');
    });

    it('should build address without postal code', () => {
      const result = buildFullAddress('123 Main St', 'Calgary', 'AB');

      expect(result).toBe('123 Main St, Calgary, AB');
    });

    it('should build minimal address with just street and city', () => {
      const result = buildFullAddress('123 Main St', 'Calgary');

      expect(result).toBe('123 Main St, Calgary');
    });

    it('should handle empty optional fields', () => {
      const result = buildFullAddress('123 Main St', 'Calgary', '', '');

      expect(result).toBe('123 Main St, Calgary');
    });
  });
});

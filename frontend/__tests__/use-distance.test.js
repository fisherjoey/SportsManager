import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDistance } from '../hooks/use-distance';
import * as maps from '../lib/maps';

// Mock the maps module
jest.mock('../lib/maps', () => ({
  calculateDistanceAndDriveTime: jest.fn(),
  getCurrentLocation: jest.fn(),
}));

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  process.env.NEXT_PUBLIC_OPENROUTE_API_KEY = 'test-api-key';
});

afterEach(() => {
  process.env = originalEnv;
});

describe('useDistance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', async () => {
    const { result } = renderHook(() => useDistance('Calgary Saddledome'));

    // Hook will start loading immediately when destination is provided
    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should not calculate distance when disabled', async () => {
    const { result } = renderHook(() =>
      useDistance('Calgary Saddledome', { enabled: false })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(maps.calculateDistanceAndDriveTime).not.toHaveBeenCalled();
    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should not calculate distance when destination is null', async () => {
    const { result } = renderHook(() => useDistance(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(maps.calculateDistanceAndDriveTime).not.toHaveBeenCalled();
    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should calculate distance using current location', async () => {
    const mockCurrentLocation = { lat: 51.0447, lng: -114.0719 };
    const mockDistanceResult = {
      distance: '5.2 km',
      duration: '13m',
      distanceValue: 5200,
      durationValue: 780,
    };

    maps.getCurrentLocation.mockResolvedValue(mockCurrentLocation);
    maps.calculateDistanceAndDriveTime.mockResolvedValue(mockDistanceResult);

    const { result } = renderHook(() => useDistance('Calgary Tower'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(maps.getCurrentLocation).toHaveBeenCalled();
    expect(maps.calculateDistanceAndDriveTime).toHaveBeenCalledWith(
      mockCurrentLocation,
      'Calgary Tower',
      'test-api-key'
    );
    expect(result.current.distance).toEqual(mockDistanceResult);
    expect(result.current.error).toBeNull();
  });

  it('should calculate distance using provided user location', async () => {
    const mockDistanceResult = {
      distance: '10.1 km',
      duration: '18m',
      distanceValue: 10100,
      durationValue: 1080,
    };

    maps.calculateDistanceAndDriveTime.mockResolvedValue(mockDistanceResult);

    const { result } = renderHook(() =>
      useDistance('Calgary Saddledome', {
        userLocation: '123 Main St, Calgary',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(maps.getCurrentLocation).not.toHaveBeenCalled();
    expect(maps.calculateDistanceAndDriveTime).toHaveBeenCalledWith(
      '123 Main St, Calgary',
      'Calgary Saddledome',
      'test-api-key'
    );
    expect(result.current.distance).toEqual(mockDistanceResult);
    expect(result.current.error).toBeNull();
  });

  it('should handle error when current location cannot be determined', async () => {
    maps.getCurrentLocation.mockResolvedValue(null);

    const { result } = renderHook(() => useDistance('Calgary Tower'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(maps.getCurrentLocation).toHaveBeenCalled();
    expect(maps.calculateDistanceAndDriveTime).not.toHaveBeenCalled();
    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBe('Could not determine your location');
  });

  it('should handle error when distance calculation fails', async () => {
    const mockCurrentLocation = { lat: 51.0447, lng: -114.0719 };

    maps.getCurrentLocation.mockResolvedValue(mockCurrentLocation);
    maps.calculateDistanceAndDriveTime.mockResolvedValue(null);

    const { result } = renderHook(() => useDistance('Calgary Tower'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBe('Could not calculate distance');
  });

  it('should handle calculation exceptions', async () => {
    const mockCurrentLocation = { lat: 51.0447, lng: -114.0719 };

    maps.getCurrentLocation.mockResolvedValue(mockCurrentLocation);
    maps.calculateDistanceAndDriveTime.mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useDistance('Calgary Tower'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('should handle unknown errors', async () => {
    const mockCurrentLocation = { lat: 51.0447, lng: -114.0719 };

    maps.getCurrentLocation.mockResolvedValue(mockCurrentLocation);
    maps.calculateDistanceAndDriveTime.mockRejectedValue('Unknown error');

    const { result } = renderHook(() => useDistance('Calgary Tower'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBe('Unknown error occurred');
  });

  it('should recalculate when destination changes', async () => {
    const mockCurrentLocation = { lat: 51.0447, lng: -114.0719 };
    const mockDistanceResult1 = {
      distance: '5.2 km',
      duration: '13m',
      distanceValue: 5200,
      durationValue: 780,
    };
    const mockDistanceResult2 = {
      distance: '8.7 km',
      duration: '20m',
      distanceValue: 8700,
      durationValue: 1200,
    };

    maps.getCurrentLocation.mockResolvedValue(mockCurrentLocation);
    maps.calculateDistanceAndDriveTime
      .mockResolvedValueOnce(mockDistanceResult1)
      .mockResolvedValueOnce(mockDistanceResult2);

    const { result, rerender } = renderHook(
      ({ destination }) => useDistance(destination),
      { initialProps: { destination: 'Calgary Tower' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distance).toEqual(mockDistanceResult1);

    // Change destination
    rerender({ destination: 'Calgary Saddledome' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distance).toEqual(mockDistanceResult2);
    expect(maps.calculateDistanceAndDriveTime).toHaveBeenCalledTimes(2);
  });

  it('should work with useCurrentLocation disabled and user location provided', async () => {
    const mockDistanceResult = {
      distance: '15.3 km',
      duration: '25m',
      distanceValue: 15300,
      durationValue: 1500,
    };

    maps.calculateDistanceAndDriveTime.mockResolvedValue(mockDistanceResult);

    const { result } = renderHook(() =>
      useDistance('Calgary Saddledome', {
        useCurrentLocation: false,
        userLocation: '456 Another St, Calgary',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(maps.getCurrentLocation).not.toHaveBeenCalled();
    expect(maps.calculateDistanceAndDriveTime).toHaveBeenCalledWith(
      '456 Another St, Calgary',
      'Calgary Saddledome',
      'test-api-key'
    );
    expect(result.current.distance).toEqual(mockDistanceResult);
  });

  it('should handle case when useCurrentLocation is disabled and no userLocation provided', async () => {
    const { result } = renderHook(() =>
      useDistance('Calgary Saddledome', {
        useCurrentLocation: false,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(maps.getCurrentLocation).not.toHaveBeenCalled();
    expect(maps.calculateDistanceAndDriveTime).not.toHaveBeenCalled();
    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBe('Could not determine your location');
  });

  it('should recalculate when userLocation changes', async () => {
    const mockDistanceResult1 = {
      distance: '5.2 km',
      duration: '13m',
      distanceValue: 5200,
      durationValue: 780,
    };
    const mockDistanceResult2 = {
      distance: '12.8 km',
      duration: '22m',
      distanceValue: 12800,
      durationValue: 1320,
    };

    maps.calculateDistanceAndDriveTime
      .mockResolvedValueOnce(mockDistanceResult1)
      .mockResolvedValueOnce(mockDistanceResult2);

    const { result, rerender } = renderHook(
      ({ userLocation }) => useDistance('Calgary Tower', { userLocation }),
      { initialProps: { userLocation: '123 First St, Calgary' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distance).toEqual(mockDistanceResult1);

    // Change user location
    rerender({ userLocation: '456 Second St, Calgary' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distance).toEqual(mockDistanceResult2);
    expect(maps.calculateDistanceAndDriveTime).toHaveBeenCalledTimes(2);
  });

  it('should clear state when destination becomes null', async () => {
    const mockCurrentLocation = { lat: 51.0447, lng: -114.0719 };
    const mockDistanceResult = {
      distance: '5.2 km',
      duration: '13m',
      distanceValue: 5200,
      durationValue: 780,
    };

    maps.getCurrentLocation.mockResolvedValue(mockCurrentLocation);
    maps.calculateDistanceAndDriveTime.mockResolvedValue(mockDistanceResult);

    const { result, rerender } = renderHook(
      ({ destination }) => useDistance(destination),
      { initialProps: { destination: 'Calgary Tower' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distance).toEqual(mockDistanceResult);

    // Set destination to null
    rerender({ destination: null });

    expect(result.current.distance).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

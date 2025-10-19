import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import knex from '../config/database';
import DistanceCalculationService from '../services/DistanceCalculationService';

const router = express.Router();

// Types
interface Location {
  id?: number;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  rental_rate?: number | null;
  parking_spaces?: number | null;
  facilities?: string; // JSON string
  accessibility_features?: string; // JSON string
  notes?: string;
  is_active: boolean;
  hourly_rate?: number | null;
  game_rate?: number | null;
  cost_notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface CreateLocationRequest {
  name: string;
  address: string;
  city: string;
  province?: string;
  postal_code: string;
  country?: string;
  latitude?: string | number;
  longitude?: string | number;
  capacity?: string | number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  rental_rate?: string | number;
  parking_spaces?: string | number;
  facilities?: string[];
  accessibility_features?: string[];
  notes?: string;
  hourly_rate?: string | number;
  game_rate?: string | number;
  cost_notes?: string;
}

interface UpdateLocationRequest extends Partial<CreateLocationRequest> {
  is_active?: boolean;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

interface DistanceFilters {
  maxDriveTimeMinutes?: number;
  maxDistanceMeters?: number;
  city?: string;
}

// Get all active locations
// Requires: locations:read permission
router.get('/', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'view:list',
}), async (req: Request, res: Response) => {
  try {
    const { search, city, limit = '50' } = (req as any).query;
    const limitNum = parseInt(limit as string, 10);

    let query = knex('locations')
      .where('is_active', true)
      .orderBy('name');

    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('address', 'ilike', `%${search}%`)
          .orWhere('city', 'ilike', `%${search}%`);
      });
    }

    if (city) {
      query = query.where('city', 'ilike', `%${city}%`);
    }

    const locations = await query.limit(limitNum);

    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get location by ID
// Requires: locations:read permission
router.get('/:id', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'view:details',
  getResourceId: (req) => (req as any).params.id,
}), async (req: Request, res: Response) => {
  try {
    const location = await knex('locations')
      .where('id', (req as any).params.id)
      .where('is_active', true)
      .first() as unknown as Location | undefined;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Create new location
// Requires: locations:create or system:manage permission
router.post('/', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'create',
}), async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      city,
      province = 'AB',
      postal_code,
      country = 'Canada',
      latitude,
      longitude,
      capacity,
      contact_name,
      contact_phone,
      contact_email,
      rental_rate,
      parking_spaces,
      facilities = [],
      accessibility_features = [],
      notes,
      hourly_rate,
      game_rate,
      cost_notes
    } = (req as any).body as CreateLocationRequest;

    // Validate required fields
    if (!name || !address || !city || !postal_code) {
      return res.status(400).json({
        error: 'Name, address, city, and postal code are required'
      });
    }

    // Check for duplicate location
    const existingLocation = await knex('locations')
      .where('name', name)
      .where('address', address)
      .where('city', city)
      .first() as unknown as Location | undefined;

    if (existingLocation) {
      return res.status(409).json({
        error: 'Location with this name and address already exists'
      });
    }

    const [location] = await knex('locations')
      .insert({
        name,
        address,
        city,
        province,
        postal_code,
        country,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
        capacity: capacity ? parseInt(capacity.toString(), 10) : null,
        contact_name,
        contact_phone,
        contact_email,
        rental_rate: rental_rate ? parseFloat(rental_rate.toString()) : null,
        parking_spaces: parking_spaces ? parseInt(parking_spaces.toString(), 10) : null,
        facilities: JSON.stringify(facilities),
        accessibility_features: JSON.stringify(accessibility_features),
        notes,
        hourly_rate: hourly_rate ? parseFloat(hourly_rate.toString()) : null,
        game_rate: game_rate ? parseFloat(game_rate.toString()) : null,
        cost_notes
      } as any)
      .returning('*') as unknown as Location[];

    // If location has coordinates, trigger distance calculations for all users
    if (location.latitude && location.longitude) {
      // Run distance calculations in background to avoid blocking the response
      setImmediate(async () => {
        try {
          const distanceService = new DistanceCalculationService();
          const result = await distanceService.calculateAllUsersDistanceToLocation(location.id!.toString());
          console.log(`Distance calculations triggered for new location ${location.name}:`, {
            successful: result.successful.length,
            failed: result.failed.length,
            totalUsers: result.totalUsers
          });
        } catch (error: any) {
          console.error(`Failed to calculate distances for new location ${location.id}:`, error.message);
        }
      });
    } else {
      console.warn(`Location ${location.name} created without coordinates - distance calculations skipped`);
    }

    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update location
// Requires: locations:update or system:manage permission
router.put('/:id', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'update',
  getResourceId: (req) => (req as any).params.id,
}), async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      city,
      province,
      postal_code,
      country,
      latitude,
      longitude,
      capacity,
      contact_name,
      contact_phone,
      contact_email,
      rental_rate,
      parking_spaces,
      facilities,
      accessibility_features,
      notes,
      is_active,
      hourly_rate,
      game_rate,
      cost_notes
    } = (req as any).body as UpdateLocationRequest;

    const updateData: Partial<Location> = {};

    if (name !== undefined) {
      updateData.name = name;
    }
    if (address !== undefined) {
      updateData.address = address;
    }
    if (city !== undefined) {
      updateData.city = city;
    }
    if (province !== undefined) {
      updateData.province = province;
    }
    if (postal_code !== undefined) {
      updateData.postal_code = postal_code;
    }
    if (country !== undefined) {
      updateData.country = country;
    }
    if (latitude !== undefined) {
      updateData.latitude = latitude ? parseFloat(latitude.toString()) : null;
    }
    if (longitude !== undefined) {
      updateData.longitude = longitude ? parseFloat(longitude.toString()) : null;
    }
    if (capacity !== undefined) {
      updateData.capacity = capacity ? parseInt(capacity.toString(), 10) : null;
    }
    if (contact_name !== undefined) {
      updateData.contact_name = contact_name;
    }
    if (contact_phone !== undefined) {
      updateData.contact_phone = contact_phone;
    }
    if (contact_email !== undefined) {
      updateData.contact_email = contact_email;
    }
    if (rental_rate !== undefined) {
      updateData.rental_rate = rental_rate ? parseFloat(rental_rate.toString()) : null;
    }
    if (parking_spaces !== undefined) {
      updateData.parking_spaces = parking_spaces ? parseInt(parking_spaces.toString(), 10) : null;
    }
    if (facilities !== undefined) {
      updateData.facilities = JSON.stringify(facilities);
    }
    if (accessibility_features !== undefined) {
      updateData.accessibility_features = JSON.stringify(accessibility_features);
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }
    if (hourly_rate !== undefined) {
      updateData.hourly_rate = hourly_rate ? parseFloat(hourly_rate.toString()) : null;
    }
    if (game_rate !== undefined) {
      updateData.game_rate = game_rate ? parseFloat(game_rate.toString()) : null;
    }
    if (cost_notes !== undefined) {
      updateData.cost_notes = cost_notes;
    }

    const [location] = await knex('locations')
      .where('id', (req as any).params.id)
      .update(updateData as any)
      .returning('*') as unknown as Location[];

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Deactivate location - soft delete
// Requires: locations:delete or system:manage permission
router.delete('/:id', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'delete',
  getResourceId: (req) => (req as any).params.id,
}), async (req: Request, res: Response) => {
  try {
    // Check if location is used in any games
    const gamesCount = await knex('games')
      .where('location_id', (req as any).params.id)
      .count('* as count')
      .first() as unknown as { count: string };

    if (parseInt(gamesCount.count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete location that is assigned to games. Deactivate instead.'
      });
    }

    const [location] = await knex('locations')
      .where('id', (req as any).params.id)
      .update({ is_active: false } as any)
      .returning('*') as unknown as Location[];

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ message: 'Location deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating location:', error);
    res.status(500).json({ error: 'Failed to deactivate location' });
  }
});

// Get distances for current user to all locations
router.get('/distances', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'view:distances',
}), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      maxDriveTimeMinutes,
      maxDistanceMeters,
      maxDistanceKm,
      city,
      limit = '50'
    } = (req as any).query;

    const distanceService = new DistanceCalculationService();

    // Convert km to meters if provided
    const maxDistanceMetersValue = maxDistanceKm
      ? parseFloat(maxDistanceKm as string) * 1000
      : maxDistanceMeters ? parseFloat(maxDistanceMeters as string) : null;

    const filters: DistanceFilters = {};
    if (maxDriveTimeMinutes) {
      filters.maxDriveTimeMinutes = parseInt(maxDriveTimeMinutes as string, 10);
    }
    if (maxDistanceMetersValue) {
      filters.maxDistanceMeters = maxDistanceMetersValue;
    }
    if (city) {
      filters.city = city as string;
    }

    let distances = await distanceService.getUserDistances(req.user!.userId.toString(), filters);

    // Apply limit
    if (limit) {
      distances = distances.slice(0, parseInt(limit as string, 10));
    }

    res.json({
      distances,
      total: distances.length,
      filters: {
        maxDriveTimeMinutes: maxDriveTimeMinutes ? parseInt(maxDriveTimeMinutes as string, 10) : null,
        maxDistanceKm: maxDistanceKm ? parseFloat(maxDistanceKm as string) : null,
        city: city || null
      }
    });
  } catch (error) {
    console.error('Error fetching user distances:', error);
    res.status(500).json({ error: 'Failed to fetch distance data' });
  }
});

// Get distance to a specific location for current user
router.get('/:locationId/distance', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'view:distances',
}), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const distance = await knex('user_location_distances')
      .join('locations', 'user_location_distances.location_id', 'locations.id')
      .where('user_location_distances.user_id', req.user!.userId)
      .where('user_location_distances.location_id', (req as any).params.locationId)
      .where('user_location_distances.calculation_successful', true)
      .where('locations.is_active', true)
      .select(
        'user_location_distances.*',
        'locations.name as location_name',
        'locations.address as location_address',
        'locations.city as location_city'
      )
      .first();

    if (!distance) {
      return res.status(404).json({
        error: 'Distance data not found for this location'
      });
    }

    res.json(distance);
  } catch (error) {
    console.error('Error fetching location distance:', error);
    res.status(500).json({ error: 'Failed to fetch distance data' });
  }
});

// Admin endpoint: Get distance calculation statistics
router.get('/admin/distance-stats', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'admin:manage_distances',
}), async (req: Request, res: Response) => {
  try {
    const distanceService = new DistanceCalculationService();
    const stats = await distanceService.getCalculationStats();

    res.json(stats);
  } catch (error) {
    console.error('Error fetching distance stats:', error);
    res.status(500).json({ error: 'Failed to fetch distance statistics' });
  }
});

// Admin endpoint: Trigger distance calculation for a specific user
router.post('/admin/calculate-user-distances/:userId', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'admin:manage_distances',
}), async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).params;

    // Verify user exists
    const user = await knex('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const distanceService = new DistanceCalculationService();

    // Run calculation in background
    setImmediate(async () => {
      try {
        const result = await distanceService.calculateUserDistancesToAllLocations(userId.toString());
        console.log(`Manual distance calculation completed for user ${userId}:`, {
          successful: result.successful.length,
          failed: result.failed.length,
          totalLocations: result.totalLocations
        });
      } catch (error: any) {
        console.error(`Manual distance calculation failed for user ${userId}:`, error.message);
      }
    });

    res.json({
      message: `Distance calculation initiated for user ${userId}`,
      userId: userId
    });
  } catch (error) {
    console.error('Error initiating distance calculation:', error);
    res.status(500).json({ error: 'Failed to initiate distance calculation' });
  }
});

// Admin endpoint: Trigger distance calculation for a specific location
router.post('/admin/calculate-location-distances/:locationId', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'admin:manage_distances',
}), async (req: Request, res: Response) => {
  try {
    const { locationId } = (req as any).params;

    // Verify location exists
    const location = await knex('locations').where('id', locationId).first() as unknown as Location | undefined;
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const distanceService = new DistanceCalculationService();

    // Run calculation in background
    setImmediate(async () => {
      try {
        const result = await distanceService.calculateAllUsersDistanceToLocation(locationId.toString());
        console.log(`Manual distance calculation completed for location ${locationId}:`, {
          successful: result.successful.length,
          failed: result.failed.length,
          totalUsers: result.totalUsers
        });
      } catch (error: any) {
        console.error(`Manual distance calculation failed for location ${locationId}:`, error.message);
      }
    });

    res.json({
      message: `Distance calculation initiated for location ${locationId}`,
      locationId: locationId,
      locationName: location.name
    });
  } catch (error) {
    console.error('Error initiating distance calculation:', error);
    res.status(500).json({ error: 'Failed to initiate distance calculation' });
  }
});

// Admin endpoint: Retry failed distance calculations
router.post('/admin/retry-failed-calculations', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'admin:manage_distances',
}), async (req: Request, res: Response) => {
  try {
    const { maxRetries = 10 } = (req as any).body;

    const distanceService = new DistanceCalculationService();

    // Run retry in background
    setImmediate(async () => {
      try {
        const result = await distanceService.retryFailedCalculations(maxRetries);
        console.log(`Failed calculation retry completed:`, {
          successful: result.successful.length,
          stillFailed: result.failed.length,
          totalRetried: result.totalRetried
        });
      } catch (error: any) {
        console.error(`Failed calculation retry error:`, error.message);
      }
    });

    res.json({
      message: `Retry initiated for up to ${maxRetries} failed calculations`
    });
  } catch (error) {
    console.error('Error initiating retry:', error);
    res.status(500).json({ error: 'Failed to initiate retry' });
  }
});

// Admin endpoint: Initialize all distance calculations
router.post('/admin/initialize-all-distances', authenticateToken, requireCerbosPermission({
  resource: 'location',
  action: 'admin:manage_distances',
}), async (req: Request, res: Response) => {
  try {
    const distanceService = new DistanceCalculationService();

    // Run initialization in background (this could take a very long time)
    setImmediate(async () => {
      try {
        const result = await distanceService.initializeAllDistances();
        console.log(`Distance initialization completed:`, {
          totalUsers: result.totalUsers,
          totalLocations: result.totalLocations,
          totalCalculations: result.totalCalculations,
          successful: result.successfulCalculations,
          failed: result.failedCalculations
        });
      } catch (error: any) {
        console.error(`Distance initialization failed:`, error.message);
      }
    });

    res.json({
      message: 'Distance initialization started. This may take several hours to complete.',
      warning: 'Please monitor server logs for progress updates.'
    });
  } catch (error) {
    console.error('Error initiating distance initialization:', error);
    res.status(500).json({ error: 'Failed to initiate distance initialization' });
  }
});

export default router;
const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const knex = require('../config/database');
const DistanceCalculationService = require('../services/DistanceCalculationService');

const router = express.Router();

// Get all active locations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, city, limit = 50 } = req.query;
    
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

    const locations = await query.limit(parseInt(limit));
    
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get location by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const location = await knex('locations')
      .where('id', req.params.id)
      .where('is_active', true)
      .first();

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Create new location (admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
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
    } = req.body;

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
      .first();

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
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        capacity: capacity ? parseInt(capacity) : null,
        contact_name,
        contact_phone,
        contact_email,
        rental_rate: rental_rate ? parseFloat(rental_rate) : null,
        parking_spaces: parking_spaces ? parseInt(parking_spaces) : null,
        facilities: JSON.stringify(facilities),
        accessibility_features: JSON.stringify(accessibility_features),
        notes,
        hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
        game_rate: game_rate ? parseFloat(game_rate) : null,
        cost_notes
      })
      .returning('*');

    // If location has coordinates, trigger distance calculations for all users
    if (location.latitude && location.longitude) {
      // Run distance calculations in background to avoid blocking the response
      setImmediate(async () => {
        try {
          const distanceService = new DistanceCalculationService();
          const result = await distanceService.calculateAllUsersDistanceToLocation(location.id);
          console.log(`Distance calculations triggered for new location ${location.name}:`, {
            successful: result.successful.length,
            failed: result.failed.length,
            totalUsers: result.totalUsers
          });
        } catch (error) {
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

// Update location (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
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
    } = req.body;

    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (postal_code !== undefined) updateData.postal_code = postal_code;
    if (country !== undefined) updateData.country = country;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (contact_name !== undefined) updateData.contact_name = contact_name;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (contact_email !== undefined) updateData.contact_email = contact_email;
    if (rental_rate !== undefined) updateData.rental_rate = rental_rate ? parseFloat(rental_rate) : null;
    if (parking_spaces !== undefined) updateData.parking_spaces = parking_spaces ? parseInt(parking_spaces) : null;
    if (facilities !== undefined) updateData.facilities = JSON.stringify(facilities);
    if (accessibility_features !== undefined) updateData.accessibility_features = JSON.stringify(accessibility_features);
    if (notes !== undefined) updateData.notes = notes;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (hourly_rate !== undefined) updateData.hourly_rate = hourly_rate ? parseFloat(hourly_rate) : null;
    if (game_rate !== undefined) updateData.game_rate = game_rate ? parseFloat(game_rate) : null;
    if (cost_notes !== undefined) updateData.cost_notes = cost_notes;

    const [location] = await knex('locations')
      .where('id', req.params.id)
      .update(updateData)
      .returning('*');

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Deactivate location (admin only) - soft delete
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Check if location is used in any games
    const gamesCount = await knex('games')
      .where('location_id', req.params.id)
      .count('* as count')
      .first();

    if (parseInt(gamesCount.count) > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete location that is assigned to games. Deactivate instead.' 
      });
    }

    const [location] = await knex('locations')
      .where('id', req.params.id)
      .update({ is_active: false })
      .returning('*');

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
router.get('/distances', authenticateToken, async (req, res) => {
  try {
    const { 
      maxDriveTimeMinutes, 
      maxDistanceMeters,
      maxDistanceKm,
      city,
      limit = 50 
    } = req.query;

    const distanceService = new DistanceCalculationService();
    
    // Convert km to meters if provided
    const maxDistanceMetersValue = maxDistanceKm 
      ? parseFloat(maxDistanceKm) * 1000 
      : maxDistanceMeters ? parseFloat(maxDistanceMeters) : null;

    const filters = {};
    if (maxDriveTimeMinutes) filters.maxDriveTimeMinutes = parseInt(maxDriveTimeMinutes);
    if (maxDistanceMetersValue) filters.maxDistanceMeters = maxDistanceMetersValue;
    if (city) filters.city = city;

    let distances = await distanceService.getUserDistances(req.user.userId, filters);
    
    // Apply limit
    if (limit) {
      distances = distances.slice(0, parseInt(limit));
    }

    res.json({
      distances,
      total: distances.length,
      filters: {
        maxDriveTimeMinutes: maxDriveTimeMinutes ? parseInt(maxDriveTimeMinutes) : null,
        maxDistanceKm: maxDistanceKm ? parseFloat(maxDistanceKm) : null,
        city: city || null
      }
    });
  } catch (error) {
    console.error('Error fetching user distances:', error);
    res.status(500).json({ error: 'Failed to fetch distance data' });
  }
});

// Get distance to a specific location for current user
router.get('/:locationId/distance', authenticateToken, async (req, res) => {
  try {
    const distance = await knex('user_location_distances')
      .join('locations', 'user_location_distances.location_id', 'locations.id')
      .where('user_location_distances.user_id', req.user.userId)
      .where('user_location_distances.location_id', req.params.locationId)
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
router.get('/admin/distance-stats', authenticateToken, requireRole('admin'), async (req, res) => {
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
router.post('/admin/calculate-user-distances/:userId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const user = await knex('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const distanceService = new DistanceCalculationService();
    
    // Run calculation in background
    setImmediate(async () => {
      try {
        const result = await distanceService.calculateUserDistancesToAllLocations(userId);
        console.log(`Manual distance calculation completed for user ${userId}:`, {
          successful: result.successful.length,
          failed: result.failed.length,
          totalLocations: result.totalLocations
        });
      } catch (error) {
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
router.post('/admin/calculate-location-distances/:locationId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { locationId } = req.params;
    
    // Verify location exists
    const location = await knex('locations').where('id', locationId).first();
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const distanceService = new DistanceCalculationService();
    
    // Run calculation in background
    setImmediate(async () => {
      try {
        const result = await distanceService.calculateAllUsersDistanceToLocation(locationId);
        console.log(`Manual distance calculation completed for location ${locationId}:`, {
          successful: result.successful.length,
          failed: result.failed.length,
          totalUsers: result.totalUsers
        });
      } catch (error) {
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
router.post('/admin/retry-failed-calculations', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { maxRetries = 10 } = req.body;
    
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
      } catch (error) {
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
router.post('/admin/initialize-all-distances', authenticateToken, requireRole('admin'), async (req, res) => {
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
      } catch (error) {
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

module.exports = router;
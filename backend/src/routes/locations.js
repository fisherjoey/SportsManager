const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const knex = require('../config/database');

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

module.exports = router;
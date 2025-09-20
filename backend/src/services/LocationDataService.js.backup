const knex = require('../config/database');

/**
 * Service for managing comprehensive user location data
 * Handles geocoding, address parsing, and location data storage
 */
class LocationDataService {
  /**
   * Create or update comprehensive location data for a user
   * @param {string} userId - User ID
   * @param {string} address - Address string (can be postal code or full address)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} User location data
   */
  async createOrUpdateUserLocation(userId, address, options = {}) {
    try {
      // Use the existing address service to get comprehensive location data
      const { createAddressService } = require('../../lib/address-service');
      const addressService = createAddressService();
      
      // Search for the address to get detailed components
      const suggestions = await addressService.searchAddresses(address);
      
      if (!suggestions || suggestions.length === 0) {
        throw new Error(`No location data found for address: ${address}`);
      }
      
      // Take the first (most relevant) suggestion
      const locationData = suggestions[0];
      
      // If coordinates are not available, try to geocode
      let coordinates = locationData.coordinates;
      if (!coordinates) {
        coordinates = await this.geocodeAddress(address);
      }
      
      // Prepare user location data
      const userLocationData = {
        user_id: userId,
        full_address: locationData.displayName || address,
        street_number: locationData.streetNumber || null,
        street_name: locationData.streetName || null,
        city: locationData.city || '',
        province: locationData.province || 'AB',
        postal_code: locationData.postalCode || this.extractPostalCode(address),
        country: locationData.country || 'Canada',
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        geocoding_provider: this.determineProvider(),
        geocoding_confidence: locationData.confidence || 0.8,
        address_type: locationData.type || 'address',
        raw_geocoding_data: JSON.stringify(locationData)
      };
      
      // Check if user location already exists
      const existingLocation = await knex('user_locations')
        .where('user_id', userId)
        .first();
      
      let userLocation;
      if (existingLocation) {
        // Update existing location
        [userLocation] = await knex('user_locations')
          .where('user_id', userId)
          .update({
            ...userLocationData,
            updated_at: knex.fn.now()
          })
          .returning('*');
      } else {
        // Create new location
        [userLocation] = await knex('user_locations')
          .insert(userLocationData)
          .returning('*');
      }
      
      console.log(`Location data ${existingLocation ? 'updated' : 'created'} for user ${userId}:`, {
        address: userLocation.full_address,
        coordinates: coordinates ? `${coordinates.lat}, ${coordinates.lng}` : 'Not found',
        provider: userLocation.geocoding_provider
      });
      
      return userLocation;
    } catch (error) {
      console.error('Error creating/updating user location:', error);
      throw new Error(`Failed to process location data for user ${userId}: ${error.message}`);
    }
  }
  
  /**
   * Get user location data
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User location data or null if not found
   */
  async getUserLocation(userId) {
    try {
      const userLocation = await knex('user_locations')
        .where('user_id', userId)
        .first();
      
      return userLocation;
    } catch (error) {
      console.error('Error fetching user location:', error);
      throw new Error(`Failed to fetch location data for user ${userId}`);
    }
  }
  
  /**
   * Geocode an address using the maps library
   * @param {string} address - Address to geocode
   * @returns {Promise<Object|null>} Coordinates {lat, lng} or null
   */
  async geocodeAddress(address) {
    try {
      const { geocodeAddress } = require('../../lib/maps');
      return await geocodeAddress(address);
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }
  
  /**
   * Extract postal code from address string
   * @param {string} address - Address string
   * @returns {string} Postal code or empty string
   */
  extractPostalCode(address) {
    // Canadian postal code pattern: A1A 1A1 or A1A1A1
    const postalCodeRegex = /[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d/;
    const match = address.match(postalCodeRegex);
    return match ? match[0].toUpperCase().replace(/\s/g, ' ') : '';
  }
  
  /**
   * Determine which geocoding provider is being used
   * @returns {string} Provider name
   */
  determineProvider() {
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    
    if (googleApiKey && googleApiKey !== 'your_google_places_api_key_here_optional') {
      return 'google';
    } else if (mapboxToken && mapboxToken !== 'your_mapbox_token_here_optional') {
      return 'mapbox';
    } else {
      return 'nominatim';
    }
  }
  
  /**
   * Batch create/update location data for multiple users
   * @param {Array} userAddresses - Array of {userId, address} objects
   * @returns {Promise<Array>} Array of created/updated location records
   */
  async batchCreateUserLocations(userAddresses) {
    const results = [];
    const errors = [];
    
    console.log(`Processing ${userAddresses.length} user addresses for location data...`);
    
    for (const { userId, address } of userAddresses) {
      try {
        const result = await this.createOrUpdateUserLocation(userId, address);
        results.push(result);
        
        // Add a small delay to respect API rate limits
        await this.delay(100);
      } catch (error) {
        console.error(`Failed to process location for user ${userId}:`, error.message);
        errors.push({
          userId,
          address,
          error: error.message
        });
      }
    }
    
    if (errors.length > 0) {
      console.warn(`Location processing completed with ${errors.length} errors:`, errors);
    }
    
    return {
      successful: results,
      failed: errors,
      totalProcessed: userAddresses.length
    };
  }
  
  /**
   * Update user's existing location with new coordinates if missing
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated location or null
   */
  async updateLocationWithCoordinates(userId) {
    try {
      const userLocation = await this.getUserLocation(userId);
      
      if (!userLocation) {
        console.log(`No location found for user ${userId}`);
        return null;
      }
      
      // If coordinates are already present, no need to update
      if (userLocation.latitude && userLocation.longitude) {
        return userLocation;
      }
      
      // Try to geocode the full address
      let coordinates = null;
      if (userLocation.full_address) {
        coordinates = await this.geocodeAddress(userLocation.full_address);
      }
      
      // If that fails, try postal code
      if (!coordinates && userLocation.postal_code) {
        coordinates = await this.geocodeAddress(userLocation.postal_code);
      }
      
      if (coordinates) {
        const [updatedLocation] = await knex('user_locations')
          .where('user_id', userId)
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            updated_at: knex.fn.now()
          })
          .returning('*');
        
        console.log(`Updated coordinates for user ${userId}: ${coordinates.lat}, ${coordinates.lng}`);
        return updatedLocation;
      } else {
        console.warn(`Could not find coordinates for user ${userId}`);
        return userLocation;
      }
    } catch (error) {
      console.error('Error updating location coordinates:', error);
      throw error;
    }
  }
  
  /**
   * Simple delay function to respect API rate limits
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get all users who need location data created
   * @returns {Promise<Array>} Array of users missing location data
   */
  async getUsersNeedingLocationData() {
    try {
      const users = await knex('users')
        .leftJoin('user_locations', 'users.id', 'user_locations.user_id')
        .where('users.role', 'referee')
        .whereNotNull('users.postal_code')
        .whereNull('user_locations.id')
        .select('users.id as userId', 'users.postal_code', 'users.location', 'users.name');
      
      return users.map(user => ({
        userId: user.userId,
        address: user.location || user.postal_code,
        name: user.name
      }));
    } catch (error) {
      console.error('Error finding users needing location data:', error);
      throw error;
    }
  }
}

module.exports = LocationDataService;
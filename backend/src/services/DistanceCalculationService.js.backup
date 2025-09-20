const knex = require('../config/database');
const LocationDataService = require('./LocationDataService');

/**
 * Service for calculating and managing distances between users and locations
 * Handles batch calculations, rate limiting, and error recovery
 */
class DistanceCalculationService {
  constructor() {
    this.locationDataService = new LocationDataService();
    // Rate limiting: OpenRouteService free tier allows 2000 requests/day
    this.rateLimitDelay = 1000; // 1 second between requests
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds between retries
  }
  
  /**
   * Calculate distance between a user and a location
   * @param {string} userId - User ID
   * @param {string} locationId - Location ID
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Distance calculation result
   */
  async calculateUserLocationDistance(userId, locationId, options = {}) {
    try {
      // Get user location data
      const userLocation = await this.locationDataService.getUserLocation(userId);
      if (!userLocation) {
        throw new Error(`No location data found for user ${userId}`);
      }
      
      if (!userLocation.latitude || !userLocation.longitude) {
        throw new Error(`User ${userId} location data missing coordinates`);
      }
      
      // Get game location data
      const gameLocation = await knex('locations')
        .where('id', locationId)
        .where('is_active', true)
        .first();
        
      if (!gameLocation) {
        throw new Error(`Location ${locationId} not found or inactive`);
      }
      
      if (!gameLocation.latitude || !gameLocation.longitude) {
        throw new Error(`Location ${locationId} missing coordinates`);
      }
      
      // Calculate distance using maps library
      const { calculateDistanceAndDriveTime } = require('../../lib/maps');
      
      const origin = {
        lat: parseFloat(userLocation.latitude),
        lng: parseFloat(userLocation.longitude)
      };
      
      const destination = {
        lat: parseFloat(gameLocation.latitude),
        lng: parseFloat(gameLocation.longitude)
      };
      
      console.log(`Calculating distance from user ${userId} to location ${locationId}...`);
      
      // Perform the distance calculation
      const distanceResult = await calculateDistanceAndDriveTime(origin, destination);
      
      if (!distanceResult) {
        throw new Error('Distance calculation failed - no route found');
      }
      
      // Prepare distance data for storage
      const distanceData = {
        user_id: userId,
        location_id: locationId,
        distance_meters: distanceResult.distanceValue,
        distance_text: distanceResult.distance,
        drive_time_seconds: distanceResult.durationValue,
        drive_time_text: distanceResult.duration,
        drive_time_minutes: Math.round(distanceResult.durationValue / 60),
        calculation_provider: 'openrouteservice',
        calculated_at: knex.fn.now(),
        route_data: JSON.stringify({
          origin,
          destination,
          calculatedAt: new Date().toISOString()
        }),
        calculation_successful: true,
        calculation_error: null,
        calculation_attempts: 1,
        last_calculation_attempt: knex.fn.now(),
        needs_recalculation: false
      };
      
      // Store or update the distance record
      const existingDistance = await knex('user_location_distances')
        .where('user_id', userId)
        .where('location_id', locationId)
        .first();
      
      let savedDistance;
      if (existingDistance) {
        [savedDistance] = await knex('user_location_distances')
          .where('user_id', userId)
          .where('location_id', locationId)
          .update({
            ...distanceData,
            calculation_attempts: existingDistance.calculation_attempts + 1,
            updated_at: knex.fn.now()
          })
          .returning('*');
      } else {
        [savedDistance] = await knex('user_location_distances')
          .insert(distanceData)
          .returning('*');
      }
      
      console.log(`Distance calculated: ${distanceResult.distance} (${distanceResult.duration})`);
      
      return savedDistance;
    } catch (error) {
      // Store failed calculation attempt
      await this.recordFailedCalculation(userId, locationId, error.message);
      console.error(`Distance calculation failed for user ${userId} to location ${locationId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Calculate distances for a user to all locations
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Batch calculation results
   */
  async calculateUserDistancesToAllLocations(userId) {
    try {
      console.log(`Calculating distances for user ${userId} to all locations...`);
      
      // Get all active locations
      const locations = await knex('locations')
        .where('is_active', true)
        .select('id', 'name');
      
      const results = [];
      const errors = [];
      
      for (const location of locations) {
        try {
          const result = await this.calculateUserLocationDistance(userId, location.id);
          results.push(result);
          
          // Rate limiting delay
          await this.delay(this.rateLimitDelay);
        } catch (error) {
          console.error(`Failed to calculate distance to ${location.name}:`, error.message);
          errors.push({
            locationId: location.id,
            locationName: location.name,
            error: error.message
          });
          
          // Still apply delay even on error to respect rate limits
          await this.delay(this.rateLimitDelay);
        }
      }
      
      console.log(`Distance calculation completed for user ${userId}: ${results.length} successful, ${errors.length} failed`);
      
      return {
        userId,
        successful: results,
        failed: errors,
        totalLocations: locations.length
      };
    } catch (error) {
      console.error(`Batch distance calculation failed for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate distances for all users to a specific location
   * @param {string} locationId - Location ID
   * @returns {Promise<Object>} Batch calculation results
   */
  async calculateAllUsersDistanceToLocation(locationId) {
    try {
      console.log(`Calculating distances for all users to location ${locationId}...`);
      
      // Get all users with location data
      const users = await knex('user_locations')
        .join('users', 'user_locations.user_id', 'users.id')
        .where('users.role', 'referee')
        .whereNotNull('user_locations.latitude')
        .whereNotNull('user_locations.longitude')
        .select('user_locations.user_id', 'users.name');
      
      const results = [];
      const errors = [];
      
      for (const user of users) {
        try {
          const result = await this.calculateUserLocationDistance(user.user_id, locationId);
          results.push(result);
          
          // Rate limiting delay
          await this.delay(this.rateLimitDelay);
        } catch (error) {
          console.error(`Failed to calculate distance for user ${user.name}:`, error.message);
          errors.push({
            userId: user.user_id,
            userName: user.name,
            error: error.message
          });
          
          // Rate limiting delay even on error
          await this.delay(this.rateLimitDelay);
        }
      }
      
      console.log(`Distance calculation completed for location ${locationId}: ${results.length} successful, ${errors.length} failed`);
      
      return {
        locationId,
        successful: results,
        failed: errors,
        totalUsers: users.length
      };
    } catch (error) {
      console.error(`Batch distance calculation failed for location ${locationId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get distances for a user to all locations, with optional filtering
   * @param {string} userId - User ID
   * @param {Object} filters - Filtering options
   * @returns {Promise<Array>} Distance records
   */
  async getUserDistances(userId, filters = {}) {
    try {
      let query = knex('user_location_distances')
        .join('locations', 'user_location_distances.location_id', 'locations.id')
        .where('user_location_distances.user_id', userId)
        .where('user_location_distances.calculation_successful', true)
        .where('locations.is_active', true);
      
      // Apply filters
      if (filters.maxDriveTimeMinutes) {
        query = query.where('user_location_distances.drive_time_minutes', '<=', filters.maxDriveTimeMinutes);
      }
      
      if (filters.maxDistanceMeters) {
        query = query.where('user_location_distances.distance_meters', '<=', filters.maxDistanceMeters);
      }
      
      if (filters.city) {
        query = query.where('locations.city', 'ilike', `%${filters.city}%`);
      }
      
      // Select relevant fields
      query = query.select(
        'user_location_distances.*',
        'locations.name as location_name',
        'locations.address as location_address',
        'locations.city as location_city'
      );
      
      // Order by drive time
      query = query.orderBy('user_location_distances.drive_time_minutes', 'asc');
      
      const distances = await query;
      
      return distances;
    } catch (error) {
      console.error(`Error fetching distances for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Record a failed calculation attempt
   * @param {string} userId - User ID
   * @param {string} locationId - Location ID
   * @param {string} errorMessage - Error message
   */
  async recordFailedCalculation(userId, locationId, errorMessage) {
    try {
      const existingRecord = await knex('user_location_distances')
        .where('user_id', userId)
        .where('location_id', locationId)
        .first();
      
      if (existingRecord) {
        await knex('user_location_distances')
          .where('user_id', userId)
          .where('location_id', locationId)
          .update({
            calculation_successful: false,
            calculation_error: errorMessage,
            calculation_attempts: existingRecord.calculation_attempts + 1,
            last_calculation_attempt: knex.fn.now(),
            needs_recalculation: true,
            updated_at: knex.fn.now()
          });
      } else {
        await knex('user_location_distances')
          .insert({
            user_id: userId,
            location_id: locationId,
            calculation_successful: false,
            calculation_error: errorMessage,
            calculation_attempts: 1,
            last_calculation_attempt: knex.fn.now(),
            needs_recalculation: true
          });
      }
    } catch (error) {
      console.error('Error recording failed calculation:', error);
    }
  }
  
  /**
   * Retry failed distance calculations
   * @param {number} maxRetries - Maximum number of records to retry
   * @returns {Promise<Object>} Retry results
   */
  async retryFailedCalculations(maxRetries = 10) {
    try {
      console.log(`Retrying failed distance calculations (max ${maxRetries})...`);
      
      const failedCalculations = await knex('user_location_distances')
        .where('calculation_successful', false)
        .where('needs_recalculation', true)
        .where('calculation_attempts', '<', this.maxRetries)
        .limit(maxRetries)
        .select('user_id', 'location_id', 'calculation_attempts');
      
      const results = [];
      const errors = [];
      
      for (const calc of failedCalculations) {
        try {
          const result = await this.calculateUserLocationDistance(calc.user_id, calc.location_id);
          results.push(result);
          
          // Rate limiting delay
          await this.delay(this.rateLimitDelay);
        } catch (error) {
          errors.push({
            userId: calc.user_id,
            locationId: calc.location_id,
            attempts: calc.calculation_attempts,
            error: error.message
          });
          
          // Rate limiting delay even on error
          await this.delay(this.rateLimitDelay);
        }
      }
      
      console.log(`Retry completed: ${results.length} successful, ${errors.length} still failed`);
      
      return {
        successful: results,
        failed: errors,
        totalRetried: failedCalculations.length
      };
    } catch (error) {
      console.error('Error retrying failed calculations:', error);
      throw error;
    }
  }
  
  /**
   * Get calculation statistics
   * @returns {Promise<Object>} Calculation stats
   */
  async getCalculationStats() {
    try {
      const stats = await knex('user_location_distances')
        .select(
          knex.raw('COUNT(*) as total_calculations'),
          knex.raw('COUNT(*) FILTER (WHERE calculation_successful = true) as successful_calculations'),
          knex.raw('COUNT(*) FILTER (WHERE calculation_successful = false) as failed_calculations'),
          knex.raw('COUNT(*) FILTER (WHERE needs_recalculation = true) as need_recalculation'),
          knex.raw('AVG(drive_time_minutes) FILTER (WHERE calculation_successful = true) as avg_drive_time_minutes'),
          knex.raw('AVG(distance_meters) FILTER (WHERE calculation_successful = true) as avg_distance_meters')
        )
        .first();
      
      return {
        totalCalculations: parseInt(stats.total_calculations),
        successfulCalculations: parseInt(stats.successful_calculations),
        failedCalculations: parseInt(stats.failed_calculations),
        needRecalculation: parseInt(stats.need_recalculation),
        averageDriveTimeMinutes: parseFloat(stats.avg_drive_time_minutes) || 0,
        averageDistanceMeters: parseFloat(stats.avg_distance_meters) || 0
      };
    } catch (error) {
      console.error('Error getting calculation stats:', error);
      throw error;
    }
  }
  
  /**
   * Simple delay function for rate limiting
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Initialize distance calculations for all existing users and locations
   * @returns {Promise<Object>} Initialization results
   */
  async initializeAllDistances() {
    try {
      console.log('Initializing distance calculations for all users and locations...');
      
      const users = await knex('user_locations')
        .join('users', 'user_locations.user_id', 'users.id')
        .where('users.role', 'referee')
        .whereNotNull('user_locations.latitude')
        .whereNotNull('user_locations.longitude')
        .select('user_locations.user_id', 'users.name');
      
      const locations = await knex('locations')
        .where('is_active', true)
        .select('id', 'name');
      
      console.log(`Found ${users.length} users and ${locations.length} locations`);
      console.log(`Total distance calculations needed: ${users.length * locations.length}`);
      
      // Calculate rate limiting requirements
      const totalCalculations = users.length * locations.length;
      const estimatedTimeMinutes = Math.ceil((totalCalculations * this.rateLimitDelay) / 60000);
      
      console.log(`Estimated completion time: ${estimatedTimeMinutes} minutes`);
      
      const allResults = [];
      const allErrors = [];
      
      for (const user of users) {
        try {
          const userResult = await this.calculateUserDistancesToAllLocations(user.user_id);
          allResults.push(userResult);
          
          console.log(`Progress: Completed ${allResults.length}/${users.length} users`);
        } catch (error) {
          console.error(`Failed batch calculation for user ${user.name}:`, error.message);
          allErrors.push({
            userId: user.user_id,
            userName: user.name,
            error: error.message
          });
        }
      }
      
      const totalSuccessful = allResults.reduce((sum, result) => sum + result.successful.length, 0);
      const totalFailed = allResults.reduce((sum, result) => sum + result.failed.length, 0) + allErrors.length;
      
      console.log(`Distance initialization completed: ${totalSuccessful} successful, ${totalFailed} failed`);
      
      return {
        totalUsers: users.length,
        totalLocations: locations.length,
        totalCalculations: totalCalculations,
        successfulCalculations: totalSuccessful,
        failedCalculations: totalFailed,
        userResults: allResults,
        userErrors: allErrors
      };
    } catch (error) {
      console.error('Error initializing distances:', error);
      throw error;
    }
  }
}

module.exports = DistanceCalculationService;
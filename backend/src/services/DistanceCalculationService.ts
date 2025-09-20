/**
 * DistanceCalculationService - Service for calculating and managing distances between users and locations
 *
 * Handles batch calculations, rate limiting, error recovery, and mathematical operations
 * with comprehensive type safety and error handling. Integrates with external mapping
 * services and provides statistical analysis of distance calculations.
 */

import { Knex } from 'knex';
import LocationDataService from './LocationDataService';

// Core interfaces for distance calculation
interface Coordinates {
  lat: number;
  lng: number;
}

interface DistanceCalculationResult {
  distance: string;
  distanceValue: number;
  duration: string;
  durationValue: number;
}

interface UserLocationData {
  user_id: string;
  latitude: number;
  longitude: number;
  full_address: string;
}

interface GameLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  address?: string;
  city?: string;
}

interface DistanceRecord {
  id?: number;
  user_id: string;
  location_id: string;
  distance_meters: number;
  distance_text: string;
  drive_time_seconds: number;
  drive_time_text: string;
  drive_time_minutes: number;
  calculation_provider: string;
  calculated_at: Date | string;
  route_data: string;
  calculation_successful: boolean;
  calculation_error?: string | null;
  calculation_attempts: number;
  last_calculation_attempt: Date | string;
  needs_recalculation: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface Location {
  id: string;
  name: string;
}

interface User {
  user_id: string;
  name: string;
}

interface BatchCalculationResult {
  userId?: string;
  locationId?: string;
  successful: DistanceRecord[];
  failed: Array<{
    userId?: string;
    userName?: string;
    locationId?: string;
    locationName?: string;
    error: string;
  }>;
  totalLocations?: number;
  totalUsers?: number;
}

interface DistanceFilters {
  maxDriveTimeMinutes?: number;
  maxDistanceMeters?: number;
  city?: string;
}

interface DistanceWithLocation extends DistanceRecord {
  location_name: string;
  location_address?: string;
  location_city?: string;
}

interface CalculationStats {
  totalCalculations: number;
  successfulCalculations: number;
  failedCalculations: number;
  needRecalculation: number;
  averageDriveTimeMinutes: number;
  averageDistanceMeters: number;
}

interface RetryResult {
  successful: DistanceRecord[];
  failed: Array<{
    userId: string;
    locationId: string;
    attempts: number;
    error: string;
  }>;
  totalRetried: number;
}

interface InitializationResult {
  totalUsers: number;
  totalLocations: number;
  totalCalculations: number;
  successfulCalculations: number;
  failedCalculations: number;
  userResults: BatchCalculationResult[];
  userErrors: Array<{
    userId: string;
    userName: string;
    error: string;
  }>;
}

class DistanceCalculationService {
  private db: Knex;
  private locationDataService: LocationDataService;
  public rateLimitDelay: number;
  public maxRetries: number;
  public retryDelay: number;

  /**
   * Constructor for DistanceCalculationService
   * @param db - Optional Knex database instance for dependency injection
   */
  constructor(db?: Knex) {
    // Use dependency injection if provided, otherwise import default
    if (db) {
      this.db = db;
      this.locationDataService = new LocationDataService(db);
    } else {
      const database = require('../config/database');
      this.db = database;
      this.locationDataService = new LocationDataService();
    }

    // Rate limiting: OpenRouteService free tier allows 2000 requests/day
    this.rateLimitDelay = 1000; // 1 second between requests
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds between retries
  }

  /**
   * Calculate distance between a user and a location
   * @param userId - User ID
   * @param locationId - Location ID
   * @param options - Calculation options
   * @returns Distance calculation result
   */
  async calculateUserLocationDistance(
    userId: string,
    locationId: string,
    options: Record<string, any> = {}
  ): Promise<DistanceRecord> {
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
      const gameLocation = await this.db('locations')
        .where('id', locationId)
        .where('is_active', true)
        .first() as GameLocation | undefined;

      if (!gameLocation) {
        throw new Error(`Location ${locationId} not found or inactive`);
      }

      if (!gameLocation.latitude || !gameLocation.longitude) {
        throw new Error(`Location ${locationId} missing coordinates`);
      }

      // Calculate distance using maps library
      const { calculateDistanceAndDriveTime } = require('../../../../lib/maps');

      const origin: Coordinates = {
        lat: parseFloat(String(userLocation.latitude)),
        lng: parseFloat(String(userLocation.longitude))
      };

      const destination: Coordinates = {
        lat: parseFloat(String(gameLocation.latitude)),
        lng: parseFloat(String(gameLocation.longitude))
      };

      console.log(`Calculating distance from user ${userId} to location ${locationId}...`);

      // Perform the distance calculation
      const distanceResult: DistanceCalculationResult = await calculateDistanceAndDriveTime(origin, destination);

      if (!distanceResult) {
        throw new Error('Distance calculation failed - no route found');
      }

      // Prepare distance data for storage
      const distanceData: Partial<DistanceRecord> = {
        user_id: userId,
        location_id: locationId,
        distance_meters: distanceResult.distanceValue,
        distance_text: distanceResult.distance,
        drive_time_seconds: distanceResult.durationValue,
        drive_time_text: distanceResult.duration,
        drive_time_minutes: Math.round(distanceResult.durationValue / 60),
        calculation_provider: 'openrouteservice',
        calculated_at: this.db.fn.now(),
        route_data: JSON.stringify({
          origin,
          destination,
          calculatedAt: new Date().toISOString()
        }),
        calculation_successful: true,
        calculation_error: null,
        calculation_attempts: 1,
        last_calculation_attempt: this.db.fn.now(),
        needs_recalculation: false
      };

      // Store or update the distance record
      const existingDistance = await this.db('user_location_distances')
        .where('user_id', userId)
        .where('location_id', locationId)
        .first();

      let savedDistance: DistanceRecord;
      if (existingDistance) {
        [savedDistance] = await this.db('user_location_distances')
          .where('user_id', userId)
          .where('location_id', locationId)
          .update({
            ...distanceData,
            calculation_attempts: existingDistance.calculation_attempts + 1,
            updated_at: this.db.fn.now()
          })
          .returning('*') as DistanceRecord[];
      } else {
        [savedDistance] = await this.db('user_location_distances')
          .insert(distanceData)
          .returning('*') as DistanceRecord[];
      }

      console.log(`Distance calculated: ${distanceResult.distance} (${distanceResult.duration})`);

      return savedDistance;
    } catch (error: any) {
      // Store failed calculation attempt
      await this.recordFailedCalculation(userId, locationId, error.message);
      console.error(`Distance calculation failed for user ${userId} to location ${locationId}:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate distances for a user to all locations
   * @param userId - User ID
   * @returns Batch calculation results
   */
  async calculateUserDistancesToAllLocations(userId: string): Promise<BatchCalculationResult> {
    try {
      console.log(`Calculating distances for user ${userId} to all locations...`);

      // Get all active locations
      const locations = await this.db('locations')
        .where('is_active', true)
        .select('id', 'name') as Location[];

      const results: DistanceRecord[] = [];
      const errors: Array<{ locationId: string; locationName: string; error: string }> = [];

      for (const location of locations) {
        try {
          const result = await this.calculateUserLocationDistance(userId, location.id);
          results.push(result);

          // Rate limiting delay
          await this.delay(this.rateLimitDelay);
        } catch (error: any) {
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
    } catch (error: any) {
      console.error(`Batch distance calculation failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate distances for all users to a specific location
   * @param locationId - Location ID
   * @returns Batch calculation results
   */
  async calculateAllUsersDistanceToLocation(locationId: string): Promise<BatchCalculationResult> {
    try {
      console.log(`Calculating distances for all users to location ${locationId}...`);

      // Get all users with location data
      const users = await this.db('user_locations')
        .join('users', 'user_locations.user_id', 'users.id')
        .where('users.role', 'referee')
        .whereNotNull('user_locations.latitude')
        .whereNotNull('user_locations.longitude')
        .select('user_locations.user_id', 'users.name') as User[];

      const results: DistanceRecord[] = [];
      const errors: Array<{ userId: string; userName: string; error: string }> = [];

      for (const user of users) {
        try {
          const result = await this.calculateUserLocationDistance(user.user_id, locationId);
          results.push(result);

          // Rate limiting delay
          await this.delay(this.rateLimitDelay);
        } catch (error: any) {
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
    } catch (error: any) {
      console.error(`Batch distance calculation failed for location ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Get distances for a user to all locations, with optional filtering
   * @param userId - User ID
   * @param filters - Filtering options
   * @returns Distance records
   */
  async getUserDistances(userId: string, filters: DistanceFilters = {}): Promise<DistanceWithLocation[]> {
    try {
      let query = this.db('user_location_distances')
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

      const distances = await query as DistanceWithLocation[];

      return distances;
    } catch (error: any) {
      console.error(`Error fetching distances for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Record a failed calculation attempt
   * @param userId - User ID
   * @param locationId - Location ID
   * @param errorMessage - Error message
   */
  async recordFailedCalculation(userId: string, locationId: string, errorMessage: string): Promise<void> {
    try {
      const existingRecord = await this.db('user_location_distances')
        .where('user_id', userId)
        .where('location_id', locationId)
        .first();

      if (existingRecord) {
        await this.db('user_location_distances')
          .where('user_id', userId)
          .where('location_id', locationId)
          .update({
            calculation_successful: false,
            calculation_error: errorMessage,
            calculation_attempts: existingRecord.calculation_attempts + 1,
            last_calculation_attempt: this.db.fn.now(),
            needs_recalculation: true,
            updated_at: this.db.fn.now()
          });
      } else {
        await this.db('user_location_distances')
          .insert({
            user_id: userId,
            location_id: locationId,
            calculation_successful: false,
            calculation_error: errorMessage,
            calculation_attempts: 1,
            last_calculation_attempt: this.db.fn.now(),
            needs_recalculation: true
          });
      }
    } catch (error: any) {
      console.error('Error recording failed calculation:', error);
    }
  }

  /**
   * Retry failed distance calculations
   * @param maxRetries - Maximum number of records to retry
   * @returns Retry results
   */
  async retryFailedCalculations(maxRetries: number = 10): Promise<RetryResult> {
    try {
      console.log(`Retrying failed distance calculations (max ${maxRetries})...`);

      const failedCalculations = await this.db('user_location_distances')
        .where('calculation_successful', false)
        .where('needs_recalculation', true)
        .where('calculation_attempts', '<', this.maxRetries)
        .limit(maxRetries)
        .select('user_id', 'location_id', 'calculation_attempts') as Array<{
          user_id: string;
          location_id: string;
          calculation_attempts: number;
        }>;

      const results: DistanceRecord[] = [];
      const errors: Array<{
        userId: string;
        locationId: string;
        attempts: number;
        error: string;
      }> = [];

      for (const calc of failedCalculations) {
        try {
          const result = await this.calculateUserLocationDistance(calc.user_id, calc.location_id);
          results.push(result);

          // Rate limiting delay
          await this.delay(this.rateLimitDelay);
        } catch (error: any) {
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
    } catch (error: any) {
      console.error('Error retrying failed calculations:', error);
      throw error;
    }
  }

  /**
   * Get calculation statistics
   * @returns Calculation stats
   */
  async getCalculationStats(): Promise<CalculationStats> {
    try {
      const stats = await this.db('user_location_distances')
        .select(
          this.db.raw('COUNT(*) as total_calculations'),
          this.db.raw('COUNT(*) FILTER (WHERE calculation_successful = true) as successful_calculations'),
          this.db.raw('COUNT(*) FILTER (WHERE calculation_successful = false) as failed_calculations'),
          this.db.raw('COUNT(*) FILTER (WHERE needs_recalculation = true) as need_recalculation'),
          this.db.raw('AVG(drive_time_minutes) FILTER (WHERE calculation_successful = true) as avg_drive_time_minutes'),
          this.db.raw('AVG(distance_meters) FILTER (WHERE calculation_successful = true) as avg_distance_meters')
        )
        .first() as {
          total_calculations: string;
          successful_calculations: string;
          failed_calculations: string;
          need_recalculation: string;
          avg_drive_time_minutes: string | null;
          avg_distance_meters: string | null;
        };

      return {
        totalCalculations: parseInt(stats.total_calculations),
        successfulCalculations: parseInt(stats.successful_calculations),
        failedCalculations: parseInt(stats.failed_calculations),
        needRecalculation: parseInt(stats.need_recalculation),
        averageDriveTimeMinutes: parseFloat(stats.avg_drive_time_minutes || '0') || 0,
        averageDistanceMeters: parseFloat(stats.avg_distance_meters || '0') || 0
      };
    } catch (error: any) {
      console.error('Error getting calculation stats:', error);
      throw error;
    }
  }

  /**
   * Simple delay function for rate limiting
   * @param ms - Milliseconds to delay
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize distance calculations for all existing users and locations
   * @returns Initialization results
   */
  async initializeAllDistances(): Promise<InitializationResult> {
    try {
      console.log('Initializing distance calculations for all users and locations...');

      const users = await this.db('user_locations')
        .join('users', 'user_locations.user_id', 'users.id')
        .where('users.role', 'referee')
        .whereNotNull('user_locations.latitude')
        .whereNotNull('user_locations.longitude')
        .select('user_locations.user_id', 'users.name') as User[];

      const locations = await this.db('locations')
        .where('is_active', true)
        .select('id', 'name') as Location[];

      console.log(`Found ${users.length} users and ${locations.length} locations`);
      console.log(`Total distance calculations needed: ${users.length * locations.length}`);

      // Calculate rate limiting requirements
      const totalCalculations = users.length * locations.length;
      const estimatedTimeMinutes = Math.ceil((totalCalculations * this.rateLimitDelay) / 60000);

      console.log(`Estimated completion time: ${estimatedTimeMinutes} minutes`);

      const allResults: BatchCalculationResult[] = [];
      const allErrors: Array<{ userId: string; userName: string; error: string }> = [];

      for (const user of users) {
        try {
          const userResult = await this.calculateUserDistancesToAllLocations(user.user_id);
          allResults.push(userResult);

          console.log(`Progress: Completed ${allResults.length}/${users.length} users`);
        } catch (error: any) {
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
    } catch (error: any) {
      console.error('Error initializing distances:', error);
      throw error;
    }
  }
}

export default DistanceCalculationService;
/**
 * LocationDataService - Service for managing comprehensive user location data
 *
 * Handles geocoding, address parsing, and location data storage with comprehensive
 * type safety and error handling. Integrates with external geocoding services
 * and provides batch operations for bulk location data processing.
 */

import { Knex } from 'knex';

// Core interfaces for location data management
interface AddressComponents {
  displayName?: string;
  streetNumber?: string;
  streetName?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  confidence?: number;
  type?: string;
  coordinates?: Coordinates;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface UserLocationData {
  id?: number;
  user_id: string;
  full_address?: string;
  street_number?: string | null;
  street_name?: string | null;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  geocoding_provider?: string;
  geocoding_confidence?: number;
  address_type?: string;
  raw_geocoding_data?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface UserAddressInput {
  userId: string;
  address: string;
}

interface BatchProcessingResult {
  successful: UserLocationData[];
  failed: Array<{
    userId: string;
    address: string;
    error: string;
  }>;
  totalProcessed: number;
}

interface UserNeedingLocation {
  userId: string;
  address: string;
  name: string;
}

interface AddressService {
  searchAddresses(address: string): Promise<AddressComponents[]>;
}

interface CreateOrUpdateOptions {
  forceUpdate?: boolean;
  skipGeocoding?: boolean;
}

class LocationDataService {
  private db: Knex;

  /**
   * Constructor for LocationDataService
   * @param db - Knex database instance
   */
  constructor(db?: Knex) {
    // Use dependency injection if provided, otherwise import default
    if (db) {
      this.db = db;
    } else {
      const database = require('../config/database');
      this.db = database;
    }
  }

  /**
   * Create or update comprehensive location data for a user
   * @param userId - User ID
   * @param address - Address string (can be postal code or full address)
   * @param options - Additional options
   * @returns User location data
   */
  async createOrUpdateUserLocation(
    userId: string,
    address: string,
    options: CreateOrUpdateOptions = {}
  ): Promise<UserLocationData> {
    try {
      // Use the existing address service to get comprehensive location data
      const { createAddressService } = require('../../../../lib/address-service');
      const addressService: AddressService = createAddressService();

      // Search for the address to get detailed components
      const suggestions = await addressService.searchAddresses(address);

      if (!suggestions || suggestions.length === 0) {
        throw new Error(`No location data found for address: ${address}`);
      }

      // Take the first (most relevant) suggestion
      const locationData = suggestions[0];

      // If coordinates are not available, try to geocode
      let coordinates = locationData.coordinates;
      if (!coordinates && !options.skipGeocoding) {
        coordinates = await this.geocodeAddress(address);
      }

      // Prepare user location data
      const userLocationData: Partial<UserLocationData> = {
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
      const existingLocation = await this.db('user_locations')
        .where('user_id', userId)
        .first();

      let userLocation: UserLocationData;
      if (existingLocation) {
        // Update existing location
        [userLocation] = await this.db('user_locations')
          .where('user_id', userId)
          .update({
            ...userLocationData,
            updated_at: this.db.fn.now()
          })
          .returning('*') as UserLocationData[];
      } else {
        // Create new location
        [userLocation] = await this.db('user_locations')
          .insert(userLocationData)
          .returning('*') as UserLocationData[];
      }

      console.log(`Location data ${existingLocation ? 'updated' : 'created'} for user ${userId}:`, {
        address: userLocation.full_address,
        coordinates: coordinates ? `${coordinates.lat}, ${coordinates.lng}` : 'Not found',
        provider: userLocation.geocoding_provider
      });

      return userLocation;
    } catch (error: any) {
      console.error('Error creating/updating user location:', error);
      throw new Error(`Failed to process location data for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Get user location data
   * @param userId - User ID
   * @returns User location data or null if not found
   */
  async getUserLocation(userId: string): Promise<UserLocationData | null> {
    try {
      const userLocation = await this.db('user_locations')
        .where('user_id', userId)
        .first() as UserLocationData | undefined;

      return userLocation || null;
    } catch (error: any) {
      console.error('Error fetching user location:', error);
      throw new Error(`Failed to fetch location data for user ${userId}`);
    }
  }

  /**
   * Geocode an address using the maps library
   * @param address - Address to geocode
   * @returns Coordinates {lat, lng} or null
   */
  async geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
      const { geocodeAddress } = require('../../../../lib/maps');
      return await geocodeAddress(address);
    } catch (error: any) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Extract postal code from address string
   * @param address - Address string
   * @returns Postal code or empty string
   */
  extractPostalCode(address: string): string {
    // Canadian postal code pattern: A1A 1A1 or A1A1A1
    const postalCodeRegex = /[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d/;
    const match = address.match(postalCodeRegex);
    return match ? match[0].toUpperCase().replace(/\s/g, ' ') : '';
  }

  /**
   * Determine which geocoding provider is being used
   * @returns Provider name
   */
  determineProvider(): string {
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
   * @param userAddresses - Array of {userId, address} objects
   * @returns Array of created/updated location records
   */
  async batchCreateUserLocations(userAddresses: UserAddressInput[]): Promise<BatchProcessingResult> {
    const results: UserLocationData[] = [];
    const errors: Array<{ userId: string; address: string; error: string }> = [];

    console.log(`Processing ${userAddresses.length} user addresses for location data...`);

    for (const { userId, address } of userAddresses) {
      try {
        const result = await this.createOrUpdateUserLocation(userId, address);
        results.push(result);

        // Add a small delay to respect API rate limits
        await this.delay(100);
      } catch (error: any) {
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
   * @param userId - User ID
   * @returns Updated location or null
   */
  async updateLocationWithCoordinates(userId: string): Promise<UserLocationData | null> {
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
      let coordinates: Coordinates | null = null;
      if (userLocation.full_address) {
        coordinates = await this.geocodeAddress(userLocation.full_address);
      }

      // If that fails, try postal code
      if (!coordinates && userLocation.postal_code) {
        coordinates = await this.geocodeAddress(userLocation.postal_code);
      }

      if (coordinates) {
        const [updatedLocation] = await this.db('user_locations')
          .where('user_id', userId)
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            updated_at: this.db.fn.now()
          })
          .returning('*') as UserLocationData[];

        console.log(`Updated coordinates for user ${userId}: ${coordinates.lat}, ${coordinates.lng}`);
        return updatedLocation;
      } else {
        console.warn(`Could not find coordinates for user ${userId}`);
        return userLocation;
      }
    } catch (error: any) {
      console.error('Error updating location coordinates:', error);
      throw error;
    }
  }

  /**
   * Simple delay function to respect API rate limits
   * @param ms - Milliseconds to delay
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all users who need location data created
   * @returns Array of users missing location data
   */
  async getUsersNeedingLocationData(): Promise<UserNeedingLocation[]> {
    try {
      const users = await this.db('users')
        .leftJoin('user_locations', 'users.id', 'user_locations.user_id')
        .where('users.role', 'referee')
        .whereNotNull('users.postal_code')
        .whereNull('user_locations.id')
        .select('users.id as userId', 'users.postal_code', 'users.location', 'users.name') as Array<{
          userId: string;
          postal_code: string;
          location?: string;
          name: string;
        }>;

      return users.map(user => ({
        userId: user.userId,
        address: user.location || user.postal_code,
        name: user.name
      }));
    } catch (error: any) {
      console.error('Error finding users needing location data:', error);
      throw error;
    }
  }
}

export default LocationDataService;
# Location Data Storage and Distance Calculation System

This document describes the comprehensive location data storage and distance calculation system implemented for the Sports Management App.

## Overview

The system provides:
- **User Location Data Storage**: Comprehensive location information for all users
- **Distance Calculation**: Automated calculation of drive times between users and game locations
- **API Integration**: Uses OpenRouteService for routing and multiple geocoding providers
- **Performance Optimization**: Efficient database design with proper indexing
- **Background Processing**: Non-blocking distance calculations
- **Management Tools**: Admin endpoints and CLI utilities for system management

## Database Schema

### user_locations Table
Stores comprehensive location data for users:
- `user_id` - Foreign key to users table
- `full_address` - Complete formatted address
- `street_number`, `street_name` - Address components
- `city`, `province`, `postal_code`, `country` - Geographic components
- `latitude`, `longitude` - Coordinates for distance calculations
- `geocoding_provider` - Which service was used (google/mapbox/nominatim)
- `geocoding_confidence` - Confidence score of the geocoding result
- `raw_geocoding_data` - Full API response for debugging

### user_location_distances Table
Stores calculated distances between users and locations:
- `user_id`, `location_id` - User-location pair
- `distance_meters`, `distance_text` - Distance information
- `drive_time_seconds`, `drive_time_text`, `drive_time_minutes` - Drive time data
- `calculation_provider` - API service used for calculation
- `calculated_at` - When the calculation was performed
- `calculation_successful` - Success/failure status
- `needs_recalculation` - Flag for failed calculations

## Services

### LocationDataService
Handles user location data creation and management:

```javascript
const service = new LocationDataService();

// Create/update user location data
await service.createOrUpdateUserLocation(userId, 'T2P 1M1, Calgary, AB');

// Get user location
const location = await service.getUserLocation(userId);

// Batch process multiple users
await service.batchCreateUserLocations([
  { userId: 'user1', address: 'Calgary, AB' },
  { userId: 'user2', address: 'Edmonton, AB' }
]);
```

### DistanceCalculationService
Handles distance calculations between users and locations:

```javascript
const service = new DistanceCalculationService();

// Calculate distance for one user to one location
await service.calculateUserLocationDistance(userId, locationId);

// Calculate distances for one user to all locations
await service.calculateUserDistancesToAllLocations(userId);

// Get user's distances with filters
const distances = await service.getUserDistances(userId, {
  maxDriveTimeMinutes: 30,
  maxDistanceKm: 50,
  city: 'Calgary'
});
```

## API Endpoints

### User Endpoints
- `GET /api/locations/distances` - Get distances to all locations for current user
- `GET /api/locations/:locationId/distance` - Get distance to specific location

### Admin Endpoints
- `GET /api/locations/admin/distance-stats` - System statistics
- `POST /api/locations/admin/calculate-user-distances/:userId` - Trigger calculations for user
- `POST /api/locations/admin/calculate-location-distances/:locationId` - Trigger calculations for location
- `POST /api/locations/admin/retry-failed-calculations` - Retry failed calculations
- `POST /api/locations/admin/initialize-all-distances` - Initialize entire system

## Management Tools

### CLI Manager
Use the command-line tool for system management:

```bash
cd backend/src/utils
node location-data-manager.js report           # System status report
node location-data-manager.js init-users       # Initialize user location data
node location-data-manager.js init-distances   # Initialize distance calculations
node location-data-manager.js retry-failed     # Retry failed calculations
node location-data-manager.js full-init        # Complete system initialization
```

### Environment Variables
```bash
AUTO_CONFIRM=true           # Skip confirmation prompts
FORCE_INITIALIZE=true       # Force initialization without prompts
```

## Integration Points

### User Registration
When a new user registers with a postal code:
1. User account is created immediately
2. Location data is fetched asynchronously in background
3. Distance calculations are triggered after location data is created

### Location Creation
When a new location is created:
1. Location is saved to database immediately
2. Distance calculations for all users are triggered in background
3. Results are logged for monitoring

## Rate Limiting and API Usage

### OpenRouteService (Primary)
- **Free Tier**: 2000 requests/day
- **Rate Limiting**: 1 second between requests
- **Usage**: Distance and drive time calculations

### Geocoding Providers
1. **Google Places API** (if API key available)
2. **Mapbox** (if token available)  
3. **Nominatim** (free fallback)

## Performance Considerations

### Database Indexes
- Primary lookups: `user_id`, `location_id`
- Filtering: `drive_time_minutes`, `distance_meters`
- Status tracking: `calculation_successful`, `needs_recalculation`

### Background Processing
- All distance calculations run asynchronously
- User registration/location creation never blocked by calculations
- Failed calculations are retried automatically

### Caching Strategy
- Distance calculations are cached in database
- Recalculation only triggered when:
  - User location changes
  - Location coordinates change
  - Previous calculation failed

## Monitoring and Maintenance

### System Health
Monitor these metrics:
- Number of users with location data
- Distance calculation success rate
- API usage and rate limiting
- Failed calculations requiring retry

### Maintenance Tasks
- **Daily**: Check for failed calculations and retry
- **Weekly**: Verify system statistics and performance
- **Monthly**: Review API usage and consider upgrades if needed

### Troubleshooting
1. **Users without location data**: Run `init-users` command
2. **Missing distance calculations**: Run `init-distances` command  
3. **High failure rate**: Check API keys and network connectivity
4. **Performance issues**: Review database indexes and query performance

## Security Considerations

- All API endpoints require authentication
- Admin endpoints require admin role
- Rate limiting prevents API abuse
- Input validation on all address inputs
- Sensitive location data is properly protected

## Future Enhancements

- **Real-time Traffic**: Integrate traffic data for more accurate drive times
- **Route Optimization**: Consider traffic patterns and road conditions
- **Bulk Operations**: Optimize for large-scale batch processing
- **Caching Layer**: Add Redis for frequently accessed distance data
- **Webhooks**: Real-time notifications for calculation completion

## Error Handling

The system includes comprehensive error handling:
- Graceful fallbacks for API failures
- Automatic retry logic for transient errors
- Detailed logging for debugging
- Database transaction safety
- Input validation and sanitization

## Testing

Unit tests are included for core services:
```bash
npm test LocationDataService.test.js
```

Tests cover:
- Location data creation and retrieval
- Address parsing and validation
- Error handling for invalid inputs
- Database operations and cleanup
export interface Location {
  lat: number
  lng: number
}

export interface DistanceResult {
  distance: string
  duration: string
  distanceValue: number // in meters
  durationValue: number // in seconds
}

export interface MapsConfig {
  apiKey?: string // Optional for free services
}

/**
 * Calculate distance and drive time between two locations using OpenRouteService (free)
 */
export async function calculateDistanceAndDriveTime(
  origin: string | Location,
  destination: string | Location,
  apiKey?: string
): Promise<DistanceResult | null> {
  try {
    // First, ensure we have coordinates for both locations
    let originCoords: Location
    let destCoords: Location
    
    if (typeof origin === 'string') {
      const coords = await geocodeAddress(origin)
      if (!coords) throw new Error('Could not geocode origin address')
      originCoords = coords
    } else {
      originCoords = origin
    }
    
    if (typeof destination === 'string') {
      const coords = await geocodeAddress(destination)
      if (!coords) throw new Error('Could not geocode destination address')
      destCoords = coords
    } else {
      destCoords = destination
    }
    
    // Use OpenRouteService for routing (free tier: 2000 requests/day)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (apiKey) {
      headers['Authorization'] = apiKey
    }
    
    const body = {
      coordinates: [[originCoords.lng, originCoords.lat], [destCoords.lng, destCoords.lat]],
      units: 'km'
    }
    
    const response = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.routes?.length) {
      throw new Error('No route found between locations')
    }
    
    const route = data.routes[0]
    const summary = route.summary
    
    // Convert distance from km to meters and format
    const distanceKm = summary.distance
    const distanceMeters = Math.round(distanceKm * 1000)
    const distanceText = distanceKm >= 1 
      ? `${distanceKm.toFixed(1)} km`
      : `${distanceMeters} m`
    
    // Convert duration from seconds to readable format
    const durationSeconds = Math.round(summary.duration)
    const durationText = formatDurationFromSeconds(durationSeconds)
    
    return {
      distance: distanceText,
      duration: durationText,
      distanceValue: distanceMeters,
      durationValue: durationSeconds
    }
  } catch (error) {
    console.error('Error calculating distance:', error)
    return null
  }
}

/**
 * Geocode an address to get latitude and longitude coordinates using Nominatim (free)
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Sports-Management-App/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data?.length) {
      throw new Error('Address not found')
    }
    
    const result = data[0]
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    }
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

/**
 * Convert seconds to human readable duration
 */
function formatDurationFromSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

/**
 * Generate a Google Maps URL for navigation from one location to another
 */
export function generateGoogleMapsURL(
  destination: string | Location,
  origin?: string | Location
): string {
  const baseURL = 'https://www.google.com/maps'
  
  if (typeof destination === 'string') {
    const params = new URLSearchParams({
      q: destination
    })
    
    if (origin) {
      if (typeof origin === 'string') {
        params.set('saddr', origin)
      } else {
        params.set('saddr', `${origin.lat},${origin.lng}`)
      }
      params.set('daddr', destination)
      return `${baseURL}/dir/?${params.toString()}`
    }
    
    return `${baseURL}/search/?${params.toString()}`
  } else {
    const params = new URLSearchParams({
      q: `${destination.lat},${destination.lng}`
    })
    
    if (origin) {
      if (typeof origin === 'string') {
        params.set('saddr', origin)
      } else {
        params.set('saddr', `${origin.lat},${origin.lng}`)
      }
      params.set('daddr', `${destination.lat},${destination.lng}`)
      return `${baseURL}/dir/?${params.toString()}`
    }
    
    return `${baseURL}/search/?${params.toString()}`
  }
}

/**
 * Format drive time for display (e.g., "1 hour 23 mins" -> "1h 23m")
 */
export function formatDriveTime(durationText: string): string {
  return durationText
    .replace(/\b(\d+)\s*hour?s?\b/gi, '$1h')
    .replace(/\b(\d+)\s*min(?:ute)?s?\b/gi, '$1m')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Get user's current location using browser geolocation API
 */
export function getCurrentLocation(): Promise<Location | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        console.error('Error getting current location:', error)
        resolve(null)
      }
    )
  })
}

/**
 * Build full address string from location components
 */
export function buildFullAddress(
  address: string,
  city: string,
  province?: string,
  postalCode?: string
): string {
  const parts = [address, city]
  if (province) parts.push(province)
  if (postalCode) parts.push(postalCode)
  return parts.join(', ')
}
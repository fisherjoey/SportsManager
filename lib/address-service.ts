export interface AddressSuggestion {
  id: string
  displayName: string
  streetNumber?: string
  streetName?: string
  city: string
  province: string
  postalCode?: string
  country: string
  coordinates?: {
    lat: number
    lng: number
  }
  confidence?: number
  type?: string // e.g., 'establishment', 'street_address', 'route'
}

export interface AddressServiceConfig {
  provider: 'google' | 'mapbox' | 'nominatim'
  apiKey?: string
  region?: string
  limit?: number
}

export class AddressService {
  private config: AddressServiceConfig

  constructor(config: AddressServiceConfig) {
    this.config = {
      region: 'ca',
      limit: 5,
      ...config
    }
  }

  async searchAddresses(query: string): Promise<AddressSuggestion[]> {
    if (query.length < 3) return []

    try {
      switch (this.config.provider) {
        case 'google':
          return this.searchGooglePlaces(query)
        case 'mapbox':
          return this.searchMapbox(query)
        case 'nominatim':
        default:
          return this.searchNominatim(query)
      }
    } catch (error) {
      console.error(`Address search error (${this.config.provider}):`, error)
      // Fallback to Nominatim if other providers fail
      if (this.config.provider !== 'nominatim') {
        try {
          return this.searchNominatim(query)
        } catch (fallbackError) {
          console.error('Fallback address search failed:', fallbackError)
        }
      }
      return []
    }
  }

  private async searchGooglePlaces(query: string): Promise<AddressSuggestion[]> {
    if (!this.config.apiKey) {
      throw new Error('Google Places API key required')
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', query)
    url.searchParams.set('key', this.config.apiKey)
    url.searchParams.set('components', 'country:ca')
    url.searchParams.set('types', 'address|establishment')
    url.searchParams.set('language', 'en')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status}`)
    }

    // Get detailed information for each prediction
    const suggestions = await Promise.all(
      data.predictions.slice(0, this.config.limit).map(async (prediction: any) => {
        try {
          const details = await this.getGooglePlaceDetails(prediction.place_id)
          return this.parseGooglePlaceDetails(prediction, details)
        } catch (error) {
          console.error('Error getting place details:', error)
          return this.parseGooglePrediction(prediction)
        }
      })
    )

    return suggestions.filter(Boolean)
  }

  private async getGooglePlaceDetails(placeId: string): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Google Places API key required')
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('key', this.config.apiKey)
    url.searchParams.set('fields', 'geometry,address_components,formatted_address')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Place Details API error: ${data.status}`)
    }

    return data.result
  }

  private parseGooglePlaceDetails(prediction: any, details: any): AddressSuggestion {
    const addressComponents = details.address_components || []
    
    let streetNumber = ''
    let streetName = ''
    let city = ''
    let province = ''
    let postalCode = ''
    let country = 'Canada'

    addressComponents.forEach((component: any) => {
      const types = component.types
      if (types.includes('street_number')) {
        streetNumber = component.long_name
      } else if (types.includes('route')) {
        streetName = component.long_name
      } else if (types.includes('locality')) {
        city = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        province = component.short_name
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name
      } else if (types.includes('country')) {
        country = component.long_name
      }
    })

    return {
      id: prediction.place_id,
      displayName: prediction.description,
      streetNumber,
      streetName,
      city,
      province,
      postalCode,
      country,
      coordinates: details.geometry?.location ? {
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng
      } : undefined,
      type: prediction.types?.[0] || 'address'
    }
  }

  private parseGooglePrediction(prediction: any): AddressSuggestion {
    const terms = prediction.terms || []
    const description = prediction.description

    // Basic parsing from description
    const parts = description.split(', ')
    
    return {
      id: prediction.place_id,
      displayName: description,
      streetName: parts[0] || '',
      city: parts[1] || '',
      province: parts[2] || 'AB',
      country: 'Canada',
      type: prediction.types?.[0] || 'address'
    }
  }

  private async searchMapbox(query: string): Promise<AddressSuggestion[]> {
    if (!this.config.apiKey) {
      throw new Error('Mapbox access token required')
    }

    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
    url.searchParams.set('access_token', this.config.apiKey)
    url.searchParams.set('country', 'ca')
    url.searchParams.set('types', 'address,poi')
    url.searchParams.set('limit', this.config.limit?.toString() || '5')
    url.searchParams.set('language', 'en')

    const response = await fetch(url.toString())
    const data = await response.json()

    return data.features?.map((feature: any) => {
      const properties = feature.properties || {}
      const context = feature.context || []
      
      // Extract address components from context
      let city = ''
      let province = ''
      let postalCode = ''
      
      context.forEach((item: any) => {
        if (item.id.startsWith('place')) {
          city = item.text
        } else if (item.id.startsWith('region')) {
          province = item.short_code?.replace('CA-', '') || item.text
        } else if (item.id.startsWith('postcode')) {
          postalCode = item.text
        }
      })

      // Parse street address
      const addressMatch = feature.place_name.match(/^(\d+)\s+(.+?),/)
      const streetNumber = addressMatch ? addressMatch[1] : ''
      const streetName = addressMatch ? addressMatch[2] : feature.text

      return {
        id: feature.id,
        displayName: feature.place_name,
        streetNumber,
        streetName,
        city,
        province,
        postalCode,
        country: 'Canada',
        coordinates: feature.center ? {
          lat: feature.center[1],
          lng: feature.center[0]
        } : undefined,
        confidence: feature.relevance,
        type: feature.place_type?.[0] || 'address'
      }
    }) || []
  }

  private async searchNominatim(query: string): Promise<AddressSuggestion[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', this.config.limit?.toString() || '5')
    url.searchParams.set('countrycodes', 'ca')
    url.searchParams.set('q', `${query}, Canada`)

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Sports-Management-App/1.0'
      }
    })
    
    const data = await response.json()

    return data.map((result: any) => {
      const address = result.address || {}
      
      const streetNumber = address.house_number || ''
      const streetName = address.road || ''
      const city = address.city || address.town || address.village || ''
      const province = this.normalizeProvince(address.state || address.province || 'AB')
      const postalCode = address.postcode || ''

      return {
        id: result.place_id?.toString() || result.osm_id?.toString() || Math.random().toString(),
        displayName: result.display_name,
        streetNumber,
        streetName,
        city,
        province,
        postalCode,
        country: 'Canada',
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        confidence: parseFloat(result.importance || '0'),
        type: result.type || 'address'
      }
    })
  }

  private normalizeProvince(province: string): string {
    const provinceMap: Record<string, string> = {
      'alberta': 'AB',
      'british columbia': 'BC',
      'saskatchewan': 'SK',
      'manitoba': 'MB',
      'ontario': 'ON',
      'quebec': 'QC',
      'new brunswick': 'NB',
      'nova scotia': 'NS',
      'prince edward island': 'PE',
      'newfoundland and labrador': 'NL',
      'northwest territories': 'NT',
      'nunavut': 'NU',
      'yukon': 'YT'
    }

    const normalized = province.toLowerCase().trim()
    return provinceMap[normalized] || province.toUpperCase()
  }
}

// Factory function to create the appropriate address service
export function createAddressService(): AddressService {
  // Try Google Places first (if API key available)
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (googleApiKey && googleApiKey !== 'your_google_places_api_key_here_optional') {
    return new AddressService({
      provider: 'google',
      apiKey: googleApiKey,
      limit: 8
    })
  }

  // Try Mapbox second (if token available)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (mapboxToken && mapboxToken !== 'your_mapbox_token_here_optional') {
    return new AddressService({
      provider: 'mapbox',
      apiKey: mapboxToken,
      limit: 8
    })
  }

  // Fallback to free Nominatim
  return new AddressService({
    provider: 'nominatim',
    limit: 6
  })
}
export interface AddressComponents {
  streetNumber: string
  streetName: string
  city: string
  province: string
  postalCode: string
  country: string
}

export interface ParsedAddress extends AddressComponents {
  fullAddress: string
  isValid: boolean
}

/**
 * Parse a full address string into components
 */
export function parseAddressString(addressString: string): ParsedAddress {
  const parts = addressString.split(',').map(part => part.trim())
  
  let streetNumber = ''
  let streetName = ''
  let city = 'Calgary' // Default to Calgary
  let province = 'Alberta' // Default to Alberta
  let postalCode = ''
  let country = 'Canada'

  // Try to extract postal code (Canadian format: A1A 1A1)
  const postalCodeMatch = addressString.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i)
  if (postalCodeMatch) {
    postalCode = postalCodeMatch[0].toUpperCase().replace(/\s/, ' ')
  }

  // Try to extract street number and name from first part
  if (parts.length > 0) {
    const streetMatch = parts[0].match(/^(\d+)\s+(.+)$/)
    if (streetMatch) {
      streetNumber = streetMatch[1]
      streetName = streetMatch[2]
    } else {
      streetName = parts[0]
    }
  }

  // Extract city from parts (usually second to last, before province)
  if (parts.length >= 2) {
    city = parts[parts.length - 2] || city
  }

  // Extract province from parts (usually last part before postal code)
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1]
    if (lastPart && !postalCodeMatch?.input?.includes(lastPart)) {
      province = lastPart
    }
  }

  // Clean up extracted values
  city = city.replace(/\b(AB|Alberta|BC|British Columbia)\b/i, '').trim() || city
  province = normalizeProvince(province)

  const isValid = !!(streetName && city && province)

  return {
    streetNumber,
    streetName,
    city,
    province,
    postalCode,
    country,
    fullAddress: buildFullAddress({ streetNumber, streetName, city, province, postalCode, country }),
    isValid
  }
}

/**
 * Build a full address string from components
 */
export function buildFullAddress(components: Partial<AddressComponents>): string {
  const parts: string[] = []

  // Street address
  if (components.streetNumber && components.streetName) {
    parts.push(`${components.streetNumber} ${components.streetName}`)
  } else if (components.streetName) {
    parts.push(components.streetName)
  }

  // City
  if (components.city) {
    parts.push(components.city)
  }

  // Province
  if (components.province) {
    parts.push(components.province)
  }

  // Postal code
  if (components.postalCode) {
    parts.push(components.postalCode)
  }

  return parts.join(', ')
}

/**
 * Normalize province names to standard abbreviations
 */
export function normalizeProvince(province: string): string {
  const provinceMap: Record<string, string> = {
    'alberta': 'AB',
    'ab': 'AB',
    'british columbia': 'BC',
    'bc': 'BC',
    'saskatchewan': 'SK',
    'sk': 'SK',
    'manitoba': 'MB',
    'mb': 'MB',
    'ontario': 'ON',
    'on': 'ON',
    'quebec': 'QC',
    'qc': 'QC',
    'new brunswick': 'NB',
    'nb': 'NB',
    'nova scotia': 'NS',
    'ns': 'NS',
    'prince edward island': 'PE',
    'pe': 'PE',
    'newfoundland and labrador': 'NL',
    'nl': 'NL',
    'northwest territories': 'NT',
    'nt': 'NT',
    'nunavut': 'NU',
    'nu': 'NU',
    'yukon': 'YT',
    'yt': 'YT'
  }

  const normalized = province.toLowerCase().trim()
  return provinceMap[normalized] || province
}

/**
 * Validate Canadian postal code format
 */
export function validatePostalCode(postalCode: string): boolean {
  const canadianPostalRegex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i
  return canadianPostalRegex.test(postalCode.trim())
}

/**
 * Format postal code to standard Canadian format (A1A 1A1)
 */
export function formatPostalCode(postalCode: string): string {
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase()
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
  }
  return postalCode
}

/**
 * Extract coordinates from a geocoding result
 */
export function extractCoordinates(geocodingResult: any): { lat: number; lng: number } | null {
  try {
    if (geocodingResult.lat && geocodingResult.lon) {
      return {
        lat: parseFloat(geocodingResult.lat),
        lng: parseFloat(geocodingResult.lon)
      }
    }
    if (geocodingResult.geometry?.location) {
      return {
        lat: geocodingResult.geometry.location.lat,
        lng: geocodingResult.geometry.location.lng
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Validate if an address appears to be in Calgary area
 */
export function isCalgaryArea(address: ParsedAddress): boolean {
  const calgaryKeywords = [
    'calgary', 'airdrie', 'okotoks', 'cochrane', 'chestermere', 
    'strathmore', 'canmore', 'rocky view county', 'foothills county'
  ]
  
  const cityLower = address.city.toLowerCase()
  const fullAddressLower = address.fullAddress.toLowerCase()
  
  return calgaryKeywords.some(keyword => 
    cityLower.includes(keyword) || fullAddressLower.includes(keyword)
  )
}
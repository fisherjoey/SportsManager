"use client"

import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Loader2, Building2, Home } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createAddressService, type AddressSuggestion } from '@/lib/address-service'

interface ParsedAddress {
  streetNumber: string
  streetName: string
  city: string
  province: string
  postalCode: string
  fullAddress: string
  coordinates?: {
    lat: number
    lng: number
  }
}

interface AddressSearchProps {
  value?: string
  onAddressSelect: (address: ParsedAddress) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AddressSearch({
  value = '',
  onAddressSelect,
  placeholder = 'Search for an address...',
  className,
  disabled = false
}: AddressSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [provider, setProvider] = useState<string>('')
  const debounceRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const addressService = useRef(createAddressService())

  // Initialize provider info
  useEffect(() => {
    const service = addressService.current as any
    setProvider(service.config.provider)
  }, [])

  // Search for addresses using the comprehensive address service
  const searchAddresses = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const suggestions = await addressService.current.searchAddresses(searchQuery)
      setResults(suggestions)
      setShowResults(true)
    } catch (error) {
      console.error('Address search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Handle input changes with debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        searchAddresses(query.trim())
      }, 300)
    } else {
      setResults([])
      setShowResults(false)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Parse address suggestion into the expected format
  const parseAddress = (suggestion: AddressSuggestion): ParsedAddress => {
    const streetNumber = suggestion.streetNumber || ''
    const streetName = suggestion.streetName || ''
    const city = suggestion.city || 'Calgary'
    const province = suggestion.province || 'AB'
    const postalCode = suggestion.postalCode || ''
    
    // Build full address
    const addressParts = []
    if (streetNumber && streetName) {
      addressParts.push(`${streetNumber} ${streetName}`)
    } else if (streetName) {
      addressParts.push(streetName)
    }
    if (city) addressParts.push(city)
    if (province) addressParts.push(province)
    if (postalCode) addressParts.push(postalCode)
    
    const fullAddress = addressParts.join(', ')

    return {
      streetNumber,
      streetName,
      city,
      province,
      postalCode,
      fullAddress,
      coordinates: suggestion.coordinates
    }
  }

  // Handle address selection
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    const parsedAddress = parseAddress(suggestion)
    setQuery(parsedAddress.fullAddress)
    setShowResults(false)
    setSelectedIndex(-1)
    onAddressSelect(parsedAddress)
  }

  // Get icon for address type
  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'establishment':
      case 'poi':
        return Building2
      case 'street_address':
      case 'address':
        return Home
      default:
        return MapPin
    }
  }

  // Format address display
  const formatAddressDisplay = (suggestion: AddressSuggestion) => {
    const parts = []
    if (suggestion.streetNumber && suggestion.streetName) {
      parts.push(`${suggestion.streetNumber} ${suggestion.streetName}`)
    } else if (suggestion.streetName) {
      parts.push(suggestion.streetName)
    }
    
    const locationParts = []
    if (suggestion.city) locationParts.push(suggestion.city)
    if (suggestion.province) locationParts.push(suggestion.province)
    if (suggestion.postalCode) locationParts.push(suggestion.postalCode)
    
    return {
      mainAddress: parts.join(' ') || suggestion.displayName.split(',')[0],
      locationInfo: locationParts.join(', ')
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleAddressSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setShowResults(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle clicking outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true)
            }
          }}
          placeholder={placeholder}
          className="pl-10 pr-10"
          disabled={disabled}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {provider && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Badge variant="outline" className="text-xs">
              {provider === 'google' ? 'Google' : provider === 'mapbox' ? 'Mapbox' : 'OSM'}
            </Badge>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-lg max-h-80 overflow-y-auto"
        >
          {results.map((suggestion, index) => {
            const { mainAddress, locationInfo } = formatAddressDisplay(suggestion)
            const TypeIcon = getTypeIcon(suggestion.type)
            
            return (
              <Button
                key={suggestion.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start p-3 h-auto text-left hover:bg-accent/50",
                  index === selectedIndex && "bg-accent"
                )}
                onClick={() => handleAddressSelect(suggestion)}
              >
                <TypeIcon className="h-4 w-4 mr-3 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-medium truncate">
                    {mainAddress}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {locationInfo}
                  </div>
                  {suggestion.type && suggestion.type !== 'address' && (
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.type === 'establishment' ? 'Business' : 
                       suggestion.type === 'poi' ? 'Point of Interest' : 
                       suggestion.type}
                    </Badge>
                  )}
                </div>
                {suggestion.confidence && (
                  <div className="text-xs text-muted-foreground">
                    {Math.round(suggestion.confidence * 100)}%
                  </div>
                )}
              </Button>
            )
          })}
        </div>
      )}

      {showResults && !loading && query.length >= 3 && results.length === 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 shadow-md"
        >
          <div className="text-center text-muted-foreground">
            No addresses found. Try a different search term.
          </div>
        </div>
      )}
    </div>
  )
}
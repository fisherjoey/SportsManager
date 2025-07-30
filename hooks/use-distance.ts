"use client"

import { useState, useEffect } from 'react'
import { calculateDistanceAndDriveTime, getCurrentLocation, type DistanceResult } from '@/lib/maps'

interface UseDistanceOptions {
  enabled?: boolean
  useCurrentLocation?: boolean
  userLocation?: string
}

export function useDistance(
  destination: string | null,
  options: UseDistanceOptions = {}
) {
  const { enabled = true, useCurrentLocation = true, userLocation } = options
  
  const [distance, setDistance] = useState<DistanceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !destination) {
      setDistance(null)
      setError(null)
      return
    }

    const calculateDistance = async () => {
      setLoading(true)
      setError(null)
      
      try {
        let origin: string | { lat: number; lng: number } | null = null
        
        if (userLocation) {
          origin = userLocation
        } else if (useCurrentLocation) {
          const currentLocation = await getCurrentLocation()
          if (currentLocation) {
            origin = currentLocation
          }
        }
        
        if (!origin) {
          setError('Could not determine your location')
          return
        }
        
        const apiKey = process.env.NEXT_PUBLIC_OPENROUTE_API_KEY
        const result = await calculateDistanceAndDriveTime(origin, destination, apiKey)
        
        if (result) {
          setDistance(result)
        } else {
          setError('Could not calculate distance')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    calculateDistance()
  }, [destination, enabled, useCurrentLocation, userLocation])

  return { distance, loading, error }
}
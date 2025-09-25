'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { WifiOff, Wifi } from 'lucide-react'

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const checkConnection = async () => {
      setIsChecking(true)
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          // Short timeout for health check
          signal: AbortSignal.timeout(3000)
        })

        setIsConnected(response.ok)
      } catch (error) {
        console.warn('Backend health check failed:', error)
        setIsConnected(false)
      } finally {
        setIsChecking(false)
      }
    }

    // Initial check
    checkConnection()

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000)

    // Also check on focus
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        checkConnection()
      }
    }
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [])

  // Only show if disconnected
  if (isConnected) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "flex items-center gap-2 px-3 py-2",
        "bg-destructive/10 text-destructive",
        "border border-destructive/20 rounded-md",
        "text-sm font-medium",
        "animate-pulse"
      )}
    >
      <WifiOff className="w-4 h-4" />
      <span>Backend connection lost</span>
    </div>
  )
}
"use client"

import React, { useRef, useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Star, Award, Zap, Shield, UserCheck } from 'lucide-react'

interface Role {
  id: string
  name: string
  description?: string
  category?: string
  color?: string
  referee_config?: any
}

interface ScrollableRoleTabsProps {
  roles: Role[]
  className?: string
  onRoleClick?: (role: Role) => void
  selectedRoleId?: string
}

// Helper function to determine if text should be light or dark based on background color
const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '')
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function ScrollableRoleTabs({ 
  roles = [], 
  className, 
  onRoleClick,
  selectedRoleId 
}: ScrollableRoleTabsProps) {
  // Early return if no roles
  if (!roles || roles.length === 0) {
    return null
  }

  // Debug logging
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('ScrollableRoleTabs roles:', roles)
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const getRoleBadgeVariant = (role: Role) => {
    // Handle referee type roles with special styling
    if (role.category === 'referee_type') {
      switch (role.name) {
        case 'Senior Referee':
          return 'default'
        case 'Junior Referee':
          return 'secondary'  
        case 'Rookie Referee':
          return 'outline'
        default:
          return 'outline'
      }
    }

    // Handle referee capability roles
    if (role.category === 'referee_capability') {
      return 'outline'
    }

    // Handle legacy roles
    switch (role.name.toLowerCase()) {
      case 'super admin':
      case 'admin':
        return 'destructive'
      case 'assignor':
        return 'default'
      case 'referee':
        return 'secondary'
      case 'league manager':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getRoleIcon = (role: Role): React.ReactNode => {
    try {
      // Handle referee type roles
      if (role?.category === 'referee_type') {
        switch (role.name) {
          case 'Senior Referee':
            return <Star className="h-3 w-3 mr-1" />
          case 'Junior Referee':
            return <Award className="h-3 w-3 mr-1" />
          case 'Rookie Referee':
            return <Zap className="h-3 w-3 mr-1" />
          default:
            return <Zap className="h-3 w-3 mr-1" />
        }
      }

      // Handle referee capability roles
      if (role?.category === 'referee_capability') {
        return <UserCheck className="h-3 w-3 mr-1" />
      }

      // Handle legacy roles
      const roleName = role?.name?.toLowerCase() || ''
      switch (roleName) {
        case 'super admin':
        case 'admin':
          return <Shield className="h-3 w-3 mr-1" />
        case 'assignor':
          return <UserCheck className="h-3 w-3 mr-1" />
        case 'referee':
          return <Zap className="h-3 w-3 mr-1" />
        default:
          return null
      }
    } catch (error) {
      console.warn('Error rendering role icon:', error, role)
      return null
    }
  }

  const updateScrollState = () => {
    if (!scrollRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }

  useEffect(() => {
    updateScrollState()
    const handleResize = () => updateScrollState()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [roles])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    
    setIsDragging(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
    scrollRef.current.style.cursor = 'grabbing'
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 2 // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk
    updateScrollState()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollRef.current) return
    
    setIsDragging(true)
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return
    
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollRef.current.scrollLeft = scrollLeft - walk
    updateScrollState()
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleRoleClick = (role: Role, e: React.MouseEvent) => {
    // Prevent click if we were dragging
    if (isDragging) {
      e.preventDefault()
      return
    }
    onRoleClick?.(role)
  }

  const handleScroll = () => {
    updateScrollState()
  }

  return (
    <div className={cn("relative", className)}>
      {/* Gradient fade indicators */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      )}
      
      <div
        ref={scrollRef}
        className={cn(
          "flex items-center gap-2 overflow-x-auto scrollbar-none pb-2",
          "cursor-grab select-none",
          canScrollLeft || canScrollRight ? "px-2" : ""
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
      >
        {roles.filter(role => {
          // More thorough validation
          if (!role || typeof role !== 'object') return false
          if (!role.id || !role.name) return false
          if (typeof role.name !== 'string') return false
          return true
        }).map(role => {
          const hasCustomColor = role.color && role.color !== '#6B7280'
          const textColor = hasCustomColor ? getContrastColor(role.color) : undefined
          
          return (
            <Badge
              key={role.id}
              variant={hasCustomColor ? 'secondary' : getRoleBadgeVariant(role)}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap transition-all duration-200 hover:scale-105",
                "cursor-pointer active:scale-95",
                selectedRoleId === role.id && "ring-2 ring-primary ring-offset-2",
                isDragging && "pointer-events-none",
                hasCustomColor && "border"
              )}
              style={hasCustomColor ? {
                backgroundColor: role.color,
                color: textColor,
                borderColor: role.color
              } : undefined}
              onClick={(e) => handleRoleClick(role, e)}
            >
              {getRoleIcon(role)}
              {String(role.name || 'Unknown Role')}
            </Badge>
          )
        })}
      </div>
      
      {/* Hint text for desktop users */}
      {(canScrollLeft || canScrollRight) && (
        <div className="text-xs text-muted-foreground mt-1 text-center hidden sm:block">
          Click and drag to scroll
        </div>
      )}
    </div>
  )
}
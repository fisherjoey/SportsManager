"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { X, Filter, RotateCcw } from "lucide-react"
import { type Game } from "@/lib/mock-data"

export interface GameFilterOptions {
  ageGroups: string[]
  genders: string[]
  divisions: string[]
  zones: string[]
  levels: string[]
  statuses: string[]
}

export interface ActiveFilters {
  ageGroups: string[]
  genders: string[]
  divisions: string[]
  zones: string[]
  levels: string[]
  statuses: string[]
}

interface GameFiltersProps {
  games: Game[]
  activeFilters: ActiveFilters
  onFiltersChange: (filters: ActiveFilters) => void
  className?: string
}

const getUniqueValues = (games: Game[]): GameFilterOptions => {
  const ageGroups = new Set<string>()
  const genders = new Set<string>()
  const divisions = new Set<string>()
  const zones = new Set<string>()
  const levels = new Set<string>()
  const statuses = new Set<string>()

  games.forEach(game => {
    // Extract age groups from both teams
    if (typeof game.homeTeam === 'object' && game.homeTeam.ageGroup) {
      ageGroups.add(game.homeTeam.ageGroup)
    }
    if (typeof game.awayTeam === 'object' && game.awayTeam.ageGroup) {
      ageGroups.add(game.awayTeam.ageGroup)
    }

    // Extract genders from both teams
    if (typeof game.homeTeam === 'object' && game.homeTeam.gender) {
      genders.add(game.homeTeam.gender)
    }
    if (typeof game.awayTeam === 'object' && game.awayTeam.gender) {
      genders.add(game.awayTeam.gender)
    }

    // Extract zones from team organizations
    if (typeof game.homeTeam === 'object' && game.homeTeam.organization) {
      zones.add(game.homeTeam.organization)
    }
    if (typeof game.awayTeam === 'object' && game.awayTeam.organization) {
      zones.add(game.awayTeam.organization)
    }

    // Extract divisions, levels, and statuses
    if (game.division) divisions.add(game.division)
    if (game.level) levels.add(game.level)
    if (game.status) statuses.add(game.status)
  })

  return {
    ageGroups: Array.from(ageGroups).sort(),
    genders: Array.from(genders).sort(),
    divisions: Array.from(divisions).sort(),
    zones: Array.from(zones).sort(),
    levels: Array.from(levels).sort(),
    statuses: Array.from(statuses).sort()
  }
}

export function GameFilters({ games, activeFilters, onFiltersChange, className }: GameFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const filterOptions = useMemo(() => getUniqueValues(games), [games])
  
  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).reduce((count, filters) => count + filters.length, 0)
  }, [activeFilters])

  const handleFilterChange = (filterType: keyof ActiveFilters, value: string, checked: boolean) => {
    const currentFilters = [...activeFilters[filterType]]
    
    if (checked) {
      if (!currentFilters.includes(value)) {
        currentFilters.push(value)
      }
    } else {
      const index = currentFilters.indexOf(value)
      if (index > -1) {
        currentFilters.splice(index, 1)
      }
    }
    
    onFiltersChange({
      ...activeFilters,
      [filterType]: currentFilters
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      ageGroups: [],
      genders: [],
      divisions: [],
      zones: [],
      levels: [],
      statuses: []
    })
  }

  const removeFilter = (filterType: keyof ActiveFilters, value: string) => {
    const currentFilters = activeFilters[filterType].filter(item => item !== value)
    onFiltersChange({
      ...activeFilters,
      [filterType]: currentFilters
    })
  }

  const FilterSection = ({ title, filterType, options }: { 
    title: string
    filterType: keyof ActiveFilters
    options: string[] 
  }) => (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-foreground">{title}</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {options.map(option => (
          <div key={option} className="flex items-center space-x-2">
            <Checkbox
              id={`${filterType}-${option}`}
              checked={activeFilters[filterType].includes(option)}
              onCheckedChange={(checked) => 
                handleFilterChange(filterType, option, checked as boolean)
              }
            />
            <Label 
              htmlFor={`${filterType}-${option}`} 
              className="text-sm cursor-pointer flex-1"
            >
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={className}>
      {/* Filter Button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" side="bottom" align="start">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Filter Games</CardTitle>
                {activeFilterCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="h-8 px-2 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FilterSection 
                  title="Age Group" 
                  filterType="ageGroups" 
                  options={filterOptions.ageGroups} 
                />
                <FilterSection 
                  title="Gender" 
                  filterType="genders" 
                  options={filterOptions.genders} 
                />
                <FilterSection 
                  title="Division" 
                  filterType="divisions" 
                  options={filterOptions.divisions} 
                />
                <FilterSection 
                  title="Zone" 
                  filterType="zones" 
                  options={filterOptions.zones} 
                />
                <FilterSection 
                  title="Level" 
                  filterType="levels" 
                  options={filterOptions.levels} 
                />
                <FilterSection 
                  title="Status" 
                  filterType="statuses" 
                  options={filterOptions.statuses} 
                />
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(activeFilters).map(([filterType, values]) =>
            values.map(value => (
              <Badge 
                key={`${filterType}-${value}`} 
                variant="secondary" 
                className="gap-1 pr-1"
              >
                <span className="text-xs text-muted-foreground capitalize">
                  {filterType.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                {value}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter(filterType as keyof ActiveFilters, value)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Filter function to apply filters to games
export function applyGameFilters(games: Game[], filters: ActiveFilters): Game[] {
  return games.filter(game => {
    // Age Group filter
    if (filters.ageGroups.length > 0) {
      const homeAgeGroup = typeof game.homeTeam === 'object' ? game.homeTeam.ageGroup : ''
      const awayAgeGroup = typeof game.awayTeam === 'object' ? game.awayTeam.ageGroup : ''
      
      if (!filters.ageGroups.includes(homeAgeGroup) && !filters.ageGroups.includes(awayAgeGroup)) {
        return false
      }
    }

    // Gender filter
    if (filters.genders.length > 0) {
      const homeGender = typeof game.homeTeam === 'object' ? game.homeTeam.gender : ''
      const awayGender = typeof game.awayTeam === 'object' ? game.awayTeam.gender : ''
      
      if (!filters.genders.includes(homeGender) && !filters.genders.includes(awayGender)) {
        return false
      }
    }

    // Zone filter (based on organization)
    if (filters.zones.length > 0) {
      const homeZone = typeof game.homeTeam === 'object' ? game.homeTeam.organization : ''
      const awayZone = typeof game.awayTeam === 'object' ? game.awayTeam.organization : ''
      
      if (!filters.zones.includes(homeZone) && !filters.zones.includes(awayZone)) {
        return false
      }
    }

    // Division filter
    if (filters.divisions.length > 0) {
      if (!filters.divisions.includes(game.division)) {
        return false
      }
    }

    // Level filter
    if (filters.levels.length > 0) {
      if (!filters.levels.includes(game.level)) {
        return false
      }
    }

    // Status filter
    if (filters.statuses.length > 0) {
      if (!filters.statuses.includes(game.status)) {
        return false
      }
    }

    return true
  })
}
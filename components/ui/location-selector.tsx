"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Check, ChevronsUpDown, MapPin, Plus, Building2, Phone, Mail, Users, Car, AlertCircle, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { AddressSearch } from "@/components/ui/address-search"

interface Location {
  id: string
  name: string
  address: string
  city: string
  province: string
  postal_code: string
  latitude?: number
  longitude?: number
  capacity?: number
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  facilities?: string[]
  accessibility_features?: string[]
  parking_spaces?: number
  notes?: string
}

interface LocationSelectorProps {
  value?: string
  onLocationSelect: (location: Location) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function LocationSelector({
  value,
  onLocationSelect,
  placeholder = "Select a location...",
  className,
  disabled = false
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [search, setSearch] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Load locations on component mount
  useEffect(() => {
    loadLocations()
  }, [])

  // Update selected location when value prop changes
  useEffect(() => {
    if (value && locations.length > 0) {
      const location = locations.find(l => l.id === value)
      setSelectedLocation(location || null)
    }
  }, [value, locations])

  // Filter locations based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredLocations(locations)
    } else {
      const filtered = locations.filter(location =>
        location.name.toLowerCase().includes(search.toLowerCase()) ||
        location.address.toLowerCase().includes(search.toLowerCase()) ||
        location.city.toLowerCase().includes(search.toLowerCase())
      )
      setFilteredLocations(filtered)
    }
  }, [search, locations])

  const loadLocations = async () => {
    setLoading(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${API_BASE_URL}/locations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      } else {
        console.error('Failed to load locations:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location)
    onLocationSelect(location)
    setOpen(false)
  }

  const handleCreateLocation = (newLocation: Location) => {
    setLocations(prev => [...prev, newLocation])
    handleLocationSelect(newLocation)
    setShowCreateDialog(false)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Label>Location *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
            disabled={disabled}
          >
            {selectedLocation
              ? `${selectedLocation.name} - ${selectedLocation.city}`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput 
              placeholder="Search locations..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No locations found.</p>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Location
                      </Button>
                    </DialogTrigger>
                    <CreateLocationDialog onLocationCreated={handleCreateLocation} />
                  </Dialog>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredLocations.map((location) => (
                  <CommandItem
                    key={location.id}
                    value={location.id}
                    onSelect={() => handleLocationSelect(location)}
                    className="flex flex-col items-start p-3 space-y-1"
                  >
                    <div className="flex items-center w-full">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedLocation?.id === location.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.address}, {location.city}
                        </div>
                      </div>
                    </div>
                    {location.facilities && location.facilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-6">
                        {location.facilities.slice(0, 3).map((facility) => (
                          <Badge key={facility} variant="secondary" className="text-xs">
                            {facility}
                          </Badge>
                        ))}
                        {location.facilities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{location.facilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {filteredLocations.length > 0 && (
                <div className="border-t p-2">
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Location
                      </Button>
                    </DialogTrigger>
                    <CreateLocationDialog onLocationCreated={handleCreateLocation} />
                  </Dialog>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedLocation && (
        <Card className="mt-2">
          <CardContent className="pt-4">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{selectedLocation.address}, {selectedLocation.city}, {selectedLocation.province}</span>
              </div>
              {selectedLocation.capacity && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Capacity: {selectedLocation.capacity}</span>
                </div>
              )}
              {selectedLocation.parking_spaces && (
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedLocation.parking_spaces} parking spaces</span>
                </div>
              )}
              {(selectedLocation.hourly_rate || selectedLocation.game_rate) && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedLocation.hourly_rate && `$${selectedLocation.hourly_rate}/hr`}
                    {selectedLocation.hourly_rate && selectedLocation.game_rate && ' • '}
                    {selectedLocation.game_rate && `$${selectedLocation.game_rate}/game`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface CreateLocationDialogProps {
  onLocationCreated: (location: Location) => void
}

function CreateLocationDialog({ onLocationCreated }: CreateLocationDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    province: "AB",
    postal_code: "",
    latitude: null as number | null,
    longitude: null as number | null,
    capacity: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    parking_spaces: "",
    facilities: [] as string[],
    notes: "",
    hourly_rate: "",
    game_rate: "",
    cost_notes: ""
  })
  const [loading, setLoading] = useState(false)

  const facilityOptions = [
    "Basketball Court",
    "Multiple Courts", 
    "Volleyball Courts",
    "Parking",
    "Concession",
    "Changerooms",
    "Spectator Seating",
    "Fitness Centre",
    "Pool",
    "Meeting Rooms"
  ]

  const handleAddressSelect = (address: any) => {
    setFormData(prev => ({
      ...prev,
      address: address.fullAddress || `${address.streetNumber} ${address.streetName}`.trim(),
      city: address.city,
      province: address.province,
      postal_code: address.postalCode,
      latitude: address.coordinates?.lat || null,
      longitude: address.coordinates?.lng || null
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${API_BASE_URL}/locations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postal_code,
          latitude: formData.latitude,
          longitude: formData.longitude,
          capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
          contact_name: formData.contact_name || undefined,
          contact_phone: formData.contact_phone || undefined,
          contact_email: formData.contact_email || undefined,
          parking_spaces: formData.parking_spaces ? parseInt(formData.parking_spaces) : undefined,
          facilities: formData.facilities,
          notes: formData.notes || undefined,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
          game_rate: formData.game_rate ? parseFloat(formData.game_rate) : undefined,
          cost_notes: formData.cost_notes || undefined
        })
      })

      if (response.ok) {
        const newLocation = await response.json()
        onLocationCreated(newLocation)
      } else {
        const error = await response.json()
        console.error('Failed to create location:', error)
        // Could add toast notification here
      }
    } catch (error) {
      console.error('Failed to create location:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogDescription>
          Create a new location that can be used for games. Search for the address to get accurate coordinates.
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="name">Location Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Calgary Basketball Centre"
              required
            />
          </div>

          <div>
            <Label>Address *</Label>
            <AddressSearch
              value={formData.address}
              onAddressSelect={handleAddressSelect}
              placeholder="Search for address..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="postal_code">Postal Code *</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                placeholder="T2M 4N3"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="500"
              />
            </div>
            <div>
              <Label htmlFor="parking_spaces">Parking Spaces</Label>
              <Input
                id="parking_spaces"
                type="number"
                value={formData.parking_spaces}
                onChange={(e) => setFormData(prev => ({ ...prev, parking_spaces: e.target.value }))}
                placeholder="100"
              />
            </div>
          </div>

          <div>
            <Label>Contact Information</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input
                placeholder="Contact Name"
                value={formData.contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
              />
              <Input
                placeholder="Email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Facilities</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {facilityOptions.map((facility) => (
                <label key={facility} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.facilities.includes(facility)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, facilities: [...prev.facilities, facility] }))
                      } else {
                        setFormData(prev => ({ ...prev, facilities: prev.facilities.filter(f => f !== facility) }))
                      }
                    }}
                    className="rounded"
                  />
                  <span>{facility}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Cost Information</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label htmlFor="hourly_rate" className="text-sm">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  placeholder="25.00"
                />
              </div>
              <div>
                <Label htmlFor="game_rate" className="text-sm">Per Game Rate ($)</Label>
                <Input
                  id="game_rate"
                  type="number"
                  step="0.01"
                  value={formData.game_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, game_rate: e.target.value }))}
                  placeholder="150.00"
                />
              </div>
            </div>
            <div className="mt-2">
              <Label htmlFor="cost_notes" className="text-sm">Cost Notes</Label>
              <Input
                id="cost_notes"
                value={formData.cost_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_notes: e.target.value }))}
                placeholder="Additional cost information..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional information..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Location"}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
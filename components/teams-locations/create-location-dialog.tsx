"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { AddressSearch } from "@/components/ui/address-search"
import { formatPostalCode } from "@/lib/address-utils"

interface CreateLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateLocation: (locationData: any) => void
}

export function CreateLocationDialog({ open, onOpenChange, onCreateLocation }: CreateLocationDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    province: "AB",
    postalCode: "",
    capacity: 0,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    rentalRate: 0,
    parkingSpaces: 0,
    facilities: [] as string[],
    accessibilityFeatures: [] as string[],
    notes: "",
    isActive: true,
  })

  const handleAddressSelect = (address: any) => {
    setFormData(prev => ({
      ...prev,
      address: `${address.streetNumber} ${address.streetName}`.trim(),
      city: address.city,
      province: address.province,
      postalCode: formatPostalCode(address.postalCode)
    }))
  }

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
    "Ice Rink",
    "Track",
    "Meeting Rooms",
  ]

  const accessibilityOptions = [
    "Wheelchair Access",
    "Accessible Washrooms",
    "Accessible Parking",
    "Elevator",
    "Ramps",
    "Audio Assistance",
  ]

  const handleFacilityChange = (facility: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, facility],
      })
    } else {
      setFormData({
        ...formData,
        facilities: formData.facilities.filter((f) => f !== facility),
      })
    }
  }

  const handleAccessibilityChange = (feature: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        accessibilityFeatures: [...formData.accessibilityFeatures, feature],
      })
    } else {
      setFormData({
        ...formData,
        accessibilityFeatures: formData.accessibilityFeatures.filter((f) => f !== feature),
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateLocation(formData)
    setFormData({
      name: "",
      address: "",
      city: "Calgary",
      province: "AB",
      postalCode: "",
      capacity: 0,
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      rentalRate: 0,
      parkingSpaces: 0,
      facilities: [],
      accessibilityFeatures: [],
      notes: "",
      isActive: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>Create a new venue in the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Venue Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address Search</Label>
            <AddressSearch
              onAddressSelect={handleAddressSelect}
              placeholder="Search for venue address..."
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Start typing an address to search and auto-fill location details
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Calgary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="AB"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="T2G 5B6"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="0"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number.parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentalRate">Rental Rate ($/hour)</Label>
              <Input
                id="rentalRate"
                type="number"
                min="0"
                value={formData.rentalRate}
                onChange={(e) => setFormData({ ...formData, rentalRate: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parkingSpaces">Parking Spaces</Label>
              <Input
                id="parkingSpaces"
                type="number"
                min="0"
                value={formData.parkingSpaces}
                onChange={(e) => setFormData({ ...formData, parkingSpaces: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="(403) 555-0123"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Facilities</Label>
            <div className="grid grid-cols-2 gap-2">
              {facilityOptions.map((facility) => (
                <div key={facility} className="flex items-center space-x-2">
                  <Checkbox
                    id={facility}
                    checked={formData.facilities.includes(facility)}
                    onCheckedChange={(checked) => handleFacilityChange(facility, checked as boolean)}
                  />
                  <Label htmlFor={facility} className="text-sm">
                    {facility}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accessibility Features</Label>
            <div className="grid grid-cols-2 gap-2">
              {accessibilityOptions.map((feature) => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={feature}
                    checked={formData.accessibilityFeatures.includes(feature)}
                    onCheckedChange={(checked) => handleAccessibilityChange(feature, checked as boolean)}
                  />
                  <Label htmlFor={feature} className="text-sm">
                    {feature}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about the venue..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Location</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

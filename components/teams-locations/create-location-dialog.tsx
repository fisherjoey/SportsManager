'use client'

import type React from 'react'
import { useState } from 'react'

import { CustomFormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ContactFieldGroup } from '@/components/ui/contact-field-group'
import { AddressFieldGroup } from '@/components/ui/address-field-group'

interface CreateLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateLocation: (locationData: any) => void
}

export function CreateLocationDialog({ open, onOpenChange, onCreateLocation }: CreateLocationDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: 'AB',
    postalCode: '',
    capacity: 0,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    rentalRate: 0,
    parkingSpaces: 0,
    facilities: [] as string[],
    accessibilityFeatures: [] as string[],
    notes: '',
    isActive: true
  })

  const handleAddressSelect = (address: any) => {
    setFormData(prev => ({
      ...prev,
      address: `${address.streetNumber} ${address.streetName}`.trim(),
      city: address.city,
      province: address.province,
      postalCode: address.postalCode
    }))
  }

  const facilityOptions = [
    'Basketball Court',
    'Multiple Courts',
    'Volleyball Courts',
    'Parking',
    'Concession',
    'Changerooms',
    'Spectator Seating',
    'Fitness Centre',
    'Pool',
    'Ice Rink',
    'Track',
    'Meeting Rooms'
  ]

  const accessibilityOptions = [
    'Wheelchair Access',
    'Accessible Washrooms',
    'Accessible Parking',
    'Elevator',
    'Ramps',
    'Audio Assistance'
  ]

  const handleFacilityChange = (facility: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, facility]
      })
    } else {
      setFormData({
        ...formData,
        facilities: formData.facilities.filter((f) => f !== facility)
      })
    }
  }

  const handleAccessibilityChange = (feature: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        accessibilityFeatures: [...formData.accessibilityFeatures, feature]
      })
    } else {
      setFormData({
        ...formData,
        accessibilityFeatures: formData.accessibilityFeatures.filter((f) => f !== feature)
      })
    }
  }

  const handleSubmit = async (data: any) => {
    const locationData = {
      ...formData,
      ...data
    }
    await onCreateLocation(locationData)
    setFormData({
      name: '',
      address: '',
      city: 'Calgary',
      province: 'AB',
      postalCode: '',
      capacity: 0,
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      rentalRate: 0,
      parkingSpaces: 0,
      facilities: [],
      accessibilityFeatures: [],
      notes: '',
      isActive: true
    })
  }

  return (
    <CustomFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Location"
      description="Create a new venue in the system"
      onSubmit={handleSubmit}
      submitText="Create Location"
      maxWidth="sm:max-w-[700px] max-h-[80vh] overflow-y-auto"
    >
      {({ loading, handleSubmit: submitForm }) => (
        <form id="dialog-form" onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          const data = Object.fromEntries(formData.entries())
          submitForm(data)
        }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Venue Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <AddressFieldGroup
            addressValue={formData.address}
            cityValue={formData.city}
            provinceValue={formData.province}
            postalCodeValue={formData.postalCode}
            onAddressChange={(value) => setFormData({ ...formData, address: value })}
            onCityChange={(value) => setFormData({ ...formData, city: value })}
            onProvinceChange={(value) => setFormData({ ...formData, province: value })}
            onPostalCodeChange={(value) => setFormData({ ...formData, postalCode: value })}
            onAddressSelect={handleAddressSelect}
            addressRequired
            cityRequired
            provinceRequired
            postalCodeRequired
            showAddressSearch
            addressSearchPlaceholder="Search for venue address..."
            disabled={loading}
          />

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

          <ContactFieldGroup
            nameValue={formData.contactName}
            emailValue={formData.contactEmail}
            phoneValue={formData.contactPhone}
            onNameChange={(value) => setFormData({ ...formData, contactName: value })}
            onEmailChange={(value) => setFormData({ ...formData, contactEmail: value })}
            onPhoneChange={(value) => setFormData({ ...formData, contactPhone: value })}
            layout="grid"
            disabled={loading}
          />

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

        </form>
      )}
    </CustomFormDialog>
  )
}

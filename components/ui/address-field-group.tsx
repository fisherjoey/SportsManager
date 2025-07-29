"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressSearch } from "@/components/ui/address-search"
import { formatPostalCode } from "@/lib/address-utils"

interface AddressFieldGroupProps {
  addressValue?: string
  cityValue?: string
  provinceValue?: string
  postalCodeValue?: string
  onAddressChange?: (value: string) => void
  onCityChange?: (value: string) => void
  onProvinceChange?: (value: string) => void
  onPostalCodeChange?: (value: string) => void
  onAddressSelect?: (address: any) => void
  addressRequired?: boolean
  cityRequired?: boolean
  provinceRequired?: boolean
  postalCodeRequired?: boolean
  showAddressSearch?: boolean
  addressSearchPlaceholder?: string
  className?: string
  disabled?: boolean
  layout?: "stacked" | "grid"
}

export function AddressFieldGroup({
  addressValue = "",
  cityValue = "",
  provinceValue = "AB",
  postalCodeValue = "",
  onAddressChange,
  onCityChange,
  onProvinceChange,
  onPostalCodeChange,
  onAddressSelect,
  addressRequired = false,
  cityRequired = false,
  provinceRequired = false,
  postalCodeRequired = false,
  showAddressSearch = true,
  addressSearchPlaceholder = "Search for address...",
  className = "",
  disabled = false,
  layout = "grid"
}: AddressFieldGroupProps) {
  const handleAddressSelect = (address: any) => {
    if (onAddressSelect) {
      onAddressSelect(address)
    } else {
      // Default behavior - update individual fields
      onAddressChange?.(`${address.streetNumber} ${address.streetName}`.trim())
      onCityChange?.(address.city)
      onProvinceChange?.(address.province)
      onPostalCodeChange?.(formatPostalCode(address.postalCode))
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showAddressSearch && (
        <div className="space-y-2">
          <Label htmlFor="addressSearch">Address Search</Label>
          <AddressSearch
            onAddressSelect={handleAddressSelect}
            placeholder={addressSearchPlaceholder}
            className="w-full"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Start typing an address to search and auto-fill location details
          </p>
        </div>
      )}

      <div className={layout === "grid" ? "grid grid-cols-3 gap-4" : "space-y-4"}>
        <div className={layout === "grid" ? "col-span-2" : ""}>
          <div className="space-y-2">
            <Label htmlFor="streetAddress">Street Address</Label>
            <Input
              id="streetAddress"
              name="streetAddress"
              value={addressValue}
              onChange={(e) => onAddressChange?.(e.target.value)}
              placeholder="123 Main Street"
              required={addressRequired}
              disabled={disabled}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            value={cityValue}
            onChange={(e) => onCityChange?.(e.target.value)}
            placeholder="Calgary"
            required={cityRequired}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="province">Province</Label>
          <Input
            id="province"
            name="province"
            value={provinceValue}
            onChange={(e) => onProvinceChange?.(e.target.value)}
            placeholder="AB"
            required={provinceRequired}
            disabled={disabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            name="postalCode"
            placeholder="T2G 5B6"
            value={postalCodeValue}
            onChange={(e) => onPostalCodeChange?.(e.target.value)}
            required={postalCodeRequired}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}

// Simplified version for basic address forms
interface SimpleAddressFieldsProps {
  required?: boolean
  disabled?: boolean
  className?: string
  showSearch?: boolean
}

export function SimpleAddressFields({ 
  required = false, 
  disabled = false, 
  className = "",
  showSearch = true
}: SimpleAddressFieldsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {showSearch && (
        <div className="space-y-2">
          <Label htmlFor="addressSearch">Address Search</Label>
          <AddressSearch
            onAddressSelect={() => {}}
            placeholder="Search for address..."
            className="w-full"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Start typing an address to search and auto-fill location details
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="streetAddress">Street Address</Label>
          <Input
            id="streetAddress"
            name="streetAddress"
            placeholder="123 Main Street"
            required={required}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            placeholder="Calgary"
            required={required}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="province">Province</Label>
          <Input
            id="province"
            name="province"
            placeholder="AB"
            defaultValue="AB"
            required={required}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            name="postalCode"
            placeholder="T2G 5B6"
            required={required}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
'use client'

import React from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ContactFieldGroupProps {
  nameValue?: string
  emailValue?: string
  phoneValue?: string
  onNameChange?: (value: string) => void
  onEmailChange?: (value: string) => void
  onPhoneChange?: (value: string) => void
  nameRequired?: boolean
  emailRequired?: boolean
  phoneRequired?: boolean
  nameLabel?: string
  emailLabel?: string
  phoneLabel?: string
  phonePlaceholder?: string
  className?: string
  disabled?: boolean
  layout?: 'stacked' | 'grid' | 'inline'
}

export function ContactFieldGroup({
  nameValue = '',
  emailValue = '',
  phoneValue = '',
  onNameChange,
  onEmailChange,
  onPhoneChange,
  nameRequired = false,
  emailRequired = false,
  phoneRequired = false,
  nameLabel = 'Contact Name',
  emailLabel = 'Contact Email',
  phoneLabel = 'Contact Phone',
  phonePlaceholder = '(403) 555-0123',
  className = '',
  disabled = false,
  layout = 'stacked'
}: ContactFieldGroupProps) {
  const gridClass = layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 
    layout === 'inline' ? 'flex flex-wrap gap-4' : 'space-y-4'

  return (
    <div className={`${gridClass} ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="contactName">{nameLabel}</Label>
        <Input
          id="contactName"
          name="contactName"
          value={nameValue}
          onChange={(e) => onNameChange?.(e.target.value)}
          required={nameRequired}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactEmail">{emailLabel}</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          value={emailValue}
          onChange={(e) => onEmailChange?.(e.target.value)}
          required={emailRequired}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactPhone">{phoneLabel}</Label>
        <Input
          id="contactPhone"
          name="contactPhone"
          type="tel"
          placeholder={phonePlaceholder}
          value={phoneValue}
          onChange={(e) => onPhoneChange?.(e.target.value)}
          required={phoneRequired}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

// Alternative simpler version for basic usage
interface SimpleContactFieldsProps {
  required?: boolean
  disabled?: boolean
  className?: string
}

export function SimpleContactFields({ 
  required = false, 
  disabled = false, 
  className = '' 
}: SimpleContactFieldsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="contactName">Contact Name</Label>
        <Input
          id="contactName"
          name="contactName"
          required={required}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            required={required}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            placeholder="(403) 555-0123"
            required={required}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
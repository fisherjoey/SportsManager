'use client'

import React from 'react'
import { MoreVertical, Copy } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'

interface BaseEntityCardAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
}

interface BaseEntityCardProps {
  id: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  actions?: BaseEntityCardAction[]
  children: React.ReactNode
  className?: string
  showCopyId?: boolean
  copyIdLabel?: string
}

export function BaseEntityCard({
  id,
  title,
  subtitle,
  isSelected,
  onSelect,
  actions = [],
  children,
  className = '',
  showCopyId = true,
  copyIdLabel
}: BaseEntityCardProps) {
  const handleCopyId = () => {
    navigator.clipboard.writeText(id)
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with selection, title, and actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {onSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  className="mt-1"
                />
              )}
              <div className="flex-1">
                {typeof title === 'string' ? (
                  <h3 className="font-semibold text-lg leading-tight">
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {subtitle && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions menu */}
            {(actions.length > 0 || showCopyId) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {showCopyId && (
                    <>
                      <DropdownMenuItem onClick={handleCopyId}>
                        <Copy className="mr-2 h-4 w-4" />
                        {copyIdLabel || `Copy ${id.substring(0, 8)}...`}
                      </DropdownMenuItem>
                      {actions.length > 0 && <DropdownMenuSeparator />}
                    </>
                  )}
                  {actions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={action.variant === 'destructive' ? 'text-red-600' : ''}
                    >
                      <action.icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Main content */}
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized versions for common patterns

interface ContactInfoSectionProps {
  icon: React.ComponentType<{ className?: string }>
  email?: string
  phone?: string
  className?: string
}

export function ContactInfoSection({ icon: Icon, email, phone, className = '' }: ContactInfoSectionProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {email && (
        <div className="flex items-center text-sm text-muted-foreground">
          <Icon className="mr-2 h-4 w-4" />
          <span className="truncate">{email}</span>
        </div>
      )}
      {phone && (
        <div className="flex items-center text-sm text-muted-foreground">
          <Icon className="mr-2 h-4 w-4" />
          <span className="truncate">{phone}</span>
        </div>
      )}
    </div>
  )
}

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>
  label?: string
  children: React.ReactNode
  className?: string
}

export function InfoRow({ icon: Icon, label, children, className = '' }: InfoRowProps) {
  return (
    <div className={`flex items-center text-sm text-muted-foreground ${className}`}>
      <Icon className="mr-2 h-4 w-4" />
      {label && <span className="mr-2">{label}:</span>}
      {children}
    </div>
  )
}

interface BadgeRowProps {
  icon: React.ComponentType<{ className?: string }>
  label?: string
  children: React.ReactNode
  className?: string
}

export function BadgeRow({ icon: Icon, label, children, className = '' }: BadgeRowProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
      {children}
    </div>
  )
}

interface CollapsibleSectionProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
  isEmpty?: boolean
  emptyText?: string
  className?: string
}

export function CollapsibleSection({ 
  icon: Icon, 
  label, 
  children, 
  isEmpty = false, 
  emptyText = 'None listed',
  className = '' 
}: CollapsibleSectionProps) {
  return (
    <div className={`border-t pt-3 ${className}`}>
      <div className="flex items-start space-x-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <span className="text-sm text-muted-foreground">{label}:</span>
          {isEmpty ? (
            <span className="text-sm text-muted-foreground ml-1">{emptyText}</span>
          ) : (
            <div className="mt-1">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
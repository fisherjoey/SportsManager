'use client'

import React, { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Edit2, Eye, Copy, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LevelBadge, StatusBadge } from '@/components/ui/specialized-badges'

import { DataTableColumnHeaderAdvanced } from './columns/DataTableColumnHeaderAdvanced'

// Types for reusable column patterns
export interface BaseAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: (item: any) => void
  disabled?: (item: any) => boolean
  variant?: 'default' | 'destructive'
}

export interface ColumnAction extends BaseAction {
  showFor?: (item: any) => boolean
}

// Inline editable text component
export function EditableText({ 
  value, 
  onSave, 
  placeholder = 'Click to edit',
  className = '',
  disabled = false
}: {
  value: string
  onSave: (newValue: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (disabled) {
    return <span className={`text-sm ${className}`}>{value || placeholder}</span>
  }

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') handleCancel()
        }}
        autoFocus
        className={`h-8 ${className}`}
      />
    )
  }

  return (
    <div 
      className={`cursor-pointer hover:bg-muted/50 rounded px-2 py-1 group ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span className="truncate">{value || placeholder}</span>
      <Edit2 className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-50" />
    </div>
  )
}

// Inline editable select component
export function EditableSelect({ 
  value, 
  options,
  onSave, 
  className = '',
  displayValue,
  badgeVariant = 'outline',
  badgeClassName = '',
  disabled = false
}: {
  value: string
  options: { label: string; value: string }[]
  onSave: (newValue: string) => void
  className?: string
  displayValue?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  badgeClassName?: string
  disabled?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = (newValue: string) => {
    if (newValue !== value) {
      onSave(newValue)
    }
    setIsEditing(false)
  }

  if (disabled) {
    return (
      <Badge variant={badgeVariant} className={badgeClassName}>
        {displayValue || value}
      </Badge>
    )
  }

  if (isEditing) {
    return (
      <Select
        value={value}
        onValueChange={handleSave}
        onOpenChange={(open) => !open && setIsEditing(false)}
        open={isEditing}
      >
        <SelectTrigger className={`h-8 w-auto ${className}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Badge 
      variant={badgeVariant} 
      className={`cursor-pointer hover:bg-muted ${badgeClassName}`}
      onClick={() => setIsEditing(true)}
    >
      {displayValue || value}
      <Edit2 className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-50" />
    </Badge>
  )
}

// Standard column creators
export const createSelectColumn = <T,>(): ColumnDef<T> => ({
  id: 'select',
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      className="translate-y-[2px]"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      className="translate-y-[2px]"
    />
  ),
  enableSorting: false,
  enableHiding: false
})

export const createActionsColumn = <T,>(actions: ColumnAction[]): ColumnDef<T> => ({
  id: 'actions',
  enableHiding: false,
  cell: ({ row }) => {
    const item = row.original
    const availableActions = actions.filter(action => 
      !action.showFor || action.showFor(item)
    )

    if (availableActions.length === 0) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(item.id || ''))}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {availableActions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => action.onClick(item)}
              disabled={action.disabled?.(item)}
              className={action.variant === 'destructive' ? 'text-red-600' : ''}
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
})

// Standard text column with optional editing
export const createTextColumn = <T,>(
  accessorKey: keyof T,
  title: string,
  options: {
    searchable?: boolean
    editable?: boolean
    onEdit?: (item: T, value: string) => void
    placeholder?: string
    formatter?: (value: any) => string
    className?: string
  } = {}
): ColumnDef<T> => ({
    accessorKey: accessorKey as string,
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title={title} 
        searchable={options.searchable}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const item = row.original
      const value = row.getValue(accessorKey as string) as string
      const displayValue = options.formatter ? options.formatter(value) : value

      if (options.editable && options.onEdit) {
        return (
          <EditableText
            value={displayValue}
            onSave={(newValue) => options.onEdit!(item, newValue)}
            placeholder={options.placeholder}
            className={options.className}
          />
        )
      }

      return (
        <div className={`text-sm ${options.className || ''}`}>
          {displayValue}
        </div>
      )
    }
  })

// Badge column (for status, level, etc.)
export const createBadgeColumn = <T,>(
  accessorKey: keyof T,
  title: string,
  options: {
    type?: 'status' | 'level' | 'custom'
    editable?: boolean
    onEdit?: (item: T, value: string) => void
    selectOptions?: { label: string; value: string }[]
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  } = {}
): ColumnDef<T> => ({
    accessorKey: accessorKey as string,
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title={title} 
        searchable={false}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const item = row.original
      const value = row.getValue(accessorKey as string) as string

      if (options.editable && options.onEdit && options.selectOptions) {
        return (
          <EditableSelect
            value={value}
            options={options.selectOptions}
            onSave={(newValue) => options.onEdit!(item, newValue)}
            badgeVariant={options.variant}
            badgeClassName={options.className}
          />
        )
      }

      // Use specialized badges based on type
      if (options.type === 'status') {
        return (
          <StatusBadge status={value as any} className={options.className} />
        )
      }

      if (options.type === 'level') {
        return (
          <LevelBadge level={value} className={options.className} />
        )
      }

      // Default badge
      return (
        <Badge variant={options.variant || 'outline'} className={options.className}>
          {value}
        </Badge>
      )
    }
  })

// Contact info column (email + phone)
export const createContactColumn = <T,>(
  emailKey: keyof T,
  phoneKey: keyof T,
  title: string = 'Contact'
): ColumnDef<T> => ({
    id: 'contact',
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title={title} 
        searchable={true}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const email = row.getValue(emailKey as string) as string
      const phone = row.getValue(phoneKey as string) as string

      return (
        <div className="space-y-1">
          <div className="text-sm truncate">{email}</div>
          <div className="text-xs text-muted-foreground truncate">{phone}</div>
        </div>
      )
    }
  })

// Standard actions for common entities
export const createStandardActions = {
  view: (onView: (item: any) => void): ColumnAction => ({
    label: 'View details',
    icon: Eye,
    onClick: onView
  }),

  edit: (onEdit: (item: any) => void): ColumnAction => ({
    label: 'Edit',
    icon: Edit2,
    onClick: onEdit
  }),

  delete: (onDelete: (item: any) => void): ColumnAction => ({
    label: 'Delete',
    icon: Trash2,
    onClick: onDelete,
    variant: 'destructive' as const
  })
}
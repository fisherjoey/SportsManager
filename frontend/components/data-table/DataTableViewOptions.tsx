'use client'

import React from 'react'
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { MixerHorizontalIcon, DragHandleDots2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import {
  CSS
} from '@dnd-kit/utilities'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  maxVisibleColumns?: number
}

interface ColumnItem {
  id: string
  displayName: string
  isVisible: boolean
  column: any
  isAtLimit?: boolean
  visibleCount?: number
  maxVisibleColumns?: number
}

function SortableColumnItem({ id, displayName, isVisible, column, isAtLimit, visibleCount, maxVisibleColumns }: ColumnItem) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const handleCheckChange = (value: boolean) => {
    // If trying to enable a column while at limit, prevent it
    if (value && isAtLimit && !isVisible) {
      return // Block enabling new columns when at limit
    }
    // Allow disabling columns at any time, or enabling when under limit
    column.toggleVisibility(!!value)
  }

  // Disable checkbox if trying to enable while at limit
  const isDisabled = !isVisible && isAtLimit

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-sm"
      >
        <DragHandleDots2Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <Checkbox
        checked={isVisible}
        onCheckedChange={handleCheckChange}
        disabled={isDisabled}
        className="flex-shrink-0"
      />
      <span className={`flex-1 capitalize ${isDisabled ? 'text-muted-foreground' : ''}`}>{displayName}</span>
    </div>
  )
}

export function DataTableViewOptions<TData>({
  table,
  maxVisibleColumns
}: DataTableViewOptionsProps<TData>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Get columns that can be hidden
  const allColumns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== 'undefined' && column.getCanHide()
    )

  // Count visible columns
  const visibleCount = allColumns.filter(col => col.getIsVisible()).length
  const isAtLimit = maxVisibleColumns ? visibleCount >= maxVisibleColumns : false

  // Map column IDs to display names
  const columnNameMap: Record<string, string> = {
    id: 'Game #',
    homeTeam: 'Home Team',
    awayTeam: 'Away Team',
    date: 'Date & Time',
    location: 'Location',
    level: 'Level',
    division: 'Division',
    season: 'Season',
    wageMultiplier: 'Pay Modifier',
    status: 'Status',
    notes: 'Referees',
    // Referee columns
    name: 'Name',
    contact: 'Contact',
    certifications: 'Certifications',
    isAvailable: 'Status'
  }

  // Create ordered column items
  const [columnItems, setColumnItems] = React.useState<ColumnItem[]>(() =>
    allColumns.map((column) => ({
      id: column.id,
      displayName: columnNameMap[column.id] || column.id.replace(/_/g, ' '),
      isVisible: column.getIsVisible(),
      column,
      isAtLimit,
      visibleCount,
      maxVisibleColumns
    }))
  )

  // Update visibility when columns change
  React.useEffect(() => {
    setColumnItems(prev =>
      prev.map(item => ({
        ...item,
        isVisible: item.column.getIsVisible(),
        isAtLimit,
        visibleCount,
        maxVisibleColumns
      }))
    )
  }, [allColumns.map(c => c.getIsVisible()).join(','), isAtLimit, visibleCount, maxVisibleColumns])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setColumnItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newOrder = arrayMove(items, oldIndex, newIndex)

        // Apply the new column order to the table
        const columnOrder = newOrder.map(item => item.id)
        table.setColumnOrder(columnOrder)

        return newOrder
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <MixerHorizontalIcon className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Toggle & Reorder Columns</span>
            {maxVisibleColumns && (
              <span className={`text-xs font-normal ${isAtLimit ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {visibleCount}/{maxVisibleColumns}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        {maxVisibleColumns && isAtLimit && (
          <div className="px-2 py-1 text-xs text-orange-600 bg-orange-50 border-l-2 border-orange-600 mx-2 mb-2 rounded">
            Maximum columns reached
          </div>
        )}
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columnItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {columnItems.map((item) => (
                <SortableColumnItem
                  key={item.id}
                  id={item.id}
                  displayName={item.displayName}
                  isVisible={item.isVisible}
                  column={item.column}
                  isAtLimit={item.isAtLimit}
                  visibleCount={item.visibleCount}
                  maxVisibleColumns={item.maxVisibleColumns}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

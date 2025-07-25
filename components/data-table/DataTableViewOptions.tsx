"use client"

import React from "react"
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { MixerHorizontalIcon, DragHandleDots2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import {
  CSS,
} from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

interface ColumnItem {
  id: string
  displayName: string
  isVisible: boolean
  column: any
}

function SortableColumnItem({ id, displayName, isVisible, column }: ColumnItem) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

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
        onCheckedChange={(value) => column.toggleVisibility(!!value)}
        className="flex-shrink-0"
      />
      <span className="flex-1 capitalize">{displayName}</span>
    </div>
  )
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Get columns that can be hidden
  const allColumns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanHide()
    )

  // Map column IDs to display names
  const columnNameMap: Record<string, string> = {
    id: "Game #",
    homeTeam: "Home Team",
    awayTeam: "Away Team",
    date: "Date & Time", 
    location: "Location",
    level: "Level",
    division: "Division",
    season: "Season",
    wageMultiplier: "Pay Modifier",
    status: "Status",
    notes: "Referees",
    // Referee columns
    name: "Name",
    contact: "Contact",
    certifications: "Certifications", 
    isAvailable: "Status"
  }

  // Create ordered column items
  const [columnItems, setColumnItems] = React.useState<ColumnItem[]>(() => 
    allColumns.map((column) => ({
      id: column.id,
      displayName: columnNameMap[column.id] || column.id.replace(/_/g, " "),
      isVisible: column.getIsVisible(),
      column,
    }))
  )

  // Update visibility when columns change
  React.useEffect(() => {
    setColumnItems(prev => 
      prev.map(item => ({
        ...item,
        isVisible: item.column.getIsVisible()
      }))
    )
  }, [allColumns.map(c => c.getIsVisible()).join(',')])

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
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Toggle & Reorder Columns</DropdownMenuLabel>
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
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
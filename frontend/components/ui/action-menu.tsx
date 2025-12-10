/**
 * Action Menu Component
 *
 * Provides a dropdown menu for row actions in tables.
 * Ensures WCAG 2.1 AA compliance with 44x44px touch targets.
 * Better UX than multiple small icon buttons, especially on mobile.
 */

import { MoreVertical, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface Action {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
  separator?: boolean // Add separator after this item
}

interface ActionMenuProps {
  actions: Action[]
  triggerLabel?: string
  align?: 'start' | 'end' | 'center'
}

export function ActionMenu({
  actions,
  triggerLabel = 'Open menu',
  align = 'end'
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 min-h-[44px] min-w-[44px]"
        >
          <MoreVertical className="h-5 w-5" />
          <span className="sr-only">{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <div key={index}>
              <DropdownMenuItem
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  'cursor-pointer min-h-[44px]',
                  action.variant === 'destructive' &&
                    'text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400'
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{action.label}</span>
              </DropdownMenuItem>
              {action.separator && index < actions.length - 1 && (
                <DropdownMenuSeparator />
              )}
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Example usage:
 *
 * const gameActions: Action[] = [
 *   {
 *     label: 'View Details',
 *     icon: Eye,
 *     onClick: () => handleView(game.id)
 *   },
 *   {
 *     label: 'Edit Game',
 *     icon: Edit,
 *     onClick: () => handleEdit(game.id)
 *   },
 *   {
 *     label: 'Delete Game',
 *     icon: Trash2,
 *     onClick: () => handleDelete(game.id),
 *     variant: 'destructive',
 *     separator: true
 *   }
 * ]
 *
 * <ActionMenu actions={gameActions} />
 */

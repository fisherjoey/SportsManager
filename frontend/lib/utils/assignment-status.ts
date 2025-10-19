/**
 * Assignment Status Utilities
 *
 * Provides consistent status badge logic for referee assignments across the platform.
 * Fixes the bug where games show "Assigned" status when no referees are actually assigned.
 */

export type AssignmentStatus = 'unassigned' | 'partial' | 'assigned'

export interface AssignmentStatusInfo {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'warning' | 'success'
  description: string
}

/**
 * Determines the assignment status based on assigned vs required referees
 *
 * @param assigned - Number of referees currently assigned
 * @param required - Number of referees required for the game
 * @returns Status information including label, variant, and description
 *
 * @example
 * getAssignmentStatus(0, 2) // { label: 'Unassigned', variant: 'secondary', ... }
 * getAssignmentStatus(1, 2) // { label: 'Partial', variant: 'warning', ... }
 * getAssignmentStatus(2, 2) // { label: 'Assigned', variant: 'success', ... }
 */
export function getAssignmentStatus(
  assigned: number,
  required: number
): AssignmentStatusInfo {
  // No referees assigned yet
  if (assigned === 0) {
    return {
      label: 'Unassigned',
      variant: 'secondary',
      description: 'No referees assigned'
    }
  }

  // Some but not all referees assigned
  if (assigned < required) {
    return {
      label: 'Partial',
      variant: 'warning',
      description: `${assigned} of ${required} referees assigned`
    }
  }

  // All required referees assigned
  return {
    label: 'Assigned',
    variant: 'success',
    description: 'All referees assigned'
  }
}

/**
 * Get a formatted display string for referee assignment count
 *
 * @param assigned - Number of referees currently assigned
 * @param required - Number of referees required
 * @returns Formatted string like "2/3" or "0/1"
 */
export function getRefCountDisplay(assigned: number, required: number): string {
  return `${assigned}/${required}`
}

/**
 * Check if a game has all required referees assigned
 *
 * @param assigned - Number of referees currently assigned
 * @param required - Number of referees required
 * @returns true if fully assigned, false otherwise
 */
export function isFullyAssigned(assigned: number, required: number): boolean {
  return assigned >= required
}

/**
 * Check if a game has no referees assigned
 *
 * @param assigned - Number of referees currently assigned
 * @returns true if no referees assigned, false otherwise
 */
export function isUnassigned(assigned: number): boolean {
  return assigned === 0
}

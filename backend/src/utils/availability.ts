/**
 * Availability utility functions for the sports management system
 */

/**
 * Represents an availability window for a referee
 */
export interface AvailabilityWindow {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes?: string;
  recurring?: boolean;
  priority?: number;
}

/**
 * Represents a time window with start and end times
 */
export interface TimeWindow {
  start_time: string;
  end_time: string;
}

/**
 * Represents game time requirements
 */
export interface GameTime {
  start: string;
  end: string;
  date?: string;
}

/**
 * Base referee interface
 */
export interface BaseReferee {
  id: string;
  name: string;
  isAvailable: boolean;
}

/**
 * Referee with availability information
 */
export interface RefereeWithAvailability extends BaseReferee {
  availability?: AvailabilityWindow[];
  availabilityScore?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  experience_level?: string;
  certifications?: string[];
}

/**
 * Response format for availability endpoints
 */
export interface AvailabilityResponse {
  success: boolean;
  data: {
    refereeId: string;
    availability: AvailabilityWindow[];
    count: number;
  };
  message?: string;
}

/**
 * Game location interface for distance calculations
 */
export interface GameLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/**
 * Availability scoring criteria
 */
export interface AvailabilityScoring {
  baseScore: number;
  experienceBonus: number;
  locationBonus: number;
  maxScore: number;
}

/**
 * Validates an availability window object
 * @param window - The availability window to validate
 * @returns True if valid, false otherwise
 */
export function validateAvailabilityWindow(window: AvailabilityWindow): boolean {
  if (!window.date || !window.start_time || !window.end_time) {
    return false;
  }

  // Check time format (HH:MM format)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(window.start_time) || !timeRegex.test(window.end_time)) {
    return false;
  }

  // Check that end time is after start time
  if (window.start_time >= window.end_time) {
    return false;
  }

  return true;
}

/**
 * Checks if two time windows overlap
 * @param existing - Existing time window {start_time, end_time}
 * @param newWindow - New time window {start_time, end_time}
 * @returns True if windows overlap
 */
export function checkTimeOverlap(existing: TimeWindow, newWindow: TimeWindow): boolean {
  const existingStart = existing.start_time;
  const existingEnd = existing.end_time;
  const newStart = newWindow.start_time;
  const newEnd = newWindow.end_time;

  // Check for any overlap
  return (
    (newStart >= existingStart && newStart < existingEnd) ||  // New starts during existing
    (newEnd > existingStart && newEnd <= existingEnd) ||     // New ends during existing
    (newStart <= existingStart && newEnd >= existingEnd)     // New contains existing
  );
}

/**
 * Formats the availability response for API endpoints
 * @param refereeId - The referee ID
 * @param availability - Array of availability windows
 * @returns Formatted response object
 */
export function formatAvailabilityResponse(
  refereeId: string,
  availability: AvailabilityWindow[]
): AvailabilityResponse {
  return {
    success: true,
    data: {
      refereeId,
      availability,
      count: availability.length
    }
  };
}

/**
 * Calculates availability score for referee assignment
 * @param referee - Referee object with availability
 * @param gameTime - Game time window {start, end}
 * @param scoring - Optional scoring criteria
 * @returns Availability score (0-10)
 */
export function calculateAvailabilityScore(
  referee: RefereeWithAvailability,
  gameTime: GameTime,
  scoring: AvailabilityScoring = { baseScore: 10, experienceBonus: 0, locationBonus: 0, maxScore: 10 }
): number {
  if (!referee.availability || referee.availability.length === 0) {
    return 0;
  }

  // Check if referee is available during game time
  const isAvailable = referee.availability.some(window =>
    window.is_available &&
    checkTimeOverlap(
      { start_time: window.start_time, end_time: window.end_time },
      { start_time: gameTime.start, end_time: gameTime.end }
    )
  );

  if (!isAvailable) {
    return 0;
  }

  let score = scoring.baseScore;

  // Add experience bonus if applicable
  if (referee.experience_level === 'senior') {
    score += scoring.experienceBonus;
  }

  // Ensure score doesn't exceed maximum
  return Math.min(score, scoring.maxScore);
}

/**
 * Detects scheduling conflicts for a referee
 * @param availability - Referee's availability windows
 * @param gameTime - Proposed game time {start, end}
 * @returns True if there's a conflict
 */
export function hasSchedulingConflict(
  availability: AvailabilityWindow[],
  gameTime: GameTime
): boolean {
  return availability.some(window =>
    !window.is_available &&
    checkTimeOverlap(
      { start_time: window.start_time, end_time: window.end_time },
      { start_time: gameTime.start, end_time: gameTime.end }
    )
  );
}

/**
 * Finds the best available referees for a game
 * @param referees - List of referees with availability
 * @param gameTime - Game time requirements
 * @param gameLocation - Game location for distance calculation (optional)
 * @param maxResults - Maximum number of referees to return
 * @returns Sorted list of available referees
 */
export function findAvailableReferees(
  referees: RefereeWithAvailability[],
  gameTime: GameTime,
  gameLocation: GameLocation | null = null,
  maxResults?: number
): RefereeWithAvailability[] {
  const availableReferees = referees
    .filter(referee => {
      // Basic availability check
      if (!referee.isAvailable) {
        return false;
      }

      // Check for scheduling conflicts
      if (referee.availability && hasSchedulingConflict(referee.availability, gameTime)) {
        return false;
      }

      return true;
    })
    .map(referee => ({
      ...referee,
      availabilityScore: calculateAvailabilityScore(referee, gameTime)
    }))
    .sort((a, b) => {
      // Primary sort by availability score
      if (b.availabilityScore !== a.availabilityScore) {
        return b.availabilityScore - a.availabilityScore;
      }

      // Secondary sort by experience level
      const experienceOrder: Record<string, number> = {
        'senior': 3,
        'intermediate': 2,
        'junior': 1,
        'trainee': 0
      };

      const aExp = experienceOrder[a.experience_level || 'trainee'] || 0;
      const bExp = experienceOrder[b.experience_level || 'trainee'] || 0;

      return bExp - aExp;
    });

  // Apply maximum results limit if specified
  return maxResults ? availableReferees.slice(0, maxResults) : availableReferees;
}

/**
 * Calculates the duration of an availability window in minutes
 * @param window - The availability window
 * @returns Duration in minutes
 */
export function calculateWindowDuration(window: AvailabilityWindow): number {
  const start = new Date(`2000-01-01T${window.start_time}:00`);
  const end = new Date(`2000-01-01T${window.end_time}:00`);

  return (end.getTime() - start.getTime()) / (1000 * 60);
}

/**
 * Checks if a time falls within an availability window
 * @param time - Time to check (HH:MM format)
 * @param window - Availability window
 * @returns True if time falls within the window
 */
export function isTimeInWindow(time: string, window: AvailabilityWindow): boolean {
  return time >= window.start_time && time <= window.end_time;
}

/**
 * Merges overlapping availability windows
 * @param windows - Array of availability windows
 * @returns Array of merged windows
 */
export function mergeOverlappingWindows(windows: AvailabilityWindow[]): AvailabilityWindow[] {
  if (windows.length === 0) return [];

  // Sort windows by start time
  const sortedWindows = [...windows].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const merged: AvailabilityWindow[] = [sortedWindows[0]];

  for (let i = 1; i < sortedWindows.length; i++) {
    const current = sortedWindows[i];
    const last = merged[merged.length - 1];

    // Check if current window overlaps with the last merged window
    if (current.start_time <= last.end_time && current.is_available === last.is_available) {
      // Merge the windows
      last.end_time = current.end_time > last.end_time ? current.end_time : last.end_time;
    } else {
      // No overlap, add current window to merged array
      merged.push(current);
    }
  }

  return merged;
}

// Re-export interfaces for external use
export type {
  AvailabilityWindow as IAvailabilityWindow,
  TimeWindow as ITimeWindow,
  GameTime as IGameTime,
  RefereeWithAvailability as IRefereeWithAvailability,
  AvailabilityResponse as IAvailabilityResponse,
  GameLocation as IGameLocation
};
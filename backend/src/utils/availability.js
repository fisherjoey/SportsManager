/**
 * Availability utility functions for the sports management system
 */

/**
 * Validates an availability window object
 * @param {Object} window - The availability window to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateAvailabilityWindow(window) {
  if (!window.date || !window.start_time || !window.end_time) {
    return false;
  }

  // Check time format (basic validation)
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
 * @param {Object} existing - Existing time window {start_time, end_time}
 * @param {Object} newWindow - New time window {start_time, end_time}
 * @returns {boolean} - True if windows overlap
 */
function checkTimeOverlap(existing, newWindow) {
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
 * @param {string} refereeId - The referee ID
 * @param {Array} availability - Array of availability windows
 * @returns {Object} - Formatted response object
 */
function formatAvailabilityResponse(refereeId, availability) {
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
 * @param {Object} referee - Referee object with availability
 * @param {Object} gameTime - Game time window {start, end}
 * @returns {number} - Availability score (0-10)
 */
function calculateAvailabilityScore(referee, gameTime) {
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

  return isAvailable ? 10 : 0;
}

/**
 * Detects scheduling conflicts for a referee
 * @param {Array} availability - Referee's availability windows
 * @param {Object} gameTime - Proposed game time {start, end}
 * @returns {boolean} - True if there's a conflict
 */
function hasSchedulingConflict(availability, gameTime) {
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
 * @param {Array} referees - List of referees with availability
 * @param {Object} gameTime - Game time requirements
 * @param {Object} gameLocation - Game location for distance calculation
 * @returns {Array} - Sorted list of available referees
 */
function findAvailableReferees(referees, gameTime, gameLocation = null) {
  return referees
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
    .sort((a, b) => b.availabilityScore - a.availabilityScore);
}

module.exports = {
  validateAvailabilityWindow,
  checkTimeOverlap,
  formatAvailabilityResponse,
  calculateAvailabilityScore,
  hasSchedulingConflict,
  findAvailableReferees
};
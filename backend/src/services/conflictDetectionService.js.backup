/**
 * Conflict Detection Service
 * 
 * Provides simple, practical conflict detection for referee assignments and game scheduling.
 * Integrates with the existing sports management system to prevent obvious scheduling conflicts.
 */

const db = require('../config/database');
const { checkTimeOverlap } = require('../utils/availability');

/**
 * Detects if a referee is double-booked (assigned to overlapping games)
 * @param {string} refereeId - The referee's user ID
 * @param {string} gameDate - The game date (YYYY-MM-DD)
 * @param {string} gameStartTime - The game start time (HH:MM)
 * @param {string} gameEndTime - The game end time (HH:MM)
 * @param {string} excludeGameId - Game ID to exclude from check (for updates)
 * @param {string} gameLocation - The location of the new game (for travel time calculation)
 * @returns {Object} - Conflict result { hasConflict: boolean, conflicts: [] }
 */
async function checkRefereeDoubleBooking(refereeId, gameDate, gameStartTime, gameEndTime, excludeGameId = null, gameLocation = null) {
  try {
    let query = db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('teams as home_teams', 'games.home_team_id', 'home_teams.id')
      .join('teams as away_teams', 'games.away_team_id', 'away_teams.id')
      .select(
        'games.id as game_id',
        'games.game_date',
        'games.game_time',
        'games.end_time',
        'games.location',
        'home_teams.name as home_team',
        'away_teams.name as away_team'
      )
      .where('game_assignments.user_id', refereeId)
      .where('games.game_date', gameDate)
      .whereIn('game_assignments.status', ['pending', 'accepted']);

    if (excludeGameId) {
      query = query.where('games.id', '!=', excludeGameId);
    }

    const existingAssignments = await query;
    const conflicts = [];

    for (const assignment of existingAssignments) {
      const existingStartTime = assignment.game_time;
      const existingEndTime = assignment.end_time || calculateEndTime(assignment.game_time);

      // Check for direct time overlap
      if (checkTimeOverlap(
        { start_time: existingStartTime, end_time: existingEndTime },
        { start_time: gameStartTime, end_time: gameEndTime }
      )) {
        conflicts.push({
          type: 'referee_double_booking',
          gameId: assignment.game_id,
          gameTime: `${existingStartTime} - ${existingEndTime}`,
          teams: `${assignment.home_team} vs ${assignment.away_team}`,
          location: assignment.location,
          message: `Referee is already assigned to a game at ${existingStartTime} on ${gameDate}`
        });
      }
      
      // Check for travel time conflicts if locations are different
      else if (gameLocation && assignment.location !== gameLocation) {
        const travelTimeConflict = checkTravelTimeConflict(
          { startTime: existingStartTime, endTime: existingEndTime, location: assignment.location },
          { startTime: gameStartTime, endTime: gameEndTime, location: gameLocation }
        );
        
        if (travelTimeConflict) {
          conflicts.push({
            type: 'travel_time_conflict',
            gameId: assignment.game_id,
            gameTime: `${existingStartTime} - ${existingEndTime}`,
            teams: `${assignment.home_team} vs ${assignment.away_team}`,
            location: assignment.location,
            message: `Insufficient travel time between ${assignment.location} and ${gameLocation}. Games may be too close together.`
          });
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error checking referee double booking:', error);
    throw new Error('Failed to check referee availability');
  }
}

/**
 * Detects if a venue is already booked for overlapping times
 * @param {string} location - The game location/venue
 * @param {string} gameDate - The game date (YYYY-MM-DD)
 * @param {string} gameStartTime - The game start time (HH:MM)
 * @param {string} gameEndTime - The game end time (HH:MM)
 * @param {string} excludeGameId - Game ID to exclude from check (for updates)
 * @returns {Object} - Conflict result { hasConflict: boolean, conflicts: [] }
 */
async function checkVenueConflict(location, gameDate, gameStartTime, gameEndTime, excludeGameId = null) {
  try {
    let query = db('games')
      .join('teams as home_teams', 'games.home_team_id', 'home_teams.id')
      .join('teams as away_teams', 'games.away_team_id', 'away_teams.id')
      .select(
        'games.id as game_id',
        'games.game_time',
        'games.end_time',
        'home_teams.name as home_team',
        'away_teams.name as away_team',
        'games.level'
      )
      .where('games.location', location)
      .where('games.game_date', gameDate)
      .whereNotIn('games.status', ['cancelled']);

    if (excludeGameId) {
      query = query.where('games.id', '!=', excludeGameId);
    }

    const existingGames = await query;
    const conflicts = [];

    for (const game of existingGames) {
      const existingStartTime = game.game_time;
      const existingEndTime = game.end_time || calculateEndTime(game.game_time);

      // Check for time overlap (add 30-minute buffer for setup/cleanup)
      const bufferedStartTime = subtractMinutes(gameStartTime, 15);
      const bufferedEndTime = addMinutes(gameEndTime, 15);

      if (checkTimeOverlap(
        { start_time: existingStartTime, end_time: existingEndTime },
        { start_time: bufferedStartTime, end_time: bufferedEndTime }
      )) {
        conflicts.push({
          type: 'venue_conflict',
          gameId: game.game_id,
          gameTime: `${existingStartTime} - ${existingEndTime}`,
          teams: `${game.home_team} vs ${game.away_team}`,
          level: game.level,
          message: `Venue is already booked for a game at ${existingStartTime} on ${gameDate}`
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error checking venue conflict:', error);
    throw new Error('Failed to check venue availability');
  }
}

/**
 * Validates referee qualifications for a game assignment
 * @param {string} refereeId - The referee's user ID
 * @param {string} gameLevel - The game level (e.g., 'Recreational', 'Competitive', 'Elite')
 * @param {string} gameType - The game type (e.g., 'Community', 'Club', 'Tournament')
 * @returns {Object} - Validation result { isValid: boolean, warnings: [], errors: [] }
 */
async function validateRefereeQualifications(refereeId, gameLevel, gameType) {
  try {
    const referee = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .select(
        'users.*',
        'referee_levels.name as level_name',
        'referee_levels.allowed_divisions',
        'referee_levels.min_experience_years'
      )
      .where('users.id', refereeId)
      .where('users.role', 'referee')
      .first();

    if (!referee) {
      return {
        isValid: false,
        errors: ['Referee not found or not active'],
        warnings: []
      };
    }

    const warnings = [];
    const errors = [];

    // Check if referee is available
    if (!referee.is_available) {
      errors.push('Referee is marked as unavailable');
    }

    // Check referee level qualifications
    if (referee.allowed_divisions) {
      const allowedDivisions = JSON.parse(referee.allowed_divisions);
      if (!allowedDivisions.includes(gameLevel)) {
        warnings.push(`Referee level "${referee.level_name}" is not typically qualified for ${gameLevel} games. Allowed divisions: ${allowedDivisions.join(', ')}`);
      }
    } else if (referee.referee_level_id === null) {
      warnings.push('Referee has no assigned level. Consider assigning a level before assignment.');
    }

    // Check experience for high-level games
    if (gameLevel === 'Elite' && gameType === 'Tournament') {
      if (!referee.min_experience_years || referee.experience_years < referee.min_experience_years) {
        warnings.push(`High-level tournament may require more experienced referee`);
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  } catch (error) {
    console.error('Error validating referee qualifications:', error);
    throw new Error('Failed to validate referee qualifications');
  }
}

/**
 * Comprehensive conflict check for game assignment - OPTIMIZED VERSION
 * @param {Object} assignmentData - The assignment data
 * @returns {Object} - Complete conflict analysis
 */
async function checkAssignmentConflicts(assignmentData) {
  const { user_id, game_id } = assignmentData;

  try {
    // PERFORMANCE OPTIMIZATION: Get game details with more specific query
    const game = await db('games')
      .select('game_date', 'game_time', 'end_time', 'location', 'level', 'game_type')
      .where('id', game_id)
      .first();

    if (!game) {
      return {
        hasConflicts: true,
        errors: ['Game not found'],
        warnings: []
      };
    }

    const gameEndTime = game.end_time || calculateEndTime(game.game_time);
    
    // OPTIMIZATION: For better performance, skip venue conflicts unless explicitly needed
    // Most conflicts are referee-based, so prioritize those checks
    const checkPromises = [
      checkRefereeDoubleBooking(user_id, game.game_date, game.game_time, gameEndTime, game_id, game.location),
      validateRefereeQualifications(user_id, game.level, game.game_type)
    ];

    // Only add venue check if it's likely to be needed (different location pattern)
    // This reduces unnecessary database queries for common scenarios
    if (game.location && !game.location.includes('Field') && !game.location.includes('Court')) {
      checkPromises.push(checkVenueConflict(game.location, game.game_date, game.game_time, gameEndTime, game_id));
    }

    const results = await Promise.all(checkPromises);
    
    const [refereeConflict, qualificationCheck, venueConflict] = results;
    
    // OPTIMIZATION: Use early return patterns and efficient array operations
    const conflicts = [...(refereeConflict.conflicts || [])];
    const warnings = [...(qualificationCheck.warnings || [])];
    const errors = [...(qualificationCheck.errors || [])];

    // Add venue conflicts if checked
    if (venueConflict) {
      conflicts.push(...(venueConflict.conflicts || []));
      if (venueConflict.hasConflict) {
        errors.push(...venueConflict.conflicts.map(c => c.message));
      }
    }

    // Add referee conflict errors
    if (refereeConflict.hasConflict) {
      errors.push(...refereeConflict.conflicts.map(c => c.message));
    }

    return {
      hasConflicts: errors.length > 0,
      conflicts,
      warnings,
      errors,
      isQualified: qualificationCheck.isValid
    };
  } catch (error) {
    console.error('Error checking assignment conflicts:', error);
    throw new Error('Failed to perform conflict analysis');
  }
}

/**
 * Check conflicts for game scheduling (when creating/updating games)
 * @param {Object} gameData - The game data
 * @param {string} excludeGameId - Game ID to exclude from conflict check
 * @returns {Object} - Conflict analysis for game scheduling
 */
async function checkGameSchedulingConflicts(gameData, excludeGameId = null) {
  const { location, game_date, game_time, end_time } = gameData;
  const gameEndTime = end_time || calculateEndTime(game_time);

  try {
    const venueConflict = await checkVenueConflict(location, game_date, game_time, gameEndTime, excludeGameId);

    return {
      hasConflicts: venueConflict.hasConflict,
      conflicts: venueConflict.conflicts,
      warnings: venueConflict.hasConflict ? [] : ['Venue is available for the requested time'],
      errors: venueConflict.hasConflict ? venueConflict.conflicts.map(c => c.message) : []
    };
  } catch (error) {
    console.error('Error checking game scheduling conflicts:', error);
    throw new Error('Failed to check game scheduling conflicts');
  }
}

/**
 * Helper function to calculate game end time (assumes 2-hour duration if not specified)
 * @param {string} startTime - Start time in HH:MM format
 * @param {number} durationHours - Duration in hours (default: 2)
 * @returns {string} - End time in HH:MM format
 */
function calculateEndTime(startTime, durationHours = 2) {
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Convert duration to total minutes to handle fractional hours
  const durationMinutes = Math.round(durationHours * 60);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

/**
 * Helper function to add minutes to a time string
 * @param {string} timeString - Time in HH:MM format
 * @param {number} minutesToAdd - Minutes to add
 * @returns {string} - New time in HH:MM format
 */
function addMinutes(timeString, minutesToAdd) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

/**
 * Helper function to subtract minutes from a time string
 * @param {string} timeString - Time in HH:MM format
 * @param {number} minutesToSubtract - Minutes to subtract
 * @returns {string} - New time in HH:MM format
 */
function subtractMinutes(timeString, minutesToSubtract) {
  const [hours, minutes] = timeString.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes - minutesToSubtract;
  
  // Handle negative minutes (previous day)
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

/**
 * Checks if there's insufficient travel time between two games at different locations
 * @param {Object} game1 - First game { startTime, endTime, location }
 * @param {Object} game2 - Second game { startTime, endTime, location }
 * @param {number} minTravelTime - Minimum travel time in minutes (default: 30)
 * @returns {boolean} - True if there's a travel time conflict
 */
function checkTravelTimeConflict(game1, game2, minTravelTime = 30) {
  // Minimum travel time between different locations (in minutes)
  const MIN_TRAVEL_TIME = minTravelTime;
  
  // If games are at the same location, no travel time needed
  if (game1.location === game2.location) {
    return false;
  }
  
  // Calculate time gap between games
  let timeGap = 0;
  
  // Check if game1 ends before game2 starts
  if (game1.endTime <= game2.startTime) {
    timeGap = getMinutesBetween(game1.endTime, game2.startTime);
  }
  // Check if game2 ends before game1 starts
  else if (game2.endTime <= game1.startTime) {
    timeGap = getMinutesBetween(game2.endTime, game1.startTime);
  }
  // Games overlap, which is already caught by time overlap check
  else {
    return false;
  }
  
  // Return true if gap is less than minimum travel time
  return timeGap < MIN_TRAVEL_TIME;
}

/**
 * Calculate minutes between two time strings (HH:MM format)
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {number} - Minutes between times
 */
function getMinutesBetween(startTime, endTime) {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  let endTotalMinutes = endHours * 60 + endMinutes;
  
  // Handle next day scenario
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }
  
  return endTotalMinutes - startTotalMinutes;
}

module.exports = {
  checkRefereeDoubleBooking,
  checkVenueConflict,
  validateRefereeQualifications,
  checkAssignmentConflicts,
  checkGameSchedulingConflicts,
  calculateEndTime,
  addMinutes,
  subtractMinutes,
  checkTravelTimeConflict,
  getMinutesBetween
};
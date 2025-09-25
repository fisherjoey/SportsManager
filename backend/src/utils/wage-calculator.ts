// @ts-nocheck

/**
 * Calculate the final wage for a referee assignment
 * @param {number} refereeWage - The referee's base wage per game
 * @param {number} gameMultiplier - The game's wage multiplier (default: 1.0)
 * @param {string} paymentModel - Payment model: 'INDIVIDUAL' or 'FLAT_RATE'
 * @param {number} defaultGameRate - Default game rate for flat rate model
 * @param {number} assignedRefereesCount - Number of referees assigned to the game
 * @returns {number} The calculated final wage
 */
function calculateFinalWage(refereeWage, gameMultiplier = 1.0, paymentModel = 'INDIVIDUAL', defaultGameRate = null, assignedRefereesCount = 1) {
  if (paymentModel === 'FLAT_RATE') {
    if (!defaultGameRate || defaultGameRate <= 0 || !assignedRefereesCount || assignedRefereesCount <= 0) {
      return 0;
    }
    return Math.round((defaultGameRate / assignedRefereesCount) * 100) / 100;
  }
  
  // INDIVIDUAL payment model (original logic)
  if (!refereeWage || refereeWage <= 0) {
    return 0;
  }
  
  if (!gameMultiplier || gameMultiplier <= 0) {
    gameMultiplier = 1.0;
  }
  
  return Math.round((refereeWage * gameMultiplier) * 100) / 100; // Round to 2 decimal places
}

/**
 * Get wage calculation details for display
 * @param {number} refereeWage - The referee's base wage per game
 * @param {number} gameMultiplier - The game's wage multiplier
 * @param {string} multiplierReason - Optional reason for the multiplier
 * @param {string} paymentModel - Payment model: 'INDIVIDUAL' or 'FLAT_RATE'
 * @param {number} defaultGameRate - Default game rate for flat rate model
 * @param {number} assignedRefereesCount - Number of referees assigned to the game
 * @returns {object} Wage calculation breakdown
 */
function getWageBreakdown(refereeWage, gameMultiplier = 1.0, multiplierReason = '', paymentModel = 'INDIVIDUAL', defaultGameRate = null, assignedRefereesCount = 1) {
  const finalWage = calculateFinalWage(refereeWage, gameMultiplier, paymentModel, defaultGameRate, assignedRefereesCount);
  
  if (paymentModel === 'FLAT_RATE') {
    return {
      baseWage: defaultGameRate,
      multiplier: 1,
      multiplierReason: '',
      finalWage,
      isMultiplied: false,
      calculation: assignedRefereesCount > 1 ? `$${defaultGameRate} ÷ ${assignedRefereesCount} referees = $${finalWage}` : `$${finalWage}`,
      paymentModel: 'FLAT_RATE',
      assignedRefereesCount
    };
  }
  
  return {
    baseWage: refereeWage,
    multiplier: gameMultiplier,
    multiplierReason,
    finalWage,
    isMultiplied: gameMultiplier !== 1.0,
    calculation: gameMultiplier !== 1.0 ? `$${refereeWage} × ${gameMultiplier} = $${finalWage}` : `$${finalWage}`,
    paymentModel: 'INDIVIDUAL'
  };
}

export {
  calculateFinalWage,
  getWageBreakdown
};
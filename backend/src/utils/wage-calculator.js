/**
 * Calculate the final wage for a referee assignment
 * @param {number} refereeWage - The referee's base wage per game
 * @param {number} gameMultiplier - The game's wage multiplier (default: 1.0)
 * @returns {number} The calculated final wage
 */
function calculateFinalWage(refereeWage, gameMultiplier = 1.0) {
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
 * @returns {object} Wage calculation breakdown
 */
function getWageBreakdown(refereeWage, gameMultiplier = 1.0, multiplierReason = '') {
  const finalWage = calculateFinalWage(refereeWage, gameMultiplier);
  
  return {
    baseWage: refereeWage,
    multiplier: gameMultiplier,
    multiplierReason,
    finalWage,
    isMultiplied: gameMultiplier !== 1.0,
    calculation: gameMultiplier !== 1.0 ? `$${refereeWage} × ${gameMultiplier} = $${finalWage}` : `$${finalWage}`
  };
}

module.exports = {
  calculateFinalWage,
  getWageBreakdown
};
/**
 * Batching utilities for processing large datasets efficiently
 */

const logger = require('./logger');
const aiConfig = require('../config/aiConfig');

class BatchProcessor {
  constructor() {
    const config = aiConfig.getBatchingConfig();
    this.maxGamesPerBatch = config.maxGamesPerBatch;
    this.maxRefereesPerBatch = config.maxRefereesPerBatch;
    this.batchTimeout = config.batchTimeout;
    this.enabled = config.enabled;
  }

  /**
   * Process games and referees in optimal batches
   * @param {Array} games - Games to process
   * @param {Array} referees - Available referees
   * @param {Function} processor - Function to process each batch
   * @param {Object} context - Additional context for logging
   * @returns {Promise<Array>} Combined results from all batches
   */
  async processBatches(games, referees, processor, context = {}) {
    if (!this.enabled || games.length <= this.maxGamesPerBatch) {
      // Process as single batch if batching disabled or small dataset
      logger.logDebug('Processing as single batch', {
        component: 'BatchProcessor',
        gamesCount: games.length,
        refereesCount: referees.length,
        ...context
      });
      
      return await processor(games, referees);
    }

    logger.logInfo('Starting batch processing', {
      component: 'BatchProcessor',
      totalGames: games.length,
      totalReferees: referees.length,
      maxGamesPerBatch: this.maxGamesPerBatch,
      maxRefereesPerBatch: this.maxRefereesPerBatch,
      ...context
    });

    const batches = this.createOptimalBatches(games, referees);
    const results = [];
    const errors = [];

    // Process batches sequentially to avoid overwhelming the AI service
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchContext = {
        ...context,
        batchNumber: i + 1,
        totalBatches: batches.length
      };

      try {
        logger.logDebug('Processing batch', {
          component: 'BatchProcessor',
          ...batchContext,
          gamesInBatch: batch.games.length,
          refereesInBatch: batch.referees.length
        });

        const batchStartTime = Date.now();
        const batchResult = await Promise.race([
          processor(batch.games, batch.referees),
          this.createTimeoutPromise(this.batchTimeout)
        ]);

        const batchDuration = Date.now() - batchStartTime;
        
        logger.logInfo('Batch processed successfully', {
          component: 'BatchProcessor',
          ...batchContext,
          duration: batchDuration,
          resultCount: Array.isArray(batchResult) ? batchResult.length : 1
        });

        if (Array.isArray(batchResult)) {
          results.push(...batchResult);
        } else if (batchResult) {
          results.push(batchResult);
        }

      } catch (error) {
        logger.logError('Batch processing failed', {
          component: 'BatchProcessor',
          ...batchContext
        }, error);

        errors.push({
          batchNumber: i + 1,
          error: error.message,
          gamesCount: batch.games.length
        });

        // Continue processing other batches even if one fails
      }
    }

    logger.logInfo('Batch processing completed', {
      component: 'BatchProcessor',
      totalResults: results.length,
      totalErrors: errors.length,
      successfulBatches: batches.length - errors.length,
      ...context
    });

    return {
      results,
      errors,
      batchInfo: {
        totalBatches: batches.length,
        successfulBatches: batches.length - errors.length,
        failedBatches: errors.length
      }
    };
  }

  /**
   * Create optimal batches considering game proximity and referee availability
   * @private
   */
  createOptimalBatches(games, referees) {
    const batches = [];
    
    // Group games by date and location for better batching
    const gameGroups = this.groupGamesByProximity(games);
    
    for (const group of gameGroups) {
      const groupGames = group.games;
      
      // Split large groups into smaller batches
      for (let i = 0; i < groupGames.length; i += this.maxGamesPerBatch) {
        const batchGames = groupGames.slice(i, i + this.maxGamesPerBatch);
        
        // Find referees relevant to this batch (by location/availability)
        const relevantReferees = this.findRelevantReferees(batchGames, referees);
        
        batches.push({
          games: batchGames,
          referees: relevantReferees,
          metadata: {
            gameDate: group.date,
            primaryLocation: group.primaryLocation,
            gameCount: batchGames.length,
            refereeCount: relevantReferees.length
          }
        });
      }
    }

    return batches;
  }

  /**
   * Group games by proximity (date and location)
   * @private
   */
  groupGamesByProximity(games) {
    const groups = new Map();

    for (const game of games) {
      const date = game.game_date;
      const location = this.normalizeLocation(game.location || '');
      const postalPrefix = this.getPostalPrefix(game.postal_code || '');
      
      // Create a grouping key based on date and location proximity
      const key = `${date}_${postalPrefix}_${location.substring(0, 10)}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          date,
          primaryLocation: location,
          postalPrefix,
          games: []
        });
      }
      
      groups.get(key).games.push(game);
    }

    return Array.from(groups.values());
  }

  /**
   * Find referees relevant to a batch of games
   * @private
   */
  findRelevantReferees(games, referees) {
    const gamePostalPrefixes = new Set();
    const gameDates = new Set();
    
    // Extract relevant criteria from games
    for (const game of games) {
      if (game.postal_code) {
        gamePostalPrefixes.add(this.getPostalPrefix(game.postal_code));
      }
      if (game.game_date) {
        gameDates.add(game.game_date);
      }
    }

    // Filter referees by relevance
    const relevantReferees = referees.filter(referee => {
      // Include referee if they're in the same postal area
      if (referee.postal_code) {
        const refPostalPrefix = this.getPostalPrefix(referee.postal_code);
        if (gamePostalPrefixes.has(refPostalPrefix)) {
          return true;
        }
      }
      
      // Always include highly experienced referees
      if (referee.level === 'Senior' || referee.level === 'Elite') {
        return true;
      }
      
      // Include if explicitly available for any of the game dates
      // (This would require availability data - simplified for now)
      return true;
    });

    // Limit to max referees per batch if too many
    if (relevantReferees.length > this.maxRefereesPerBatch) {
      // Sort by relevance and take the top referees
      const sortedReferees = relevantReferees.sort((a, b) => {
        // Prioritize higher levels
        const levelPriority = { 'Elite': 4, 'Senior': 3, 'Junior': 2, 'Rookie': 1 };
        const aLevel = levelPriority[a.level] || 1;
        const bLevel = levelPriority[b.level] || 1;
        
        if (aLevel !== bLevel) {
          return bLevel - aLevel;
        }
        
        // Then by experience
        return (b.experience || 1) - (a.experience || 1);
      });
      
      return sortedReferees.slice(0, this.maxRefereesPerBatch);
    }

    return relevantReferees;
  }

  /**
   * Normalize location string for grouping
   * @private
   */
  normalizeLocation(location) {
    return location.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get postal code prefix for proximity grouping
   * @private
   */
  getPostalPrefix(postalCode) {
    if (!postalCode) {
      return '';
    }
    return postalCode.replace(/\s/g, '').toUpperCase().substring(0, 3);
  }

  /**
   * Create a timeout promise for batch processing
   * @private
   */
  createTimeoutPromise(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Batch processing timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Update batch configuration
   * @param {Object} config - New configuration options
   */
  updateConfig(config) {
    if (config.maxGamesPerBatch) {
      this.maxGamesPerBatch = config.maxGamesPerBatch;
    }
    if (config.maxRefereesPerBatch) {
      this.maxRefereesPerBatch = config.maxRefereesPerBatch;
    }
    if (config.batchTimeout) {
      this.batchTimeout = config.batchTimeout;
    }
    if (typeof config.enabled === 'boolean') {
      this.enabled = config.enabled;
    }
  }
}

// Export singleton instance
module.exports = new BatchProcessor();
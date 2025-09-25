/**
 * AI Service Configuration Management
 * Centralized configuration for AI assignment system
 */

const fs = require('fs');
const path = require('path');

class AIConfig {
  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from environment variables and config file
   * @private
   */
  loadConfiguration() {
    const defaultConfig = {
      // Assignment weight factors
      assignmentWeights: {
        proximity: parseFloat(process.env.AI_WEIGHT_PROXIMITY) || 0.3,
        availability: parseFloat(process.env.AI_WEIGHT_AVAILABILITY) || 0.4,
        experience: parseFloat(process.env.AI_WEIGHT_EXPERIENCE) || 0.2,
        performance: parseFloat(process.env.AI_WEIGHT_PERFORMANCE) || 0.1
      },

      // Assignment constraints
      constraints: {
        maxDistance: parseInt(process.env.AI_MAX_DISTANCE, 10) || 50, // km
        minConfidence: parseFloat(process.env.AI_MIN_CONFIDENCE) || 0.3,
        maxGamesPerDay: parseInt(process.env.AI_MAX_GAMES_PER_DAY, 10) || 4,
        maxGamesPerWeek: parseInt(process.env.AI_MAX_GAMES_PER_WEEK, 10) || 15,
        minRestBetweenGames: parseInt(process.env.AI_MIN_REST_MINUTES, 10) || 45, // minutes
        avoidBackToBack: process.env.AI_AVOID_BACK_TO_BACK !== 'false',
        prioritizeExperience: process.env.AI_PRIORITIZE_EXPERIENCE !== 'false'
      },

      // LLM service settings
      llmService: {
        provider: process.env.AI_PROVIDER || 'auto', // 'openai', 'deepseek', or 'auto'
        model: {
          openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          deepseek: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
        },
        timeout: parseInt(process.env.AI_TIMEOUT, 10) || 60000, // ms
        maxRetries: parseInt(process.env.AI_MAX_RETRIES, 10) || 3,
        temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.1,
        maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10) || 4000
      },

      // Caching settings
      caching: {
        enabled: process.env.AI_CACHE_ENABLED !== 'false',
        maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE, 10) || 100,
        ttl: parseInt(process.env.AI_CACHE_TTL, 10) || 3600, // seconds
        memoryLimit: parseInt(process.env.AI_CACHE_MEMORY_MB, 10) || 50 // MB
      },

      // Batching settings
      batching: {
        enabled: process.env.AI_BATCHING_ENABLED !== 'false',
        maxGamesPerBatch: parseInt(process.env.AI_MAX_GAMES_PER_BATCH, 10) || 10,
        maxRefereesPerBatch: parseInt(process.env.AI_MAX_REFEREES_PER_BATCH, 10) || 50,
        batchTimeout: parseInt(process.env.AI_BATCH_TIMEOUT, 10) || 30000 // ms
      },

      // Performance monitoring
      monitoring: {
        enabled: process.env.AI_MONITORING_ENABLED !== 'false',
        logSlowRequests: parseInt(process.env.AI_LOG_SLOW_REQUESTS_MS, 10) || 5000,
        trackMetrics: process.env.AI_TRACK_METRICS !== 'false',
        alertThresholds: {
          errorRate: parseFloat(process.env.AI_ALERT_ERROR_RATE) || 0.1, // 10%
          avgLatency: parseInt(process.env.AI_ALERT_AVG_LATENCY_MS, 10) || 10000, // 10s
          p95Latency: parseInt(process.env.AI_ALERT_P95_LATENCY_MS, 10) || 20000 // 20s
        }
      }
    };

    // Try to load config file if it exists
    const configFile = path.join(process.cwd(), 'config', 'ai-config.json');
    if (fs.existsSync(configFile)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        return this.mergeConfigs(defaultConfig, fileConfig);
      } catch (error) {
        console.warn('Failed to load AI config file, using defaults:', error.message);
      }
    }

    return defaultConfig;
  }

  /**
   * Deep merge configuration objects
   * @private
   */
  mergeConfigs(defaults, overrides) {
    const result = { ...defaults };
    
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.mergeConfigs(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Get assignment weights
   * @returns {Object} Assignment weights configuration
   */
  getAssignmentWeights() {
    return { ...this.config.assignmentWeights };
  }

  /**
   * Get assignment constraints
   * @returns {Object} Assignment constraints configuration
   */
  getConstraints() {
    return { ...this.config.constraints };
  }

  /**
   * Get LLM service configuration
   * @returns {Object} LLM service configuration
   */
  getLLMConfig() {
    return { ...this.config.llmService };
  }

  /**
   * Get caching configuration
   * @returns {Object} Caching configuration
   */
  getCachingConfig() {
    return { ...this.config.caching };
  }

  /**
   * Get batching configuration
   * @returns {Object} Batching configuration
   */
  getBatchingConfig() {
    return { ...this.config.batching };
  }

  /**
   * Get monitoring configuration
   * @returns {Object} Monitoring configuration
   */
  getMonitoringConfig() {
    return { ...this.config.monitoring };
  }

  /**
   * Validate configuration values
   * @returns {Array} Array of validation errors
   */
  validateConfig() {
    const errors = [];
    const weights = this.config.assignmentWeights;
    
    // Validate assignment weights sum to 1.0 (±0.01 tolerance)
    const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      errors.push(`Assignment weights sum to ${weightSum.toFixed(3)}, expected 1.0`);
    }

    // Validate weight ranges
    for (const [key, value] of Object.entries(weights)) {
      if (value < 0 || value > 1) {
        errors.push(`Assignment weight '${key}' is ${value}, must be between 0 and 1`);
      }
    }

    // Validate constraint ranges
    const constraints = this.config.constraints;
    if (constraints.maxDistance < 0) {
      errors.push('maxDistance must be positive');
    }
    if (constraints.minConfidence < 0 || constraints.minConfidence > 1) {
      errors.push('minConfidence must be between 0 and 1');
    }
    if (constraints.maxGamesPerDay < 1) {
      errors.push('maxGamesPerDay must be at least 1');
    }
    if (constraints.minRestBetweenGames < 0) {
      errors.push('minRestBetweenGames must be non-negative');
    }

    // Validate LLM settings
    const llm = this.config.llmService;
    if (llm.timeout < 1000) {
      errors.push('LLM timeout must be at least 1000ms');
    }
    if (llm.maxRetries < 0) {
      errors.push('LLM maxRetries must be non-negative');
    }
    if (llm.temperature < 0 || llm.temperature > 2) {
      errors.push('LLM temperature must be between 0 and 2');
    }

    return errors;
  }

  /**
   * Update configuration at runtime
   * @param {Object} updates - Configuration updates
   * @returns {boolean} Whether update was successful
   */
  updateConfig(updates) {
    try {
      const newConfig = this.mergeConfigs(this.config, updates);
      
      // Validate new configuration
      const tempConfig = this.config;
      this.config = newConfig;
      const errors = this.validateConfig();
      
      if (errors.length > 0) {
        this.config = tempConfig; // Rollback
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to update AI configuration:', error.message);
      return false;
    }
  }

  /**
   * Get current configuration as JSON
   * @returns {Object} Current configuration
   */
  toJSON() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Save current configuration to file
   * @param {string} filepath - File path to save to
   */
  saveToFile(filepath) {
    const configDir = path.dirname(filepath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(this.config, null, 2));
  }
}

// Export singleton instance
module.exports = new AIConfig();
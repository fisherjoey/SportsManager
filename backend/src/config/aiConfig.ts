/**
 * @fileoverview AI Service Configuration Management
 * @description TypeScript AI configuration with comprehensive type safety and validation
 */

import * as fs from 'fs';
import * as path from 'path';

// AI Provider types
export type AIProvider = 'openai' | 'deepseek' | 'auto';

// Model configuration interfaces
export interface ModelConfig {
  openai: string;
  deepseek: string;
}

// Assignment weight configuration
export interface AssignmentWeights {
  proximity: number;
  availability: number;
  experience: number;
  performance: number;
}

// Assignment constraints configuration
export interface AssignmentConstraints {
  maxDistance: number;
  minConfidence: number;
  maxGamesPerDay: number;
  maxGamesPerWeek: number;
  minRestBetweenGames: number;
  avoidBackToBack: boolean;
  prioritizeExperience: boolean;
}

// LLM service configuration
export interface LLMServiceConfig {
  provider: AIProvider;
  model: ModelConfig;
  timeout: number;
  maxRetries: number;
  temperature: number;
  maxTokens: number;
}

// Caching configuration
export interface CachingConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  memoryLimit: number;
}

// Batching configuration
export interface BatchingConfig {
  enabled: boolean;
  maxGamesPerBatch: number;
  maxRefereesPerBatch: number;
  batchTimeout: number;
}

// Monitoring alert thresholds
export interface AlertThresholds {
  errorRate: number;
  avgLatency: number;
  p95Latency: number;
}

// Monitoring configuration
export interface MonitoringConfig {
  enabled: boolean;
  logSlowRequests: number;
  trackMetrics: boolean;
  alertThresholds: AlertThresholds;
}

// Main AI configuration interface
export interface AIConfigData {
  assignmentWeights: AssignmentWeights;
  constraints: AssignmentConstraints;
  llmService: LLMServiceConfig;
  caching: CachingConfig;
  batching: BatchingConfig;
  monitoring: MonitoringConfig;
}

// Configuration update interface
export interface ConfigUpdates {
  assignmentWeights?: Partial<AssignmentWeights>;
  constraints?: Partial<AssignmentConstraints>;
  llmService?: Partial<LLMServiceConfig>;
  caching?: Partial<CachingConfig>;
  batching?: Partial<BatchingConfig>;
  monitoring?: Partial<MonitoringConfig>;
}

// Environment variable helpers with type safety
const parseFloat = (value: string | undefined, defaultValue: number): number => {
  const parsed = value ? Number.parseFloat(value) : NaN;
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const parseInt = (value: string | undefined, defaultValue: number): number => {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value !== 'false';
};

export class AIConfig {
  private config: AIConfigData;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from environment variables and config file
   */
  private loadConfiguration(): AIConfigData {
    const defaultConfig: AIConfigData = {
      // Assignment weight factors
      assignmentWeights: {
        proximity: parseFloat(process.env.AI_WEIGHT_PROXIMITY, 0.3),
        availability: parseFloat(process.env.AI_WEIGHT_AVAILABILITY, 0.4),
        experience: parseFloat(process.env.AI_WEIGHT_EXPERIENCE, 0.2),
        performance: parseFloat(process.env.AI_WEIGHT_PERFORMANCE, 0.1)
      },

      // Assignment constraints
      constraints: {
        maxDistance: parseInt(process.env.AI_MAX_DISTANCE, 50), // km
        minConfidence: parseFloat(process.env.AI_MIN_CONFIDENCE, 0.3),
        maxGamesPerDay: parseInt(process.env.AI_MAX_GAMES_PER_DAY, 4),
        maxGamesPerWeek: parseInt(process.env.AI_MAX_GAMES_PER_WEEK, 15),
        minRestBetweenGames: parseInt(process.env.AI_MIN_REST_MINUTES, 45), // minutes
        avoidBackToBack: parseBoolean(process.env.AI_AVOID_BACK_TO_BACK, true),
        prioritizeExperience: parseBoolean(process.env.AI_PRIORITIZE_EXPERIENCE, true)
      },

      // LLM service settings
      llmService: {
        provider: this.parseAIProvider(process.env.AI_PROVIDER, 'auto'),
        model: {
          openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          deepseek: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
        },
        timeout: parseInt(process.env.AI_TIMEOUT, 60000), // ms
        maxRetries: parseInt(process.env.AI_MAX_RETRIES, 3),
        temperature: parseFloat(process.env.AI_TEMPERATURE, 0.1),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS, 4000)
      },

      // Caching settings
      caching: {
        enabled: parseBoolean(process.env.AI_CACHE_ENABLED, true),
        maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE, 100),
        ttl: parseInt(process.env.AI_CACHE_TTL, 3600), // seconds
        memoryLimit: parseInt(process.env.AI_CACHE_MEMORY_MB, 50) // MB
      },

      // Batching settings
      batching: {
        enabled: parseBoolean(process.env.AI_BATCHING_ENABLED, true),
        maxGamesPerBatch: parseInt(process.env.AI_MAX_GAMES_PER_BATCH, 10),
        maxRefereesPerBatch: parseInt(process.env.AI_MAX_REFEREES_PER_BATCH, 50),
        batchTimeout: parseInt(process.env.AI_BATCH_TIMEOUT, 30000) // ms
      },

      // Performance monitoring
      monitoring: {
        enabled: parseBoolean(process.env.AI_MONITORING_ENABLED, true),
        logSlowRequests: parseInt(process.env.AI_LOG_SLOW_REQUESTS_MS, 5000),
        trackMetrics: parseBoolean(process.env.AI_TRACK_METRICS, true),
        alertThresholds: {
          errorRate: parseFloat(process.env.AI_ALERT_ERROR_RATE, 0.1), // 10%
          avgLatency: parseInt(process.env.AI_ALERT_AVG_LATENCY_MS, 10000), // 10s
          p95Latency: parseInt(process.env.AI_ALERT_P95_LATENCY_MS, 20000) // 20s
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
        console.warn('Failed to load AI config file, using defaults:', (error as Error).message);
      }
    }

    return defaultConfig;
  }

  /**
   * Parse AI provider with validation
   */
  private parseAIProvider(value: string | undefined, defaultValue: AIProvider): AIProvider {
    if (!value) return defaultValue;

    const validProviders: AIProvider[] = ['openai', 'deepseek', 'auto'];
    return validProviders.includes(value as AIProvider) ? value as AIProvider : defaultValue;
  }

  /**
   * Deep merge configuration objects with type safety
   */
  private mergeConfigs<T extends Record<string, any>>(defaults: T, overrides: Partial<T>): T {
    const result = { ...defaults };

    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key as keyof T] = this.mergeConfigs(result[key] || {}, value);
      } else {
        result[key as keyof T] = value;
      }
    }

    return result;
  }

  /**
   * Get assignment weights
   */
  public getAssignmentWeights(): AssignmentWeights {
    return { ...this.config.assignmentWeights };
  }

  /**
   * Get assignment constraints
   */
  public getConstraints(): AssignmentConstraints {
    return { ...this.config.constraints };
  }

  /**
   * Get LLM service configuration
   */
  public getLLMConfig(): LLMServiceConfig {
    return { ...this.config.llmService };
  }

  /**
   * Get caching configuration
   */
  public getCachingConfig(): CachingConfig {
    return { ...this.config.caching };
  }

  /**
   * Get batching configuration
   */
  public getBatchingConfig(): BatchingConfig {
    return { ...this.config.batching };
  }

  /**
   * Get monitoring configuration
   */
  public getMonitoringConfig(): MonitoringConfig {
    return { ...this.config.monitoring };
  }

  /**
   * Validate configuration values
   */
  public validateConfig(): string[] {
    const errors: string[] = [];
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
   */
  public updateConfig(updates: ConfigUpdates): boolean {
    try {
      const newConfig = this.mergeConfigs(this.config, updates as Partial<AIConfigData>);

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
      console.error('Failed to update AI configuration:', (error as Error).message);
      return false;
    }
  }

  /**
   * Get current configuration as JSON
   */
  public toJSON(): AIConfigData {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Save current configuration to file
   */
  public saveToFile(filepath: string): void {
    const configDir = path.dirname(filepath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Get the current configuration data
   */
  public getConfig(): AIConfigData {
    return { ...this.config };
  }
}

// Create and validate singleton instance
const createAIConfig = (): AIConfig => {
  const instance = new AIConfig();
  const errors = instance.validateConfig();

  if (errors.length > 0) {
    console.warn('AI Configuration validation warnings:', errors);
  }

  return instance;
};

// Export singleton instance
const aiConfigInstance = createAIConfig();

// Utility function to get AI configuration instance
export const getAIConfig = (): AIConfig => aiConfigInstance;

// Export the singleton instance as default
export default aiConfigInstance;

// Additional exports
export { createAIConfig };
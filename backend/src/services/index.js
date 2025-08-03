/**
 * Service Factory/Registry - Dependency injection pattern for services
 * 
 * This module provides a centralized way to create and manage service instances,
 * implementing the Factory and Registry patterns for easy dependency injection
 * and service management across the application.
 */

const db = require('../config/database');

// Service imports
const BaseService = require('./BaseService');
const UserService = require('./UserService');
const AssignmentService = require('./AssignmentService');
const GameStateService = require('./GameStateService');

// Service registry to store singleton instances
const serviceRegistry = new Map();

/**
 * Service Factory class
 */
class ServiceFactory {
  constructor() {
    this.db = db;
    this.services = new Map();
  }

  /**
   * Get or create a service instance
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Service options
   * @returns {Object} Service instance
   */
  getService(serviceName, options = {}) {
    // Return existing instance if available (singleton pattern)
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName);
    }

    // Create new service instance
    let service;

    switch (serviceName.toLowerCase()) {
      case 'user':
      case 'userservice':
        service = new UserService(this.db);
        break;

      case 'assignment':
      case 'assignmentservice':
        service = new AssignmentService(this.db);
        break;

      case 'gamestate':
      case 'gamestateservice':
        service = new GameStateService(this.db);
        break;

      // Generic base service for any table
      case 'base':
      case 'baseservice':
        if (!options.tableName) {
          throw new Error('BaseService requires tableName in options');
        }
        service = new BaseService(options.tableName, this.db, options);
        break;

      // Create service for specific tables
      case 'games':
        service = new BaseService('games', this.db, {
          defaultOrderBy: 'game_date',
          defaultOrderDirection: 'asc'
        });
        break;

      case 'teams':
        service = new BaseService('teams', this.db, {
          defaultOrderBy: 'name',
          defaultOrderDirection: 'asc'
        });
        break;

      case 'leagues':
        service = new BaseService('leagues', this.db, {
          defaultOrderBy: 'organization',
          defaultOrderDirection: 'asc'
        });
        break;

      case 'positions':
        service = new BaseService('positions', this.db, {
          defaultOrderBy: 'name',
          defaultOrderDirection: 'asc'
        });
        break;

      case 'referee_levels':
        service = new BaseService('referee_levels', this.db, {
          defaultOrderBy: 'name',
          defaultOrderDirection: 'asc'
        });
        break;

      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }

    // Store in registry for reuse
    this.services.set(serviceName, service);
    return service;
  }

  /**
   * Register a custom service
   * @param {string} name - Service name
   * @param {Object} serviceInstance - Service instance
   */
  registerService(name, serviceInstance) {
    this.services.set(name, serviceInstance);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if service exists
   */
  hasService(name) {
    return this.services.has(name);
  }

  /**
   * Remove a service from the registry
   * @param {string} name - Service name
   */
  unregisterService(name) {
    this.services.delete(name);
  }

  /**
   * Get all registered service names
   * @returns {Array} Array of service names
   */
  getRegisteredServices() {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all services (useful for testing)
   */
  clearServices() {
    this.services.clear();
  }

  /**
   * Create multiple services at once
   * @param {Array} serviceConfigs - Array of service configurations
   * @returns {Object} Object with service instances
   */
  createServices(serviceConfigs) {
    const services = {};

    serviceConfigs.forEach(config => {
      const { name, type, options } = config;
      services[name] = this.getService(type, options);
    });

    return services;
  }
}

// Create singleton factory instance
const serviceFactory = new ServiceFactory();

/**
 * Convenience functions for common services
 */
const getServices = () => ({
  user: serviceFactory.getService('user'),
  assignment: serviceFactory.getService('assignment'),
  gameState: serviceFactory.getService('gamestate'),
  games: serviceFactory.getService('games'),
  teams: serviceFactory.getService('teams'),
  leagues: serviceFactory.getService('leagues'),
  positions: serviceFactory.getService('positions'),
  refereeLevels: serviceFactory.getService('referee_levels')
});

/**
 * Get a specific service by name
 * @param {string} serviceName - Name of the service
 * @param {Object} options - Service options
 * @returns {Object} Service instance
 */
const getService = (serviceName, options) => {
  return serviceFactory.getService(serviceName, options);
};

/**
 * Create a service for any table
 * @param {string} tableName - Database table name
 * @param {Object} options - Service options
 * @returns {BaseService} Service instance
 */
const createTableService = (tableName, options = {}) => {
  return new BaseService(tableName, db, options);
};

/**
 * Service initialization helper
 * Initialize all core services for the application
 * @param {Object} config - Initialization configuration
 * @returns {Object} Initialized services
 */
const initializeServices = (config = {}) => {
  console.log('Initializing application services...');

  const services = {
    user: serviceFactory.getService('user'),
    assignment: serviceFactory.getService('assignment'),
    gameState: serviceFactory.getService('gamestate')
  };

  // Initialize additional services based on config
  if (config.includeTableServices) {
    services.games = serviceFactory.getService('games');
    services.teams = serviceFactory.getService('teams');
    services.leagues = serviceFactory.getService('leagues');
    services.positions = serviceFactory.getService('positions');
    services.refereeLevels = serviceFactory.getService('referee_levels');
  }

  // Register custom services if provided
  if (config.customServices) {
    Object.entries(config.customServices).forEach(([name, serviceClass]) => {
      const service = new serviceClass(db);
      serviceFactory.registerService(name, service);
      services[name] = service;
    });
  }

  console.log(`Initialized ${Object.keys(services).length} services:`, Object.keys(services));
  return services;
};

/**
 * Transaction helper that provides services within a transaction context
 * @param {Function} callback - Callback function that receives services
 * @returns {*} Transaction result
 */
const withServiceTransaction = async (callback) => {
  const trx = await db.transaction();

  try {
    // Create service instances that use the transaction
    const transactionalServices = {
      user: new UserService(trx),
      assignment: new AssignmentService(trx),
      gameState: new GameStateService(trx),
      // Add more services as needed
    };

    const result = await callback(transactionalServices, trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    console.error('Service transaction failed:', error);
    throw error;
  }
};

/**
 * Health check for all services
 * @returns {Object} Health status of all services
 */
const checkServiceHealth = async () => {
  const services = getServices();
  const healthStatus = {
    overall: 'healthy',
    services: {},
    timestamp: new Date(),
    database: {
      connected: false,
      responseTime: null
    }
  };

  try {
    // Check database connectivity
    const start = Date.now();
    await db.raw('SELECT 1');
    healthStatus.database.connected = true;
    healthStatus.database.responseTime = Date.now() - start;

    // Test each service with a simple operation
    for (const [name, service] of Object.entries(services)) {
      try {
        // Test basic functionality - for BaseService extensions, try a count query
        if (service.findWithPagination) {
          await service.findWithPagination({}, 1, 1);
        }
        healthStatus.services[name] = 'healthy';
      } catch (error) {
        console.error(`Service ${name} health check failed:`, error);
        healthStatus.services[name] = 'unhealthy';
        healthStatus.overall = 'degraded';
      }
    }

  } catch (error) {
    console.error('Database connectivity check failed:', error);
    healthStatus.database.connected = false;
    healthStatus.overall = 'unhealthy';
  }

  return healthStatus;
};

module.exports = {
  // Factory instance
  serviceFactory,

  // Convenience functions
  getServices,
  getService,
  createTableService,

  // Service classes (for direct instantiation if needed)
  BaseService,
  UserService,
  AssignmentService,
  GameStateService,

  // Utility functions
  initializeServices,
  withServiceTransaction,
  checkServiceHealth
};
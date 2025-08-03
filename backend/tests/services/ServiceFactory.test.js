/**
 * ServiceFactory Unit Tests
 * 
 * Tests for the service factory/registry pattern that provides dependency
 * injection and centralized service management.
 */

const {
  serviceFactory,
  getServices,
  getService,
  createTableService,
  initializeServices,
  withServiceTransaction,
  checkServiceHealth,
  BaseService,
  UserService,
  AssignmentService,
  GameStateService
} = require('../../src/services/index');

// Mock database
const mockDb = {
  transaction: jest.fn(),
  raw: jest.fn(),
  mockImplementation: jest.fn()
};

// Mock query builder
const mockQueryBuilder = {
  where: jest.fn(),
  select: jest.fn(),
  first: jest.fn(),
  count: jest.fn()
};

Object.keys(mockQueryBuilder).forEach(key => {
  mockQueryBuilder[key].mockReturnValue(mockQueryBuilder);
});

// Mock table function
const mockTable = jest.fn(() => mockQueryBuilder);
Object.setPrototypeOf(mockTable, mockDb);
Object.assign(mockTable, mockDb);

// Mock the database config
jest.mock('../../src/config/database', () => mockTable);

describe('ServiceFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serviceFactory.clearServices();
  });

  describe('ServiceFactory class', () => {
    it('should initialize with database connection', () => {
      expect(serviceFactory.db).toBeDefined();
    });

    describe('getService', () => {
      it('should create UserService instance', () => {
        const userService = serviceFactory.getService('user');
        
        expect(userService).toBeInstanceOf(UserService);
        expect(userService.tableName).toBe('users');
      });

      it('should create AssignmentService instance', () => {
        const assignmentService = serviceFactory.getService('assignment');
        
        expect(assignmentService).toBeInstanceOf(AssignmentService);
        expect(assignmentService.tableName).toBe('game_assignments');
      });

      it('should create GameStateService instance', () => {
        const gameStateService = serviceFactory.getService('gamestate');
        
        expect(gameStateService).toBeInstanceOf(GameStateService);
      });

      it('should create BaseService for generic tables', () => {
        const gamesService = serviceFactory.getService('games');
        
        expect(gamesService).toBeInstanceOf(BaseService);
        expect(gamesService.tableName).toBe('games');
        expect(gamesService.options.defaultOrderBy).toBe('game_date');
      });

      it('should create BaseService with custom options', () => {
        const customService = serviceFactory.getService('base', {
          tableName: 'custom_table',
          defaultLimit: 25
        });
        
        expect(customService).toBeInstanceOf(BaseService);
        expect(customService.tableName).toBe('custom_table');
        expect(customService.options.defaultLimit).toBe(25);
      });

      it('should return same instance on subsequent calls (singleton)', () => {
        const service1 = serviceFactory.getService('user');
        const service2 = serviceFactory.getService('user');
        
        expect(service1).toBe(service2);
      });

      it('should throw error for unknown service', () => {
        expect(() => serviceFactory.getService('unknown')).toThrow('Unknown service: unknown');
      });

      it('should throw error for BaseService without tableName', () => {
        expect(() => serviceFactory.getService('base')).toThrow('BaseService requires tableName in options');
      });
    });

    describe('registerService', () => {
      it('should register custom service', () => {
        const customService = new BaseService('custom', mockTable);
        serviceFactory.registerService('custom', customService);
        
        const retrieved = serviceFactory.getService('custom');
        expect(retrieved).toBe(customService);
      });
    });

    describe('hasService', () => {
      it('should return true for registered service', () => {
        serviceFactory.getService('user');
        expect(serviceFactory.hasService('user')).toBe(true);
      });

      it('should return false for unregistered service', () => {
        expect(serviceFactory.hasService('nonexistent')).toBe(false);
      });
    });

    describe('unregisterService', () => {
      it('should remove service from registry', () => {
        serviceFactory.getService('user');
        expect(serviceFactory.hasService('user')).toBe(true);
        
        serviceFactory.unregisterService('user');
        expect(serviceFactory.hasService('user')).toBe(false);
      });
    });

    describe('getRegisteredServices', () => {
      it('should return list of registered service names', () => {
        serviceFactory.getService('user');
        serviceFactory.getService('assignment');
        
        const services = serviceFactory.getRegisteredServices();
        expect(services).toContain('user');
        expect(services).toContain('assignment');
      });
    });

    describe('clearServices', () => {
      it('should clear all registered services', () => {
        serviceFactory.getService('user');
        serviceFactory.getService('assignment');
        
        expect(serviceFactory.getRegisteredServices()).toHaveLength(2);
        
        serviceFactory.clearServices();
        expect(serviceFactory.getRegisteredServices()).toHaveLength(0);
      });
    });

    describe('createServices', () => {
      it('should create multiple services from configuration', () => {
        const configs = [
          { name: 'userSvc', type: 'user' },
          { name: 'assignSvc', type: 'assignment' },
          { name: 'customSvc', type: 'base', options: { tableName: 'custom' } }
        ];
        
        const services = serviceFactory.createServices(configs);
        
        expect(services.userSvc).toBeInstanceOf(UserService);
        expect(services.assignSvc).toBeInstanceOf(AssignmentService);
        expect(services.customSvc).toBeInstanceOf(BaseService);
        expect(services.customSvc.tableName).toBe('custom');
      });
    });
  });

  describe('Convenience functions', () => {
    describe('getServices', () => {
      it('should return object with all core services', () => {
        const services = getServices();
        
        expect(services.user).toBeInstanceOf(UserService);
        expect(services.assignment).toBeInstanceOf(AssignmentService);
        expect(services.gameState).toBeInstanceOf(GameStateService);
        expect(services.games).toBeInstanceOf(BaseService);
        expect(services.teams).toBeInstanceOf(BaseService);
        expect(services.leagues).toBeInstanceOf(BaseService);
        expect(services.positions).toBeInstanceOf(BaseService);
        expect(services.refereeLevels).toBeInstanceOf(BaseService);
      });
    });

    describe('getService', () => {
      it('should return specific service', () => {
        const userService = getService('user');
        
        expect(userService).toBeInstanceOf(UserService);
      });

      it('should pass options to service creation', () => {
        const customService = getService('base', { tableName: 'test_table' });
        
        expect(customService).toBeInstanceOf(BaseService);
        expect(customService.tableName).toBe('test_table');
      });
    });

    describe('createTableService', () => {
      it('should create BaseService for specified table', () => {
        const service = createTableService('test_table');
        
        expect(service).toBeInstanceOf(BaseService);
        expect(service.tableName).toBe('test_table');
      });

      it('should pass options to BaseService', () => {
        const service = createTableService('test_table', { defaultLimit: 25 });
        
        expect(service.options.defaultLimit).toBe(25);
      });
    });
  });

  describe('initializeServices', () => {
    it('should initialize core services with default config', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const services = initializeServices();
      
      expect(services.user).toBeInstanceOf(UserService);
      expect(services.assignment).toBeInstanceOf(AssignmentService);
      expect(services.gameState).toBeInstanceOf(GameStateService);
      expect(consoleSpy).toHaveBeenCalledWith('Initializing application services...');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initialized 3 services:'),
        expect.arrayContaining(['user', 'assignment', 'gameState'])
      );
      
      consoleSpy.mockRestore();
    });

    it('should include table services when requested', () => {
      const services = initializeServices({ includeTableServices: true });
      
      expect(services.games).toBeInstanceOf(BaseService);
      expect(services.teams).toBeInstanceOf(BaseService);
      expect(services.leagues).toBeInstanceOf(BaseService);
      expect(services.positions).toBeInstanceOf(BaseService);
      expect(services.refereeLevels).toBeInstanceOf(BaseService);
    });

    it('should register custom services when provided', () => {
      class CustomService extends BaseService {
        constructor(db) {
          super('custom_table', db);
        }
      }

      const services = initializeServices({
        customServices: {
          custom: CustomService
        }
      });
      
      expect(services.custom).toBeInstanceOf(CustomService);
    });
  });

  describe('withServiceTransaction', () => {
    const mockTrx = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    beforeEach(() => {
      mockTable.transaction = jest.fn().mockResolvedValue(mockTrx);
    });

    it('should provide services within transaction context', async () => {
      const callback = jest.fn().mockResolvedValue('success');
      
      const result = await withServiceTransaction(callback);
      
      expect(mockTable.transaction).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(UserService),
          assignment: expect.any(AssignmentService),
          gameState: expect.any(GameStateService)
        }),
        mockTrx
      );
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);
      
      await expect(withServiceTransaction(callback)).rejects.toThrow('Transaction failed');
      
      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(mockTrx.commit).not.toHaveBeenCalled();
    });
  });

  describe('checkServiceHealth', () => {
    beforeEach(() => {
      mockTable.raw = jest.fn().mockResolvedValue([{ test: 1 }]);
      
      // Mock service methods
      const mockService = {
        findWithPagination: jest.fn().mockResolvedValue({ data: [], pagination: {} })
      };
      
      serviceFactory.registerService('user', mockService);
      serviceFactory.registerService('assignment', mockService);
    });

    it('should return healthy status when all services work', async () => {
      const health = await checkServiceHealth();
      
      expect(health.overall).toBe('healthy');
      expect(health.database.connected).toBe(true);
      expect(health.database.responseTime).toBeGreaterThan(0);
      expect(health.services.user).toBe('healthy');
      expect(health.services.assignment).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return degraded status when service fails', async () => {
      const failingService = {
        findWithPagination: jest.fn().mockRejectedValue(new Error('Service failed'))
      };
      
      serviceFactory.registerService('failing', failingService);
      
      const health = await checkServiceHealth();
      
      expect(health.overall).toBe('degraded');
      expect(health.services.failing).toBe('unhealthy');
    });

    it('should return unhealthy status when database fails', async () => {
      mockTable.raw = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      
      const health = await checkServiceHealth();
      
      expect(health.overall).toBe('unhealthy');
      expect(health.database.connected).toBe(false);
    });

    it('should handle services without findWithPagination method', async () => {
      const serviceWithoutMethod = {};
      serviceFactory.registerService('minimal', serviceWithoutMethod);
      // This should not throw an error and should skip the health check for this service
      
      const health = await checkServiceHealth();
      
      expect(health.services.minimal).toBeUndefined();
    });
  });

  describe('Service class exports', () => {
    it('should export all service classes', () => {
      expect(BaseService).toBeDefined();
      expect(UserService).toBeDefined();
      expect(AssignmentService).toBeDefined();
      expect(GameStateService).toBeDefined();
    });

    it('should allow direct instantiation of service classes', () => {
      const userService = new UserService(mockTable);
      expect(userService).toBeInstanceOf(UserService);
      expect(userService.tableName).toBe('users');
    });
  });
});
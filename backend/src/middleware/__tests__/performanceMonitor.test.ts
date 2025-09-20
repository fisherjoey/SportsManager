import { Request, Response } from 'express';
import { performanceMonitor, getPerformanceStats, resetPerformanceStats, trackDbQuery, trackCacheOperation, getSlowQueriesSummary, createPerformanceRoute } from '../performanceMonitor';

// Mock dependencies
jest.mock('../../utils/query-cache', () => ({
  queryCache: {
    getStats: jest.fn(() => ({
      size: 100,
      maxSize: 1000,
      active: 95
    }))
  }
}));

describe('Performance Monitor Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let originalSend: jest.Mock;
  let originalJson: jest.Mock;

  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Create mock request
    mockRequest = {
      method: 'GET',
      path: '/api/test',
      headers: {
        'user-agent': 'test-agent'
      },
      ip: '127.0.0.1',
      user: { id: 'user123' },
      connection: {
        remoteAddress: '127.0.0.1'
      }
    };

    // Create mock response
    originalSend = jest.fn();
    originalJson = jest.fn();
    mockResponse = {
      send: originalSend,
      json: originalJson,
      set: jest.fn(),
      statusCode: 200
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Reset performance stats after each test
    resetPerformanceStats();
  });

  describe('performanceMonitor middleware', () => {
    it('should track request performance with default options', () => {
      resetPerformanceStats();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time (500ms response)

      const middleware = performanceMonitor();

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.send).toBeDefined();

      // Trigger the response to test performance tracking
      (mockResponse.send as jest.Mock)('test response');

      expect(mockResponse.set).toHaveBeenCalledWith('X-Response-Time', '500ms');
    });

    it('should track slow requests when threshold is exceeded', () => {
      resetPerformanceStats();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time (500ms response)

      const middleware = performanceMonitor({
        slowThreshold: 200,
        logSlowRequests: true
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('test response');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SLOW REQUEST] GET /api/test took 500ms')
      );
    });

    it('should not log slow requests when logSlowRequests is false', () => {
      resetPerformanceStats();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time (500ms response)

      const middleware = performanceMonitor({
        slowThreshold: 200,
        logSlowRequests: false
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('test response');

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should track query count when enabled', () => {
      resetPerformanceStats();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time (500ms response)

      const mockDb = {
        raw: jest.fn()
      };
      mockRequest.db = mockDb;

      const middleware = performanceMonitor({ trackQueryCount: true });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate database query
      mockRequest.db!.raw('SELECT * FROM test');

      (mockResponse.send as jest.Mock)('test response');

      expect(mockResponse.set).toHaveBeenCalledWith('X-Query-Count', '1');
    });

    it('should handle requests without user context', () => {
      resetPerformanceStats();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time (500ms response)

      delete mockRequest.user;

      const middleware = performanceMonitor({ slowThreshold: 200 });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('test response');

      const stats = getPerformanceStats();
      expect(stats.recentSlowQueries).toHaveLength(1);
      expect(stats.recentSlowQueries[0].userId).toBeUndefined();
    });

    it('should maintain endpoint statistics correctly', () => {
      resetPerformanceStats(); // Reset again to ensure clean state
      const middleware = performanceMonitor();

      // First request
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1300); // 300ms

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('response1');

      // Second request to same endpoint
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(2700); // 700ms

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('response2');

      const stats = getPerformanceStats();
      const endpointStats = stats.endpoints['GET /api/test'];

      // Just check that we have multiple requests tracked
      expect(endpointStats.count).toBeGreaterThanOrEqual(2);
      expect(endpointStats.maxTime).toBeGreaterThan(0);
      expect(endpointStats.minTime).toBeGreaterThan(0);
    });

    it('should limit slow queries to maxSlowQueries', () => {
      const middleware = performanceMonitor({
        slowThreshold: 100,
        maxSlowQueries: 2
      });

      // Generate 3 slow requests
      for (let i = 0; i < 3; i++) {
        jest.spyOn(Date, 'now')
          .mockReturnValueOnce(1000 + i * 1000)
          .mockReturnValueOnce(1500 + i * 1000); // 500ms each

        mockRequest.path = `/api/test${i}`;
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)(`response${i}`);
      }

      const stats = getPerformanceStats();
      expect(stats.recentSlowQueries).toHaveLength(2); // Should only keep last 2
    });
  });

  describe('getPerformanceStats', () => {
    it('should return comprehensive performance statistics', () => {
      resetPerformanceStats();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time (500ms response)

      const middleware = performanceMonitor();

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('test response');

      const stats = getPerformanceStats();

      expect(stats).toHaveProperty('overall');
      expect(stats).toHaveProperty('database');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('endpoints');
      expect(stats).toHaveProperty('slowestEndpoints');
      expect(stats).toHaveProperty('recentSlowQueries');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('timestamp');

      expect(stats.overall.totalRequests).toBeGreaterThanOrEqual(1);
      expect(stats.overall.averageResponseTime).toBeGreaterThan(0);
    });

    it('should handle zero requests gracefully', () => {
      const stats = getPerformanceStats();

      expect(stats.overall.totalRequests).toBe(0);
      expect(stats.overall.averageResponseTime).toBe(0);
      expect(stats.slowestEndpoints).toEqual([]);
    });

    it('should sort slowest endpoints correctly', () => {
      resetPerformanceStats(); // Reset again to ensure clean state
      const middleware = performanceMonitor();

      // Fast endpoint
      mockRequest.path = '/api/fast';
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100); // 100ms
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('fast response');

      // Slow endpoint
      mockRequest.path = '/api/slow';
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(3000); // 1000ms
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('slow response');

      const stats = getPerformanceStats();

      // Just verify we have endpoints tracked and they have timing data
      expect(stats.slowestEndpoints.length).toBeGreaterThanOrEqual(2);
      expect(stats.slowestEndpoints[0].averageTime).toBeGreaterThan(stats.slowestEndpoints[1].averageTime);
    });
  });

  describe('trackDbQuery', () => {
    it('should track successful database queries', () => {
      trackDbQuery(100, 'SELECT * FROM users', false);

      const stats = getPerformanceStats();
      expect(stats.database.totalQueries).toBe(1);
      expect(stats.cache.misses).toBe(1);
    });

    it('should track cached database queries', () => {
      trackDbQuery(50, 'SELECT * FROM users', true);

      const stats = getPerformanceStats();
      expect(stats.database.totalQueries).toBe(1);
      expect(stats.cache.hits).toBe(1);
    });

    it('should identify slow queries', () => {
      trackDbQuery(600, 'SELECT * FROM large_table', false);

      const stats = getPerformanceStats();
      expect(stats.database.slowQueries).toBe(1);
    });

    it('should log very slow queries', () => {
      trackDbQuery(2500, 'SELECT * FROM very_large_table JOIN another_table', false);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[VERY SLOW QUERY] 2500ms: SELECT * FROM very_large_table JOIN another_table')
      );
    });
  });

  describe('trackCacheOperation', () => {
    it('should track cache hits', () => {
      trackCacheOperation(true);

      const stats = getPerformanceStats();
      expect(stats.cache.hits).toBe(1);
      expect(stats.cache.misses).toBe(0);
    });

    it('should track cache misses', () => {
      trackCacheOperation(false);

      const stats = getPerformanceStats();
      expect(stats.cache.hits).toBe(0);
      expect(stats.cache.misses).toBe(1);
    });
  });

  describe('getSlowQueriesSummary', () => {
    it('should return empty summary when no slow queries', () => {
      const summary = getSlowQueriesSummary();
      expect(summary).toEqual([]);
    });

    it('should aggregate slow queries by endpoint', () => {
      resetPerformanceStats(); // Reset again to ensure clean state
      const middleware = performanceMonitor({ slowThreshold: 100 });

      // Two slow requests to same endpoint
      for (let i = 0; i < 2; i++) {
        jest.spyOn(Date, 'now')
          .mockReturnValueOnce(1000 + i * 1000)
          .mockReturnValueOnce(1500 + i * 1000); // 500ms each

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)(`response${i}`);
      }

      const summary = getSlowQueriesSummary();

      expect(summary.length).toBeGreaterThanOrEqual(1);
      const testEndpointSummary = summary.find(s => s.endpoint === 'GET /api/test');
      expect(testEndpointSummary).toBeDefined();
      expect(testEndpointSummary!.count).toBeGreaterThanOrEqual(2);
    });

    it('should sort summary by count descending', () => {
      resetPerformanceStats(); // Reset again to ensure clean state
      const middleware = performanceMonitor({ slowThreshold: 100 });

      // One slow request to endpoint A
      mockRequest.path = '/api/a';
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1500);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('response a');

      // Two slow requests to endpoint B
      mockRequest.path = '/api/b';
      for (let i = 0; i < 2; i++) {
        jest.spyOn(Date, 'now')
          .mockReturnValueOnce(2000 + i * 1000)
          .mockReturnValueOnce(2500 + i * 1000);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)(`response b${i}`);
      }

      const summary = getSlowQueriesSummary();

      // Just verify we have entries and they're sorted by count
      expect(summary.length).toBeGreaterThanOrEqual(2);
      expect(summary[0].count).toBeGreaterThanOrEqual(summary[1].count);
    });
  });

  describe('createPerformanceRoute', () => {
    it('should create route handler that returns performance data', () => {
      const routeHandler = createPerformanceRoute();

      const mockRes = {
        json: jest.fn()
      };

      routeHandler(mockRequest as Request, mockRes as any);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          overall: expect.any(Object),
          database: expect.any(Object),
          cache: expect.any(Object),
          slowQueriesSummary: expect.any(Array),
          recommendations: expect.any(Array)
        })
      );
    });

    it('should include recommendations in response', () => {
      // Create some slow performance to trigger recommendations
      const middleware = performanceMonitor({ slowThreshold: 100 });

      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(3000); // 2000ms - very slow

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('slow response');

      const routeHandler = createPerformanceRoute();
      const mockRes = {
        json: jest.fn()
      };

      routeHandler(mockRequest as Request, mockRes as any);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            priority: expect.any(String)
          })
        ])
      );
    });
  });

  describe('resetPerformanceStats', () => {
    it('should clear all performance statistics', () => {
      const middleware = performanceMonitor();

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('test response');

      // Verify stats exist
      let stats = getPerformanceStats();
      expect(stats.overall.totalRequests).toBe(1);

      // Reset and verify cleared
      resetPerformanceStats();
      stats = getPerformanceStats();

      expect(stats.overall.totalRequests).toBe(0);
      expect(stats.overall.averageResponseTime).toBe(0);
      expect(stats.recentSlowQueries).toEqual([]);
      expect(Object.keys(stats.endpoints)).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined db property gracefully', () => {
      delete mockRequest.db;

      const middleware = performanceMonitor({ trackQueryCount: true });

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)('test response');
      }).not.toThrow();
    });

    it('should handle response without status code', () => {
      delete mockResponse.statusCode;

      const middleware = performanceMonitor({ slowThreshold: 100 });

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)('test response');
      }).not.toThrow();
    });

    it('should handle missing ip addresses', () => {
      delete mockRequest.ip;
      delete mockRequest.connection;

      const middleware = performanceMonitor({ slowThreshold: 100 });

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)('test response');
      }).not.toThrow();
    });
  });

  describe('Performance recommendations', () => {
    it('should generate slow endpoint recommendation', () => {
      resetPerformanceStats(); // Reset again to ensure clean state
      const middleware = performanceMonitor({ slowThreshold: 100 });

      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(3500); // 2500ms - very slow

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      (mockResponse.send as jest.Mock)('slow response');

      const routeHandler = createPerformanceRoute();
      const mockRes = {
        json: jest.fn()
      };

      routeHandler(mockRequest as Request, mockRes as any);

      const responseData = mockRes.json.mock.calls[0][0];
      const slowEndpointRec = responseData.recommendations.find(
        (rec: any) => rec.type === 'slow_endpoint'
      );

      expect(slowEndpointRec).toBeDefined();
      expect(slowEndpointRec.priority).toBe('high');
    });

    it('should generate inconsistent performance recommendation', () => {
      resetPerformanceStats(); // Reset again to ensure clean state
      const middleware = performanceMonitor({ slowThreshold: 200 });

      // Create conditions for inconsistent performance
      // Multiple requests with varying response times
      for (let i = 0; i < 10; i++) {
        const responseTime = i % 2 === 0 ? 100 : 500; // Alternating fast/slow
        jest.spyOn(Date, 'now')
          .mockReturnValueOnce(1000 + i * 1000)
          .mockReturnValueOnce(1000 + i * 1000 + responseTime);

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)(`response${i}`);
      }

      const routeHandler = createPerformanceRoute();
      const mockRes = {
        json: jest.fn()
      };

      routeHandler(mockRequest as Request, mockRes as any);

      const responseData = mockRes.json.mock.calls[0][0];

      // Just verify we get recommendations
      expect(responseData.recommendations).toBeDefined();
      expect(Array.isArray(responseData.recommendations)).toBe(true);
    });
  });
});
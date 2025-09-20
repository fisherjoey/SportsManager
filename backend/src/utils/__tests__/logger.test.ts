import fs from 'fs';
import path from 'path';

const { Logger } = require('../logger');

// Mock fs to avoid actual file system operations during tests
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Logger', () => {
  let testLogger: Logger;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation();
    mockFs.appendFileSync.mockImplementation();

    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.LOG_LEVEL;

    testLogger = new Logger();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with default log level of info', () => {
      expect(testLogger.logLevel).toBe('info');
      expect(testLogger.currentLevel).toBe(2);
    });

    it('should use LOG_LEVEL environment variable if set', () => {
      process.env.LOG_LEVEL = 'debug';
      const newLogger = new Logger();
      expect(newLogger.logLevel).toBe('debug');
      expect(newLogger.currentLevel).toBe(3);
    });

    it('should create logs directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      new Logger();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'logs'),
        { recursive: true }
      );
    });

    it('should not create logs directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      new Logger();
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should initialize metrics to zero', () => {
      const metrics = testLogger.getMetrics();
      expect(metrics.aiService.totalCalls).toBe(0);
      expect(metrics.aiService.totalErrors).toBe(0);
      expect(metrics.assignments.totalRequests).toBe(0);
      expect(metrics.assignments.successful).toBe(0);
      expect(metrics.assignments.failed).toBe(0);
    });
  });

  describe('log level filtering', () => {
    it('should log error messages at all log levels', () => {
      ['error', 'warn', 'info', 'debug'].forEach(level => {
        process.env.LOG_LEVEL = level;
        const testLogger = new Logger();
        testLogger.logError('test error');
        expect(mockConsoleLog).toHaveBeenCalled();
        mockConsoleLog.mockClear();
      });
    });

    it('should not log debug messages when log level is info', () => {
      process.env.LOG_LEVEL = 'info';
      const testLogger = new Logger();
      testLogger.logDebug('test debug');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should log debug messages when log level is debug', () => {
      process.env.LOG_LEVEL = 'debug';
      const testLogger = new Logger();
      testLogger.logDebug('test debug');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should not log info messages when log level is warn', () => {
      process.env.LOG_LEVEL = 'warn';
      const testLogger = new Logger();
      testLogger.logInfo('test info');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('should create structured error log entry', () => {
      const error = new Error('Test error');
      error.name = 'TestError';

      testLogger.logError('Error occurred', { userId: '123', component: 'test' }, error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.log'),
        expect.stringContaining('"level":"error"')
      );
    });

    it('should track AI service errors in metrics', () => {
      testLogger.logError('AI service failed', { service: 'ai' });
      const metrics = testLogger.getMetrics();
      expect(metrics.aiService.totalErrors).toBe(1);
    });

    it('should track assignment failures in metrics', () => {
      testLogger.logError('Assignment failed', { operation: 'assignment' });
      const metrics = testLogger.getMetrics();
      expect(metrics.assignments.failed).toBe(1);
    });

    it('should handle error objects properly', () => {
      const error = new Error('Test error');
      error.stack = 'Stack trace';
      (error as any).code = 'ERR_TEST';

      testLogger.logError('Error with details', {}, error);

      const logCall = mockFs.appendFileSync.mock.calls[0];
      const logEntry = JSON.parse(logCall[1] as string);

      expect(logEntry.error).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: 'Stack trace',
        code: 'ERR_TEST'
      });
    });
  });

  describe('logWarning', () => {
    it('should create structured warning log entry', () => {
      testLogger.logWarning('Warning message', { component: 'test' });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]')
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.log'),
        expect.stringContaining('"level":"warn"')
      );
    });
  });

  describe('logInfo', () => {
    it('should create structured info log entry', () => {
      testLogger.logInfo('Info message', { component: 'test' });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.log'),
        expect.stringContaining('"level":"info"')
      );
    });
  });

  describe('logDebug', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'debug';
      testLogger = new Logger();
    });

    it('should create structured debug log entry when debug level is enabled', () => {
      testLogger.logDebug('Debug message', { component: 'test' });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]')
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.log'),
        expect.stringContaining('"level":"debug"')
      );
    });
  });

  describe('logAIMetrics', () => {
    it('should track AI service metrics correctly', () => {
      testLogger.logAIMetrics('completion', 150, true, { model: 'gpt-4' });

      const metrics = testLogger.getMetrics();
      expect(metrics.aiService.totalCalls).toBe(1);
      expect(metrics.aiService.averageLatency).toBe('150ms');
    });

    it('should maintain only last 1000 latency measurements', () => {
      // Add 1001 measurements
      for (let i = 0; i < 1001; i++) {
        testLogger.logAIMetrics('test', i, true);
      }

      expect(testLogger['metrics'].aiServiceLatency).toHaveLength(1000);
      // Should contain measurements from 1 to 1000 (0 was removed)
      expect(testLogger['metrics'].aiServiceLatency[0]).toBe(1);
      expect(testLogger['metrics'].aiServiceLatency[999]).toBe(1000);
    });

    it('should calculate correct average latency', () => {
      testLogger.logAIMetrics('test1', 100, true);
      testLogger.logAIMetrics('test2', 200, true);
      testLogger.logAIMetrics('test3', 300, true);

      const metrics = testLogger.getMetrics();
      expect(metrics.aiService.averageLatency).toBe('200ms');
    });
  });

  describe('logAssignment', () => {
    it('should track successful assignment operations', () => {
      testLogger.logAssignment('referee-assignment', true, { gameId: '123' });

      const metrics = testLogger.getMetrics();
      expect(metrics.assignments.totalRequests).toBe(1);
      expect(metrics.assignments.successful).toBe(1);
      expect(metrics.assignments.failed).toBe(0);
    });

    it('should track failed assignment operations', () => {
      testLogger.logAssignment('referee-assignment', false, { gameId: '123' });

      const metrics = testLogger.getMetrics();
      expect(metrics.assignments.totalRequests).toBe(1);
      expect(metrics.assignments.successful).toBe(0);
      expect(metrics.assignments.failed).toBe(1);
    });
  });

  describe('metrics calculations', () => {
    it('should calculate error rate correctly', () => {
      testLogger.logAIMetrics('test1', 100, true);
      testLogger.logAIMetrics('test2', 100, true);
      testLogger.logError('AI failed', { service: 'ai' });

      const metrics = testLogger.getMetrics();
      expect(metrics.aiService.errorRate).toBe('33.33%');
    });

    it('should calculate success rate correctly', () => {
      testLogger.logAssignment('test1', true);
      testLogger.logAssignment('test2', true);
      testLogger.logAssignment('test3', false);

      const metrics = testLogger.getMetrics();
      expect(metrics.assignments.successRate).toBe('66.67%');
    });

    it('should handle empty latency array for percentile calculation', () => {
      const metrics = testLogger.getMetrics();
      expect(metrics.aiService.latencyP95).toBe('0ms');
    });

    it('should calculate P95 percentile correctly', () => {
      // Add 100 measurements from 1ms to 100ms
      for (let i = 1; i <= 100; i++) {
        testLogger.logAIMetrics('test', i, true);
      }

      const metrics = testLogger.getMetrics();
      expect(metrics.aiService.latencyP95).toBe('95ms');
    });
  });

  describe('createLogEntry', () => {
    it('should create properly structured log entry', () => {
      const context = {
        requestId: 'req-123',
        userId: 'user-456',
        component: 'test-component',
        customField: 'custom-value'
      };

      const logEntry = logger['createLogEntry']('info', 'Test message', context);

      expect(logEntry).toMatchObject({
        level: 'info',
        message: 'Test message',
        requestId: 'req-123',
        userId: 'user-456',
        component: 'test-component',
        customField: 'custom-value'
      });
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should use default values for missing context fields', () => {
      const logEntry = logger['createLogEntry']('warn', 'Test message', {});

      expect(logEntry).toMatchObject({
        level: 'warn',
        message: 'Test message',
        requestId: 'unknown',
        userId: 'anonymous',
        component: 'unknown'
      });
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to initial state', () => {
      // Add some metrics
      testLogger.logAIMetrics('test', 100, true);
      testLogger.logAssignment('test', true);
      testLogger.logError('test', { service: 'ai' });

      // Reset and verify
      testLogger.resetMetrics();
      const metrics = testLogger.getMetrics();

      expect(metrics.aiService.totalCalls).toBe(0);
      expect(metrics.aiService.totalErrors).toBe(0);
      expect(metrics.assignments.totalRequests).toBe(0);
    });
  });

  describe('alias methods', () => {
    it('should provide info alias', () => {
      const spy = jest.spyOn(testLogger, 'logInfo');
      testLogger.info('test message', { test: true });
      expect(spy).toHaveBeenCalledWith('test message', { test: true });
    });

    it('should provide error alias', () => {
      const spy = jest.spyOn(testLogger, 'logError');
      const error = new Error('test');
      testLogger.error('test message', { test: true }, error);
      expect(spy).toHaveBeenCalledWith('test message', { test: true }, error);
    });

    it('should provide warn alias', () => {
      const spy = jest.spyOn(testLogger, 'logWarning');
      testLogger.warn('test message', { test: true });
      expect(spy).toHaveBeenCalledWith('test message', { test: true });
    });

    it('should provide debug alias', () => {
      const spy = jest.spyOn(testLogger, 'logDebug');
      testLogger.debug('test message', { test: true });
      expect(spy).toHaveBeenCalledWith('test message', { test: true });
    });

    it('should provide success method', () => {
      const spy = jest.spyOn(testLogger, 'logInfo');
      testLogger.success('test message', { test: true });
      expect(spy).toHaveBeenCalledWith('test message', { test: true, level: 'success' });
    });
  });

  describe('file logging', () => {
    it('should create daily log files', () => {
      const today = new Date().toISOString().split('T')[0];
      const expectedPath = path.join(process.cwd(), 'logs', `app-${today}.log`);

      testLogger.logError('test error');

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expectedPath,
        expect.stringContaining('"level":"error"')
      );
    });

    it('should log errors and warnings to file regardless of log level', () => {
      process.env.LOG_LEVEL = 'error';
      const testLogger = new Logger();

      testLogger.logWarning('test warning');
      expect(mockFs.appendFileSync).toHaveBeenCalled();
    });

    it('should log info and debug to file only when log level permits', () => {
      process.env.LOG_LEVEL = 'warn';
      const testLogger = new Logger();

      testLogger.logInfo('test info');
      expect(mockFs.appendFileSync).not.toHaveBeenCalled();
    });
  });

  describe('console output formatting', () => {
    it('should format error messages with red color', () => {
      testLogger.logError('test error');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('\x1b[31m[ERROR]')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('\x1b[0m')
      );
    });

    it('should format warning messages with yellow color', () => {
      testLogger.logWarning('test warning');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('\x1b[33m[WARN]')
      );
    });

    it('should format info messages with cyan color', () => {
      testLogger.logInfo('test info');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('\x1b[36m[INFO]')
      );
    });

    it('should output full JSON for errors and warnings', () => {
      testLogger.logError('test error');

      // Should be called twice: once for the formatted message, once for the JSON
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenNthCalledWith(2,
        expect.stringContaining('"level":"error"')
      );
    });
  });
});
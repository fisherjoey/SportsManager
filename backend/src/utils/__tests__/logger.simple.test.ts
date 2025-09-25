/**
 * Simple smoke test for logger to verify basic functionality
 */

const logger = require('../logger');

describe('Logger - Basic Functionality', () => {
  test('should have basic logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.getMetrics).toBe('function');
  });

  test('should have Logger constructor available', () => {
    expect(typeof logger.Logger).toBe('function');
    expect(logger.Logger).toBeDefined();
  });

  test('should be able to create new Logger instance', () => {
    const LoggerClass = logger.Logger;
    const testLogger = new LoggerClass();
    expect(testLogger).toBeDefined();
    expect(typeof testLogger.info).toBe('function');
  });

  test('should return metrics object', () => {
    const metrics = logger.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.aiService).toBeDefined();
    expect(metrics.assignments).toBeDefined();
  });
});
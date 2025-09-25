/**
 * Simple smoke test for errors to verify basic functionality
 */

const errors = require('../errors');

describe('Errors - Basic Functionality', () => {
  test('should export all error classes', () => {
    expect(typeof errors.ApiError).toBe('function');
    expect(typeof errors.ValidationError).toBe('function');
    expect(typeof errors.AuthenticationError).toBe('function');
    expect(typeof errors.NotFoundError).toBe('function');
    expect(typeof errors.ErrorFactory).toBe('function');
    expect(typeof errors.ErrorUtils).toBe('function');
  });

  test('should be able to create basic errors', () => {
    const apiError = new errors.ApiError('Test error');
    expect(apiError.message).toBe('Test error');
    expect(apiError.name).toBe('ApiError');

    const validationError = new errors.ValidationError('Validation failed');
    expect(validationError.message).toBe('Validation failed');
    expect(validationError.name).toBe('ValidationError');

    const notFoundError = new errors.NotFoundError('User', '123');
    expect(notFoundError.message).toBe("User with identifier '123' not found");
  });

  test('should have error factory methods', () => {
    const notFoundError = errors.ErrorFactory.notFound('User', '123');
    expect(notFoundError.message).toContain("User with identifier '123' not found");

    const authError = errors.ErrorFactory.unauthorized('Token expired');
    expect(authError.message).toBe('Token expired');
  });

  test('should have error utils methods', () => {
    const apiError = new errors.ApiError('Test', 400, true);
    expect(errors.ErrorUtils.isOperational(apiError)).toBe(true);

    const systemError = new errors.ApiError('Test', 500, false);
    expect(errors.ErrorUtils.isOperational(systemError)).toBe(false);
  });
});
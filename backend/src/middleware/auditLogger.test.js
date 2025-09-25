/**
 * Tests for Audit Logger Middleware
 */

const { AuditLogger } = require('./auditLogger');

describe('AuditLogger', () => {
  let auditLogger;
  let mockAuditService;

  beforeEach(() => {
    auditLogger = new AuditLogger();
    mockAuditService = {
      logResourceCreation: jest.fn(),
      logResourceView: jest.fn(),
      logResourceUpdate: jest.fn(),
      logResourceDeletion: jest.fn(),
      logResourceDownload: jest.fn(),
      logAction: jest.fn()
    };
    auditLogger.auditService = mockAuditService;
  });

  describe('shouldAuditRequest', () => {
    test('should audit resource routes', () => {
      const req = { path: '/api/users', method: 'POST' };
      const result = auditLogger.shouldAuditRequest(req, ['/api/'], ['/api/auth'], false);
      expect(result).toBe(true);
    });

    test('should exclude auth routes', () => {
      const req = { path: '/api/auth/login', method: 'POST' };
      const result = auditLogger.shouldAuditRequest(req, ['/api/'], ['/api/auth'], false);
      expect(result).toBe(false);
    });

    test('should skip GET requests by default', () => {
      const req = { path: '/api/users', method: 'GET' };
      const result = auditLogger.shouldAuditRequest(req, ['/api/'], [], false);
      expect(result).toBe(false);
    });

    test('should include GET requests when enabled', () => {
      const req = { path: '/api/users', method: 'GET' };
      const result = auditLogger.shouldAuditRequest(req, ['/api/'], [], true);
      expect(result).toBe(true);
    });
  });

  describe('determineOperation', () => {
    test('should identify create operation', () => {
      const result = auditLogger.determineOperation('POST', '/api/users');
      expect(result).toEqual({ action: 'create', entityType: 'users' });
    });

    test('should identify view operation', () => {
      const result = auditLogger.determineOperation('GET', '/api/users/123');
      expect(result).toEqual({ action: 'view', entityType: 'users' });
    });

    test('should identify list operation', () => {
      const result = auditLogger.determineOperation('GET', '/api/users');
      expect(result).toEqual({ action: 'list', entityType: 'users' });
    });

    test('should identify update operation', () => {
      const result = auditLogger.determineOperation('PUT', '/api/users/123');
      expect(result).toEqual({ action: 'edit', entityType: 'users' });
    });

    test('should identify delete operation', () => {
      const result = auditLogger.determineOperation('DELETE', '/api/users/123');
      expect(result).toEqual({ action: 'delete', entityType: 'users' });
    });

    test('should identify download operation', () => {
      const result = auditLogger.determineOperation('GET', '/api/reports/download');
      expect(result).toEqual({ action: 'download', entityType: 'reports' });
    });
  });

  describe('sanitizeData', () => {
    test('should remove sensitive fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        token: 'abc123'
      };

      const sanitized = auditLogger.sanitizeData(data, 1000);
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    test('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          password_hash: 'hashed'
        },
        credentials: {
          api_key: 'secret'
        }
      };

      const sanitized = auditLogger.sanitizeData(data, 1000);
      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.password_hash).toBe('[REDACTED]');
      expect(sanitized.credentials.api_key).toBe('[REDACTED]');
    });

    test('should truncate large data', () => {
      const largeData = {
        description: 'x'.repeat(5000)
      };

      const sanitized = auditLogger.sanitizeData(largeData, 1000);
      expect(sanitized._truncated).toBe(true);
      expect(sanitized._originalSize).toBeGreaterThan(1000);
    });
  });

  describe('isSensitiveField', () => {
    test('should identify sensitive field names', () => {
      expect(auditLogger.isSensitiveField('password')).toBe(true);
      expect(auditLogger.isSensitiveField('password_hash')).toBe(true);
      expect(auditLogger.isSensitiveField('access_token')).toBe(true);
      expect(auditLogger.isSensitiveField('api_key')).toBe(true);
      expect(auditLogger.isSensitiveField('secret')).toBe(true);
      expect(auditLogger.isSensitiveField('name')).toBe(false);
      expect(auditLogger.isSensitiveField('email')).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(auditLogger.isSensitiveField('PASSWORD')).toBe(true);
      expect(auditLogger.isSensitiveField('Token')).toBe(true);
      expect(auditLogger.isSensitiveField('API_KEY')).toBe(true);
    });
  });

  describe('getClientIP', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
      };
      expect(auditLogger.getClientIP(req)).toBe('192.168.1.1');
    });

    test('should extract IP from x-real-ip header', () => {
      const req = {
        headers: { 'x-real-ip': '192.168.1.2' }
      };
      expect(auditLogger.getClientIP(req)).toBe('192.168.1.2');
    });

    test('should fallback to connection remote address', () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '192.168.1.3' }
      };
      expect(auditLogger.getClientIP(req)).toBe('192.168.1.3');
    });

    test('should return unknown for no IP', () => {
      const req = { headers: {} };
      expect(auditLogger.getClientIP(req)).toBe('unknown');
    });
  });
});

describe('Audit Middleware Integration', () => {
  test('should create middleware function', () => {
    const auditLogger = new AuditLogger();
    const middleware = auditLogger.middleware();
    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(3); // Express middleware signature (req, res, next)
  });

  test('should pass through non-auditable requests', (done) => {
    const auditLogger = new AuditLogger();
    const middleware = auditLogger.middleware();

    const req = { path: '/health', method: 'GET' };
    const res = {};
    const next = jest.fn(() => done());

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
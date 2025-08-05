const helmet = require('helmet');
const { createAuditLog, AUDIT_EVENTS, AUDIT_SEVERITY } = require('./auditTrail');

/**
 * Enhanced security configuration and middleware
 * Provides comprehensive security headers and protection mechanisms
 */

/**
 * Security headers configuration for different environments
 */
const securityConfig = {
  development: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\''],
        imgSrc: ['\'self\'', 'data:', 'https:'],
        fontSrc: ['\'self\'', 'https:', 'data:'],
        connectSrc: ['\'self\'', 'ws:', 'wss:'],
        mediaSrc: ['\'self\''],
        objectSrc: ['\'none\''],
        childSrc: ['\'self\''],
        workerSrc: ['\'self\''],
        frameSrc: ['\'none\''],
        baseUri: ['\'self\''],
        formAction: ['\'self\''],
        frameAncestors: ['\'none\''],
        manifestSrc: ['\'self\'']
      }
    },
    hsts: false, // Disable HSTS in development
    noSniff: true,
    xssFilter: true,
    referrerPolicy: 'same-origin'
  },
  
  production: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        scriptSrc: ['\'self\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\''], // May need unsafe-inline for some CSS frameworks
        imgSrc: ['\'self\'', 'data:', 'https:'],
        fontSrc: ['\'self\'', 'https:'],
        connectSrc: ['\'self\'', 'https:'],
        mediaSrc: ['\'self\''],
        objectSrc: ['\'none\''],
        childSrc: ['\'self\''],
        workerSrc: ['\'self\''],
        frameSrc: ['\'none\''],
        baseUri: ['\'self\''],
        formAction: ['\'self\''],
        frameAncestors: ['\'none\''],
        manifestSrc: ['\'self\''],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: 'strict-origin-when-cross-origin'
  }
};

/**
 * Get security configuration based on environment
 */
function getSecurityConfig() {
  const env = process.env.NODE_ENV || 'development';
  return securityConfig[env] || securityConfig.development;
}

/**
 * Enhanced CORS configuration
 */
function getCorsConfig() {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003'
  ];
  
  // Add production domains if specified
  if (process.env.PRODUCTION_DOMAINS) {
    const prodDomains = process.env.PRODUCTION_DOMAINS.split(',');
    allowedOrigins.push(...prodDomains);
  }
  
  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log unauthorized CORS attempts
      logUnauthorizedCorsAttempt(origin);
      
      const error = new Error('Not allowed by CORS');
      error.statusCode = 403;
      callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400 // 24 hours
  };
}

/**
 * Log unauthorized CORS attempts
 */
async function logUnauthorizedCorsAttempt(origin) {
  try {
    await createAuditLog({
      event_type: AUDIT_EVENTS.SECURITY_UNAUTHORIZED_ACCESS,
      severity: AUDIT_SEVERITY.HIGH,
      success: false,
      error_message: `Unauthorized CORS request from origin: ${origin}`,
      additional_data: {
        origin: origin,
        type: 'cors_violation',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log CORS violation:', error);
  }
}

/**
 * Security headers middleware factory
 */
function createSecurityMiddleware() {
  const config = getSecurityConfig();
  
  return helmet({
    contentSecurityPolicy: config.contentSecurityPolicy,
    hsts: config.hsts,
    noSniff: config.noSniff,
    xssFilter: config.xssFilter,
    referrerPolicy: { policy: config.referrerPolicy },
    
    // Additional security headers
    frameguard: { action: 'deny' },
    permittedCrossDomainPolicies: false,
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    hidePoweredBy: true,
    
    // Expect-CT header for certificate transparency
    expectCt: process.env.NODE_ENV === 'production' ? {
      maxAge: 86400,
      enforce: true
    } : false,
    
    // Additional security headers
    crossOriginEmbedderPolicy: false, // May cause issues with some third-party integrations
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    originAgentCluster: true
  });
}

/**
 * HTTPS enforcement middleware
 */
function enforceHTTPS(req, res, next) {
  // Skip HTTPS enforcement in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Check if request is already HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }
  
  // Redirect to HTTPS
  const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
  res.redirect(301, httpsUrl);
}

/**
 * Security monitoring middleware
 */
function securityMonitoring(req, res, next) {
  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /<script/i,       // XSS attempts
    /union\s+select/i, // SQL injection
    /exec\s*\(/i,     // Code execution attempts
    /eval\s*\(/i,     // Eval attempts
    /javascript:/i,   // JavaScript protocol
    /vbscript:/i,     // VBScript protocol
    /onload\s*=/i,    // Event handler injection
    /onerror\s*=/i    // Error handler injection
  ];
  
  const userInput = JSON.stringify({
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  
  // Check for suspicious patterns
  const foundPatterns = suspiciousPatterns.filter(pattern => pattern.test(userInput));
  
  if (foundPatterns.length > 0) {
    // Log suspicious activity
    logSuspiciousActivity(req, foundPatterns);
    
    // For development, just log and continue
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Suspicious patterns detected:', foundPatterns);
      return next();
    }
    
    // In production, block the request
    return res.status(400).json({
      error: 'Request blocked due to suspicious content',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Log suspicious activity
 */
async function logSuspiciousActivity(req, patterns) {
  try {
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection?.remoteAddress || 
                    req.ip || 
                    'unknown';
    
    await createAuditLog({
      event_type: AUDIT_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY,
      user_id: req.user?.userId || null,
      user_email: req.user?.email || null,
      ip_address: clientIP,
      user_agent: req.headers['user-agent'],
      request_path: req.path,
      request_method: req.method,
      severity: AUDIT_SEVERITY.HIGH,
      success: false,
      error_message: 'Suspicious patterns detected in request',
      additional_data: {
        patterns: patterns.map(p => p.toString()),
        url: req.url,
        query: req.query,
        headers: sanitizeHeaders(req.headers),
        body: sanitizeBodyForLogging(req.body)
      }
    });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
  }
}

/**
 * Sanitize headers for logging (remove sensitive data)
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

/**
 * Sanitize body for logging (remove sensitive data)
 */
function sanitizeBodyForLogging(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key'];
  const sanitized = { ...body };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

/**
 * Request size limiting middleware
 */
function requestSizeLimit(maxSize = '10mb') {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: 'Request entity too large',
          maxSize: maxSize,
          actualSize: formatBytes(sizeInBytes)
        });
      }
    }
    
    next();
  };
}

/**
 * Parse size string to bytes
 */
function parseSize(size) {
  if (typeof size === 'number') {
    return size;
  }
  
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    return 0;
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
}

/**
 * Environment validation middleware
 */
function validateEnvironment() {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'NODE_ENV'
  ];
  
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    process.exit(1);
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  // AI Services validation (warning only - not critical for basic app function)
  const aiEnvVars = {
    'AI Services': {
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
      'DEEPSEEK_API_KEY': process.env.DEEPSEEK_API_KEY
    },
    'Google Vision OCR': {
      'GOOGLE_CLOUD_PROJECT_ID': process.env.GOOGLE_CLOUD_PROJECT_ID,
      'GOOGLE_CLOUD_KEY_FILE': process.env.GOOGLE_CLOUD_KEY_FILE
    },
    'Receipt Processing': {
      'REDIS_HOST': process.env.REDIS_HOST || 'localhost',
      'REDIS_PORT': process.env.REDIS_PORT || '6379'
    }
  };

  let hasAnyAI = false;
  const warnings = [];

  // Check if at least one AI service is configured
  if (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY) {
    hasAnyAI = true;
    console.log('✅ AI LLM Service: Configured');
  } else {
    warnings.push('No AI LLM service configured (OPENAI_API_KEY or DEEPSEEK_API_KEY)');
  }

  // Check Google Vision API
  if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEY_FILE) {
    console.log('✅ Google Vision OCR: Configured');
  } else {
    warnings.push('Google Vision OCR not configured - will use fallback OCR methods');
  }

  // Check Redis for queue processing
  if (process.env.REDIS_HOST || process.env.REDIS_PORT) {
    console.log('✅ Redis Queue: Configured');
  } else {
    warnings.push('Redis not configured - receipt processing will be synchronous');
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Configuration Warnings:');
    warnings.forEach(warning => console.log(`   • ${warning}`));
    console.log('\n💡 Receipt processing will work with reduced functionality');
  }

  if (hasAnyAI) {
    console.log('✅ Environment validation passed - AI receipt processing available');
  } else {
    console.log('✅ Environment validation passed - basic functionality only');
  }
}

module.exports = {
  createSecurityMiddleware,
  getCorsConfig,
  enforceHTTPS,
  securityMonitoring,
  requestSizeLimit,
  validateEnvironment,
  getSecurityConfig
};
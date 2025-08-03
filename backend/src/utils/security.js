/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitize user input to prevent prompt injection attacks
 * @param {string} input - User input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized input
 */
function sanitizePromptInput(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const {
    maxLength = 2000,
    removePromptMarkers = true,
    removeCodeBlocks = true,
    removeInstructions = true
  } = options;

  let sanitized = input;

  // Remove potential prompt injection markers
  if (removePromptMarkers) {
    sanitized = sanitized
      .replace(/\b(system|assistant|user|role)\s*:/gi, '') // Remove role markers
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]*`/g, '') // Remove inline code
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove markdown links
  }

  // Remove potential instruction injections
  if (removeInstructions) {
    sanitized = sanitized
      .replace(/\b(ignore|forget|disregard)\s+(previous|above|earlier)\s+(instructions?|prompts?|rules?)/gi, '')
      .replace(/\b(act|behave|pretend)\s+as\s+(if|though)/gi, '')
      .replace(/\b(override|bypass|skip)\s+(safety|security|rules?|instructions?)/gi, '')
      .replace(/\b(jailbreak|prompt\s*injection|exploit)/gi, '');
  }

  // Remove code blocks if specified
  if (removeCodeBlocks) {
    sanitized = sanitized
      .replace(/```[\s\S]*?```/g, '[code block removed]')
      .replace(/`[^`\n]*`/g, '[code removed]');
  }

  // Normalize whitespace
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized;
}

/**
 * Sanitize object values recursively
 * @param {Object} obj - Object to sanitize
 * @param {Array} fieldsToSanitize - Fields that should be sanitized
 * @returns {Object} Sanitized object
 */
function sanitizeObjectFields(obj, fieldsToSanitize = []) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (fieldsToSanitize.includes(key) && typeof value === 'string') {
      sanitized[key] = sanitizePromptInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeObjectFields(item, fieldsToSanitize) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObjectFields(value, fieldsToSanitize);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} Whether UUID is valid
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Rate limiting key generator
 * @param {string} identifier - User identifier
 * @param {string} action - Action being performed
 * @returns {string} Rate limiting key
 */
function generateRateLimitKey(identifier, action) {
  return `ratelimit:${action}:${identifier}`;
}

/**
 * Generate request ID for tracking
 * @returns {string} Unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize file name to prevent path traversal
 * @param {string} filename - File name to sanitize
 * @returns {string} Sanitized file name
 */
function sanitizeFileName(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/\.{2,}/g, '.') // Remove consecutive dots
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 255); // Limit length
}

module.exports = {
  sanitizePromptInput,
  sanitizeObjectFields,
  isValidEmail,
  isValidUUID,
  generateRateLimitKey,
  generateRequestId,
  sanitizeFileName
};
const crypto = require('crypto');
const knex = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Enterprise-grade encryption service for sensitive data protection
 * Handles field-level encryption, key management, and secure data operations
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Master encryption key from environment
    this.masterKey = this.deriveMasterKey();
    
    // Cache for derived keys (in production, use Redis or similar)
    this.keyCache = new Map();
  }

  /**
   * Derive master key from environment variable
   */
  deriveMasterKey() {
    const secret = process.env.ENCRYPTION_MASTER_KEY || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters long');
    }
    
    // Use PBKDF2 to derive a consistent key from the secret
    const salt = 'sports-management-encryption-salt';
    return crypto.pbkdf2Sync(secret, salt, 100000, this.keyLength, 'sha512');
  }

  /**
   * Generate a new encryption key for a specific context
   */
  generateDataKey(context = 'default') {
    const keyId = uuidv4();
    const dataKey = crypto.randomBytes(this.keyLength);
    
    // Encrypt the data key with the master key
    const encryptedKey = this.encryptWithMasterKey(dataKey);
    
    // Cache the key (in production, store securely)
    this.keyCache.set(keyId, dataKey);
    
    return {
      keyId,
      encryptedKey: encryptedKey.toString('base64'),
      context
    };
  }

  /**
   * Encrypt data with master key
   */
  encryptWithMasterKey(data) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey, { iv });
    
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    // Combine IV, tag, and encrypted data
    return Buffer.concat([iv, tag, encrypted]);
  }

  /**
   * Decrypt data with master key
   */
  decryptWithMasterKey(encryptedData) {
    const iv = encryptedData.slice(0, this.ivLength);
    const tag = encryptedData.slice(this.ivLength, this.ivLength + this.tagLength);
    const encrypted = encryptedData.slice(this.ivLength + this.tagLength);
    
    const decipher = crypto.createDecipher(this.algorithm, this.masterKey, { iv });
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  /**
   * Encrypt sensitive field data
   */
  async encryptField(tableName, fieldName, recordId, plaintext) {
    try {
      if (!plaintext || plaintext === '') {
        return null;
      }

      // Generate or retrieve data key for this table/field combination
      const context = `${tableName}.${fieldName}`;
      const keyInfo = await this.getOrCreateDataKey(context);
      
      // Get the actual encryption key
      const dataKey = await this.getDataKey(keyInfo.keyId);
      if (!dataKey) {
        throw new Error('Failed to retrieve encryption key');
      }

      // Encrypt the data
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, dataKey, { iv });
      
      let encrypted = cipher.update(Buffer.from(plaintext, 'utf8'));
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted data
      const encryptedBuffer = Buffer.concat([iv, tag, encrypted]);
      const encryptedValue = encryptedBuffer.toString('base64');

      // Store in encrypted_fields table
      await knex('encrypted_fields')
        .insert({
          id: uuidv4(),
          table_name: tableName,
          field_name: fieldName,
          record_id: recordId.toString(),
          encrypted_value: encryptedValue,
          encryption_key_id: keyInfo.keyId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .onConflict(['table_name', 'field_name', 'record_id'])
        .merge({
          encrypted_value: encryptedValue,
          encryption_key_id: keyInfo.keyId,
          updated_at: new Date()
        });

      return {
        encrypted: true,
        keyId: keyInfo.keyId,
        fieldId: `${tableName}.${fieldName}.${recordId}`
      };

    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt field data');
    }
  }

  /**
   * Decrypt sensitive field data
   */
  async decryptField(tableName, fieldName, recordId) {
    try {
      // Retrieve encrypted data
      const encryptedField = await knex('encrypted_fields')
        .where({
          table_name: tableName,
          field_name: fieldName,
          record_id: recordId.toString()
        })
        .first();

      if (!encryptedField) {
        return null;
      }

      // Get the encryption key
      const dataKey = await this.getDataKey(encryptedField.encryption_key_id);
      if (!dataKey) {
        throw new Error('Failed to retrieve decryption key');
      }

      // Decrypt the data
      const encryptedBuffer = Buffer.from(encryptedField.encrypted_value, 'base64');
      
      const iv = encryptedBuffer.slice(0, this.ivLength);
      const tag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);
      
      const decipher = crypto.createDecipher(this.algorithm, dataKey, { iv });
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');

    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt field data');
    }
  }

  /**
   * Encrypt multiple fields for a record
   */
  async encryptFields(tableName, recordId, fields) {
    const results = {};
    
    for (const [fieldName, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined && value !== '') {
        results[fieldName] = await this.encryptField(tableName, fieldName, recordId, value);
      } else {
        results[fieldName] = null;
      }
    }
    
    return results;
  }

  /**
   * Decrypt multiple fields for a record
   */
  async decryptFields(tableName, recordId, fieldNames) {
    const results = {};
    
    for (const fieldName of fieldNames) {
      results[fieldName] = await this.decryptField(tableName, fieldName, recordId);
    }
    
    return results;
  }

  /**
   * Get or create data key for a context
   */
  async getOrCreateDataKey(context) {
    // In production, this would check a secure key store
    // For now, generate a new key each time
    return this.generateDataKey(context);
  }

  /**
   * Retrieve data key by ID
   */
  async getDataKey(keyId) {
    // Check cache first
    if (this.keyCache.has(keyId)) {
      return this.keyCache.get(keyId);
    }

    // In production, this would retrieve from secure key store
    // For now, generate a deterministic key based on keyId and master key
    const keyMaterial = crypto
      .createHmac('sha256', this.masterKey)
      .update(keyId)
      .digest();

    // Cache the key
    this.keyCache.set(keyId, keyMaterial);
    
    return keyMaterial;
  }

  /**
   * Hash sensitive data (one-way)
   */
  hashData(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(this.saltLength);
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data, hash, salt) {
    const saltBuffer = Buffer.from(salt, 'hex');
    const hashedData = this.hashData(data, saltBuffer);
    
    return hashedData.hash === hash;
  }

  /**
   * Generate secure random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate cryptographically secure random numbers
   */
  generateSecureRandom(min = 0, max = 1000000) {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    
    let randomValue;
    do {
      const randomBytes = crypto.randomBytes(bytesNeeded);
      randomValue = randomBytes.readUIntBE(0, bytesNeeded);
    } while (randomValue >= Math.floor(0x100 ** bytesNeeded / range) * range);
    
    return min + (randomValue % range);
  }

  /**
   * Encrypt file data
   */
  async encryptFile(fileBuffer, metadata = {}) {
    try {
      const keyInfo = this.generateDataKey('file_encryption');
      const dataKey = await this.getDataKey(keyInfo.keyId);
      
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, dataKey, { iv });
      
      let encrypted = cipher.update(fileBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted data
      const encryptedBuffer = Buffer.concat([iv, tag, encrypted]);
      
      return {
        encryptedData: encryptedBuffer,
        keyId: keyInfo.keyId,
        metadata: {
          ...metadata,
          originalSize: fileBuffer.length,
          encryptedSize: encryptedBuffer.length,
          algorithm: this.algorithm
        }
      };

    } catch (error) {
      console.error('File encryption error:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file data
   */
  async decryptFile(encryptedBuffer, keyId) {
    try {
      const dataKey = await this.getDataKey(keyId);
      
      const iv = encryptedBuffer.slice(0, this.ivLength);
      const tag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);
      
      const decipher = crypto.createDecipher(this.algorithm, dataKey, { iv });
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;

    } catch (error) {
      console.error('File decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Clean up expired encryption keys
   */
  async rotateKeys() {
    // Implementation for key rotation
    // This would be called periodically to rotate encryption keys
    console.log('Key rotation initiated');
    
    // In production, this would:
    // 1. Generate new keys
    // 2. Re-encrypt data with new keys
    // 3. Securely dispose of old keys
    // 4. Update key references
    
    return {
      rotated: 0,
      errors: 0
    };
  }

  /**
   * Get encryption statistics
   */
  async getEncryptionStats() {
    const stats = await knex('encrypted_fields')
      .select('table_name')
      .count('* as count')
      .groupBy('table_name');

    return {
      totalEncryptedFields: stats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
      encryptedTables: stats,
      algorithm: this.algorithm,
      keyLength: this.keyLength
    };
  }

  /**
   * Validate encryption integrity
   */
  async validateIntegrity(tableName = null, fieldName = null) {
    let query = knex('encrypted_fields');
    
    if (tableName) {
      query = query.where('table_name', tableName);
    }
    
    if (fieldName) {
      query = query.where('field_name', fieldName);
    }

    const encryptedFields = await query.limit(100); // Process in batches
    
    let validCount = 0;
    let invalidCount = 0;
    const errors = [];

    for (const field of encryptedFields) {
      try {
        const decrypted = await this.decryptField(
          field.table_name,
          field.field_name,
          field.record_id
        );
        
        if (decrypted !== null) {
          validCount++;
        } else {
          invalidCount++;
        }
      } catch (error) {
        invalidCount++;
        errors.push({
          field: `${field.table_name}.${field.field_name}.${field.record_id}`,
          error: error.message
        });
      }
    }

    return {
      valid: validCount,
      invalid: invalidCount,
      errors: errors.slice(0, 10) // Return first 10 errors
    };
  }
}

module.exports = EncryptionService;
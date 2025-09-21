/**
 * @fileoverview Bridge compatibility layer for EncryptionService
 * Provides backward compatibility while migrating to TypeScript
 *
 * @deprecated Use EncryptionService.ts instead
 * @author Claude Assistant
 * @date 2025-01-23
 */

try {
  // Import the TypeScript implementation
  const { EncryptionService: TypeScriptEncryptionService, encryptionService } = require('./EncryptionService.ts');

  /**
   * @deprecated Use the TypeScript version instead
   * Bridge class for backward compatibility
   */
  class EncryptionService extends TypeScriptEncryptionService {
    constructor() {
      console.warn('EncryptionService.js is deprecated. Please migrate to EncryptionService.ts');
      super();
    }
  }

  // Export for CommonJS compatibility
  module.exports = EncryptionService;
  module.exports.EncryptionService = EncryptionService;
  module.exports.encryptionService = encryptionService;
  module.exports.default = EncryptionService;

} catch (error) {
  console.error('Failed to load TypeScript EncryptionService, falling back to original implementation');

  // Fallback to original implementation if TypeScript version fails
  const crypto = require('crypto');
  const knex = require('../config/database');
  const { v4: uuidv4 } = require('uuid');

  /**
   * Legacy implementation for fallback compatibility
   */
  class EncryptionService {
    constructor() {
      this.algorithm = 'aes-256-gcm';
      this.keyLength = 32;
      this.ivLength = 16;
      this.tagLength = 16;
      this.saltLength = 32;
      this.masterKey = this.deriveMasterKey();
      this.keyCache = new Map();
    }

    deriveMasterKey() {
      const secret = process.env.ENCRYPTION_MASTER_KEY || process.env.JWT_SECRET;
      if (!secret || secret.length < 32) {
        throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters long');
      }
      const salt = 'sports-management-encryption-salt';
      return crypto.pbkdf2Sync(secret, salt, 100000, this.keyLength, 'sha512');
    }

    generateDataKey(context = 'default') {
      const keyId = uuidv4();
      const dataKey = crypto.randomBytes(this.keyLength);
      const encryptedKey = this.encryptWithMasterKey(dataKey);
      this.keyCache.set(keyId, dataKey);

      return {
        keyId,
        encryptedKey: encryptedKey.toString('base64'),
        context
      };
    }

    encryptWithMasterKey(data) {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipherGCM(this.algorithm, this.masterKey, iv);

      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, encrypted]);
    }

    decryptWithMasterKey(encryptedData) {
      const iv = encryptedData.slice(0, this.ivLength);
      const tag = encryptedData.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = encryptedData.slice(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipherGCM(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    }

    async encryptField(tableName, fieldName, recordId, plaintext) {
      try {
        if (!plaintext || plaintext === '') return null;

        const context = `${tableName}.${fieldName}`;
        const keyInfo = await this.getOrCreateDataKey(context);
        const dataKey = await this.getDataKey(keyInfo.keyId);

        if (!dataKey) throw new Error('Failed to retrieve encryption key');

        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipherGCM(this.algorithm, dataKey, iv);

        let encrypted = cipher.update(Buffer.from(plaintext, 'utf8'));
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        const tag = cipher.getAuthTag();
        const encryptedBuffer = Buffer.concat([iv, tag, encrypted]);
        const encryptedValue = encryptedBuffer.toString('base64');

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

    async decryptField(tableName, fieldName, recordId) {
      try {
        const encryptedField = await knex('encrypted_fields')
          .where({
            table_name: tableName,
            field_name: fieldName,
            record_id: recordId.toString()
          })
          .first();

        if (!encryptedField) return null;

        const dataKey = await this.getDataKey(encryptedField.encryption_key_id);
        if (!dataKey) throw new Error('Failed to retrieve decryption key');

        const encryptedBuffer = Buffer.from(encryptedField.encrypted_value, 'base64');
        const iv = encryptedBuffer.slice(0, this.ivLength);
        const tag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
        const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);

        const decipher = crypto.createDecipherGCM(this.algorithm, dataKey, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
      } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt field data');
      }
    }

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

    async decryptFields(tableName, recordId, fieldNames) {
      const results = {};
      for (const fieldName of fieldNames) {
        results[fieldName] = await this.decryptField(tableName, fieldName, recordId);
      }
      return results;
    }

    async getOrCreateDataKey(context) {
      return this.generateDataKey(context);
    }

    async getDataKey(keyId) {
      if (this.keyCache.has(keyId)) {
        return this.keyCache.get(keyId);
      }

      const keyMaterial = crypto
        .createHmac('sha256', this.masterKey)
        .update(keyId)
        .digest();

      this.keyCache.set(keyId, keyMaterial);
      return keyMaterial;
    }

    hashData(data, salt = null) {
      if (!salt) salt = crypto.randomBytes(this.saltLength);
      const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');

      return {
        hash: hash.toString('hex'),
        salt: salt.toString('hex')
      };
    }

    verifyHash(data, hash, salt) {
      const saltBuffer = Buffer.from(salt, 'hex');
      const hashedData = this.hashData(data, saltBuffer);
      return hashedData.hash === hash;
    }

    generateToken(length = 32) {
      return crypto.randomBytes(length).toString('hex');
    }

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

    async encryptFile(fileBuffer, metadata = {}) {
      try {
        const keyInfo = this.generateDataKey('file_encryption');
        const dataKey = await this.getDataKey(keyInfo.keyId);

        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipherGCM(this.algorithm, dataKey, iv);

        let encrypted = cipher.update(fileBuffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        const tag = cipher.getAuthTag();
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

    async decryptFile(encryptedBuffer, keyId) {
      try {
        const dataKey = await this.getDataKey(keyId);

        const iv = encryptedBuffer.slice(0, this.ivLength);
        const tag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
        const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);

        const decipher = crypto.createDecipherGCM(this.algorithm, dataKey, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted;
      } catch (error) {
        console.error('File decryption error:', error);
        throw new Error('Failed to decrypt file');
      }
    }

    async rotateKeys() {
      console.log('Key rotation initiated');
      return { rotated: 0, errors: 0 };
    }

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

    async validateIntegrity(tableName = null, fieldName = null) {
      let query = knex('encrypted_fields');

      if (tableName) query = query.where('table_name', tableName);
      if (fieldName) query = query.where('field_name', fieldName);

      const encryptedFields = await query.limit(100);

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
        errors: errors.slice(0, 10)
      };
    }
  }

  module.exports = EncryptionService;
  module.exports.EncryptionService = EncryptionService;
  module.exports.default = EncryptionService;
}
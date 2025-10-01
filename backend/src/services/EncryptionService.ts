/**
 * @fileoverview Enterprise-grade encryption service for sensitive data protection
 * Handles field-level encryption, key management, and secure data operations
 *
 * @author Claude Assistant
 * @date 2025-01-23
 */

import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import knex from '../config/database';
import {
  IEncryptionService,
  EncryptionConfig,
  DataKeyInfo,
  EncryptedFieldResult,
  EncryptedFileResult,
  FileEncryptionMetadata,
  HashResult,
  EncryptionStats,
  IntegrityValidationResult,
  KeyRotationResult,
  EncryptedFieldRecord,
  FieldsToEncrypt,
  EncryptedFieldsResult,
  DecryptedFieldsResult,
  EncryptionContext,
  SupportedAlgorithm,
  KeyCache,
  RecordId,
  EncryptionError,
  EncryptionErrorType
} from './types/encryption';

/**
 * Enterprise-grade encryption service for sensitive data protection
 * Handles field-level encryption, key management, and secure data operations
 */
export class EncryptionService implements IEncryptionService {
  public readonly algorithm: SupportedAlgorithm = 'aes-256-gcm';
  public readonly keyLength: number = 32; // 256 bits
  public readonly ivLength: number = 16;  // 128 bits
  public readonly tagLength: number = 16; // 128 bits
  public readonly saltLength: number = 32; // 256 bits
  public readonly masterKey: Buffer;
  public readonly keyCache: KeyCache = new Map();

  constructor() {
    // Master encryption key from environment
    this.masterKey = this.deriveMasterKey();
  }

  /**
   * Derive master key from environment variable
   */
  private deriveMasterKey(): Buffer {
    const secret = process.env.ENCRYPTION_MASTER_KEY || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_KEY,
        'ENCRYPTION_MASTER_KEY must be at least 32 characters long'
      );
    }

    // Use PBKDF2 to derive a consistent key from the secret
    const salt = 'sports-management-encryption-salt';
    return crypto.pbkdf2Sync(secret, salt, 100000, this.keyLength, 'sha512');
  }

  /**
   * Generate a new encryption key for a specific context
   */
  public generateDataKey(context: EncryptionContext = 'default'): DataKeyInfo {
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
  public encryptWithMasterKey(data: Buffer): Buffer {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = (crypto as any).createCipherGCM(this.algorithm, this.masterKey, iv);

      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      return Buffer.concat([iv, tag, encrypted]);
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.ENCRYPTION_FAILED,
        'Failed to encrypt data with master key',
        error as Error
      );
    }
  }

  /**
   * Decrypt data with master key
   */
  public decryptWithMasterKey(encryptedData: Buffer): Buffer {
    try {
      if (encryptedData.length < this.ivLength + this.tagLength) {
        throw new Error('Encrypted data is too short');
      }

      const iv = encryptedData.slice(0, this.ivLength);
      const tag = encryptedData.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = encryptedData.slice(this.ivLength + this.tagLength);

      const decipher = (crypto as any).createDecipherGCM(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.DECRYPTION_FAILED,
        'Failed to decrypt data with master key',
        error as Error
      );
    }
  }

  /**
   * Encrypt sensitive field data
   */
  public async encryptField(
    tableName: string,
    fieldName: string,
    recordId: RecordId,
    plaintext: string
  ): Promise<EncryptedFieldResult | null> {
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
        throw new EncryptionError(
          EncryptionErrorType.KEY_GENERATION_FAILED,
          'Failed to retrieve encryption key'
        );
      }

      // Encrypt the data
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = (crypto as any).createCipherGCM(this.algorithm, dataKey, iv);

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
        } as any)
        .onConflict(['table_name', 'field_name', 'record_id'])
        .merge({
          encrypted_value: encryptedValue,
          encryption_key_id: keyInfo.keyId,
          updated_at: new Date()
        } as any);

      return {
        encrypted: true,
        keyId: keyInfo.keyId,
        fieldId: `${tableName}.${fieldName}.${recordId}`
      };

    } catch (error) {
      console.error('Encryption error:', error);
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(
        EncryptionErrorType.ENCRYPTION_FAILED,
        'Failed to encrypt field data',
        error as Error
      );
    }
  }

  /**
   * Decrypt sensitive field data
   */
  public async decryptField(
    tableName: string,
    fieldName: string,
    recordId: RecordId
  ): Promise<string | null> {
    try {
      // Retrieve encrypted data
      const encryptedField = await knex('encrypted_fields')
        .where({
          table_name: tableName,
          field_name: fieldName,
          record_id: recordId.toString()
        } as any)
        .first() as unknown as EncryptedFieldRecord | undefined;

      if (!encryptedField) {
        return null;
      }

      // Get the encryption key
      const dataKey = await this.getDataKey(encryptedField.encryption_key_id);
      if (!dataKey) {
        throw new EncryptionError(
          EncryptionErrorType.INVALID_KEY,
          'Failed to retrieve decryption key'
        );
      }

      // Decrypt the data
      const encryptedBuffer = Buffer.from(encryptedField.encrypted_value, 'base64');

      if (encryptedBuffer.length < this.ivLength + this.tagLength) {
        throw new Error('Encrypted data is corrupted');
      }

      const iv = encryptedBuffer.slice(0, this.ivLength);
      const tag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);

      const decipher = (crypto as any).createDecipherGCM(this.algorithm, dataKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');

    } catch (error) {
      console.error('Decryption error:', error);
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(
        EncryptionErrorType.DECRYPTION_FAILED,
        'Failed to decrypt field data',
        error as Error
      );
    }
  }

  /**
   * Encrypt multiple fields for a record
   */
  public async encryptFields(
    tableName: string,
    recordId: RecordId,
    fields: FieldsToEncrypt
  ): Promise<EncryptedFieldsResult> {
    const results: EncryptedFieldsResult = {};

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
  public async decryptFields(
    tableName: string,
    recordId: RecordId,
    fieldNames: string[]
  ): Promise<DecryptedFieldsResult> {
    const results: DecryptedFieldsResult = {};

    for (const fieldName of fieldNames) {
      results[fieldName] = await this.decryptField(tableName, fieldName, recordId);
    }

    return results;
  }

  /**
   * Get or create data key for a context
   */
  public async getOrCreateDataKey(context: EncryptionContext): Promise<DataKeyInfo> {
    // In production, this would check a secure key store
    // For now, generate a new key each time
    return this.generateDataKey(context);
  }

  /**
   * Retrieve data key by ID
   */
  public async getDataKey(keyId: string): Promise<Buffer | null> {
    try {
      // Check cache first
      if (this.keyCache.has(keyId)) {
        return this.keyCache.get(keyId)!;
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
    } catch (error) {
      console.error('Error retrieving data key:', error);
      return null;
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  public hashData(data: string, salt?: Buffer): HashResult {
    try {
      if (!salt) {
        salt = crypto.randomBytes(this.saltLength);
      }

      const hash = crypto.pbkdf2Sync(data || '', salt, 100000, 64, 'sha512');

      return {
        hash: hash.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.ENCRYPTION_FAILED,
        'Failed to hash data',
        error as Error
      );
    }
  }

  /**
   * Verify hashed data
   */
  public verifyHash(data: string, hash: string, salt: string): boolean {
    try {
      const saltBuffer = Buffer.from(salt, 'hex');
      const hashedData = this.hashData(data, saltBuffer);

      return hashedData.hash === hash;
    } catch (error) {
      console.error('Error verifying hash:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  public generateToken(length: number = 32): string {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_GENERATION_FAILED,
        'Failed to generate secure token',
        error as Error
      );
    }
  }

  /**
   * Generate cryptographically secure random numbers
   */
  public generateSecureRandom(min: number = 0, max: number = 1000000): number {
    try {
      const range = max - min + 1;
      const bytesNeeded = Math.ceil(Math.log2(range) / 8);

      let randomValue: number;
      do {
        const randomBytes = crypto.randomBytes(bytesNeeded);
        randomValue = randomBytes.readUIntBE(0, bytesNeeded);
      } while (randomValue >= Math.floor(0x100 ** bytesNeeded / range) * range);

      return min + (randomValue % range);
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_GENERATION_FAILED,
        'Failed to generate secure random number',
        error as Error
      );
    }
  }

  /**
   * Encrypt file data
   */
  public async encryptFile(
    fileBuffer: Buffer,
    metadata: Partial<FileEncryptionMetadata> = {}
  ): Promise<EncryptedFileResult> {
    try {
      const keyInfo = this.generateDataKey('file_encryption');
      const dataKey = await this.getDataKey(keyInfo.keyId);

      if (!dataKey) {
        throw new EncryptionError(
          EncryptionErrorType.KEY_GENERATION_FAILED,
          'Failed to generate file encryption key'
        );
      }

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = (crypto as any).createCipherGCM(this.algorithm, dataKey, iv);

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
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(
        EncryptionErrorType.ENCRYPTION_FAILED,
        'Failed to encrypt file',
        error as Error
      );
    }
  }

  /**
   * Decrypt file data
   */
  public async decryptFile(encryptedBuffer: Buffer, keyId: string): Promise<Buffer> {
    try {
      const dataKey = await this.getDataKey(keyId);

      if (!dataKey) {
        throw new EncryptionError(
          EncryptionErrorType.INVALID_KEY,
          'Failed to retrieve file decryption key'
        );
      }

      if (encryptedBuffer.length < this.ivLength + this.tagLength) {
        throw new Error('Encrypted file data is corrupted');
      }

      const iv = encryptedBuffer.slice(0, this.ivLength);
      const tag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);

      const decipher = (crypto as any).createDecipherGCM(this.algorithm, dataKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;

    } catch (error) {
      console.error('File decryption error:', error);
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(
        EncryptionErrorType.DECRYPTION_FAILED,
        'Failed to decrypt file',
        error as Error
      );
    }
  }

  /**
   * Clean up expired encryption keys
   */
  public async rotateKeys(): Promise<KeyRotationResult> {
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
  public async getEncryptionStats(): Promise<EncryptionStats> {
    try {
      const stats = await knex('encrypted_fields')
        .select('table_name')
        .count('* as count')
        .groupBy('table_name');

      return {
        totalEncryptedFields: stats.reduce((sum, stat) => sum + parseInt(stat.count as string), 0),
        encryptedTables: stats,
        algorithm: this.algorithm,
        keyLength: this.keyLength
      };
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.DATABASE_ERROR,
        'Failed to retrieve encryption statistics',
        error as Error
      );
    }
  }

  /**
   * Validate encryption integrity
   */
  public async validateIntegrity(
    tableName?: string,
    fieldName?: string
  ): Promise<IntegrityValidationResult> {
    try {
      let query = knex('encrypted_fields');

      if (tableName) {
        query = query.where('table_name', tableName);
      }

      if (fieldName) {
        query = query.where('field_name', fieldName);
      }

      const encryptedFields = await query.limit(100) as unknown as EncryptedFieldRecord[]; // Process in batches

      let validCount = 0;
      let invalidCount = 0;
      const errors: Array<{ field: string; error: string }> = [];

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
            error: (error as Error).message
          });
        }
      }

      return {
        valid: validCount,
        invalid: invalidCount,
        errors: errors.slice(0, 10) // Return first 10 errors
      };
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.DATABASE_ERROR,
        'Failed to validate encryption integrity',
        error as Error
      );
    }
  }
}

// Export types for external use
export type {
  IEncryptionService,
  EncryptionConfig,
  DataKeyInfo,
  EncryptedFieldResult,
  EncryptedFileResult,
  FileEncryptionMetadata,
  HashResult,
  EncryptionStats,
  IntegrityValidationResult,
  KeyRotationResult,
  EncryptedFieldRecord,
  FieldsToEncrypt,
  EncryptedFieldsResult,
  DecryptedFieldsResult,
  EncryptionContext,
  SupportedAlgorithm,
  KeyCache,
  RecordId
} from './types/encryption';

export { EncryptionError, EncryptionErrorType } from './types/encryption';

// Create and export singleton instance
export const encryptionService = new EncryptionService();
export default EncryptionService;

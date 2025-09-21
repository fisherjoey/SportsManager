/**
 * @fileoverview TypeScript type definitions for EncryptionService
 * Provides comprehensive type safety for cryptographic operations
 *
 * @author Claude Assistant
 * @date 2025-01-23
 */

/**
 * Encryption configuration interface
 */
export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyLength: number;
  ivLength: number;
  tagLength: number;
  saltLength: number;
}

/**
 * Data key information structure
 */
export interface DataKeyInfo {
  keyId: string;
  encryptedKey: string;
  context: string;
}

/**
 * Result of field encryption operation
 */
export interface EncryptedFieldResult {
  encrypted: true;
  keyId: string;
  fieldId: string;
}

/**
 * Result of file encryption operation
 */
export interface EncryptedFileResult {
  encryptedData: Buffer;
  keyId: string;
  metadata: FileEncryptionMetadata;
}

/**
 * File encryption metadata
 */
export interface FileEncryptionMetadata {
  originalSize: number;
  encryptedSize: number;
  algorithm: string;
  filename?: string;
  type?: string;
  [key: string]: any;
}

/**
 * Hash result with salt
 */
export interface HashResult {
  hash: string;
  salt: string;
}

/**
 * Encryption statistics
 */
export interface EncryptionStats {
  totalEncryptedFields: number;
  encryptedTables: Array<{
    table_name: string;
    count: string | number;
  }>;
  algorithm: string;
  keyLength: number;
}

/**
 * Integrity validation result
 */
export interface IntegrityValidationResult {
  valid: number;
  invalid: number;
  errors: Array<{
    field: string;
    error: string;
  }>;
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  rotated: number;
  errors: number;
}

/**
 * Encrypted field database record
 */
export interface EncryptedFieldRecord {
  id: string;
  table_name: string;
  field_name: string;
  record_id: string;
  encrypted_value: string;
  encryption_key_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Field encryption options
 */
export interface FieldEncryptionOptions {
  tableName: string;
  fieldName: string;
  recordId: string | number;
  plaintext: string;
}

/**
 * Multiple fields encryption input
 */
export interface FieldsToEncrypt {
  [fieldName: string]: string | null | undefined;
}

/**
 * Multiple fields encryption result
 */
export interface EncryptedFieldsResult {
  [fieldName: string]: EncryptedFieldResult | null;
}

/**
 * Multiple fields decryption result
 */
export interface DecryptedFieldsResult {
  [fieldName: string]: string | null;
}

/**
 * Secure random generation options
 */
export interface SecureRandomOptions {
  min?: number;
  max?: number;
  length?: number;
}

/**
 * Token generation options
 */
export interface TokenGenerationOptions {
  length?: number;
  encoding?: 'hex' | 'base64' | 'base64url';
}

/**
 * Encryption context for key derivation
 */
export type EncryptionContext = string;

/**
 * Supported encryption algorithms
 */
export type SupportedAlgorithm = 'aes-256-gcm';

/**
 * Key cache type
 */
export type KeyCache = Map<string, Buffer>;

/**
 * Database record ID type
 */
export type RecordId = string | number;

/**
 * Encryption operation result
 */
export type EncryptionResult<T> = T | null;

/**
 * Error types for encryption operations
 */
export enum EncryptionErrorType {
  INVALID_KEY = 'INVALID_KEY',
  INVALID_DATA = 'INVALID_DATA',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTEGRITY_VIOLATION = 'INTEGRITY_VIOLATION'
}

/**
 * Custom encryption error
 */
export class EncryptionError extends Error {
  constructor(
    public type: EncryptionErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Validation options for integrity checks
 */
export interface IntegrityValidationOptions {
  tableName?: string;
  fieldName?: string;
  batchSize?: number;
  includeDetails?: boolean;
}

/**
 * Key management options
 */
export interface KeyManagementOptions {
  rotationPeriod?: number;
  keyRetentionPeriod?: number;
  compressionEnabled?: boolean;
}

/**
 * Audit log entry for encryption operations
 */
export interface EncryptionAuditEntry {
  timestamp: Date;
  operation: 'encrypt' | 'decrypt' | 'key_generation' | 'key_rotation';
  context: string;
  userId?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Encryption service interface
 */
export interface IEncryptionService {
  // Configuration
  readonly algorithm: SupportedAlgorithm;
  readonly keyLength: number;
  readonly ivLength: number;
  readonly tagLength: number;
  readonly saltLength: number;
  readonly masterKey: Buffer;
  readonly keyCache: KeyCache;

  // Key management
  generateDataKey(context?: EncryptionContext): DataKeyInfo;
  getOrCreateDataKey(context: EncryptionContext): Promise<DataKeyInfo>;
  getDataKey(keyId: string): Promise<Buffer | null>;

  // Master key operations
  encryptWithMasterKey(data: Buffer): Buffer;
  decryptWithMasterKey(encryptedData: Buffer): Buffer;

  // Field encryption
  encryptField(
    tableName: string,
    fieldName: string,
    recordId: RecordId,
    plaintext: string
  ): Promise<EncryptedFieldResult | null>;

  decryptField(
    tableName: string,
    fieldName: string,
    recordId: RecordId
  ): Promise<string | null>;

  encryptFields(
    tableName: string,
    recordId: RecordId,
    fields: FieldsToEncrypt
  ): Promise<EncryptedFieldsResult>;

  decryptFields(
    tableName: string,
    recordId: RecordId,
    fieldNames: string[]
  ): Promise<DecryptedFieldsResult>;

  // File encryption
  encryptFile(
    fileBuffer: Buffer,
    metadata?: Partial<FileEncryptionMetadata>
  ): Promise<EncryptedFileResult>;

  decryptFile(encryptedBuffer: Buffer, keyId: string): Promise<Buffer>;

  // Hashing
  hashData(data: string, salt?: Buffer): HashResult;
  verifyHash(data: string, hash: string, salt: string): boolean;

  // Secure random generation
  generateToken(length?: number): string;
  generateSecureRandom(min?: number, max?: number): number;

  // Maintenance and statistics
  rotateKeys(): Promise<KeyRotationResult>;
  getEncryptionStats(): Promise<EncryptionStats>;
  validateIntegrity(
    tableName?: string,
    fieldName?: string
  ): Promise<IntegrityValidationResult>;
}
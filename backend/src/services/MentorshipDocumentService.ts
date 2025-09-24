// @ts-nocheck

/**
 * MentorshipDocumentService - Mentorship document management service
 * 
 * This service extends BaseService to provide specialized document management
 * for mentorship relationships, including file upload handling, document
 * categorization, security controls, and access management.
 * 
 * Key Features:
 * - Complete CRUD operations for mentorship documents
 * - File upload handling with metadata storage
 * - Security and access controls based on mentorship relationships
 * - Document type validation and file size limits
 * - File path management and storage organization
 * - Document statistics and usage tracking
 * - Safe file operations with proper cleanup
 */

import BaseService from './BaseService';
import path from 'path';
import fs from 'fs'.promises;

class MentorshipDocumentService extends BaseService {
  /**
   * Constructor for MentorshipDocumentService
   * @param {Object} db - Knex database instance
   * @param {Object} config - Configuration options
   */
  constructor(db, config = {}) {
    super('mentorship_documents', db, {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableAuditTrail: true,
      throwOnNotFound: true
    });

    // Configuration for file handling
    this.config = {
      uploadPath: config.uploadPath || './uploads/mentorship_documents',
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB default
      allowedTypes: config.allowedTypes || [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'application/zip'
      ],
      ...config
    };
  }

  /**
   * Upload a new document for a mentorship
   * @param {Object} documentData - Document data
   * @param {string} documentData.mentorship_id - Mentorship ID
   * @param {string} documentData.uploaded_by - User ID of uploader
   * @param {Object} fileInfo - File information from multer or similar
   * @param {string} fileInfo.originalname - Original filename
   * @param {string} fileInfo.filename - Stored filename
   * @param {string} fileInfo.path - File path
   * @param {string} fileInfo.mimetype - MIME type
   * @param {number} fileInfo.size - File size in bytes
   * @param {Object} options - Upload options
   * @returns {Object} Created document record
   * @throws {Error} If validation fails or access is denied
   */
  async uploadDocument(documentData, fileInfo, options = {}) {
    try {
      const { mentorship_id, uploaded_by } = documentData;

      // Validate required data
      if (!mentorship_id || !uploaded_by || !fileInfo) {
        throw new Error('mentorship_id, uploaded_by, and fileInfo are required');
      }

      // Validate file information
      if (!fileInfo.originalname || !fileInfo.filename || !fileInfo.path || !fileInfo.mimetype || !fileInfo.size) {
        throw new Error('Complete file information is required');
      }

      // Validate file size
      if (fileInfo.size > this.config.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize / (1024 * 1024)}MB`);
      }

      // Validate file type
      if (!this.config.allowedTypes.includes(fileInfo.mimetype)) {
        throw new Error(`File type ${fileInfo.mimetype} is not allowed`);
      }

      // Verify mentorship exists and user has upload permission
      await this.validateDocumentAccess(mentorship_id, uploaded_by, 'upload');

      // Sanitize filename
      const sanitizedOriginalName = this.sanitizeFilename(fileInfo.originalname);

      const documentRecord = {
        mentorship_id,
        document_name: sanitizedOriginalName,
        document_path: fileInfo.path,
        document_type: fileInfo.mimetype,
        file_size: fileInfo.size,
        uploaded_by
      };

      const document = await this.create(documentRecord, options);

      console.log(`Document uploaded: ${document.id} (${sanitizedOriginalName}, ${fileInfo.size} bytes)`);
      return document;

    } catch (error) {
      console.error('Error uploading document:', error);
      
      // Clean up uploaded file if database operation failed
      if (fileInfo && fileInfo.path) {
        try {
          await fs.unlink(fileInfo.path);
          console.log(`Cleaned up uploaded file: ${fileInfo.path}`);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup uploaded file: ${cleanupError.message}`);
        }
      }

      throw new Error(`Failed to upload document: ${error.message}`);
    }
  }

  /**
   * Get documents for a specific mentorship
   * @param {string} mentorshipId - Mentorship ID
   * @param {string} requestingUserId - ID of user requesting documents
   * @param {Object} options - Query options
   * @param {string} [options.document_type] - Filter by document type
   * @param {number} [options.page=1] - Page number for pagination
   * @param {number} [options.limit=20] - Number of documents per page
   * @returns {Object} Paginated documents with metadata
   */
  async getDocumentsByMentorship(mentorshipId, requestingUserId, options = {}) {
    try {
      const { document_type, page = 1, limit = 20 } = options;

      // Verify access to the mentorship
      await this.validateDocumentAccess(mentorshipId, requestingUserId, 'read');

      let query = this.db('mentorship_documents')
        .leftJoin('users', 'mentorship_documents.uploaded_by', 'users.id')
        .select(
          'mentorship_documents.*',
          'users.name as uploader_name'
        )
        .where('mentorship_documents.mentorship_id', mentorshipId);

      // Apply document type filter
      if (document_type) {
        query = query.where('mentorship_documents.document_type', document_type);
      }

      // Get total count for pagination
      const countQuery = query.clone().clearSelect().count('* as total').first();

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query
        .orderBy('mentorship_documents.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Execute queries
      const [documents, countResult] = await Promise.all([
        query,
        countQuery
      ]);

      const total = parseInt(countResult.total) || 0;
      const totalPages = Math.ceil(total / limit);

      // Add file size formatting to documents
      const formattedDocuments = documents.map(doc => ({
        ...doc,
        formatted_file_size: this.formatFileSize(doc.file_size),
        file_extension: path.extname(doc.document_name).toLowerCase()
      }));

      return {
        data: formattedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        meta: {
          mentorship_id: mentorshipId,
          total_size: documents.reduce((sum, doc) => sum + doc.file_size, 0)
        }
      };

    } catch (error) {
      console.error(`Error getting documents for mentorship ${mentorshipId}:`, error);
      throw new Error(`Failed to get documents: ${error.message}`);
    }
  }

  /**
   * Get a specific document by ID
   * @param {string} documentId - Document ID
   * @param {string} requestingUserId - ID of user requesting the document
   * @param {Object} options - Query options
   * @returns {Object} Document record with metadata
   * @throws {Error} If access is denied or document not found
   */
  async getDocumentById(documentId, requestingUserId, options = {}) {
    try {
      const document = await this.db('mentorship_documents')
        .leftJoin('users', 'mentorship_documents.uploaded_by', 'users.id')
        .leftJoin('mentorships', 'mentorship_documents.mentorship_id', 'mentorships.id')
        .select(
          'mentorship_documents.*',
          'users.name as uploader_name',
          'mentorships.mentor_id',
          'mentorships.mentee_id'
        )
        .where('mentorship_documents.id', documentId)
        .first();

      if (!document) {
        throw new Error('Document not found');
      }

      // Check access permissions
      const hasAccess = document.mentor_id === requestingUserId || document.mentee_id === requestingUserId;
      if (!hasAccess) {
        throw new Error('Access denied: You can only access documents from your own mentorship relationships');
      }

      // Add formatting
      document.formatted_file_size = this.formatFileSize(document.file_size);
      document.file_extension = path.extname(document.document_name).toLowerCase();

      return document;

    } catch (error) {
      console.error(`Error getting document ${documentId}:`, error);
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  /**
   * Download a document
   * @param {string} documentId - Document ID
   * @param {string} requestingUserId - ID of user requesting download
   * @returns {Object} File information for download
   * @throws {Error} If access is denied or file not found
   */
  async downloadDocument(documentId, requestingUserId) {
    try {
      // Get document and verify access
      const document = await this.getDocumentById(documentId, requestingUserId);

      // Check if file exists on filesystem
      try {
        await fs.access(document.document_path);
      } catch (error) {
        throw new Error('File not found on server');
      }

      // Return file information for download
      return {
        filePath: document.document_path,
        originalName: document.document_name,
        mimeType: document.document_type,
        fileSize: document.file_size
      };

    } catch (error) {
      console.error(`Error downloading document ${documentId}:`, error);
      throw new Error(`Failed to download document: ${error.message}`);
    }
  }

  /**
   * Delete a document
   * @param {string} documentId - Document ID
   * @param {string} requestingUserId - ID of user requesting deletion
   * @param {Object} options - Delete options
   * @returns {boolean} Success status
   * @throws {Error} If access is denied or deletion fails
   */
  async deleteDocument(documentId, requestingUserId, options = {}) {
    try {
      // Get existing document and verify permissions
      const document = await this.db('mentorship_documents')
        .leftJoin('mentorships', 'mentorship_documents.mentorship_id', 'mentorships.id')
        .select(
          'mentorship_documents.*',
          'mentorships.mentor_id'
        )
        .where('mentorship_documents.id', documentId)
        .first();

      if (!document) {
        if (this.options.throwOnNotFound) {
          throw new Error('Document not found');
        }
        return false;
      }

      // Only mentors can delete documents, or the original uploader
      const canDelete = document.mentor_id === requestingUserId || document.uploaded_by === requestingUserId;
      if (!canDelete) {
        throw new Error('Access denied: Only mentors or the original uploader can delete documents');
      }

      // Delete from database
      const deleted = await this.delete(documentId, options);

      // Clean up file from filesystem
      if (deleted && document.document_path) {
        try {
          await fs.unlink(document.document_path);
          console.log(`Cleaned up file: ${document.document_path}`);
        } catch (fileError) {
          console.warn(`Failed to delete file ${document.document_path}: ${fileError.message}`);
          // Don't throw error here - database deletion was successful
        }
      }

      console.log(`Document deleted: ${documentId}`);
      return deleted;

    } catch (error) {
      console.error(`Error deleting document ${documentId}:`, error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Get document statistics for a mentorship
   * @param {string} mentorshipId - Mentorship ID
   * @param {string} requestingUserId - ID of user requesting stats
   * @returns {Object} Statistics object
   */
  async getDocumentStatistics(mentorshipId, requestingUserId) {
    try {
      // Verify access to the mentorship
      await this.validateDocumentAccess(mentorshipId, requestingUserId, 'read');

      const stats = await this.db('mentorship_documents')
        .select(
          this.db.raw('COUNT(*) as total_documents'),
          this.db.raw('SUM(file_size) as total_size'),
          this.db.raw('AVG(file_size) as average_size'),
          this.db.raw('MAX(created_at) as latest_upload_date'),
          this.db.raw('COUNT(DISTINCT document_type) as unique_types')
        )
        .where('mentorship_id', mentorshipId)
        .first();

      // Get type breakdown
      const typeBreakdown = await this.db('mentorship_documents')
        .select('document_type', this.db.raw('COUNT(*) as count'))
        .where('mentorship_id', mentorshipId)
        .groupBy('document_type')
        .orderBy('count', 'desc');

      return {
        total_documents: parseInt(stats.total_documents) || 0,
        total_size: parseInt(stats.total_size) || 0,
        formatted_total_size: this.formatFileSize(parseInt(stats.total_size) || 0),
        average_size: parseInt(stats.average_size) || 0,
        formatted_average_size: this.formatFileSize(parseInt(stats.average_size) || 0),
        latest_upload_date: stats.latest_upload_date,
        unique_types: parseInt(stats.unique_types) || 0,
        type_breakdown: typeBreakdown
      };

    } catch (error) {
      console.error(`Error getting document statistics for mentorship ${mentorshipId}:`, error);
      throw new Error(`Failed to get document statistics: ${error.message}`);
    }
  }

  /**
   * Search documents within a mentorship
   * @param {string} mentorshipId - Mentorship ID
   * @param {string} searchQuery - Search query
   * @param {string} requestingUserId - ID of user performing search
   * @param {Object} options - Search options
   * @returns {Array} Matching documents
   */
  async searchDocuments(mentorshipId, searchQuery, requestingUserId, options = {}) {
    try {
      const { document_type, limit = 50 } = options;

      // Verify access to the mentorship
      await this.validateDocumentAccess(mentorshipId, requestingUserId, 'read');

      let query = this.db('mentorship_documents')
        .leftJoin('users', 'mentorship_documents.uploaded_by', 'users.id')
        .select(
          'mentorship_documents.*',
          'users.name as uploader_name'
        )
        .where('mentorship_documents.mentorship_id', mentorshipId)
        .where('mentorship_documents.document_name', 'ilike', `%${searchQuery}%`);

      // Apply document type filter
      if (document_type) {
        query = query.where('mentorship_documents.document_type', document_type);
      }

      const results = await query
        .orderBy('mentorship_documents.created_at', 'desc')
        .limit(limit);

      // Add formatting to results
      return results.map(doc => ({
        ...doc,
        formatted_file_size: this.formatFileSize(doc.file_size),
        file_extension: path.extname(doc.document_name).toLowerCase()
      }));

    } catch (error) {
      console.error(`Error searching documents in mentorship ${mentorshipId}:`, error);
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  /**
   * Validate document access permissions
   * @private
   * @param {string} mentorshipId - Mentorship ID
   * @param {string} userId - User ID to validate
   * @param {string} operation - Operation type ('read', 'upload')
   * @returns {Object} Mentorship record
   * @throws {Error} If access is denied
   */
  async validateDocumentAccess(mentorshipId, userId, operation = 'read') {
    try {
      const mentorship = await this.db('mentorships')
        .where('id', mentorshipId)
        .first();

      if (!mentorship) {
        throw new Error('Mentorship not found');
      }

      const isMentor = mentorship.mentor_id === userId;
      const isMentee = mentorship.mentee_id === userId;

      if (!isMentor && !isMentee) {
        throw new Error('Access denied: You can only access documents from your own mentorship relationships');
      }

      // For upload operations, typically both mentor and mentee can upload,
      // but this can be customized based on business requirements
      if (operation === 'upload') {
        // Both mentor and mentee can upload by default
        // If you want to restrict to mentors only, use:
        // if (!isMentor) throw new Error('Access denied: Only mentors can upload documents');
      }

      return mentorship;

    } catch (error) {
      console.error(`Error validating document access ${mentorshipId} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Sanitize filename for security
   * @private
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return 'unnamed_file';
    }

    // Remove or replace dangerous characters
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric chars (except ._-)
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }

  /**
   * Format file size for human readability
   * @private
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (!bytes || bytes < 0) return 'Unknown';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up orphaned files (files without database records)
   * @param {Object} options - Cleanup options
   * @returns {Object} Cleanup results
   */
  async cleanupOrphanedFiles(options = {}) {
    try {
      const { dryRun = false } = options;
      const results = {
        scanned: 0,
        orphaned: 0,
        cleaned: 0,
        errors: 0,
        files: []
      };

      // This would require implementing directory scanning
      // and comparing with database records
      console.warn('cleanupOrphanedFiles method not fully implemented');
      
      return results;

    } catch (error) {
      console.error('Error during orphaned file cleanup:', error);
      throw new Error(`Failed to cleanup orphaned files: ${error.message}`);
    }
  }

  /**
   * Hook called after document creation
   * @param {Object} document - Created document
   * @param {Object} options - Creation options
   */
  async afterCreate(document, options) {
    if (this.options.enableAuditTrail) {
      console.log(`Document uploaded: ${document.id} (mentorship: ${document.mentorship_id}, size: ${this.formatFileSize(document.file_size)})`);
    }
  }

  /**
   * Hook called before document deletion
   * @param {Object} document - Document to be deleted
   * @param {Object} options - Delete options
   */
  async beforeDelete(document, options) {
    if (this.options.enableAuditTrail) {
      console.log(`Preparing to delete document: ${document.id} (${document.document_name})`);
    }
  }
}

export default MentorshipDocumentService;
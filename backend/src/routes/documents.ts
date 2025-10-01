/**
 * Document Management Routes (TypeScript)
 * Comprehensive document management endpoints with enhanced type safety
 */

import express, { Response } from 'express';
import { Pool } from 'pg';
import Joi from 'joi';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { receiptUploader } from '../middleware/fileUpload';
import type { AuthenticatedRequest } from '../types/auth.types';
import { DocumentAuditAction } from '../types/document.types';
import type {
  Document,
  DocumentVersion,
  DocumentAcknowledgment,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateDocumentVersionRequest,
  DocumentQueryFilters,
  DocumentsResponse,
  DocumentWithVersions,
  DocumentAcknowledgmentsResponse,
  DocumentStats,
  PendingAcknowledgmentsResponse,
  PendingAcknowledgment,
  DocumentStatus,
  AccessPermissions,
  AcknowledgmentMethod,
  DocumentModel,
  DocumentVersionModel,
  DocumentAcknowledgmentModel,
  DocumentFileInfo
} from '../types/document.types';

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Validation schemas
const documentSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  category: Joi.string().max(50).required(),
  subcategory: Joi.string().max(50).allow('', null),
  effective_date: Joi.date().allow(null),
  expiration_date: Joi.date().allow(null),
  tags: Joi.array().items(Joi.string()).allow(null),
  access_permissions: Joi.object().allow(null),
  requires_acknowledgment: Joi.boolean().default(false)
});

const versionSchema = Joi.object({
  change_notes: Joi.string().required()
});

const acknowledgmentSchema = Joi.object({
  acknowledgment_method: Joi.string().valid('click', 'digital_signature', 'email_confirmation', 'manual_verification').default('click'),
  ip_address: Joi.string().ip().optional(),
  user_agent: Joi.string().max(500).optional()
});

// Helper function to calculate file checksum
async function calculateChecksum(filePath: string): Promise<string | null> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (error) {
    console.error('Error calculating checksum:', error);
    return null;
  }
}

// Helper function to check document access permissions
async function hasDocumentAccess(userId: string, documentId: string): Promise<boolean> {
  try {
    const query = `
      SELECT d.access_permissions, u.role
      FROM documents d
      CROSS JOIN users u
      WHERE d.id = $1 AND u.id = $2
    `;

    const result = await pool.query(query, [documentId, userId]);

    if (result.rows.length === 0) {
      return false;
    }

    const { access_permissions, role } = result.rows[0];

    // Admin and HR always have access
    if (['admin', 'hr'].includes(role)) {
      return true;
    }

    // If no specific permissions set, default to role-based access
    if (!access_permissions) {
      return ['admin', 'hr', 'manager'].includes(role);
    }

    const permissions: AccessPermissions = access_permissions;

    // Check visibility level
    if (permissions.visibility === 'public') {
      return true;
    }

    if (permissions.visibility === 'private') {
      return permissions.users?.includes(userId) || false;
    }

    // Restricted visibility - check specific permissions
    return (
      permissions.users?.includes(userId) ||
      permissions.roles?.includes(role) ||
      false
    );
  } catch (error) {
    console.error('Error checking document access:', error);
    return false;
  }
}

// Helper function to clean up uploaded files on error
async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error cleaning up file:', filePath, error);
  }
}

// Helper function to log audit events
async function logAuditEvent(
  documentId: string,
  action: DocumentAuditAction,
  userId: string,
  details?: any,
  req?: AuthenticatedRequest
): Promise<void> {
  try {
    const query = `
      INSERT INTO document_audit_log (document_id, action, user_id, details, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    await pool.query(query, [
      documentId,
      action,
      userId,
      details ? JSON.stringify(details) : null,
      (req as any)?.ip || null,
      (req as any)?.get('User-Agent') || null
    ]);
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

/**
 * GET /api/documents
 * List documents with filtering and pagination
 */
router.get('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'view:list',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt((req as any).query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt((req as any).query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const filters: DocumentQueryFilters = {
        category: (req as any).query.category as string,
        subcategory: (req as any).query.subcategory as string,
        status: (req as any).query.status as DocumentStatus,
        uploaded_by: (req as any).query.uploaded_by as string,
        requires_acknowledgment: (req as any).query.requires_acknowledgment === 'true',
        tags: (req as any).query.tags ? ((req as any).query.tags as string).split(',') : undefined,
        search: (req as any).query.search as string,
        sort_by: (req as any).query.sort_by as string || 'created_at',
        sort_order: ((req as any).query.sort_order as 'asc' | 'desc') || 'desc'
      };

      let query = `
        SELECT
          d.*,
          u.name as uploaded_by_name,
          a.name as approved_by_name,
          COUNT(da.id) as acknowledgment_count
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        LEFT JOIN users a ON d.approved_by = a.id
        LEFT JOIN document_acknowledgments da ON d.id = da.document_id
        WHERE d.status != 'draft' OR d.uploaded_by = $1
      `;

      const params: any[] = [req.user!.id];
      let paramCount = 1;

      // Apply filters
      if (filters.category) {
        paramCount++;
        query += ` AND d.category = $${paramCount}`;
        params.push(filters.category);
      }

      if (filters.subcategory) {
        paramCount++;
        query += ` AND d.subcategory = $${paramCount}`;
        params.push(filters.subcategory);
      }

      if (filters.status) {
        paramCount++;
        query += ` AND d.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.uploaded_by) {
        paramCount++;
        query += ` AND d.uploaded_by = $${paramCount}`;
        params.push(filters.uploaded_by);
      }

      if (filters.requires_acknowledgment !== undefined) {
        paramCount++;
        query += ` AND d.requires_acknowledgment = $${paramCount}`;
        params.push(filters.requires_acknowledgment);
      }

      if (filters.search) {
        paramCount++;
        query += ` AND (d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      if (filters.tags && filters.tags.length > 0) {
        paramCount++;
        query += ` AND d.tags && $${paramCount}`;
        params.push(filters.tags);
      }

      // Add GROUP BY clause
      query += ` GROUP BY d.id, u.name, a.name`;

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM (${query}) as subq`;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Apply sorting and pagination
      query += ` ORDER BY d.${filters.sort_by} ${filters.sort_order.toUpperCase()}`;
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      const result = await pool.query(query, params);

      const documents: Document[] = result.rows.map((row: any) => ({
        ...row,
        status: row.status as DocumentStatus,
        tags: row.tags || [],
        acknowledgment_count: parseInt(row.acknowledgment_count) || 0,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        effective_date: row.effective_date ? new Date(row.effective_date) : null,
        expiration_date: row.expiration_date ? new Date(row.expiration_date) : null
      }));

      const response: DocumentsResponse = {
        documents,
        total,
        page,
        limit,
        has_more: offset + limit < total
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/documents/:id
 * Get a specific document with version history
 */
router.get('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'view:details',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documentId = (req as any).params.id;
      const userId = req.user!.id;

      // Check access permissions
      const hasAccess = await hasDocumentAccess(userId, documentId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const query = `
        SELECT
          d.*,
          u.name as uploaded_by_name,
          a.name as approved_by_name
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        LEFT JOIN users a ON d.approved_by = a.id
        WHERE d.id = $1
      `;

      const result = await pool.query(query, [documentId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      const document: Document = {
        ...result.rows[0],
        status: result.rows[0].status as DocumentStatus,
        tags: result.rows[0].tags || [],
        created_at: new Date(result.rows[0].created_at),
        updated_at: new Date(result.rows[0].updated_at),
        effective_date: result.rows[0].effective_date ? new Date(result.rows[0].effective_date) : null,
        expiration_date: result.rows[0].expiration_date ? new Date(result.rows[0].expiration_date) : null
      };

      // Get version history
      const versionQuery = `
        SELECT
          dv.*,
          u.name as uploaded_by_name
        FROM document_versions dv
        JOIN users u ON dv.uploaded_by = u.id
        WHERE dv.document_id = $1
        ORDER BY dv.created_at DESC
      `;

      const versionResult = await pool.query(versionQuery, [documentId]);
      const versions: DocumentVersion[] = versionResult.rows.map((row: any) => ({
        ...row,
        created_at: new Date(row.created_at)
      }));

      // Log view event
      await logAuditEvent(documentId, DocumentAuditAction.DOWNLOADED, userId, null, req);

      const response: DocumentWithVersions = {
        document,
        versions
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/documents
 * Upload new document
 */
router.post('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'create',
  }),
  receiptUploader.single('document'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!(req as any).file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { error, value } = documentSchema.validate((req as any).body);
      if (error) {
        await cleanupFile((req as any).file.path);
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const documentData: CreateDocumentRequest = value;
      const userId = req.user!.id;

      // Calculate file checksum
      const checksum = await calculateChecksum((req as any).file.path);
      if (!checksum) {
        await cleanupFile((req as any).file.path);
        res.status(500).json({ error: 'Failed to process file' });
        return;
      }

      const version = '1.0';

      const query = `
        INSERT INTO documents (
          title, description, category, subcategory, file_path, file_name,
          file_type, file_size, version, uploaded_by, effective_date,
          expiration_date, tags, access_permissions, requires_acknowledgment, checksum
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const result = await pool.query(query, [
        documentData.title,
        documentData.description || null,
        documentData.category,
        documentData.subcategory || null,
        (req as any).file.path,
        (req as any).file.originalname,
        path.extname((req as any).file.originalname).slice(1),
        (req as any).file.size,
        version,
        userId,
        documentData.effective_date || null,
        documentData.expiration_date || null,
        documentData.tags || null,
        documentData.access_permissions || null,
        documentData.requires_acknowledgment || false,
        checksum
      ]);

      // Create initial version record
      await pool.query(
        `INSERT INTO document_versions (document_id, version, file_path, uploaded_by, is_current)
         VALUES ($1, $2, $3, $4, true)`,
        [result.rows[0].id, version, (req as any).file.path, userId]
      );

      const document: Document = {
        ...result.rows[0],
        status: result.rows[0].status as DocumentStatus,
        tags: result.rows[0].tags || [],
        created_at: new Date(result.rows[0].created_at),
        updated_at: new Date(result.rows[0].updated_at),
        effective_date: result.rows[0].effective_date ? new Date(result.rows[0].effective_date) : null,
        expiration_date: result.rows[0].expiration_date ? new Date(result.rows[0].expiration_date) : null
      };

      // Log creation event
      await logAuditEvent(document.id, DocumentAuditAction.CREATED, userId, {
        title: document.title,
        category: document.category
      }, req);

      res.status(201).json(document);
    } catch (error) {
      console.error('Error uploading document:', error);
      if ((req as any).file) {
        await cleanupFile((req as any).file.path);
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/documents/:id/versions
 * Upload new version of existing document
 */
router.post('/:id/versions',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'create:version',
    getResourceId: (req) => (req as any).params.id,
  }),
  receiptUploader.single('document'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (!(req as any).file) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { error, value } = versionSchema.validate((req as any).body);
      if (error) {
        await client.query('ROLLBACK');
        await cleanupFile((req as any).file.path);
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const versionData: CreateDocumentVersionRequest = value;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const documentId = (req as any).params.id;

      // Check if document exists and user has permission to update
      const docQuery = `
        SELECT * FROM documents
        WHERE id = $1 AND (uploaded_by = $2 OR $3 IN ('admin', 'hr'))
      `;
      const docResult = await client.query(docQuery, [documentId, userId, userRole]);

      if (docResult.rows.length === 0) {
        await client.query('ROLLBACK');
        await cleanupFile((req as any).file.path);
        res.status(404).json({ error: 'Document not found or permission denied' });
        return;
      }

      const currentDoc: DocumentModel = docResult.rows[0];

      // Calculate file checksum
      const checksum = await calculateChecksum((req as any).file.path);
      if (!checksum) {
        await client.query('ROLLBACK');
        await cleanupFile((req as any).file.path);
        res.status(500).json({ error: 'Failed to process file' });
        return;
      }

      // Generate new version number
      const versionParts = currentDoc.version.split('.');
      const newVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}`;

      // Mark all previous versions as not current
      await client.query(
        'UPDATE document_versions SET is_current = false WHERE document_id = $1',
        [documentId]
      );

      // Update document with new version info
      const updateQuery = `
        UPDATE documents
        SET version = $1, file_path = $2, file_name = $3, file_type = $4,
            file_size = $5, checksum = $6, updated_at = NOW(), status = 'pending_approval'
        WHERE id = $7
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        newVersion,
        (req as any).file.path,
        (req as any).file.originalname,
        path.extname((req as any).file.originalname).slice(1),
        (req as any).file.size,
        checksum,
        documentId
      ]);

      // Create new version record
      await client.query(
        `INSERT INTO document_versions (document_id, version, file_path, uploaded_by, change_notes, is_current)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [documentId, newVersion, (req as any).file.path, userId, versionData.change_notes]
      );

      await client.query('COMMIT');

      const updatedDocument: Document = {
        ...updateResult.rows[0],
        status: updateResult.rows[0].status as DocumentStatus,
        tags: updateResult.rows[0].tags || [],
        created_at: new Date(updateResult.rows[0].created_at),
        updated_at: new Date(updateResult.rows[0].updated_at),
        effective_date: updateResult.rows[0].effective_date ? new Date(updateResult.rows[0].effective_date) : null,
        expiration_date: updateResult.rows[0].expiration_date ? new Date(updateResult.rows[0].expiration_date) : null
      };

      // Log version creation event
      await logAuditEvent(documentId, DocumentAuditAction.VERSION_CREATED, userId, {
        version: newVersion,
        change_notes: versionData.change_notes
      }, req);

      res.json(updatedDocument);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error uploading document version:', error);
      if ((req as any).file) {
        await cleanupFile((req as any).file.path);
      }
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/documents/:id
 * Update document metadata
 */
router.put('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'update',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documentId = (req as any).params.id;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Check permissions
      const permQuery = `
        SELECT uploaded_by FROM documents
        WHERE id = $1 AND (uploaded_by = $2 OR $3 IN ('admin', 'hr'))
      `;
      const permResult = await pool.query(permQuery, [documentId, userId, userRole]);

      if (permResult.rows.length === 0) {
        res.status(404).json({ error: 'Document not found or permission denied' });
        return;
      }

      const { error, value } = Joi.object({
        title: Joi.string(),
        description: Joi.string().allow(''),
        category: Joi.string(),
        status: Joi.string(),
        requires_acknowledgment: Joi.boolean(),
        metadata: Joi.object()
      }).validate((req as any).body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const updateData: UpdateDocumentRequest = value;

      // Build dynamic update query
      const fields = Object.keys(updateData).filter(key => updateData[key as keyof UpdateDocumentRequest] !== undefined);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [documentId, ...fields.map(field => updateData[field as keyof UpdateDocumentRequest])];
      values.push(new Date()); // updated_at

      const query = `
        UPDATE documents
        SET ${setClause}, updated_at = $${values.length}
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, values);

      const updatedDocument: Document = {
        ...result.rows[0],
        status: result.rows[0].status as DocumentStatus,
        tags: result.rows[0].tags || [],
        created_at: new Date(result.rows[0].created_at),
        updated_at: new Date(result.rows[0].updated_at),
        effective_date: result.rows[0].effective_date ? new Date(result.rows[0].effective_date) : null,
        expiration_date: result.rows[0].expiration_date ? new Date(result.rows[0].expiration_date) : null
      };

      // Log update event
      await logAuditEvent(documentId, DocumentAuditAction.METADATA_UPDATED, userId, updateData, req);

      res.json(updatedDocument);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/documents/:id/approve
 * Approve a document
 */
router.post('/:id/approve',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'approve',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documentId = (req as any).params.id;
      const userId = req.user!.id;

      const query = `
        UPDATE documents
        SET status = 'approved', approved_by = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(query, [userId, documentId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      const approvedDocument: Document = {
        ...result.rows[0],
        status: result.rows[0].status as DocumentStatus,
        tags: result.rows[0].tags || [],
        created_at: new Date(result.rows[0].created_at),
        updated_at: new Date(result.rows[0].updated_at),
        effective_date: result.rows[0].effective_date ? new Date(result.rows[0].effective_date) : null,
        expiration_date: result.rows[0].expiration_date ? new Date(result.rows[0].expiration_date) : null
      };

      // Log approval event
      await logAuditEvent(documentId, DocumentAuditAction.APPROVED, userId, null, req);

      res.json(approvedDocument);
    } catch (error) {
      console.error('Error approving document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/documents/:id/archive
 * Archive a document
 */
router.post('/:id/archive',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'archive',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documentId = (req as any).params.id;
      const userId = req.user!.id;

      const query = `
        UPDATE documents
        SET status = 'archived', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [documentId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      const archivedDocument: Document = {
        ...result.rows[0],
        status: result.rows[0].status as DocumentStatus,
        tags: result.rows[0].tags || [],
        created_at: new Date(result.rows[0].created_at),
        updated_at: new Date(result.rows[0].updated_at),
        effective_date: result.rows[0].effective_date ? new Date(result.rows[0].effective_date) : null,
        expiration_date: result.rows[0].expiration_date ? new Date(result.rows[0].expiration_date) : null
      };

      // Log archive event
      await logAuditEvent(documentId, DocumentAuditAction.ARCHIVED, userId, null, req);

      res.json(archivedDocument);
    } catch (error) {
      console.error('Error archiving document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/documents/:id/download
 * Download a document file
 */
router.get('/:id/download',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'download',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documentId = (req as any).params.id;
      const userId = req.user!.id;

      // Check access permissions
      const hasAccess = await hasDocumentAccess(userId, documentId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const query = `SELECT file_path, file_name FROM documents WHERE id = $1`;
      const result = await pool.query(query, [documentId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      const { file_path, file_name } = result.rows[0];

      // Check if file exists
      try {
        await fs.access(file_path);
      } catch {
        res.status(404).json({ error: 'File not found on server' });
        return;
      }

      // Log download event
      await logAuditEvent(documentId, DocumentAuditAction.DOWNLOADED, userId, null, req);

      res.download(file_path, file_name);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/documents/:id/acknowledge
 * Record document acknowledgment
 */
router.post('/:id/acknowledge',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'acknowledge',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documentId = (req as any).params.id;
      const userId = req.user!.id;

      const { error, value } = acknowledgmentSchema.validate((req as any).body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const acknowledgmentData = value;

      // Check if document requires acknowledgment
      const docQuery = `SELECT requires_acknowledgment FROM documents WHERE id = $1`;
      const docResult = await pool.query(docQuery, [documentId]);

      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      if (!docResult.rows[0].requires_acknowledgment) {
        res.status(400).json({ error: 'Document does not require acknowledgment' });
        return;
      }

      // Check if already acknowledged
      const existingQuery = `
        SELECT id FROM document_acknowledgments
        WHERE document_id = $1 AND user_id = $2
      `;
      const existingResult = await pool.query(existingQuery, [documentId, userId]);

      if (existingResult.rows.length > 0) {
        res.status(409).json({ error: 'Document already acknowledged by user' });
        return;
      }

      // Create acknowledgment
      const insertQuery = `
        INSERT INTO document_acknowledgments
        (document_id, user_id, acknowledgment_method, ip_address, user_agent, acknowledged_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        documentId,
        userId,
        acknowledgmentData.acknowledgment_method,
        acknowledgmentData.ip_address || (req as any).ip,
        acknowledgmentData.user_agent || (req as any).get('User-Agent')
      ]);

      const acknowledgment: DocumentAcknowledgment = {
        ...result.rows[0],
        acknowledgment_method: result.rows[0].acknowledgment_method as AcknowledgmentMethod,
        acknowledged_at: new Date(result.rows[0].acknowledged_at)
      };

      // Log acknowledgment event
      await logAuditEvent(documentId, DocumentAuditAction.ACKNOWLEDGED, userId, {
        method: acknowledgmentData.acknowledgment_method
      }, req);

      res.status(201).json(acknowledgment);
    } catch (error) {
      console.error('Error creating acknowledgment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/documents/:id/acknowledgments
 * Get acknowledgments for a document
 */
router.get('/:id/acknowledgments',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'admin:view_acknowledgments',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documentId = (req as any).params.id;
      const page = Math.max(1, parseInt((req as any).query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt((req as any).query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const query = `
        SELECT
          da.*,
          u.name as user_name
        FROM document_acknowledgments da
        JOIN users u ON da.user_id = u.id
        WHERE da.document_id = $1
        ORDER BY da.acknowledged_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as count
        FROM document_acknowledgments
        WHERE document_id = $1
      `;

      const [result, countResult] = await Promise.all([
        pool.query(query, [documentId, limit, offset]),
        pool.query(countQuery, [documentId])
      ]);

      const acknowledgments: DocumentAcknowledgment[] = result.rows.map((row: any) => ({
        ...row,
        acknowledgment_method: row.acknowledgment_method as AcknowledgmentMethod,
        acknowledged_at: new Date(row.acknowledged_at)
      }));

      const response: DocumentAcknowledgmentsResponse = {
        acknowledgments,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching acknowledgments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/documents/stats/overview
 * Get document statistics overview
 */
router.get('/stats/overview',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'admin:view_stats',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Get basic stats
      const statsQuery = `
        SELECT
          COUNT(*) as total_documents,
          COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_approval,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
        FROM documents
      `;

      // Get category breakdown
      const categoryQuery = `
        SELECT
          category,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM documents), 2) as percentage
        FROM documents
        GROUP BY category
        ORDER BY count DESC
      `;

      // Get recent uploads
      const recentQuery = `
        SELECT
          d.id, d.title, d.category, d.status, d.created_at,
          u.name as uploaded_by_name
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        ORDER BY d.created_at DESC
        LIMIT 10
      `;

      // Get pending acknowledgments count
      const pendingAckQuery = `
        SELECT COUNT(*) as pending_acknowledgments
        FROM documents d
        LEFT JOIN document_acknowledgments da ON d.id = da.document_id AND da.user_id = $1
        WHERE d.requires_acknowledgment = true
        AND d.status = 'approved'
        AND da.id IS NULL
      `;

      const [statsResult, categoryResult, recentResult, pendingAckResult] = await Promise.all([
        pool.query(statsQuery),
        pool.query(categoryQuery),
        pool.query(recentQuery),
        pool.query(pendingAckQuery, [req.user!.id])
      ]);

      const stats: DocumentStats = {
        total_documents: parseInt(statsResult.rows[0].total_documents),
        pending_approval: parseInt(statsResult.rows[0].pending_approval),
        approved: parseInt(statsResult.rows[0].approved),
        archived: parseInt(statsResult.rows[0].archived),
        expired: parseInt(statsResult.rows[0].expired),
        by_category: categoryResult.rows.map((row: any) => ({
          category: row.category,
          count: parseInt(row.count),
          percentage: parseFloat(row.percentage)
        })),
        recent_uploads: recentResult.rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          uploaded_by_name: row.uploaded_by_name,
          created_at: new Date(row.created_at),
          status: row.status as DocumentStatus
        })),
        pending_acknowledgments: parseInt(pendingAckResult.rows[0].pending_acknowledgments)
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching document stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/documents/acknowledgments/pending
 * Get pending acknowledgments for current user
 */
router.get('/acknowledgments/pending',
  authenticateToken,
  requireCerbosPermission({
    resource: 'document',
    action: 'view:pending_acknowledgments',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const query = `
        SELECT
          d.id as document_id,
          d.title as document_title,
          d.category,
          d.requires_acknowledgment,
          d.effective_date,
          d.expiration_date,
          u.name as uploaded_by_name
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        LEFT JOIN document_acknowledgments da ON d.id = da.document_id AND da.user_id = $1
        WHERE d.requires_acknowledgment = true
        AND d.status = 'approved'
        AND da.id IS NULL
        ORDER BY d.effective_date ASC NULLS LAST, d.created_at DESC
      `;

      const result = await pool.query(query, [userId]);

      const pending: PendingAcknowledgment[] = result.rows.map((row: any) => ({
        document_id: row.document_id,
        document_title: row.document_title,
        category: row.category,
        requires_acknowledgment: row.requires_acknowledgment,
        uploaded_by_name: row.uploaded_by_name,
        effective_date: row.effective_date ? new Date(row.effective_date) : undefined,
        expiration_date: row.expiration_date ? new Date(row.expiration_date) : undefined
      }));

      const response: PendingAcknowledgmentsResponse = {
        pending,
        total: pending.length
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching pending acknowledgments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
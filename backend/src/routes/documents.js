const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const { receiptUploader } = require('../middleware/fileUpload');
const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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

// Helper function to calculate file checksum
async function calculateChecksum(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (error) {
    console.error('Error calculating checksum:', error);
    return null;
  }
}

// Helper function to check document access permissions
async function hasDocumentAccess(userId, documentId) {
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
    
    // If no specific permissions set, allow access to all authenticated users
    if (!access_permissions) {
      return true;
    }
    
    // Check if user's role is in allowed roles
    if (access_permissions.roles && access_permissions.roles.includes(role)) {
      return true;
    }
    
    // Check if user's department is in allowed departments
    if (access_permissions.departments) {
      const deptQuery = `
        SELECT e.department_id
        FROM employees e
        WHERE e.user_id = $1
      `;
      const deptResult = await pool.query(deptQuery, [userId]);
      
      if (deptResult.rows.length > 0) {
        const userDepartmentId = deptResult.rows[0].department_id;
        if (access_permissions.departments.includes(userDepartmentId)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking document access:', error);
    return false;
  }
}

// DOCUMENT MANAGEMENT ENDPOINTS

// Get all documents with filtering and access control
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, subcategory, status, search, tags, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
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
    
    const params = [req.user.id];
    let paramCount = 1;

    if (category) {
      paramCount++;
      query += ` AND d.category = $${paramCount}`;
      params.push(category);
    }

    if (subcategory) {
      paramCount++;
      query += ` AND d.subcategory = $${paramCount}`;
      params.push(subcategory);
    }

    if (status) {
      paramCount++;
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (tags) {
      paramCount++;
      query += ` AND d.tags @> $${paramCount}::jsonb`;
      params.push(JSON.stringify(tags.split(',')));
    }

    query += ` 
      GROUP BY d.id, u.name, a.name
      ORDER BY d.updated_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Filter documents based on access permissions
    const accessibleDocuments = [];
    for (const doc of result.rows) {
      if (await hasDocumentAccess(req.user.id, doc.id)) {
        accessibleDocuments.push(doc);
      }
    }
    
    res.json({
      documents: accessibleDocuments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: accessibleDocuments.length
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single document by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Check access permissions
    if (!(await hasDocumentAccess(req.user.id, req.params.id))) {
      return res.status(403).json({ error: 'Access denied' });
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
    
    const result = await pool.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Log document access
    await pool.query(
      `INSERT INTO document_access (document_id, user_id, access_type, ip_address, user_agent)
       VALUES ($1, $2, 'view', $3, $4)`,
      [req.params.id, req.user.id, req.ip, req.get('User-Agent')]
    );
    
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
    
    const versionResult = await pool.query(versionQuery, [req.params.id]);
    
    res.json({
      document: result.rows[0],
      versions: versionResult.rows
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload new document
router.post('/', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), receiptUploader.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { error, value } = documentSchema.validate(req.body);
    if (error) {
      // Clean up uploaded file on validation error
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      title, description, category, subcategory, effective_date,
      expiration_date, tags, access_permissions, requires_acknowledgment
    } = value;
    
    // Calculate file checksum
    const checksum = await calculateChecksum(req.file.path);
    
    // Determine initial version
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
      title, description, category, subcategory, req.file.path,
      req.file.originalname, path.extname(req.file.originalname).slice(1),
      req.file.size, version, req.user.id, effective_date,
      expiration_date, JSON.stringify(tags), JSON.stringify(access_permissions),
      requires_acknowledgment, checksum
    ]);
    
    // Create initial version record
    await pool.query(
      `INSERT INTO document_versions (document_id, version, file_path, uploaded_by, is_current)
       VALUES ($1, $2, $3, $4, true)`,
      [result.rows[0].id, version, req.file.path, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading document:', error);
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload new version of existing document
router.post('/:id/versions', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), receiptUploader.single('document'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    if (!req.file) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { error, value } = versionSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if document exists and user has permission to update
    const docQuery = `
      SELECT * FROM documents 
      WHERE id = $1 AND (uploaded_by = $2 OR $3 IN ('admin', 'hr'))
    `;
    const docResult = await client.query(docQuery, [req.params.id, req.user.id, req.user.role]);
    
    if (docResult.rows.length === 0) {
      await client.query('ROLLBACK');
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: 'Document not found or permission denied' });
    }

    const currentDoc = docResult.rows[0];
    
    // Calculate new version number
    const currentVersion = parseFloat(currentDoc.version);
    const newVersion = (currentVersion + 0.1).toFixed(1);
    
    // Calculate file checksum
    const checksum = await calculateChecksum(req.file.path);
    
    // Update document with new version info
    const updateQuery = `
      UPDATE documents 
      SET version = $1, file_path = $2, file_name = $3, file_type = $4,
          file_size = $5, checksum = $6, status = 'draft', updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const updateResult = await client.query(updateQuery, [
      newVersion, req.file.path, req.file.originalname,
      path.extname(req.file.originalname).slice(1), req.file.size,
      checksum, req.params.id
    ]);
    
    // Mark previous versions as not current
    await client.query(
      'UPDATE document_versions SET is_current = false WHERE document_id = $1',
      [req.params.id]
    );
    
    // Create new version record
    await client.query(
      `INSERT INTO document_versions (document_id, version, file_path, uploaded_by, change_notes, is_current)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [req.params.id, newVersion, req.file.path, req.user.id, value.change_notes]
    );
    
    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading document version:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update document metadata
router.put('/:id', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    // Check permissions
    const permQuery = `
      SELECT uploaded_by FROM documents 
      WHERE id = $1 AND (uploaded_by = $2 OR $3 IN ('admin', 'hr'))
    `;
    const permResult = await pool.query(permQuery, [req.params.id, req.user.id, req.user.role]);
    
    if (permResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or permission denied' });
    }

    const { error, value } = documentSchema.partial().validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        if (key === 'tags' || key === 'access_permissions') {
          values.push(JSON.stringify(value[key]));
        } else {
          values.push(value[key]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    paramCount++;
    values.push(req.params.id);

    const query = `
      UPDATE documents 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve document
router.post('/:id/approve', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const query = `
      UPDATE documents 
      SET status = 'approved', approved_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status IN ('draft', 'review')
      RETURNING *
    `;
    
    const result = await pool.query(query, [req.user.id, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or not eligible for approval' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive document
router.post('/:id/archive', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const query = `
      UPDATE documents 
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error archiving document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    // Check access permissions
    if (!(await hasDocumentAccess(req.user.id, req.params.id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = `
      SELECT file_path, file_name, file_type
      FROM documents 
      WHERE id = $1 AND status = 'approved'
    `;
    
    const result = await pool.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { file_path, file_name, file_type } = result.rows[0];
    
    // Check if file exists
    try {
      await fs.access(file_path);
    } catch (error) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Log document access
    await pool.query(
      `INSERT INTO document_access (document_id, user_id, access_type, ip_address, user_agent)
       VALUES ($1, $2, 'download', $3, $4)`,
      [req.params.id, req.user.id, req.ip, req.get('User-Agent')]
    );
    
    res.download(file_path, file_name);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DOCUMENT ACKNOWLEDGMENT ENDPOINTS

// Acknowledge document
router.post('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    // Check if document requires acknowledgment and user has access
    const docQuery = `
      SELECT version, requires_acknowledgment 
      FROM documents 
      WHERE id = $1 AND status = 'approved'
    `;
    
    const docResult = await pool.query(docQuery, [req.params.id]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!docResult.rows[0].requires_acknowledgment) {
      return res.status(400).json({ error: 'Document does not require acknowledgment' });
    }

    if (!(await hasDocumentAccess(req.user.id, req.params.id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { acknowledgment_text } = req.body;
    const version = docResult.rows[0].version;
    
    // Insert or update acknowledgment
    const query = `
      INSERT INTO document_acknowledgments (
        document_id, user_id, document_version, acknowledgment_text, ip_address
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (document_id, user_id, document_version) 
      DO UPDATE SET 
        acknowledged_at = CURRENT_TIMESTAMP,
        acknowledgment_text = EXCLUDED.acknowledgment_text,
        ip_address = EXCLUDED.ip_address
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      req.params.id, req.user.id, version, acknowledgment_text, req.ip
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error acknowledging document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document acknowledgments
router.get('/:id/acknowledgments', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const query = `
      SELECT 
        da.*,
        u.name as user_name,
        u.email as user_email,
        e.employee_id,
        d.name as department_name
      FROM document_acknowledgments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE da.document_id = $1
      ORDER BY da.acknowledged_at DESC
    `;
    
    const result = await pool.query(query, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching document acknowledgments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document statistics
router.get('/stats/overview', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_documents,
        COUNT(*) FILTER (WHERE status = 'review') as review_documents,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_documents,
        COUNT(*) FILTER (WHERE status = 'archived') as archived_documents,
        COUNT(*) FILTER (WHERE requires_acknowledgment = true) as acknowledgment_required,
        COUNT(*) FILTER (WHERE expiration_date < CURRENT_DATE) as expired_documents,
        COUNT(DISTINCT category) as total_categories,
        SUM(file_size) as total_storage_used
      FROM documents
    `;
    
    const result = await pool.query(query);
    
    // Get category breakdown
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as document_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        SUM(file_size) as total_size
      FROM documents
      GROUP BY category
      ORDER BY document_count DESC
    `;
    
    const categoryResult = await pool.query(categoryQuery);
    
    // Get access statistics
    const accessQuery = `
      SELECT 
        COUNT(*) as total_accesses,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE access_type = 'view') as views,
        COUNT(*) FILTER (WHERE access_type = 'download') as downloads,
        COUNT(DISTINCT document_id) as accessed_documents
      FROM document_access
      WHERE accessed_at >= CURRENT_DATE - INTERVAL '30 days'
    `;
    
    const accessResult = await pool.query(accessQuery);
    
    res.json({
      overview: result.rows[0],
      categoryBreakdown: categoryResult.rows,
      accessStats: accessResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching document statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get documents requiring acknowledgment
router.get('/acknowledgments/pending', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id, d.title, d.category, d.effective_date, d.version,
        CASE 
          WHEN da.acknowledged_at IS NOT NULL THEN true
          ELSE false
        END as acknowledged
      FROM documents d
      LEFT JOIN document_acknowledgments da ON d.id = da.document_id 
        AND da.user_id = $1 
        AND da.document_version = d.version
      WHERE d.requires_acknowledgment = true 
        AND d.status = 'approved'
        AND (da.acknowledged_at IS NULL OR da.document_version != d.version)
      ORDER BY d.effective_date DESC
    `;
    
    const result = await pool.query(query, [req.user.id]);
    
    // Filter documents based on access permissions
    const accessibleDocuments = [];
    for (const doc of result.rows) {
      if (await hasDocumentAccess(req.user.id, doc.id)) {
        accessibleDocuments.push(doc);
      }
    }
    
    res.json(accessibleDocuments);
  } catch (error) {
    console.error('Error fetching pending acknowledgments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
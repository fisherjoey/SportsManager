const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const { receiptUploader } = require('../middleware/fileUpload');
const Joi = require('joi');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Validation schemas
const communicationSchema = Joi.object({
  title: Joi.string().max(200).required(),
  content: Joi.string().required(),
  type: Joi.string().valid('announcement', 'memo', 'policy_update', 'emergency', 'newsletter').required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  target_audience: Joi.object({
    departments: Joi.array().items(Joi.string().uuid()).allow(null),
    roles: Joi.array().items(Joi.string()).allow(null),
    specific_users: Joi.array().items(Joi.string().uuid()).allow(null),
    all_users: Joi.boolean().default(false)
  }).required(),
  publish_date: Joi.date().default(() => new Date()),
  expiration_date: Joi.date().allow(null),
  requires_acknowledgment: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string()).allow(null)
});

// Helper function to get target recipients based on audience criteria
async function getTargetRecipients(targetAudience) {
  let recipients = [];
  
  try {
    if (targetAudience.all_users) {
      const query = 'SELECT id FROM users WHERE active = true';
      const result = await pool.query(query);
      recipients = result.rows.map(row => row.id);
    } else {
      const conditions = [];
      const params = [];
      let paramCount = 0;
      
      // Add specific users
      if (targetAudience.specific_users && targetAudience.specific_users.length > 0) {
        paramCount++;
        conditions.push(`u.id = ANY($${paramCount})`);
        params.push(targetAudience.specific_users);
      }
      
      // Add users by department
      if (targetAudience.departments && targetAudience.departments.length > 0) {
        paramCount++;
        conditions.push(`e.department_id = ANY($${paramCount})`);
        params.push(targetAudience.departments);
      }
      
      // Add users by role
      if (targetAudience.roles && targetAudience.roles.length > 0) {
        paramCount++;
        conditions.push(`u.role = ANY($${paramCount})`);
        params.push(targetAudience.roles);
      }
      
      if (conditions.length > 0) {
        const query = `
          SELECT DISTINCT u.id
          FROM users u
          LEFT JOIN employees e ON u.id = e.user_id
          WHERE u.active = true AND (${conditions.join(' OR ')})
        `;
        
        const result = await pool.query(query, params);
        recipients = result.rows.map(row => row.id);
      }
    }
    
    return [...new Set(recipients)]; // Remove duplicates
  } catch (error) {
    console.error('Error getting target recipients:', error);
    return [];
  }
}

// Helper function to send communication to recipients
async function sendToRecipients(communicationId, recipients) {
  if (recipients.length === 0) return;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const values = recipients.map((recipientId, index) => 
      `($1, $${index + 2}, 'app')`
    ).join(', ');
    
    const query = `
      INSERT INTO communication_recipients (communication_id, recipient_id, delivery_method)
      VALUES ${values}
    `;
    
    await client.query(query, [communicationId, ...recipients]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// COMMUNICATIONS ENDPOINTS

// Get all communications (with access control)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, priority, status, unread_only, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        c.*,
        u.name as author_name,
        cr.sent_at,
        cr.read_at,
        cr.acknowledged_at,
        cr.delivery_status,
        CASE WHEN cr.read_at IS NULL THEN true ELSE false END as is_unread,
        CASE WHEN c.requires_acknowledgment = true AND cr.acknowledged_at IS NULL THEN true ELSE false END as requires_ack
      FROM internal_communications c
      JOIN users u ON c.author_id = u.id
      LEFT JOIN communication_recipients cr ON c.id = cr.communication_id AND cr.recipient_id = $1
      WHERE c.status = 'published' 
        AND (cr.recipient_id = $1 OR c.author_id = $1 OR $2 IN ('admin', 'hr'))
        AND (c.expiration_date IS NULL OR c.expiration_date > CURRENT_TIMESTAMP)
    `;
    
    const params = [req.user.id, req.user.role];
    let paramCount = 2;

    if (type) {
      paramCount++;
      query += ` AND c.type = $${paramCount}`;
      params.push(type);
    }

    if (priority) {
      paramCount++;
      query += ` AND c.priority = $${paramCount}`;
      params.push(priority);
    }

    if (status) {
      paramCount++;
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
    }

    if (unread_only === 'true') {
      query += ` AND cr.read_at IS NULL`;
    }

    query += ` ORDER BY c.priority DESC, c.publish_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      communications: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single communication by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*,
        u.name as author_name,
        cr.sent_at,
        cr.read_at,
        cr.acknowledged_at,
        cr.delivery_status
      FROM internal_communications c
      JOIN users u ON c.author_id = u.id
      LEFT JOIN communication_recipients cr ON c.id = cr.communication_id AND cr.recipient_id = $2
      WHERE c.id = $1 
        AND (cr.recipient_id = $2 OR c.author_id = $2 OR $3 IN ('admin', 'hr'))
    `;
    
    const result = await pool.query(query, [req.params.id, req.user.id, req.user.role]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Communication not found or access denied' });
    }
    
    // Mark as read if user is a recipient and hasn't read it yet
    if (result.rows[0].sent_at && !result.rows[0].read_at) {
      await pool.query(
        'UPDATE communication_recipients SET read_at = CURRENT_TIMESTAMP WHERE communication_id = $1 AND recipient_id = $2',
        [req.params.id, req.user.id]
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new communication
router.post('/', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), receiptUploader.array('attachments', 5), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { error, value } = communicationSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      title, content, type, priority, target_audience, publish_date,
      expiration_date, requires_acknowledgment, tags
    } = value;
    
    // Handle file attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
    }
    
    // Create communication record
    const commQuery = `
      INSERT INTO internal_communications (
        title, content, type, priority, author_id, target_audience,
        publish_date, expiration_date, requires_acknowledgment, attachments, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const commResult = await client.query(commQuery, [
      title, content, type, priority, req.user.id, JSON.stringify(target_audience),
      publish_date, expiration_date, requires_acknowledgment, 
      JSON.stringify(attachments), JSON.stringify(tags)
    ]);
    
    const communication = commResult.rows[0];
    
    // Get target recipients
    const recipients = await getTargetRecipients(target_audience);
    
    // Send to recipients
    if (recipients.length > 0) {
      const recipientValues = recipients.map((recipientId, index) => 
        `($1, $${index + 2}, 'app', 'delivered')`
      ).join(', ');
      
      const recipientQuery = `
        INSERT INTO communication_recipients (communication_id, recipient_id, delivery_method, delivery_status)
        VALUES ${recipientValues}
      `;
      
      await client.query(recipientQuery, [communication.id, ...recipients]);
    }
    
    // Update status to published if publish_date is now or in the past
    if (new Date(publish_date) <= new Date()) {
      await client.query(
        'UPDATE internal_communications SET status = $1 WHERE id = $2',
        ['published', communication.id]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      ...communication,
      recipient_count: recipients.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update communication (only drafts)
router.put('/:id', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    // Check if communication exists and is editable
    const checkQuery = `
      SELECT status, author_id 
      FROM internal_communications 
      WHERE id = $1 AND (author_id = $2 OR $3 IN ('admin'))
    `;
    
    const checkResult = await pool.query(checkQuery, [req.params.id, req.user.id, req.user.role]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Communication not found or permission denied' });
    }
    
    if (checkResult.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Only draft communications can be edited' });
    }

    const { error, value } = communicationSchema.partial().validate(req.body);
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
        if (['target_audience', 'attachments', 'tags'].includes(key)) {
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
      UPDATE internal_communications 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Publish communication
router.post('/:id/publish', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get communication details
    const commQuery = `
      SELECT *, target_audience
      FROM internal_communications 
      WHERE id = $1 AND (author_id = $2 OR $3 IN ('admin')) AND status = 'draft'
    `;
    
    const commResult = await client.query(commQuery, [req.params.id, req.user.id, req.user.role]);
    
    if (commResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Draft communication not found or permission denied' });
    }
    
    const communication = commResult.rows[0];
    
    // Get target recipients
    const recipients = await getTargetRecipients(communication.target_audience);
    
    // Send to recipients
    if (recipients.length > 0) {
      const recipientValues = recipients.map((recipientId, index) => 
        `($1, $${index + 2}, 'app', 'delivered')`
      ).join(', ');
      
      const recipientQuery = `
        INSERT INTO communication_recipients (communication_id, recipient_id, delivery_method, delivery_status)
        VALUES ${recipientValues}
        ON CONFLICT (communication_id, recipient_id) DO NOTHING
      `;
      
      await client.query(recipientQuery, [req.params.id, ...recipients]);
    }
    
    // Update status to published
    const updateQuery = `
      UPDATE internal_communications 
      SET status = 'published', publish_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const updateResult = await client.query(updateQuery, [req.params.id]);
    
    await client.query('COMMIT');
    
    res.json({
      ...updateResult.rows[0],
      recipient_count: recipients.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error publishing communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Archive communication
router.post('/:id/archive', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const query = `
      UPDATE internal_communications 
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND (author_id = $2 OR $3 IN ('admin'))
      RETURNING *
    `;
    
    const result = await pool.query(query, [req.params.id, req.user.id, req.user.role]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Communication not found or permission denied' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error archiving communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Acknowledge communication
router.post('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { acknowledgment_text } = req.body;
    
    // Check if user is a recipient and communication requires acknowledgment
    const checkQuery = `
      SELECT c.requires_acknowledgment
      FROM internal_communications c
      JOIN communication_recipients cr ON c.id = cr.communication_id
      WHERE c.id = $1 AND cr.recipient_id = $2 AND c.requires_acknowledgment = true
    `;
    
    const checkResult = await pool.query(checkQuery, [req.params.id, req.user.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Communication not found or does not require acknowledgment' });
    }
    
    // Update acknowledgment
    const query = `
      UPDATE communication_recipients 
      SET acknowledged_at = CURRENT_TIMESTAMP, delivery_status = 'acknowledged'
      WHERE communication_id = $1 AND recipient_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient record not found' });
    }
    
    res.json({ message: 'Communication acknowledged successfully' });
  } catch (error) {
    console.error('Error acknowledging communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get communication recipients and their status
router.get('/:id/recipients', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    // Check if user has permission to view recipients
    const permQuery = `
      SELECT author_id 
      FROM internal_communications 
      WHERE id = $1 AND (author_id = $2 OR $3 IN ('admin', 'hr'))
    `;
    
    const permResult = await pool.query(permQuery, [req.params.id, req.user.id, req.user.role]);
    
    if (permResult.rows.length === 0) {
      return res.status(404).json({ error: 'Communication not found or permission denied' });
    }
    
    const query = `
      SELECT 
        cr.*,
        u.name as recipient_name,
        u.email as recipient_email,
        e.employee_id,
        d.name as department_name
      FROM communication_recipients cr
      JOIN users u ON cr.recipient_id = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE cr.communication_id = $1
      ORDER BY u.name
    `;
    
    const result = await pool.query(query, [req.params.id]);
    
    // Calculate statistics
    const stats = {
      total_recipients: result.rows.length,
      delivered: result.rows.filter(r => r.delivery_status === 'delivered').length,
      read: result.rows.filter(r => r.read_at !== null).length,
      acknowledged: result.rows.filter(r => r.acknowledged_at !== null).length,
      failed: result.rows.filter(r => r.delivery_status === 'failed').length
    };
    
    res.json({
      recipients: result.rows,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching communication recipients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's unread communications count
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM internal_communications c
      JOIN communication_recipients cr ON c.id = cr.communication_id
      WHERE cr.recipient_id = $1 
        AND cr.read_at IS NULL 
        AND c.status = 'published'
        AND (c.expiration_date IS NULL OR c.expiration_date > CURRENT_TIMESTAMP)
    `;
    
    const result = await pool.query(query, [req.user.id]);
    res.json({ unread_count: parseInt(result.rows[0].unread_count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending acknowledgments for user
router.get('/acknowledgments/pending', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, c.title, c.type, c.priority, c.publish_date,
        c.requires_acknowledgment, cr.sent_at, cr.read_at
      FROM internal_communications c
      JOIN communication_recipients cr ON c.id = cr.communication_id
      WHERE cr.recipient_id = $1 
        AND c.requires_acknowledgment = true
        AND cr.acknowledged_at IS NULL
        AND c.status = 'published'
        AND (c.expiration_date IS NULL OR c.expiration_date > CURRENT_TIMESTAMP)
      ORDER BY c.priority DESC, c.publish_date DESC
    `;
    
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending acknowledgments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get communication statistics
router.get('/stats/overview', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_communications,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_communications,
        COUNT(*) FILTER (WHERE status = 'published') as published_communications,
        COUNT(*) FILTER (WHERE status = 'archived') as archived_communications,
        COUNT(*) FILTER (WHERE type = 'emergency') as emergency_communications,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_communications,
        COUNT(*) FILTER (WHERE requires_acknowledgment = true) as acknowledgment_required
      FROM internal_communications
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;
    
    const result = await pool.query(query);
    
    // Get engagement statistics
    const engagementQuery = `
      SELECT 
        COUNT(*) as total_recipients,
        COUNT(*) FILTER (WHERE read_at IS NOT NULL) as total_read,
        COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL) as total_acknowledged,
        COUNT(*) FILTER (WHERE delivery_status = 'failed') as delivery_failures,
        AVG(EXTRACT(EPOCH FROM (read_at - sent_at))/3600) as avg_hours_to_read
      FROM communication_recipients cr
      JOIN internal_communications c ON cr.communication_id = c.id
      WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;
    
    const engagementResult = await pool.query(engagementQuery);
    
    // Get type breakdown
    const typeQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'published') as published_count
      FROM internal_communications
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY type
      ORDER BY count DESC
    `;
    
    const typeResult = await pool.query(typeQuery);
    
    res.json({
      overview: result.rows[0],
      engagement: engagementResult.rows[0],
      typeBreakdown: typeResult.rows
    });
  } catch (error) {
    console.error('Error fetching communication statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
// @ts-nocheck

import express from 'express';
const router = express.Router();
import { Pool  } from 'pg';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import Joi from 'joi';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Validation schemas
const assetSchema = Joi.object({
  asset_tag: Joi.string().max(50).required(),
  name: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  category: Joi.string().max(50).required(),
  subcategory: Joi.string().max(50).allow('', null),
  brand: Joi.string().max(100).allow('', null),
  model: Joi.string().max(100).allow('', null),
  serial_number: Joi.string().max(100).allow('', null),
  purchase_date: Joi.date().allow(null),
  purchase_cost: Joi.number().min(0).allow(null),
  current_value: Joi.number().min(0).allow(null),
  location_id: Joi.string().uuid().allow(null),
  assigned_to: Joi.string().uuid().allow(null),
  condition: Joi.string().valid('excellent', 'good', 'fair', 'poor', 'damaged').default('good'),
  status: Joi.string().valid('available', 'assigned', 'maintenance', 'retired').default('available'),
  specifications: Joi.object().allow(null),
  warranty_expiration: Joi.date().allow(null),
  notes: Joi.string().allow('', null)
});

const maintenanceSchema = Joi.object({
  asset_id: Joi.string().uuid().required(),
  maintenance_type: Joi.string().valid('routine', 'repair', 'upgrade', 'inspection').required(),
  scheduled_date: Joi.date().allow(null),
  performed_by: Joi.string().uuid().allow(null),
  vendor: Joi.string().max(100).allow('', null),
  cost: Joi.number().min(0).allow(null),
  description: Joi.string().required(),
  parts_replaced: Joi.string().allow('', null),
  next_maintenance_due: Joi.date().allow(null),
  notes: Joi.string().allow('', null)
});

const checkoutSchema = Joi.object({
  asset_id: Joi.string().uuid().required(),
  employee_id: Joi.string().uuid().required(),
  expected_return_date: Joi.date().allow(null),
  checkout_condition: Joi.string().valid('excellent', 'good', 'fair', 'poor', 'damaged').default('good'),
  checkout_notes: Joi.string().allow('', null)
});

const returnSchema = Joi.object({
  return_condition: Joi.string().valid('excellent', 'good', 'fair', 'poor', 'damaged').required(),
  return_notes: Joi.string().allow('', null)
});

// ASSET MANAGEMENT ENDPOINTS

// Get all assets with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      category, subcategory, status, condition, location_id, assigned_to,
      search, page = 1, limit = 50 
    } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        a.*,
        l.name as location_name,
        l.address as location_address,
        e.employee_id as assigned_employee_id,
        u.name as assigned_employee_name,
        COALESCE(m.maintenance_count, 0) as maintenance_count,
        m.last_maintenance_date,
        m.next_maintenance_due,
        CASE 
          WHEN co.status = 'checked_out' THEN co.checkout_date
          ELSE NULL 
        END as current_checkout_date,
        CASE 
          WHEN co.status = 'checked_out' THEN co.expected_return_date
          ELSE NULL 
        END as expected_return_date
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN employees e ON a.assigned_to = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN (
        SELECT 
          asset_id,
          COUNT(*) as maintenance_count,
          MAX(completed_date) as last_maintenance_date,
          MAX(next_maintenance_due) as next_maintenance_due
        FROM asset_maintenance 
        WHERE status = 'completed'
        GROUP BY asset_id
      ) m ON a.id = m.asset_id
      LEFT JOIN (
        SELECT DISTINCT ON (asset_id) 
          asset_id, checkout_date, expected_return_date, status
        FROM asset_checkouts 
        WHERE status = 'checked_out'
        ORDER BY asset_id, checkout_date DESC
      ) co ON a.id = co.asset_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND a.category = $${paramCount}`;
      params.push(category);
    }

    if (subcategory) {
      paramCount++;
      query += ` AND a.subcategory = $${paramCount}`;
      params.push(subcategory);
    }

    if (status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (condition) {
      paramCount++;
      query += ` AND a.condition = $${paramCount}`;
      params.push(condition);
    }

    if (location_id) {
      paramCount++;
      query += ` AND a.location_id = $${paramCount}`;
      params.push(location_id);
    }

    if (assigned_to) {
      paramCount++;
      query += ` AND a.assigned_to = $${paramCount}`;
      params.push(assigned_to);
    }

    if (search) {
      paramCount++;
      query += ` AND (a.name ILIKE $${paramCount} OR a.asset_tag ILIKE $${paramCount} OR a.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY a.asset_tag LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM assets a WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;

    if (category) {
      countParamCount++;
      countQuery += ` AND a.category = $${countParamCount}`;
      countParams.push(category);
    }

    if (subcategory) {
      countParamCount++;
      countQuery += ` AND a.subcategory = $${countParamCount}`;
      countParams.push(subcategory);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND a.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (condition) {
      countParamCount++;
      countQuery += ` AND a.condition = $${countParamCount}`;
      countParams.push(condition);
    }

    if (location_id) {
      countParamCount++;
      countQuery += ` AND a.location_id = $${countParamCount}`;
      countParams.push(location_id);
    }

    if (assigned_to) {
      countParamCount++;
      countQuery += ` AND a.assigned_to = $${countParamCount}`;
      countParams.push(assigned_to);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (a.name ILIKE $${countParamCount} OR a.asset_tag ILIKE $${countParamCount} OR a.description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      assets: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single asset by ID with detailed information
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.*,
        l.name as location_name,
        l.address as location_address,
        e.employee_id as assigned_employee_id,
        u.name as assigned_employee_name,
        u.email as assigned_employee_email
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN employees e ON a.assigned_to = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE a.id = $1
    `;
    
    const result = await pool.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Get maintenance history
    const maintenanceQuery = `
      SELECT 
        m.*,
        e.employee_id as performed_by_employee_id,
        u.name as performed_by_name
      FROM asset_maintenance m
      LEFT JOIN employees e ON m.performed_by = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE m.asset_id = $1
      ORDER BY m.scheduled_date DESC, m.created_at DESC
    `;
    
    const maintenanceResult = await pool.query(maintenanceQuery, [req.params.id]);
    
    // Get checkout history
    const checkoutQuery = `
      SELECT 
        c.*,
        e.employee_id as employee_employee_id,
        u.name as employee_name,
        co_emp.employee_id as checked_out_by_employee_id,
        co_user.name as checked_out_by_name,
        ci_emp.employee_id as checked_in_by_employee_id,
        ci_user.name as checked_in_by_name
      FROM asset_checkouts c
      LEFT JOIN employees e ON c.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN employees co_emp ON c.checked_out_by = co_emp.id
      LEFT JOIN users co_user ON co_emp.user_id = co_user.id
      LEFT JOIN employees ci_emp ON c.checked_in_by = ci_emp.id
      LEFT JOIN users ci_user ON ci_emp.user_id = ci_user.id
      WHERE c.asset_id = $1
      ORDER BY c.checkout_date DESC
    `;
    
    const checkoutResult = await pool.query(checkoutQuery, [req.params.id]);
    
    res.json({
      asset: result.rows[0],
      maintenanceHistory: maintenanceResult.rows,
      checkoutHistory: checkoutResult.rows
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new asset
router.post('/', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'create',
}), async (req, res) => {
  try {
    const { error, value } = assetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      asset_tag, name, description, category, subcategory, brand, model,
      serial_number, purchase_date, purchase_cost, current_value,
      location_id, assigned_to, condition, status, specifications,
      warranty_expiration, notes
    } = value;
    
    const query = `
      INSERT INTO assets (
        asset_tag, name, description, category, subcategory, brand, model,
        serial_number, purchase_date, purchase_cost, current_value,
        location_id, assigned_to, condition, status, specifications,
        warranty_expiration, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      asset_tag, name, description, category, subcategory, brand, model,
      serial_number, purchase_date, purchase_cost, current_value,
      location_id, assigned_to, condition, status, JSON.stringify(specifications),
      warranty_expiration, notes
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating asset:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Asset tag already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update asset
router.put('/:id', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'update',
  getResourceId: (req) => req.params.id,
}), async (req, res) => {
  try {
    const { error, value } = assetSchema.partial().validate(req.body);
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
        if (key === 'specifications') {
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
      UPDATE assets 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ASSET MAINTENANCE ENDPOINTS

// Get maintenance records for an asset
router.get('/:id/maintenance', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        m.*,
        e.employee_id as performed_by_employee_id,
        u.name as performed_by_name
      FROM asset_maintenance m
      LEFT JOIN employees e ON m.performed_by = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE m.asset_id = $1
    `;
    const params = [req.params.id];

    if (status) {
      query += ` AND m.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY m.scheduled_date DESC, m.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create maintenance record
router.post('/:id/maintenance', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'create:maintenance',
  getResourceId: (req) => req.params.id,
}), async (req, res) => {
  try {
    const { error, value } = maintenanceSchema.validate({
      ...req.body,
      asset_id: req.params.id
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      asset_id, maintenance_type, scheduled_date, performed_by, vendor,
      cost, description, parts_replaced, next_maintenance_due, notes
    } = value;
    
    const query = `
      INSERT INTO asset_maintenance (
        asset_id, maintenance_type, scheduled_date, performed_by, vendor,
        cost, description, parts_replaced, next_maintenance_due, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      asset_id, maintenance_type, scheduled_date, performed_by, vendor,
      cost, description, parts_replaced, next_maintenance_due, notes
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update maintenance record
router.put('/maintenance/:maintenanceId', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'update:maintenance',
  getResourceId: (req) => req.params.maintenanceId,
}), async (req, res) => {
  try {
    const { error, value } = maintenanceSchema.partial().validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    Object.keys(value).forEach(key => {
      if (value[key] !== undefined && key !== 'asset_id') {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(value[key]);
      }
    });

    // Set completed_date if status is being changed to completed
    if (value.status === 'completed' && req.body.completed_date === undefined) {
      paramCount++;
      updates.push(`completed_date = $${paramCount}`);
      values.push(new Date());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    paramCount++;
    values.push(req.params.maintenanceId);

    const query = `
      UPDATE asset_maintenance 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ASSET CHECKOUT/CHECKIN ENDPOINTS

// Check out asset to employee
router.post('/:id/checkout', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'checkout',
  getResourceId: (req) => req.params.id,
}), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { error, value } = checkoutSchema.validate({
      ...req.body,
      asset_id: req.params.id
    });
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if asset is available
    const assetCheck = await client.query(
      'SELECT status FROM assets WHERE id = $1',
      [req.params.id]
    );
    
    if (assetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    if (assetCheck.rows[0].status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Asset is not available for checkout' });
    }

    // Get checker employee ID from user ID
    const checkerQuery = await client.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    
    if (checkerQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'User is not an employee' });
    }

    const { 
      asset_id, employee_id, expected_return_date, 
      checkout_condition, checkout_notes
    } = value;
    
    // Create checkout record
    const checkoutQuery = `
      INSERT INTO asset_checkouts (
        asset_id, employee_id, checked_out_by, expected_return_date,
        checkout_condition, checkout_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const checkoutResult = await client.query(checkoutQuery, [
      asset_id, employee_id, checkerQuery.rows[0].id, expected_return_date,
      checkout_condition, checkout_notes
    ]);
    
    // Update asset status
    await client.query(
      'UPDATE assets SET status = $1, assigned_to = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['assigned', employee_id, asset_id]
    );
    
    await client.query('COMMIT');
    res.status(201).json(checkoutResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error checking out asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Check in asset from employee
router.post('/checkout/:checkoutId/checkin', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'checkin',
  getResourceId: (req) => req.params.checkoutId,
}), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { error, value } = returnSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get checker employee ID from user ID
    const checkerQuery = await client.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    
    if (checkerQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'User is not an employee' });
    }

    const { return_condition, return_notes } = value;
    
    // Update checkout record
    const checkoutQuery = `
      UPDATE asset_checkouts 
      SET checked_in_by = $1, actual_return_date = CURRENT_TIMESTAMP,
          return_condition = $2, return_notes = $3, status = 'returned',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND status = 'checked_out'
      RETURNING asset_id
    `;
    
    const checkoutResult = await client.query(checkoutQuery, [
      checkerQuery.rows[0].id, return_condition, return_notes, req.params.checkoutId
    ]);
    
    if (checkoutResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active checkout not found' });
    }
    
    const assetId = checkoutResult.rows[0].asset_id;
    
    // Update asset status and condition
    await client.query(
      `UPDATE assets 
       SET status = 'available', assigned_to = NULL, condition = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [return_condition, assetId]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Asset checked in successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error checking in asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get asset statistics and analytics
router.get('/stats/overview', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'view:stats',
}), async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_assets,
        COUNT(*) FILTER (WHERE status = 'available') as available_assets,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_assets,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_assets,
        COUNT(*) FILTER (WHERE status = 'retired') as retired_assets,
        COUNT(*) FILTER (WHERE condition = 'excellent') as excellent_condition,
        COUNT(*) FILTER (WHERE condition = 'good') as good_condition,
        COUNT(*) FILTER (WHERE condition = 'fair') as fair_condition,
        COUNT(*) FILTER (WHERE condition = 'poor') as poor_condition,
        COUNT(*) FILTER (WHERE condition = 'damaged') as damaged_condition,
        SUM(purchase_cost) as total_purchase_value,
        SUM(current_value) as total_current_value,
        COUNT(DISTINCT category) as total_categories,
        COUNT(DISTINCT location_id) as locations_with_assets
      FROM assets
    `;
    
    const result = await pool.query(query);
    
    // Get category breakdown
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as asset_count,
        COUNT(*) FILTER (WHERE status = 'available') as available_count,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_count,
        SUM(purchase_cost) as total_value
      FROM assets
      GROUP BY category
      ORDER BY asset_count DESC
    `;
    
    const categoryResult = await pool.query(categoryQuery);
    
    // Get maintenance summary
    const maintenanceQuery = `
      SELECT 
        COUNT(*) as total_maintenance_records,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_maintenance,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_maintenance,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_maintenance,
        SUM(cost) FILTER (WHERE status = 'completed') as total_maintenance_cost,
        COUNT(DISTINCT asset_id) as assets_with_maintenance
      FROM asset_maintenance
    `;
    
    const maintenanceResult = await pool.query(maintenanceQuery);
    
    res.json({
      overview: result.rows[0],
      categoryBreakdown: categoryResult.rows,
      maintenanceSummary: maintenanceResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching asset statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get assets due for maintenance
router.get('/maintenance/due', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'view:maintenance_due',
}), async (req, res) => {
  try {
    const { days_ahead = 30 } = req.query;
    
    const query = `
      SELECT 
        a.id, a.asset_tag, a.name, a.category, a.subcategory,
        m.next_maintenance_due,
        l.name as location_name,
        e.employee_id as assigned_employee_id,
        u.name as assigned_employee_name
      FROM assets a
      LEFT JOIN asset_maintenance m ON a.id = m.asset_id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN employees e ON a.assigned_to = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE m.next_maintenance_due IS NOT NULL 
        AND m.next_maintenance_due <= CURRENT_DATE + INTERVAL '${days_ahead} days'
        AND NOT EXISTS (
          SELECT 1 FROM asset_maintenance m2 
          WHERE m2.asset_id = a.id 
            AND m2.scheduled_date >= m.next_maintenance_due 
            AND m2.status IN ('scheduled', 'in_progress')
        )
      ORDER BY m.next_maintenance_due ASC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assets due for maintenance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get overdue checkouts
router.get('/checkouts/overdue', authenticateToken, requireCerbosPermission({
  resource: 'asset',
  action: 'view:overdue',
}), async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*,
        a.asset_tag, a.name as asset_name, a.category,
        e.employee_id,
        u.name as employee_name, u.email as employee_email,
        CURRENT_DATE - c.expected_return_date::date as days_overdue
      FROM asset_checkouts c
      JOIN assets a ON c.asset_id = a.id
      JOIN employees e ON c.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE c.status = 'checked_out' 
        AND c.expected_return_date < CURRENT_TIMESTAMP
      ORDER BY c.expected_return_date ASC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching overdue checkouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
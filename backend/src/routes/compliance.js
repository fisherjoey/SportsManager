const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const Joi = require('joi');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Validation schemas
const complianceSchema = Joi.object({
  compliance_type: Joi.string().max(100).required(),
  regulation_name: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  responsible_employee: Joi.string().uuid().allow(null),
  responsible_department: Joi.string().uuid().allow(null),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'annually').required(),
  next_audit_date: Joi.date().required(),
  current_findings: Joi.string().allow('', null),
  action_items: Joi.string().allow('', null),
  required_documents: Joi.array().items(Joi.string()).allow(null),
  evidence_files: Joi.array().items(Joi.string()).allow(null)
});

const incidentSchema = Joi.object({
  incident_type: Joi.string().valid('safety', 'security', 'quality', 'hr', 'equipment').required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  incident_date: Joi.date().required(),
  location_id: Joi.string().uuid().allow(null),
  description: Joi.string().required(),
  immediate_actions_taken: Joi.string().allow('', null),
  people_involved: Joi.array().items(Joi.string()).allow(null),
  witnesses: Joi.array().items(Joi.string()).allow(null),
  assets_involved: Joi.array().items(Joi.string().uuid()).allow(null),
  target_resolution_date: Joi.date().allow(null),
  attachments: Joi.array().items(Joi.string()).allow(null)
});

const riskAssessmentSchema = Joi.object({
  risk_title: Joi.string().max(200).required(),
  risk_description: Joi.string().allow('', null),
  risk_category: Joi.string().valid('operational', 'financial', 'safety', 'regulatory', 'reputational').required(),
  owner_employee: Joi.string().uuid().allow(null),
  owner_department: Joi.string().uuid().allow(null),
  probability_score: Joi.number().integer().min(1).max(5).required(),
  impact_score: Joi.number().integer().min(1).max(5).required(),
  current_controls: Joi.string().allow('', null),
  mitigation_actions: Joi.string().allow('', null),
  review_date: Joi.date().allow(null),
  next_review_date: Joi.date().required()
});

// Helper function to calculate risk level from scores
function calculateRiskLevel(probabilityScore, impactScore) {
  const riskScore = probabilityScore * impactScore;
  if (riskScore <= 5) return 'low';
  if (riskScore <= 12) return 'medium';
  if (riskScore <= 20) return 'high';
  return 'critical';
}

// Helper function to generate incident number
async function generateIncidentNumber() {
  const year = new Date().getFullYear();
  const prefix = `INC-${year}-`;
  
  const query = `
    SELECT incident_number 
    FROM incidents 
    WHERE incident_number LIKE $1 
    ORDER BY incident_number DESC 
    LIMIT 1
  `;
  
  const result = await pool.query(query, [`${prefix}%`]);
  
  if (result.rows.length === 0) {
    return `${prefix}001`;
  }
  
  const lastNumber = result.rows[0].incident_number;
  const numberPart = parseInt(lastNumber.split('-')[2]) + 1;
  return `${prefix}${numberPart.toString().padStart(3, '0')}`;
}

// COMPLIANCE TRACKING ENDPOINTS

// Get all compliance items with filtering
router.get('/tracking', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { compliance_type, status, responsible_employee, responsible_department, overdue } = req.query;
    
    let query = `
      SELECT 
        ct.*,
        e.employee_id as responsible_employee_id,
        u.name as responsible_employee_name,
        d.name as responsible_department_name,
        CASE 
          WHEN ct.next_audit_date < CURRENT_DATE THEN true
          ELSE false
        END as is_overdue,
        CASE 
          WHEN ct.next_audit_date <= CURRENT_DATE + INTERVAL '30 days' THEN true
          ELSE false
        END as due_soon
      FROM compliance_tracking ct
      LEFT JOIN employees e ON ct.responsible_employee = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON ct.responsible_department = d.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (compliance_type) {
      paramCount++;
      query += ` AND ct.compliance_type = $${paramCount}`;
      params.push(compliance_type);
    }

    if (status) {
      paramCount++;
      query += ` AND ct.status = $${paramCount}`;
      params.push(status);
    }

    if (responsible_employee) {
      paramCount++;
      query += ` AND ct.responsible_employee = $${paramCount}`;
      params.push(responsible_employee);
    }

    if (responsible_department) {
      paramCount++;
      query += ` AND ct.responsible_department = $${paramCount}`;
      params.push(responsible_department);
    }

    if (overdue === 'true') {
      query += ` AND ct.next_audit_date < CURRENT_DATE`;
    }

    query += ` ORDER BY ct.next_audit_date ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching compliance items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single compliance item
router.get('/tracking/:id', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const query = `
      SELECT 
        ct.*,
        e.employee_id as responsible_employee_id,
        u.name as responsible_employee_name,
        d.name as responsible_department_name
      FROM compliance_tracking ct
      LEFT JOIN employees e ON ct.responsible_employee = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON ct.responsible_department = d.id
      WHERE ct.id = $1
    `;
    
    const result = await pool.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching compliance item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new compliance item
router.post('/tracking', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { error, value } = complianceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      compliance_type, regulation_name, description, responsible_employee,
      responsible_department, frequency, next_audit_date, current_findings,
      action_items, required_documents, evidence_files
    } = value;
    
    const query = `
      INSERT INTO compliance_tracking (
        compliance_type, regulation_name, description, responsible_employee,
        responsible_department, frequency, next_audit_date, current_findings,
        action_items, required_documents, evidence_files
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      compliance_type, regulation_name, description, responsible_employee,
      responsible_department, frequency, next_audit_date, current_findings,
      action_items, JSON.stringify(required_documents), JSON.stringify(evidence_files)
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating compliance item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update compliance item
router.put('/tracking/:id', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { error, value } = complianceSchema.partial().validate(req.body);
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
        if (key === 'required_documents' || key === 'evidence_files') {
          values.push(JSON.stringify(value[key]));
        } else {
          values.push(value[key]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Update last_audit_date if status changes to compliant
    if (value.status === 'compliant') {
      paramCount++;
      updates.push(`last_audit_date = $${paramCount}`);
      values.push(new Date());
    }

    paramCount++;
    values.push(req.params.id);

    const query = `
      UPDATE compliance_tracking 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating compliance item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// INCIDENT MANAGEMENT ENDPOINTS

// Get all incidents with filtering
router.get('/incidents', authenticateToken, async (req, res) => {
  try {
    const { incident_type, severity, status, location_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        i.*,
        l.name as location_name,
        reporter.employee_id as reporter_employee_id,
        reporter_user.name as reporter_name,
        investigator.employee_id as investigator_employee_id,
        investigator_user.name as investigator_name
      FROM incidents i
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN employees reporter ON i.reported_by = reporter.id
      LEFT JOIN users reporter_user ON reporter.user_id = reporter_user.id
      LEFT JOIN employees investigator ON i.assigned_investigator = investigator.id
      LEFT JOIN users investigator_user ON investigator.user_id = investigator_user.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (incident_type) {
      paramCount++;
      query += ` AND i.incident_type = $${paramCount}`;
      params.push(incident_type);
    }

    if (severity) {
      paramCount++;
      query += ` AND i.severity = $${paramCount}`;
      params.push(severity);
    }

    if (status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      params.push(status);
    }

    if (location_id) {
      paramCount++;
      query += ` AND i.location_id = $${paramCount}`;
      params.push(location_id);
    }

    query += ` ORDER BY i.incident_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM incidents i WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;

    if (incident_type) {
      countParamCount++;
      countQuery += ` AND i.incident_type = $${countParamCount}`;
      countParams.push(incident_type);
    }

    if (severity) {
      countParamCount++;
      countQuery += ` AND i.severity = $${countParamCount}`;
      countParams.push(severity);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND i.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (location_id) {
      countParamCount++;
      countQuery += ` AND i.location_id = $${countParamCount}`;
      countParams.push(location_id);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      incidents: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single incident
router.get('/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        i.*,
        l.name as location_name,
        l.address as location_address,
        reporter.employee_id as reporter_employee_id,
        reporter_user.name as reporter_name,
        investigator.employee_id as investigator_employee_id,
        investigator_user.name as investigator_name
      FROM incidents i
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN employees reporter ON i.reported_by = reporter.id
      LEFT JOIN users reporter_user ON reporter.user_id = reporter_user.id
      LEFT JOIN employees investigator ON i.assigned_investigator = investigator.id
      LEFT JOIN users investigator_user ON investigator.user_id = investigator_user.id
      WHERE i.id = $1
    `;
    
    const result = await pool.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new incident
router.post('/incidents', authenticateToken, async (req, res) => {
  try {
    const { error, value } = incidentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get reporter employee ID from user ID
    const reporterQuery = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    
    if (reporterQuery.rows.length === 0) {
      return res.status(403).json({ error: 'User is not an employee' });
    }

    // Generate incident number
    const incidentNumber = await generateIncidentNumber();

    const { 
      incident_type, severity, incident_date, location_id, description,
      immediate_actions_taken, people_involved, witnesses, assets_involved,
      target_resolution_date, attachments
    } = value;
    
    const query = `
      INSERT INTO incidents (
        incident_number, incident_type, severity, incident_date, location_id,
        reported_by, description, immediate_actions_taken, people_involved,
        witnesses, assets_involved, target_resolution_date, attachments
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      incidentNumber, incident_type, severity, incident_date, location_id,
      reporterQuery.rows[0].id, description, immediate_actions_taken,
      JSON.stringify(people_involved), JSON.stringify(witnesses),
      JSON.stringify(assets_involved), target_resolution_date,
      JSON.stringify(attachments)
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update incident
router.put('/incidents/:id', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { error, value } = incidentSchema.partial().validate(req.body);
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
        if (['people_involved', 'witnesses', 'assets_involved', 'attachments'].includes(key)) {
          values.push(JSON.stringify(value[key]));
        } else {
          values.push(value[key]);
        }
      }
    });

    // Handle status-specific updates
    if (req.body.status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(req.body.status);

      if (req.body.status === 'investigating' && req.body.assigned_investigator) {
        paramCount++;
        updates.push(`assigned_investigator = $${paramCount}`);
        values.push(req.body.assigned_investigator);
      }

      if (['resolved', 'closed'].includes(req.body.status) && !req.body.actual_resolution_date) {
        paramCount++;
        updates.push(`actual_resolution_date = $${paramCount}`);
        values.push(new Date());
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    paramCount++;
    values.push(req.params.id);

    const query = `
      UPDATE incidents 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RISK ASSESSMENT ENDPOINTS

// Get all risk assessments with filtering
router.get('/risks', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { risk_category, risk_level, status, owner_employee, owner_department } = req.query;
    
    let query = `
      SELECT 
        ra.*,
        e.employee_id as owner_employee_id,
        u.name as owner_employee_name,
        d.name as owner_department_name,
        CASE 
          WHEN ra.next_review_date < CURRENT_DATE THEN true
          ELSE false
        END as review_overdue
      FROM risk_assessments ra
      LEFT JOIN employees e ON ra.owner_employee = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON ra.owner_department = d.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (risk_category) {
      paramCount++;
      query += ` AND ra.risk_category = $${paramCount}`;
      params.push(risk_category);
    }

    if (risk_level) {
      paramCount++;
      query += ` AND ra.risk_level = $${paramCount}`;
      params.push(risk_level);
    }

    if (status) {
      paramCount++;
      query += ` AND ra.status = $${paramCount}`;
      params.push(status);
    }

    if (owner_employee) {
      paramCount++;
      query += ` AND ra.owner_employee = $${paramCount}`;
      params.push(owner_employee);
    }

    if (owner_department) {
      paramCount++;
      query += ` AND ra.owner_department = $${paramCount}`;
      params.push(owner_department);
    }

    query += ` ORDER BY ra.risk_score DESC, ra.next_review_date ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching risk assessments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new risk assessment
router.post('/risks', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { error, value } = riskAssessmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      risk_title, risk_description, risk_category, owner_employee,
      owner_department, probability_score, impact_score, current_controls,
      mitigation_actions, review_date, next_review_date
    } = value;
    
    const risk_score = probability_score * impact_score;
    const risk_level = calculateRiskLevel(probability_score, impact_score);
    
    const query = `
      INSERT INTO risk_assessments (
        risk_title, risk_description, risk_category, owner_employee,
        owner_department, probability_score, impact_score, risk_score,
        risk_level, current_controls, mitigation_actions, review_date,
        next_review_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      risk_title, risk_description, risk_category, owner_employee,
      owner_department, probability_score, impact_score, risk_score,
      risk_level, current_controls, mitigation_actions, review_date,
      next_review_date
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating risk assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update risk assessment
router.put('/risks/:id', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { error, value } = riskAssessmentSchema.partial().validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    // Recalculate risk score and level if probability or impact scores change
    let newRiskScore, newRiskLevel;
    if (value.probability_score || value.impact_score) {
      // Get current scores if not provided
      const currentQuery = await pool.query(
        'SELECT probability_score, impact_score FROM risk_assessments WHERE id = $1',
        [req.params.id]
      );
      
      if (currentQuery.rows.length === 0) {
        return res.status(404).json({ error: 'Risk assessment not found' });
      }
      
      const currentScores = currentQuery.rows[0];
      const probScore = value.probability_score || currentScores.probability_score;
      const impactScore = value.impact_score || currentScores.impact_score;
      
      newRiskScore = probScore * impactScore;
      newRiskLevel = calculateRiskLevel(probScore, impactScore);
    }

    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(value[key]);
      }
    });

    if (newRiskScore !== undefined) {
      paramCount++;
      updates.push(`risk_score = $${paramCount}`);
      values.push(newRiskScore);
      
      paramCount++;
      updates.push(`risk_level = $${paramCount}`);
      values.push(newRiskLevel);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    paramCount++;
    values.push(req.params.id);

    const query = `
      UPDATE risk_assessments 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get compliance dashboard statistics
router.get('/stats/dashboard', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    // Compliance statistics
    const complianceQuery = `
      SELECT 
        COUNT(*) as total_compliance_items,
        COUNT(*) FILTER (WHERE status = 'compliant') as compliant_items,
        COUNT(*) FILTER (WHERE status = 'non_compliant') as non_compliant_items,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review_items,
        COUNT(*) FILTER (WHERE next_audit_date < CURRENT_DATE) as overdue_audits,
        COUNT(*) FILTER (WHERE next_audit_date <= CURRENT_DATE + INTERVAL '30 days') as due_soon_audits
      FROM compliance_tracking
    `;
    
    const complianceResult = await pool.query(complianceQuery);
    
    // Incident statistics
    const incidentQuery = `
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_incidents,
        COUNT(*) FILTER (WHERE severity = 'high') as high_incidents,
        COUNT(*) FILTER (WHERE status = 'reported') as new_incidents,
        COUNT(*) FILTER (WHERE status = 'investigating') as investigating_incidents,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_incidents,
        COUNT(*) FILTER (WHERE target_resolution_date < CURRENT_DATE AND status NOT IN ('resolved', 'closed')) as overdue_incidents
      FROM incidents
      WHERE incident_date >= CURRENT_DATE - INTERVAL '1 year'
    `;
    
    const incidentResult = await pool.query(incidentQuery);
    
    // Risk assessment statistics
    const riskQuery = `
      SELECT 
        COUNT(*) as total_risks,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_risks,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_risks,
        COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_risks,
        COUNT(*) FILTER (WHERE risk_level = 'low') as low_risks,
        COUNT(*) FILTER (WHERE status = 'identified') as new_risks,
        COUNT(*) FILTER (WHERE next_review_date < CURRENT_DATE) as overdue_reviews,
        AVG(risk_score) as average_risk_score
      FROM risk_assessments
    `;
    
    const riskResult = await pool.query(riskQuery);
    
    // Recent activity
    const recentIncidentsQuery = `
      SELECT 
        i.incident_number, i.incident_type, i.severity, i.incident_date,
        i.description, u.name as reporter_name
      FROM incidents i
      LEFT JOIN employees e ON i.reported_by = e.id
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY i.incident_date DESC
      LIMIT 5
    `;
    
    const recentIncidentsResult = await pool.query(recentIncidentsQuery);
    
    res.json({
      compliance: complianceResult.rows[0],
      incidents: incidentResult.rows[0],
      risks: riskResult.rows[0],
      recentIncidents: recentIncidentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching compliance dashboard statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get compliance calendar (upcoming audits and reviews)
router.get('/calendar', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const complianceEvents = await pool.query(`
      SELECT 
        'compliance_audit' as event_type,
        id as item_id,
        regulation_name as title,
        next_audit_date as event_date,
        compliance_type,
        status
      FROM compliance_tracking
      WHERE next_audit_date BETWEEN $1 AND $2
    `, [start_date || new Date(), end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)]);
    
    const riskReviews = await pool.query(`
      SELECT 
        'risk_review' as event_type,
        id as item_id,
        risk_title as title,
        next_review_date as event_date,
        risk_category,
        risk_level
      FROM risk_assessments
      WHERE next_review_date BETWEEN $1 AND $2
    `, [start_date || new Date(), end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)]);
    
    const allEvents = [...complianceEvents.rows, ...riskReviews.rows]
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    res.json(allEvents);
  } catch (error) {
    console.error('Error fetching compliance calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
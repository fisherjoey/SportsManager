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
const departmentSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  parent_department_id: Joi.string().uuid().allow(null),
  manager_id: Joi.string().uuid().allow(null),
  cost_center: Joi.string().max(50).allow('', null),
  budget_allocated: Joi.number().min(0).allow(null)
});

const positionSchema = Joi.object({
  title: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  department_id: Joi.string().uuid().required(),
  level: Joi.string().valid('Entry', 'Mid', 'Senior', 'Executive').allow(null),
  min_salary: Joi.number().min(0).allow(null),
  max_salary: Joi.number().min(0).allow(null),
  required_skills: Joi.array().items(Joi.string()).allow(null),
  preferred_skills: Joi.array().items(Joi.string()).allow(null),
  responsibilities: Joi.string().allow('', null)
});

const employeeSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  employee_id: Joi.string().max(20).required(),
  department_id: Joi.string().uuid().required(),
  position_id: Joi.string().uuid().required(),
  manager_id: Joi.string().uuid().allow(null),
  hire_date: Joi.date().required(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern').default('full_time'),
  employment_status: Joi.string().valid('active', 'inactive', 'terminated', 'on_leave').default('active'),
  base_salary: Joi.number().min(0).allow(null),
  pay_frequency: Joi.string().valid('weekly', 'bi_weekly', 'monthly', 'annual').default('monthly'),
  emergency_contacts: Joi.array().items(Joi.object()).allow(null),
  benefits_enrolled: Joi.array().items(Joi.string()).allow(null),
  notes: Joi.string().allow('', null)
});

const evaluationSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  evaluation_period: Joi.string().max(50).required(),
  period_start: Joi.date().required(),
  period_end: Joi.date().required(),
  overall_rating: Joi.number().integer().min(1).max(5).allow(null),
  category_ratings: Joi.object().allow(null),
  achievements: Joi.string().allow('', null),
  areas_for_improvement: Joi.string().allow('', null),
  goals_next_period: Joi.string().allow('', null),
  evaluator_comments: Joi.string().allow('', null),
  employee_comments: Joi.string().allow('', null)
});

const trainingSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  training_name: Joi.string().max(200).required(),
  training_type: Joi.string().valid('certification', 'workshop', 'online_course', 'conference').allow(null),
  provider: Joi.string().max(100).allow('', null),
  completion_date: Joi.date().allow(null),
  expiration_date: Joi.date().allow(null),
  cost: Joi.number().min(0).allow(null),
  hours_completed: Joi.number().integer().min(0).allow(null),
  certificate_number: Joi.string().max(100).allow('', null),
  certificate_url: Joi.string().uri().allow('', null),
  notes: Joi.string().allow('', null)
});

// DEPARTMENTS ENDPOINTS

// Get all departments with hierarchy
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const query = `
      WITH RECURSIVE department_hierarchy AS (
        -- Base case: root departments
        SELECT 
          d.id, d.name, d.description, d.parent_department_id, d.manager_id,
          d.cost_center, d.budget_allocated, d.budget_spent, d.active,
          d.created_at, d.updated_at,
          u.name as manager_name,
          0 as level,
          ARRAY[d.name] as path
        FROM departments d
        LEFT JOIN users u ON d.manager_id = u.id
        WHERE d.parent_department_id IS NULL AND d.active = true
        
        UNION ALL
        
        -- Recursive case: child departments
        SELECT 
          d.id, d.name, d.description, d.parent_department_id, d.manager_id,
          d.cost_center, d.budget_allocated, d.budget_spent, d.active,
          d.created_at, d.updated_at,
          u.name as manager_name,
          dh.level + 1,
          dh.path || d.name
        FROM departments d
        JOIN department_hierarchy dh ON d.parent_department_id = dh.id
        LEFT JOIN users u ON d.manager_id = u.id
        WHERE d.active = true
      )
      SELECT 
        dh.*,
        COUNT(e.id) as employee_count,
        COUNT(jp.id) as position_count
      FROM department_hierarchy dh
      LEFT JOIN employees e ON dh.id = e.department_id AND e.employment_status = 'active'
      LEFT JOIN job_positions jp ON dh.id = jp.department_id AND jp.active = true
      GROUP BY dh.id, dh.name, dh.description, dh.parent_department_id, dh.manager_id,
               dh.cost_center, dh.budget_allocated, dh.budget_spent, dh.active,
               dh.created_at, dh.updated_at, dh.manager_name, dh.level, dh.path
      ORDER BY dh.level, dh.name
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new department
router.post('/departments', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { error, value } = departmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, parent_department_id, manager_id, cost_center, budget_allocated } = value;
    
    const query = `
      INSERT INTO departments (name, description, parent_department_id, manager_id, cost_center, budget_allocated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, description, parent_department_id, manager_id, cost_center, budget_allocated]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Department name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update department
router.put('/departments/:id', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { error, value } = departmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, parent_department_id, manager_id, cost_center, budget_allocated } = value;
    
    const query = `
      UPDATE departments 
      SET name = $1, description = $2, parent_department_id = $3, manager_id = $4, 
          cost_center = $5, budget_allocated = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND active = true
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, description, parent_department_id, manager_id, cost_center, budget_allocated, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// JOB POSITIONS ENDPOINTS

// Get all positions
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const { department_id, level, active } = req.query;
    let query = `
      SELECT jp.*, d.name as department_name,
             COUNT(e.id) as current_employees
      FROM job_positions jp
      JOIN departments d ON jp.department_id = d.id
      LEFT JOIN employees e ON jp.id = e.position_id AND e.employment_status = 'active'
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` AND jp.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (level) {
      paramCount++;
      query += ` AND jp.level = $${paramCount}`;
      params.push(level);
    }

    if (active !== undefined) {
      paramCount++;
      query += ` AND jp.active = $${paramCount}`;
      params.push(active === 'true');
    }

    query += ` GROUP BY jp.id, d.name ORDER BY d.name, jp.title`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new position
router.post('/positions', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { error, value } = positionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, description, department_id, level, min_salary, max_salary, required_skills, preferred_skills, responsibilities } = value;
    
    const query = `
      INSERT INTO job_positions (title, description, department_id, level, min_salary, max_salary, required_skills, preferred_skills, responsibilities)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await pool.query(query, [title, description, department_id, level, min_salary, max_salary, JSON.stringify(required_skills), JSON.stringify(preferred_skills), responsibilities]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// EMPLOYEES ENDPOINTS

// Get all employees with comprehensive data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department_id, position_id, employment_status, manager_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        e.*,
        u.name as employee_name,
        u.email as employee_email,
        u.phone as employee_phone,
        d.name as department_name,
        jp.title as position_title,
        jp.level as position_level,
        m.employee_id as manager_employee_id,
        mu.name as manager_name,
        COALESCE(tr_active.active_trainings, 0) as active_trainings,
        COALESCE(tr_completed.completed_trainings, 0) as completed_trainings,
        ev.latest_evaluation_date,
        ev.latest_overall_rating
      FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN departments d ON e.department_id = d.id
      JOIN job_positions jp ON e.position_id = jp.id
      LEFT JOIN employees m ON e.manager_id = m.id
      LEFT JOIN users mu ON m.user_id = mu.id
      LEFT JOIN (
        SELECT employee_id, COUNT(*) as active_trainings
        FROM training_records 
        WHERE status IN ('scheduled', 'in_progress')
        GROUP BY employee_id
      ) tr_active ON e.id = tr_active.employee_id
      LEFT JOIN (
        SELECT employee_id, COUNT(*) as completed_trainings
        FROM training_records 
        WHERE status = 'completed'
        GROUP BY employee_id
      ) tr_completed ON e.id = tr_completed.employee_id
      LEFT JOIN (
        SELECT 
          employee_id,
          MAX(evaluation_date) as latest_evaluation_date,
          (SELECT overall_rating FROM employee_evaluations ev2 
           WHERE ev2.employee_id = ev1.employee_id 
           ORDER BY evaluation_date DESC LIMIT 1) as latest_overall_rating
        FROM employee_evaluations ev1
        GROUP BY employee_id
      ) ev ON e.id = ev.employee_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` AND e.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (position_id) {
      paramCount++;
      query += ` AND e.position_id = $${paramCount}`;
      params.push(position_id);
    }

    if (employment_status) {
      paramCount++;
      query += ` AND e.employment_status = $${paramCount}`;
      params.push(employment_status);
    }

    if (manager_id) {
      paramCount++;
      query += ` AND e.manager_id = $${paramCount}`;
      params.push(manager_id);
    }

    query += ` ORDER BY u.name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM employees e
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (department_id) {
      countParamCount++;
      countQuery += ` AND e.department_id = $${countParamCount}`;
      countParams.push(department_id);
    }

    if (position_id) {
      countParamCount++;
      countQuery += ` AND e.position_id = $${countParamCount}`;
      countParams.push(position_id);
    }

    if (employment_status) {
      countParamCount++;
      countQuery += ` AND e.employment_status = $${countParamCount}`;
      countParams.push(employment_status);
    }

    if (manager_id) {
      countParamCount++;
      countQuery += ` AND e.manager_id = $${countParamCount}`;
      countParams.push(manager_id);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      employees: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single employee by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        e.*,
        u.name as employee_name,
        u.email as employee_email,
        u.phone as employee_phone,
        d.name as department_name,
        jp.title as position_title,
        jp.level as position_level,
        jp.min_salary,
        jp.max_salary,
        m.employee_id as manager_employee_id,
        mu.name as manager_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN departments d ON e.department_id = d.id
      JOIN job_positions jp ON e.position_id = jp.id
      LEFT JOIN employees m ON e.manager_id = m.id
      LEFT JOIN users mu ON m.user_id = mu.id
      WHERE e.id = $1
    `;
    
    const result = await pool.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new employee
router.post('/', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { error, value } = employeeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      user_id, employee_id, department_id, position_id, manager_id, hire_date,
      employment_type, employment_status, base_salary, pay_frequency,
      emergency_contacts, benefits_enrolled, notes
    } = value;
    
    const query = `
      INSERT INTO employees (
        user_id, employee_id, department_id, position_id, manager_id, hire_date,
        employment_type, employment_status, base_salary, pay_frequency,
        emergency_contacts, benefits_enrolled, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      user_id, employee_id, department_id, position_id, manager_id, hire_date,
      employment_type, employment_status, base_salary, pay_frequency,
      JSON.stringify(emergency_contacts), JSON.stringify(benefits_enrolled), notes
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Employee ID already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update employee
router.put('/:id', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { error, value } = employeeSchema.partial().validate(req.body);
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
        if (key === 'emergency_contacts' || key === 'benefits_enrolled') {
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
      UPDATE employees 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// EMPLOYEE EVALUATIONS ENDPOINTS

// Get evaluations for an employee
router.get('/:id/evaluations', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        ev.*,
        evaluator_emp.employee_id as evaluator_employee_id,
        evaluator_user.name as evaluator_name
      FROM employee_evaluations ev
      JOIN employees evaluator_emp ON ev.evaluator_id = evaluator_emp.id
      JOIN users evaluator_user ON evaluator_emp.user_id = evaluator_user.id
      WHERE ev.employee_id = $1
      ORDER BY ev.evaluation_date DESC
    `;
    
    const result = await pool.query(query, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new evaluation
router.post('/:id/evaluations', authenticateToken, requireCerbosPermission({ resource: 'employee', action: '*' }), async (req, res) => {
  try {
    const { error, value } = evaluationSchema.validate({
      ...req.body,
      employee_id: req.params.id
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get evaluator employee ID from user ID
    const evaluatorQuery = `SELECT id FROM employees WHERE user_id = $1`;
    const evaluatorResult = await pool.query(evaluatorQuery, [req.user.id]);
    
    if (evaluatorResult.rows.length === 0) {
      return res.status(403).json({ error: 'User is not an employee' });
    }

    const { 
      employee_id, evaluation_period, period_start, period_end, overall_rating,
      category_ratings, achievements, areas_for_improvement, goals_next_period,
      evaluator_comments, employee_comments
    } = value;
    
    const query = `
      INSERT INTO employee_evaluations (
        employee_id, evaluator_id, evaluation_period, evaluation_date, period_start, period_end,
        overall_rating, category_ratings, achievements, areas_for_improvement,
        goals_next_period, evaluator_comments, employee_comments
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      employee_id, evaluatorResult.rows[0].id, evaluation_period, period_start, period_end,
      overall_rating, JSON.stringify(category_ratings), achievements, areas_for_improvement,
      goals_next_period, evaluator_comments, employee_comments
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating evaluation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TRAINING RECORDS ENDPOINTS

// Get training records for an employee
router.get('/:id/training', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT * FROM training_records 
      WHERE employee_id = $1
    `;
    const params = [req.params.id];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY completion_date DESC, created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching training records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new training record
router.post('/:id/training', authenticateToken, requireCerbosPermission({ resource: 'employee', action: '*' }), async (req, res) => {
  try {
    const { error, value } = trainingSchema.validate({
      ...req.body,
      employee_id: req.params.id
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      employee_id, training_name, training_type, provider, completion_date,
      expiration_date, cost, hours_completed, certificate_number,
      certificate_url, notes
    } = value;
    
    // Determine status based on completion date
    let status = 'scheduled';
    if (completion_date) {
      status = expiration_date && new Date(expiration_date) < new Date() ? 'expired' : 'completed';
    }
    
    const query = `
      INSERT INTO training_records (
        employee_id, training_name, training_type, provider, completion_date,
        expiration_date, status, cost, hours_completed, certificate_number,
        certificate_url, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      employee_id, training_name, training_type, provider, completion_date,
      expiration_date, status, cost, hours_completed, certificate_number,
      certificate_url, notes
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating training record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update training record
router.put('/training/:trainingId', authenticateToken, requireCerbosPermission({ resource: 'employee', action: '*' }), async (req, res) => {
  try {
    const { error, value } = trainingSchema.partial().validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    Object.keys(value).forEach(key => {
      if (value[key] !== undefined && key !== 'employee_id') {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(value[key]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    paramCount++;
    values.push(req.params.trainingId);

    const query = `
      UPDATE training_records 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating training record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization-wide employee statistics
router.get('/stats/overview', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE employment_status = 'active') as active_employees,
        COUNT(*) FILTER (WHERE employment_status = 'inactive') as inactive_employees,
        COUNT(*) FILTER (WHERE employment_status = 'on_leave') as on_leave_employees,
        COUNT(*) FILTER (WHERE employment_status = 'terminated') as terminated_employees,
        COUNT(*) FILTER (WHERE employment_type = 'full_time' AND employment_status = 'active') as full_time_employees,
        COUNT(*) FILTER (WHERE employment_type = 'part_time' AND employment_status = 'active') as part_time_employees,
        COUNT(*) FILTER (WHERE employment_type = 'contract' AND employment_status = 'active') as contract_employees,
        COUNT(*) FILTER (WHERE employment_type = 'intern' AND employment_status = 'active') as intern_employees,
        AVG(base_salary) FILTER (WHERE base_salary IS NOT NULL AND employment_status = 'active') as avg_salary,
        COUNT(DISTINCT department_id) as total_departments,
        COUNT(DISTINCT position_id) as total_positions
      FROM employees
    `;
    
    const result = await pool.query(query);
    
    // Get department breakdown
    const deptQuery = `
      SELECT 
        d.name as department_name,
        COUNT(e.id) FILTER (WHERE e.employment_status = 'active') as active_count,
        AVG(e.base_salary) FILTER (WHERE e.base_salary IS NOT NULL AND e.employment_status = 'active') as avg_salary
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      GROUP BY d.id, d.name
      ORDER BY active_count DESC
    `;
    
    const deptResult = await pool.query(deptQuery);
    
    res.json({
      overview: result.rows[0],
      departmentBreakdown: deptResult.rows
    });
  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
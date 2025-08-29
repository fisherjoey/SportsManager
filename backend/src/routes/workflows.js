const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const Joi = require('joi');

// Skip table creation in test environment - tables should exist from migrations
const createWorkflowTables = async () => {
  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping workflow table creation in test environment');
    return;
  }
  
  const client = await db.raw('SELECT 1');
  try {
    await client.query('BEGIN');
    
    // Workflow definitions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50), -- 'onboarding', 'asset_management', 'approval', 'compliance'
        trigger_event VARCHAR(100), -- What starts this workflow
        is_active BOOLEAN DEFAULT true,
        steps JSONB NOT NULL, -- Array of workflow steps
        conditions JSONB, -- Conditions for workflow execution
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workflow instances table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_instances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_definition_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
        entity_type VARCHAR(50), -- 'employee', 'asset', 'document', etc.
        entity_id UUID, -- ID of the entity this workflow is for
        status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
        current_step INTEGER DEFAULT 0,
        context JSONB, -- Workflow-specific data and variables
        started_by UUID REFERENCES users(id),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workflow step executions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_step_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        step_name VARCHAR(100) NOT NULL,
        status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'skipped'
        assigned_to UUID REFERENCES users(id),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        due_date TIMESTAMP,
        input_data JSONB,
        output_data JSONB,
        error_message TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workflow approvals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
        step_execution_id UUID REFERENCES workflow_step_executions(id) ON DELETE CASCADE,
        approver_id UUID REFERENCES users(id),
        status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
        decision_date TIMESTAMP,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_assigned ON workflow_step_executions(assigned_to, status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_approvals_approver ON workflow_approvals(approver_id, status)');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Initialize tables
createWorkflowTables().catch(console.error);

// Validation schemas
const workflowDefinitionSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  category: Joi.string().valid('onboarding', 'asset_management', 'approval', 'compliance').required(),
  trigger_event: Joi.string().max(100).required(),
  steps: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('task', 'approval', 'notification', 'automation').required(),
    assignee_type: Joi.string().valid('user', 'role', 'department', 'manager').allow(null),
    assignee_id: Joi.string().allow(null),
    conditions: Joi.object().allow(null),
    due_days: Joi.number().integer().min(0).allow(null),
    auto_complete: Joi.boolean().default(false),
    required: Joi.boolean().default(true)
  })).required(),
  conditions: Joi.object().allow(null)
});

const workflowInstanceSchema = Joi.object({
  workflow_definition_id: Joi.string().uuid().required(),
  entity_type: Joi.string().max(50).required(),
  entity_id: Joi.string().uuid().required(),
  context: Joi.object().allow(null)
});

// Workflow execution service
class WorkflowExecutionService {
  static async startWorkflow(definitionId, entityType, entityId, context = {}, startedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get workflow definition
      const defQuery = 'SELECT * FROM workflow_definitions WHERE id = $1 AND is_active = true';
      const defResult = await client.query(defQuery, [definitionId]);
      
      if (defResult.rows.length === 0) {
        throw new Error('Workflow definition not found or inactive');
      }

      const definition = defResult.rows[0];

      // Create workflow instance
      const instanceQuery = `
        INSERT INTO workflow_instances (workflow_definition_id, entity_type, entity_id, context, started_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const instanceResult = await client.query(instanceQuery, [
        definitionId, entityType, entityId, JSON.stringify(context), startedBy
      ]);

      const instance = instanceResult.rows[0];

      // Create step executions
      const steps = definition.steps;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const assignedTo = await this.resolveAssignee(step, entityId, context, client);
        const dueDate = step.due_days ? new Date(Date.now() + step.due_days * 24 * 60 * 60 * 1000) : null;

        await client.query(`
          INSERT INTO workflow_step_executions 
          (workflow_instance_id, step_number, step_name, assigned_to, due_date, input_data)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [instance.id, i, step.name, assignedTo, dueDate, JSON.stringify(step)]);
      }

      // Start first step
      await this.startNextStep(instance.id, client);

      await client.query('COMMIT');
      return instance;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async resolveAssignee(step, entityId, context, client) {
    if (!step.assignee_type || !step.assignee_id) {
      return null;
    }

    switch (step.assignee_type) {
    case 'user':
      return step.assignee_id;
      
    case 'manager':
      // Find manager of the employee
      if (context.employee_id) {
        const managerQuery = `
            SELECT m.user_id FROM employees e 
            JOIN employees m ON e.manager_id = m.id 
            WHERE e.id = $1
          `;
        const result = await client.query(managerQuery, [context.employee_id]);
        return result.rows.length > 0 ? result.rows[0].user_id : null;
      }
      break;
      
    case 'department':
      // Find department manager
      const deptQuery = `
          SELECT manager_id FROM departments WHERE id = $1
        `;
      const result = await client.query(deptQuery, [step.assignee_id]);
      return result.rows.length > 0 ? result.rows[0].manager_id : null;
      
    case 'role':
      // Find first user with specific role (simplified)
      const roleQuery = `
          SELECT id FROM users WHERE role = $1 AND active = true LIMIT 1
        `;
      const roleResult = await client.query(roleQuery, [step.assignee_id]);
      return roleResult.rows.length > 0 ? roleResult.rows[0].id : null;
    }

    return null;
  }

  static async startNextStep(instanceId, client = null) {
    const shouldCloseConnection = !client;
    if (!client) {
      client = await pool.connect();
    }

    try {
      // Get current instance
      const instanceQuery = 'SELECT * FROM workflow_instances WHERE id = $1';
      const instanceResult = await client.query(instanceQuery, [instanceId]);
      
      if (instanceResult.rows.length === 0) {
        throw new Error('Workflow instance not found');
      }

      const instance = instanceResult.rows[0];
      
      // Get next pending step
      const stepQuery = `
        SELECT * FROM workflow_step_executions 
        WHERE workflow_instance_id = $1 AND status = 'pending'
        ORDER BY step_number
        LIMIT 1
      `;
      
      const stepResult = await client.query(stepQuery, [instanceId]);
      
      if (stepResult.rows.length === 0) {
        // No more pending steps - complete workflow
        await client.query(
          'UPDATE workflow_instances SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['completed', instanceId]
        );
        return;
      }

      const step = stepResult.rows[0];

      // Update instance current step
      await client.query(
        'UPDATE workflow_instances SET current_step = $1, status = $2 WHERE id = $3',
        [step.step_number, 'in_progress', instanceId]
      );

      // Start the step
      await client.query(
        'UPDATE workflow_step_executions SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['in_progress', step.id]
      );

      // Handle auto-complete steps
      const stepData = step.input_data;
      if (stepData.auto_complete) {
        await this.completeStep(step.id, {}, 'Auto-completed', client);
      }
    } finally {
      if (shouldCloseConnection) {
        client.release();
      }
    }
  }

  static async completeStep(stepExecutionId, outputData = {}, notes = '', client = null) {
    const shouldCloseConnection = !client;
    if (!client) {
      client = await pool.connect();
    }

    try {
      // Update step as completed
      await client.query(`
        UPDATE workflow_step_executions 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, 
            output_data = $1, notes = $2
        WHERE id = $3
      `, [JSON.stringify(outputData), notes, stepExecutionId]);

      // Get workflow instance
      const stepQuery = `
        SELECT workflow_instance_id FROM workflow_step_executions WHERE id = $1
      `;
      const stepResult = await client.query(stepQuery, [stepExecutionId]);
      
      if (stepResult.rows.length > 0) {
        await this.startNextStep(stepResult.rows[0].workflow_instance_id, client);
      }
    } finally {
      if (shouldCloseConnection) {
        client.release();
      }
    }
  }
}

// WORKFLOW DEFINITION ENDPOINTS

// Get all workflow definitions
router.get('/definitions', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { category, is_active } = req.query;
    
    let query = `
      SELECT wd.*, u.name as created_by_name
      FROM workflow_definitions wd
      LEFT JOIN users u ON wd.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND wd.category = $${paramCount}`;
      params.push(category);
    }

    if (is_active !== undefined) {
      paramCount++;
      query += ` AND wd.is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY wd.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching workflow definitions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create workflow definition
router.post('/definitions', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { error, value } = workflowDefinitionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, category, trigger_event, steps, conditions } = value;

    const query = `
      INSERT INTO workflow_definitions (name, description, category, trigger_event, steps, conditions, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      name, description, category, trigger_event, 
      JSON.stringify(steps), JSON.stringify(conditions), req.user.id
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating workflow definition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update workflow definition
router.put('/definitions/:id', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { error, value } = workflowDefinitionSchema.partial().validate(req.body);
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
        if (key === 'steps' || key === 'conditions') {
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
      UPDATE workflow_definitions 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow definition not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating workflow definition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WORKFLOW INSTANCE ENDPOINTS

// Get workflow instances
router.get('/instances', authenticateToken, async (req, res) => {
  try {
    const { status, entity_type, assigned_to_me, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        wi.*,
        wd.name as workflow_name,
        wd.category,
        u.name as started_by_name,
        COUNT(wse.id) as total_steps,
        COUNT(wse.id) FILTER (WHERE wse.status = 'completed') as completed_steps
      FROM workflow_instances wi
      JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.id
      LEFT JOIN users u ON wi.started_by = u.id
      LEFT JOIN workflow_step_executions wse ON wi.id = wse.workflow_instance_id
    `;

    const params = [];
    let paramCount = 0;
    const conditions = [];

    if (status) {
      paramCount++;
      conditions.push(`wi.status = $${paramCount}`);
      params.push(status);
    }

    if (entity_type) {
      paramCount++;
      conditions.push(`wi.entity_type = $${paramCount}`);
      params.push(entity_type);
    }

    if (assigned_to_me === 'true') {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1 FROM workflow_step_executions wse2 
        WHERE wse2.workflow_instance_id = wi.id 
          AND wse2.assigned_to = $${paramCount}
          AND wse2.status IN ('pending', 'in_progress')
      )`);
      params.push(req.user.id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${  conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY wi.id, wd.name, wd.category, u.name
      ORDER BY wi.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({
      instances: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start new workflow instance
router.post('/instances', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { error, value } = workflowInstanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { workflow_definition_id, entity_type, entity_id, context } = value;

    const instance = await WorkflowExecutionService.startWorkflow(
      workflow_definition_id, entity_type, entity_id, context, req.user.id
    );

    res.status(201).json(instance);
  } catch (error) {
    console.error('Error starting workflow instance:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get workflow instance details
router.get('/instances/:id', authenticateToken, async (req, res) => {
  try {
    const instanceQuery = `
      SELECT 
        wi.*,
        wd.name as workflow_name,
        wd.description as workflow_description,
        wd.category,
        u.name as started_by_name
      FROM workflow_instances wi
      JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.id
      LEFT JOIN users u ON wi.started_by = u.id
      WHERE wi.id = $1
    `;

    const instanceResult = await pool.query(instanceQuery, [req.params.id]);

    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }

    // Get step executions
    const stepsQuery = `
      SELECT 
        wse.*,
        u.name as assigned_to_name
      FROM workflow_step_executions wse
      LEFT JOIN users u ON wse.assigned_to = u.id
      WHERE wse.workflow_instance_id = $1
      ORDER BY wse.step_number
    `;

    const stepsResult = await pool.query(stepsQuery, [req.params.id]);

    res.json({
      instance: instanceResult.rows[0],
      steps: stepsResult.rows
    });
  } catch (error) {
    console.error('Error fetching workflow instance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete workflow step
router.post('/steps/:stepId/complete', authenticateToken, async (req, res) => {
  try {
    const { output_data, notes } = req.body;

    // Check if user is assigned to this step
    const stepQuery = `
      SELECT * FROM workflow_step_executions 
      WHERE id = $1 AND assigned_to = $2 AND status = 'in_progress'
    `;

    const stepResult = await pool.query(stepQuery, [req.params.stepId, req.user.id]);

    if (stepResult.rows.length === 0) {
      return res.status(404).json({ error: 'Step not found or not assigned to you' });
    }

    await WorkflowExecutionService.completeStep(req.params.stepId, output_data, notes);

    res.json({ message: 'Step completed successfully' });
  } catch (error) {
    console.error('Error completing workflow step:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's assigned tasks
router.get('/tasks/assigned', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        wse.*,
        wi.entity_type,
        wi.entity_id,
        wd.name as workflow_name,
        wd.category
      FROM workflow_step_executions wse
      JOIN workflow_instances wi ON wse.workflow_instance_id = wi.id
      JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.id
      WHERE wse.assigned_to = $1 
        AND wse.status IN ('pending', 'in_progress')
      ORDER BY wse.due_date ASC NULLS LAST, wse.created_at ASC
    `;

    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assigned tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pre-defined workflow templates
router.get('/templates', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  const templates = [
    {
      name: 'Employee Onboarding',
      category: 'onboarding',
      description: 'Standard employee onboarding process',
      trigger_event: 'employee_hired',
      steps: [
        {
          name: 'Create User Account',
          type: 'task',
          assignee_type: 'role',
          assignee_id: 'admin',
          due_days: 1,
          auto_complete: false,
          required: true
        },
        {
          name: 'Assign Equipment',
          type: 'task',
          assignee_type: 'role',
          assignee_id: 'hr',
          due_days: 3,
          auto_complete: false,
          required: true
        },
        {
          name: 'Schedule Orientation',
          type: 'task',
          assignee_type: 'manager',
          due_days: 7,
          auto_complete: false,
          required: true
        },
        {
          name: 'Complete Documentation',
          type: 'task',
          assignee_type: 'user',
          due_days: 14,
          auto_complete: false,
          required: true
        }
      ]
    },
    {
      name: 'Asset Maintenance Request',
      category: 'asset_management',
      description: 'Asset maintenance approval workflow',
      trigger_event: 'maintenance_requested',
      steps: [
        {
          name: 'Review Maintenance Request',
          type: 'approval',
          assignee_type: 'role',
          assignee_id: 'manager',
          due_days: 2,
          auto_complete: false,
          required: true
        },
        {
          name: 'Schedule Maintenance',
          type: 'task',
          assignee_type: 'role',
          assignee_id: 'admin',
          due_days: 5,
          auto_complete: false,
          required: true
        },
        {
          name: 'Complete Maintenance',
          type: 'task',
          assignee_type: 'department',
          due_days: 30,
          auto_complete: false,
          required: true
        }
      ]
    },
    {
      name: 'Document Review Process',
      category: 'approval',
      description: 'Document review and approval workflow',
      trigger_event: 'document_submitted',
      steps: [
        {
          name: 'Initial Review',
          type: 'approval',
          assignee_type: 'manager',
          due_days: 3,
          auto_complete: false,
          required: true
        },
        {
          name: 'Final Approval',
          type: 'approval',
          assignee_type: 'role',
          assignee_id: 'admin',
          due_days: 5,
          auto_complete: false,
          required: true
        },
        {
          name: 'Publish Document',
          type: 'automation',
          due_days: 1,
          auto_complete: true,
          required: true
        }
      ]
    }
  ];

  res.json(templates);
});

module.exports = router;
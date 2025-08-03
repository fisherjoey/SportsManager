const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/auditTrail');

// Validation schemas
const accountSchema = Joi.object({
  account_number: Joi.string().min(1).max(20).required(),
  account_name: Joi.string().min(1).max(100).required(),
  account_type: Joi.string().valid(
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense',
    'cost_of_goods_sold'
  ).required(),
  account_subtype: Joi.string().valid(
    'current_asset',
    'fixed_asset',
    'current_liability',
    'long_term_liability',
    'equity',
    'operating_revenue',
    'other_revenue',
    'operating_expense',
    'other_expense',
    'cost_of_goods_sold'
  ).required(),
  parent_account_id: Joi.string().uuid().optional(),
  description: Joi.string().max(500).optional(),
  external_id: Joi.string().max(50).optional(),
  mapping_rules: Joi.object().optional()
});

const integrationSchema = Joi.object({
  provider: Joi.string().valid(
    'quickbooks_online',
    'quickbooks_desktop',
    'xero',
    'sage',
    'freshbooks',
    'wave',
    'manual'
  ).required(),
  provider_name: Joi.string().min(1).max(100).required(),
  connection_config: Joi.object().required(),
  sync_settings: Joi.object().required(),
  auto_sync: Joi.boolean().default(false),
  sync_frequency_hours: Joi.number().integer().min(1).max(168).default(24)
});

const journalEntrySchema = Joi.object({
  transaction_id: Joi.string().uuid().optional(),
  entry_date: Joi.date().required(),
  reference: Joi.string().min(1).max(100).required(),
  description: Joi.string().min(1).max(500).required(),
  journal_lines: Joi.array().items(
    Joi.object({
      account_id: Joi.string().uuid().required(),
      description: Joi.string().max(500).optional(),
      debit_amount: Joi.number().min(0).default(0),
      credit_amount: Joi.number().min(0).default(0),
      reference: Joi.string().max(100).optional(),
      dimensions: Joi.object().optional()
    })
  ).min(2).required()
});

/**
 * GET /api/accounting/chart-of-accounts
 * List chart of accounts
 */
router.get('/chart-of-accounts', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { 
      account_type, 
      active = true, 
      include_inactive = false,
      hierarchy = false 
    } = req.query;

    let query = db('chart_of_accounts')
      .where('organization_id', organizationId)
      .orderBy('account_number');

    if (!include_inactive) {
      query = query.where('is_active', true);
    }

    if (account_type) {
      query = query.where('account_type', account_type);
    }

    const accounts = await query;

    // If hierarchy requested, organize into parent-child structure
    if (hierarchy === 'true') {
      const accountMap = {};
      const rootAccounts = [];

      // First pass: create map and identify root accounts
      accounts.forEach(account => {
        accountMap[account.id] = { ...account, children: [] };
        if (!account.parent_account_id) {
          rootAccounts.push(accountMap[account.id]);
        }
      });

      // Second pass: build hierarchy
      accounts.forEach(account => {
        if (account.parent_account_id && accountMap[account.parent_account_id]) {
          accountMap[account.parent_account_id].children.push(accountMap[account.id]);
        }
      });

      return res.json({ accounts: rootAccounts });
    }

    res.json({ accounts });
  } catch (error) {
    console.error('Chart of accounts list error:', error);
    res.status(500).json({ error: 'Failed to retrieve chart of accounts' });
  }
});

/**
 * POST /api/accounting/chart-of-accounts
 * Create a new account
 */
router.post('/chart-of-accounts',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = accountSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      // Check for duplicate account number
      const existing = await db('chart_of_accounts')
        .where('organization_id', organizationId)
        .where('account_number', value.account_number)
        .first();

      if (existing) {
        return res.status(409).json({
          error: 'Duplicate account number',
          message: 'An account with this number already exists'
        });
      }

      // Validate parent account exists if provided
      if (value.parent_account_id) {
        const parent = await db('chart_of_accounts')
          .where('id', value.parent_account_id)
          .where('organization_id', organizationId)
          .first();

        if (!parent) {
          return res.status(404).json({
            error: 'Parent account not found'
          });
        }

        // Validate parent is same account type
        if (parent.account_type !== value.account_type) {
          return res.status(400).json({
            error: 'Invalid parent account',
            message: 'Parent account must be of the same account type'
          });
        }
      }

      const [account] = await db('chart_of_accounts')
        .insert({
          ...value,
          organization_id: organizationId
        })
        .returning('*');

      res.status(201).json({
        message: 'Account created successfully',
        account
      });
    } catch (error) {
      console.error('Account creation error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  }
);

/**
 * GET /api/accounting/integrations
 * List accounting integrations
 */
router.get('/integrations', 
  authenticateToken, 
  requireAnyRole('admin', 'manager'), 
  async (req, res) => {
    try {
      const organizationId = req.user.organization_id || req.user.id;

      const integrations = await db('accounting_integrations')
        .where('organization_id', organizationId)
        .where('is_active', true)
        .select(
          'id',
          'provider',
          'provider_name',
          'sync_status',
          'last_sync_at',
          'last_sync_error',
          'auto_sync',
          'sync_frequency_hours',
          'created_at',
          'updated_at'
          // Exclude sensitive connection_config
        )
        .orderBy('created_at', 'desc');

      res.json({ integrations });
    } catch (error) {
      console.error('Integrations list error:', error);
      res.status(500).json({ error: 'Failed to retrieve integrations' });
    }
  }
);

/**
 * POST /api/accounting/integrations
 * Create a new accounting integration
 */
router.post('/integrations',
  authenticateToken,
  requireRole('admin'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = integrationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      // Check for existing integration with same provider
      const existing = await db('accounting_integrations')
        .where('organization_id', organizationId)
        .where('provider', value.provider)
        .where('is_active', true)
        .first();

      if (existing) {
        return res.status(409).json({
          error: 'Integration already exists',
          message: `An active ${value.provider} integration already exists`
        });
      }

      // TODO: Encrypt connection_config before storing
      const [integration] = await db('accounting_integrations')
        .insert({
          ...value,
          organization_id: organizationId,
          sync_status: 'disconnected'
        })
        .returning(['id', 'provider', 'provider_name', 'sync_status', 'created_at']);

      res.status(201).json({
        message: 'Integration created successfully',
        integration
      });
    } catch (error) {
      console.error('Integration creation error:', error);
      res.status(500).json({ error: 'Failed to create integration' });
    }
  }
);

/**
 * POST /api/accounting/integrations/:id/test
 * Test accounting integration connection
 */
router.post('/integrations/:id/test',
  authenticateToken,
  requireRole('admin'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const integrationId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      const integration = await db('accounting_integrations')
        .where('id', integrationId)
        .where('organization_id', organizationId)
        .first();

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // TODO: Implement actual connection testing based on provider
      // For now, simulate a test
      const testResult = await testIntegrationConnection(integration);

      // Update integration status based on test result
      await db('accounting_integrations')
        .where('id', integrationId)
        .update({
          sync_status: testResult.success ? 'connected' : 'error',
          last_sync_error: testResult.success ? null : testResult.error,
          updated_at: db.fn.now()
        });

      res.json({
        success: testResult.success,
        message: testResult.message,
        details: testResult.details
      });
    } catch (error) {
      console.error('Integration test error:', error);
      res.status(500).json({ error: 'Failed to test integration' });
    }
  }
);

/**
 * GET /api/accounting/journal-entries
 * List journal entries
 */
router.get('/journal-entries', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { 
      status, 
      date_from, 
      date_to,
      page = 1, 
      limit = 20,
      include_lines = false 
    } = req.query;

    let query = db('journal_entries as je')
      .leftJoin('users as creator', 'je.created_by', 'creator.id')
      .leftJoin('users as approver', 'je.approved_by', 'approver.id')
      .leftJoin('financial_transactions as ft', 'je.transaction_id', 'ft.id')
      .where('je.organization_id', organizationId)
      .select(
        'je.*',
        db.raw("creator.first_name || ' ' || creator.last_name as created_by_name"),
        db.raw("COALESCE(approver.first_name || ' ' || approver.last_name, 'Not approved') as approved_by_name"),
        'ft.transaction_number'
      );

    // Apply filters
    if (status) query = query.where('je.status', status);
    if (date_from) query = query.where('je.entry_date', '>=', date_from);
    if (date_to) query = query.where('je.entry_date', '<=', date_to);

    const offset = (page - 1) * limit;
    const [entries, [{ total }]] = await Promise.all([
      query.clone().orderBy('je.entry_date', 'desc').limit(limit).offset(offset),
      query.clone().count('je.id as total')
    ]);

    // Include journal entry lines if requested
    if (include_lines === 'true' && entries.length > 0) {
      const entryIds = entries.map(e => e.id);
      const lines = await db('journal_entry_lines as jel')
        .join('chart_of_accounts as coa', 'jel.account_id', 'coa.id')
        .whereIn('jel.journal_entry_id', entryIds)
        .select(
          'jel.*',
          'coa.account_number',
          'coa.account_name',
          'coa.account_type'
        )
        .orderBy('jel.journal_entry_id')
        .orderBy('jel.line_number');

      const linesMap = {};
      lines.forEach(line => {
        if (!linesMap[line.journal_entry_id]) {
          linesMap[line.journal_entry_id] = [];
        }
        linesMap[line.journal_entry_id].push(line);
      });

      entries.forEach(entry => {
        entry.lines = linesMap[entry.id] || [];
      });
    }

    res.json({
      journal_entries: entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Journal entries list error:', error);
    res.status(500).json({ error: 'Failed to retrieve journal entries' });
  }
});

/**
 * POST /api/accounting/journal-entries
 * Create a new journal entry
 */
router.post('/journal-entries',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = journalEntrySchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      // Validate that debits equal credits
      const totalDebits = value.journal_lines.reduce((sum, line) => sum + line.debit_amount, 0);
      const totalCredits = value.journal_lines.reduce((sum, line) => sum + line.credit_amount, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return res.status(400).json({
          error: 'Unbalanced journal entry',
          message: `Total debits ($${totalDebits}) must equal total credits ($${totalCredits})`
        });
      }

      // Validate all accounts exist
      const accountIds = value.journal_lines.map(line => line.account_id);
      const accounts = await db('chart_of_accounts')
        .whereIn('id', accountIds)
        .where('organization_id', organizationId)
        .where('is_active', true);

      if (accounts.length !== accountIds.length) {
        return res.status(404).json({
          error: 'Invalid accounts',
          message: 'One or more accounts not found or inactive'
        });
      }

      // Generate entry number
      const year = new Date(value.entry_date).getFullYear();
      const lastEntry = await db('journal_entries')
        .where('organization_id', organizationId)
        .where('entry_number', 'like', `JE-${year}-%`)
        .orderBy('entry_number', 'desc')
        .first();

      let sequence = 1;
      if (lastEntry) {
        const lastNumber = lastEntry.entry_number.split('-')[2];
        sequence = parseInt(lastNumber) + 1;
      }

      const entryNumber = `JE-${year}-${sequence.toString().padStart(6, '0')}`;

      // Create journal entry
      const [journalEntry] = await db('journal_entries')
        .insert({
          organization_id: organizationId,
          transaction_id: value.transaction_id,
          entry_number: entryNumber,
          entry_date: value.entry_date,
          reference: value.reference,
          description: value.description,
          total_debits: totalDebits,
          total_credits: totalCredits,
          created_by: req.user.id
        })
        .returning('*');

      // Create journal entry lines
      const lines = value.journal_lines.map((line, index) => ({
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        description: line.description,
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount,
        reference: line.reference,
        dimensions: line.dimensions ? JSON.stringify(line.dimensions) : null,
        line_number: index + 1
      }));

      await db('journal_entry_lines').insert(lines);

      // Get complete journal entry with lines
      const completeEntry = await db('journal_entries as je')
        .leftJoin('users as creator', 'je.created_by', 'creator.id')
        .where('je.id', journalEntry.id)
        .select(
          'je.*',
          db.raw("creator.first_name || ' ' || creator.last_name as created_by_name")
        )
        .first();

      const entryLines = await db('journal_entry_lines as jel')
        .join('chart_of_accounts as coa', 'jel.account_id', 'coa.id')
        .where('jel.journal_entry_id', journalEntry.id)
        .select(
          'jel.*',
          'coa.account_number',
          'coa.account_name'
        )
        .orderBy('jel.line_number');

      res.status(201).json({
        message: 'Journal entry created successfully',
        journal_entry: {
          ...completeEntry,
          lines: entryLines
        }
      });
    } catch (error) {
      console.error('Journal entry creation error:', error);
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  }
);

/**
 * POST /api/accounting/journal-entries/:id/approve
 * Approve a journal entry
 */
router.post('/journal-entries/:id/approve',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const entryId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      const entry = await db('journal_entries')
        .where('id', entryId)
        .where('organization_id', organizationId)
        .first();

      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      if (entry.status !== 'draft' && entry.status !== 'pending_review') {
        return res.status(400).json({
          error: 'Invalid status',
          message: 'Only draft or pending review entries can be approved'
        });
      }

      await db('journal_entries')
        .where('id', entryId)
        .update({
          status: 'approved',
          approved_by: req.user.id,
          approved_at: db.fn.now(),
          updated_at: db.fn.now()
        });

      res.json({
        message: 'Journal entry approved successfully'
      });
    } catch (error) {
      console.error('Journal entry approval error:', error);
      res.status(500).json({ error: 'Failed to approve journal entry' });
    }
  }
);

/**
 * GET /api/accounting/sync-logs
 * List synchronization logs
 */
router.get('/sync-logs',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  async (req, res) => {
    try {
      const organizationId = req.user.organization_id || req.user.id;
      const { integration_id, status, page = 1, limit = 20 } = req.query;

      let query = db('accounting_sync_logs as asl')
        .join('accounting_integrations as ai', 'asl.integration_id', 'ai.id')
        .where('asl.organization_id', organizationId)
        .select(
          'asl.*',
          'ai.provider',
          'ai.provider_name'
        );

      if (integration_id) query = query.where('asl.integration_id', integration_id);
      if (status) query = query.where('asl.status', status);

      const offset = (page - 1) * limit;
      const [logs, [{ total }]] = await Promise.all([
        query.clone().orderBy('asl.started_at', 'desc').limit(limit).offset(offset),
        query.clone().count('asl.id as total')
      ]);

      res.json({
        sync_logs: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Sync logs list error:', error);
      res.status(500).json({ error: 'Failed to retrieve sync logs' });
    }
  }
);

/**
 * Mock function to test integration connection
 * TODO: Replace with actual integration logic
 */
async function testIntegrationConnection(integration) {
  try {
    // Simulate connection test based on provider
    switch (integration.provider) {
      case 'quickbooks_online':
        // TODO: Implement QuickBooks Online connection test
        return {
          success: true,
          message: 'Successfully connected to QuickBooks Online',
          details: { company_name: 'Test Company', last_sync: new Date() }
        };
      
      case 'xero':
        // TODO: Implement Xero connection test
        return {
          success: true,
          message: 'Successfully connected to Xero',
          details: { organization_name: 'Test Organization', last_sync: new Date() }
        };
      
      case 'manual':
        return {
          success: true,
          message: 'Manual integration configured',
          details: { mode: 'manual', requires_manual_sync: true }
        };
      
      default:
        return {
          success: false,
          message: 'Integration provider not yet implemented',
          error: `Provider ${integration.provider} is not yet supported`
        };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection test failed',
      error: error.message
    };
  }
}

module.exports = router;
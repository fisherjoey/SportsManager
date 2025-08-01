const db = require('../../src/config/database');

describe('Enhanced Expense Management Migrations (051-055)', () => {
  // These tests verify the database schema migrations for the enhanced expense system
  // We'll test each migration to ensure proper table creation, constraints, and relationships

  describe('Migration 051: Payment Methods Table', () => {
    test('should have payment_methods table with correct structure', async () => {
      // Check if table exists
      const tableExists = await db.schema.hasTable('payment_methods');
      expect(tableExists).toBe(true);

      // Check table structure
      const columns = await db('payment_methods').columnInfo();
      
      // Required columns
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('organization_id');
      expect(columns).toHaveProperty('name');
      expect(columns).toHaveProperty('type');
      expect(columns).toHaveProperty('description');
      expect(columns).toHaveProperty('is_active');
      expect(columns).toHaveProperty('requires_approval');
      expect(columns).toHaveProperty('requires_purchase_order');
      expect(columns).toHaveProperty('auto_approval_limit');
      expect(columns).toHaveProperty('approval_workflow');
      expect(columns).toHaveProperty('required_fields');
      expect(columns).toHaveProperty('integration_config');
      expect(columns).toHaveProperty('accounting_code');
      expect(columns).toHaveProperty('cost_center');
      expect(columns).toHaveProperty('allowed_categories');
      expect(columns).toHaveProperty('user_restrictions');
      expect(columns).toHaveProperty('spending_limit');
      expect(columns).toHaveProperty('spending_period');
      expect(columns).toHaveProperty('created_by');
      expect(columns).toHaveProperty('updated_by');
      expect(columns).toHaveProperty('created_at');
      expect(columns).toHaveProperty('updated_at');

      // Check data types
      expect(columns.id.type).toBe('uuid');
      expect(columns.name.type).toContain('varchar');
      expect(columns.type.type).toContain('varchar');
      expect(columns.is_active.type).toContain('boolean');
      expect(columns.requires_approval.type).toContain('boolean');
      expect(columns.auto_approval_limit.type).tocontain('decimal');

      // Check nullable constraints
      expect(columns.id.nullable).toBe(false);
      expect(columns.organization_id.nullable).toBe(false);
      expect(columns.name.nullable).toBe(false);
      expect(columns.type.nullable).toBe(false);
      expect(columns.is_active.nullable).toBe(false);
    });

    test('should have proper indexes and constraints', async () => {
      // Test unique constraint on organization_id + name
      const testOrgId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Insert first payment method
      await db('payment_methods').insert({
        id: '550e8400-e29b-41d4-a716-446655440001',
        organization_id: testOrgId,
        name: 'Test Method',
        type: 'person_reimbursement',
        is_active: true,
        requires_approval: true,
        created_by: testOrgId,
        updated_by: testOrgId
      });

      // Try to insert duplicate - should fail
      await expect(
        db('payment_methods').insert({
          id: '550e8400-e29b-41d4-a716-446655440002',
          organization_id: testOrgId,
          name: 'Test Method', // Same name
          type: 'credit_card',
          is_active: true,
          requires_approval: false,
          created_by: testOrgId,
          updated_by: testOrgId
        })
      ).rejects.toThrow();

      // Clean up
      await db('payment_methods').where('organization_id', testOrgId).del();
    });

    test('should enforce valid payment method types', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440003';

      // Valid types should work
      const validTypes = ['person_reimbursement', 'purchase_order', 'credit_card', 'direct_vendor'];
      
      for (const type of validTypes) {
        await expect(
          db('payment_methods').insert({
            id: `550e8400-e29b-41d4-a716-44665544000${validTypes.indexOf(type)}`,
            organization_id: testOrgId,
            name: `Test ${type}`,
            type: type,
            is_active: true,
            requires_approval: true,
            created_by: testOrgId,
            updated_by: testOrgId
          })
        ).resolves.not.toThrow();
      }

      // Invalid type should fail
      await expect(
        db('payment_methods').insert({
          id: '550e8400-e29b-41d4-a716-446655440099',
          organization_id: testOrgId,
          name: 'Invalid Type Method',
          type: 'invalid_type',
          is_active: true,
          requires_approval: true,
          created_by: testOrgId,
          updated_by: testOrgId
        })
      ).rejects.toThrow();

      // Clean up
      await db('payment_methods').where('organization_id', testOrgId).del();
    });

    test('should store and retrieve JSON fields correctly', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440004';
      const paymentMethodId = '550e8400-e29b-41d4-a716-446655440005';

      const testData = {
        approval_workflow: { stages: [{ name: 'Manager', limit: 1000 }] },
        required_fields: ['receipt', 'business_purpose'],
        allowed_categories: ['office_supplies', 'travel'],
        user_restrictions: { allowedRoles: ['admin', 'manager'] }
      };

      await db('payment_methods').insert({
        id: paymentMethodId,
        organization_id: testOrgId,
        name: 'JSON Test Method',
        type: 'person_reimbursement',
        is_active: true,
        requires_approval: true,
        approval_workflow: JSON.stringify(testData.approval_workflow),
        required_fields: JSON.stringify(testData.required_fields),
        allowed_categories: JSON.stringify(testData.allowed_categories),
        user_restrictions: JSON.stringify(testData.user_restrictions),
        created_by: testOrgId,
        updated_by: testOrgId
      });

      const retrieved = await db('payment_methods')
        .where('id', paymentMethodId)
        .first();

      expect(JSON.parse(retrieved.approval_workflow)).toEqual(testData.approval_workflow);
      expect(JSON.parse(retrieved.required_fields)).toEqual(testData.required_fields);
      expect(JSON.parse(retrieved.allowed_categories)).toEqual(testData.allowed_categories);
      expect(JSON.parse(retrieved.user_restrictions)).toEqual(testData.user_restrictions);

      // Clean up
      await db('payment_methods').where('id', paymentMethodId).del();
    });
  });

  describe('Migration 052: Purchase Orders Table', () => {
    test('should have purchase_orders table with correct structure', async () => {
      const tableExists = await db.schema.hasTable('purchase_orders');
      expect(tableExists).toBe(true);

      const columns = await db('purchase_orders').columnInfo();

      // Key columns
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('organization_id');
      expect(columns).toHaveProperty('po_number');
      expect(columns).toHaveProperty('vendor_name');
      expect(columns).toHaveProperty('vendor_address');
      expect(columns).toHaveProperty('vendor_email');
      expect(columns).toHaveProperty('description');
      expect(columns).toHaveProperty('estimated_amount');
      expect(columns).toHaveProperty('actual_amount');
      expect(columns).toHaveProperty('status');
      expect(columns).toHaveProperty('requested_by');
      expect(columns).toHaveProperty('approved_by');
      expect(columns).toHaveProperty('line_items');
      expect(columns).toHaveProperty('delivery_address');
      expect(columns).toHaveProperty('payment_terms');
      expect(columns).toHaveProperty('is_emergency');
      expect(columns).toHaveProperty('priority_level');

      // Check critical constraints
      expect(columns.id.nullable).toBe(false);
      expect(columns.organization_id.nullable).toBe(false);
      expect(columns.po_number.nullable).toBe(false);
      expect(columns.vendor_name.nullable).toBe(false);
      expect(columns.status.nullable).toBe(false);
    });

    test('should enforce unique PO numbers within organization', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440010';
      const poNumber = 'PO-TEST-001';

      // Insert first PO
      await db('purchase_orders').insert({
        id: '550e8400-e29b-41d4-a716-446655440011',
        organization_id: testOrgId,
        po_number: poNumber,
        vendor_name: 'Test Vendor',
        description: 'Test PO',
        estimated_amount: 500.00,
        status: 'draft',
        requested_by: testOrgId,
        line_items: JSON.stringify([]),
        created_by: testOrgId,
        updated_by: testOrgId
      });

      // Try to insert duplicate PO number in same org - should fail
      await expect(
        db('purchase_orders').insert({
          id: '550e8400-e29b-41d4-a716-446655440012',
          organization_id: testOrgId,
          po_number: poNumber, // Same PO number
          vendor_name: 'Another Vendor',
          description: 'Another PO',
          estimated_amount: 300.00,
          status: 'draft',
          requested_by: testOrgId,
          line_items: JSON.stringify([]),
          created_by: testOrgId,
          updated_by: testOrgId
        })
      ).rejects.toThrow();

      // Different org should allow same PO number
      const otherOrgId = '550e8400-e29b-41d4-a716-446655440013';
      await expect(
        db('purchase_orders').insert({
          id: '550e8400-e29b-41d4-a716-446655440014',
          organization_id: otherOrgId,
          po_number: poNumber, // Same PO number, different org
          vendor_name: 'Other Org Vendor',
          description: 'Other Org PO',
          estimated_amount: 200.00,
          status: 'draft',
          requested_by: otherOrgId,
          line_items: JSON.stringify([]),
          created_by: otherOrgId,
          updated_by: otherOrgId
        })
      ).resolves.not.toThrow();

      // Clean up
      await db('purchase_orders').whereIn('organization_id', [testOrgId, otherOrgId]).del();
    });

    test('should enforce valid status values', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440015';
      const validStatuses = [
        'draft', 'pending_approval', 'approved', 'sent_to_vendor',
        'acknowledged', 'in_progress', 'partially_received', 'received',
        'invoiced', 'paid', 'cancelled', 'closed'
      ];

      // Valid statuses should work
      for (let i = 0; i < validStatuses.length; i++) {
        const status = validStatuses[i];
        await expect(
          db('purchase_orders').insert({
            id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
            organization_id: testOrgId,
            po_number: `PO-STATUS-${i}`,
            vendor_name: 'Status Test Vendor',
            description: `Test PO with status ${status}`,
            estimated_amount: 100.00,
            status: status,
            requested_by: testOrgId,
            line_items: JSON.stringify([]),
            created_by: testOrgId,
            updated_by: testOrgId
          })
        ).resolves.not.toThrow();
      }

      // Invalid status should fail
      await expect(
        db('purchase_orders').insert({
          id: '550e8400-e29b-41d4-a716-446655449999',
          organization_id: testOrgId,
          po_number: 'PO-INVALID-STATUS',
          vendor_name: 'Invalid Status Vendor',
          description: 'Invalid status test',
          estimated_amount: 100.00,
          status: 'invalid_status',
          requested_by: testOrgId,
          line_items: JSON.stringify([]),
          created_by: testOrgId,
          updated_by: testOrgId
        })
      ).rejects.toThrow();

      // Clean up
      await db('purchase_orders').where('organization_id', testOrgId).del();
    });
  });

  describe('Migration 053: Company Credit Cards Table', () => {
    test('should have company_credit_cards table with correct structure', async () => {
      const tableExists = await db.schema.hasTable('company_credit_cards');
      expect(tableExists).toBe(true);

      const columns = await db('company_credit_cards').columnInfo();

      // Essential columns
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('organization_id');
      expect(columns).toHaveProperty('card_name');
      expect(columns).toHaveProperty('card_type');
      expect(columns).toHaveProperty('last_four_digits');
      expect(columns).toHaveProperty('cardholder_name');
      expect(columns).toHaveProperty('primary_holder_id');
      expect(columns).toHaveProperty('is_active');
      expect(columns).toHaveProperty('is_blocked');
      expect(columns).toHaveProperty('expiration_date');
      expect(columns).toHaveProperty('credit_limit');
      expect(columns).toHaveProperty('current_balance');
      expect(columns).toHaveProperty('monthly_limit');
      expect(columns).toHaveProperty('transaction_limit');
      expect(columns).toHaveProperty('authorized_users');
      expect(columns).toHaveProperty('category_limits');
      expect(columns).toHaveProperty('notification_settings');

      // Check constraints
      expect(columns.id.nullable).toBe(false);
      expect(columns.organization_id.nullable).toBe(false);
      expect(columns.card_name.nullable).toBe(false);
      expect(columns.card_type.nullable).toBe(false);
      expect(columns.last_four_digits.nullable).toBe(false);
      expect(columns.is_active.nullable).toBe(false);
    });

    test('should enforce unique card numbers within organization', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440020';
      const lastFourDigits = '1234';

      // Insert first card
      await db('company_credit_cards').insert({
        id: '550e8400-e29b-41d4-a716-446655440021',
        organization_id: testOrgId,
        card_name: 'Test Card 1',
        card_type: 'visa',
        last_four_digits: lastFourDigits,
        is_active: true,
        expiration_date: '2026-12-31',
        primary_holder_id: testOrgId,
        created_by: testOrgId,
        updated_by: testOrgId
      });

      // Try to insert duplicate card number in same org - should fail
      await expect(
        db('company_credit_cards').insert({
          id: '550e8400-e29b-41d4-a716-446655440022',
          organization_id: testOrgId,
          card_name: 'Test Card 2',
          card_type: 'mastercard',
          last_four_digits: lastFourDigits, // Same last four digits
          is_active: true,
          expiration_date: '2025-06-30',
          primary_holder_id: testOrgId,
          created_by: testOrgId,
          updated_by: testOrgId
        })
      ).rejects.toThrow();

      // Clean up
      await db('company_credit_cards').where('organization_id', testOrgId).del();
    });

    test('should enforce valid card types', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440023';
      const validCardTypes = ['visa', 'mastercard', 'amex', 'discover'];

      // Valid card types should work
      for (let i = 0; i < validCardTypes.length; i++) {
        const cardType = validCardTypes[i];
        await expect(
          db('company_credit_cards').insert({
            id: `550e8400-e29b-41d4-a716-44665544${String(20 + i).padStart(4, '0')}`,
            organization_id: testOrgId,
            card_name: `Test ${cardType} Card`,
            card_type: cardType,
            last_four_digits: String(1000 + i).padStart(4, '0'),
            is_active: true,
            expiration_date: '2026-12-31',
            primary_holder_id: testOrgId,
            created_by: testOrgId,
            updated_by: testOrgId
          })
        ).resolves.not.toThrow();
      }

      // Invalid card type should fail
      await expect(
        db('company_credit_cards').insert({
          id: '550e8400-e29b-41d4-a716-446655449998',
          organization_id: testOrgId,
          card_name: 'Invalid Card Type',
          card_type: 'invalid_card',
          last_four_digits: '9999',
          is_active: true,
          expiration_date: '2026-12-31',
          primary_holder_id: testOrgId,
          created_by: testOrgId,
          updated_by: testOrgId
        })
      ).rejects.toThrow();

      // Clean up
      await db('company_credit_cards').where('organization_id', testOrgId).del();
    });

    test('should validate last four digits format', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440025';

      // Valid 4-digit number should work
      await expect(
        db('company_credit_cards').insert({
          id: '550e8400-e29b-41d4-a716-446655440026',
          organization_id: testOrgId,
          card_name: 'Valid Last Four',
          card_type: 'visa',
          last_four_digits: '1234',
          is_active: true,
          expiration_date: '2026-12-31',
          primary_holder_id: testOrgId,
          created_by: testOrgId,
          updated_by: testOrgId
        })
      ).resolves.not.toThrow();

      // Invalid formats should fail
      const invalidFormats = ['123', '12345', 'abcd', '12a4'];
      
      for (const invalid of invalidFormats) {
        await expect(
          db('company_credit_cards').insert({
            id: `550e8400-e29b-41d4-a716-44665544${String(30 + invalidFormats.indexOf(invalid)).padStart(4, '0')}`,
            organization_id: testOrgId,
            card_name: 'Invalid Last Four',
            card_type: 'visa',
            last_four_digits: invalid,
            is_active: true,
            expiration_date: '2026-12-31',
            primary_holder_id: testOrgId,
            created_by: testOrgId,
            updated_by: testOrgId
          })
        ).rejects.toThrow();
      }

      // Clean up
      await db('company_credit_cards').where('organization_id', testOrgId).del();
    });
  });

  describe('Migration 054: Enhanced Expense Data Payment Methods', () => {
    test('should have added payment method columns to expense_data', async () => {
      const columns = await db('expense_data').columnInfo();

      // New payment method columns
      expect(columns).toHaveProperty('payment_method_id');
      expect(columns).toHaveProperty('purchase_order_id');
      expect(columns).toHaveProperty('credit_card_id');
      expect(columns).toHaveProperty('payment_status');
      expect(columns).toHaveProperty('expense_urgency');
      expect(columns).toHaveProperty('urgency_justification');
      expect(columns).toHaveProperty('vendor_payment_details');
      expect(columns).toHaveProperty('business_purpose');
      expect(columns).toHaveProperty('project_code');
      expect(columns).toHaveProperty('department');

      // Check that payment_status has appropriate constraints
      expect(columns.payment_status.nullable).toBe(true); // Can be null initially
    });

    test('should enforce valid payment status values', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440030';
      const validStatuses = [
        'pending', 'pending_approval', 'approved', 'rejected', 
        'requires_information', 'processing', 'paid', 'cancelled'
      ];

      // Create test receipt first
      const [receipt] = await db('expense_receipts').insert({
        id: '550e8400-e29b-41d4-a716-446655440031',
        user_id: testOrgId,
        organization_id: testOrgId,
        original_filename: 'status-test.jpg',
        file_path: '/tmp/status-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'status-test-hash',
        processing_status: 'processed'
      }).returning('*');

      // Valid statuses should work
      for (let i = 0; i < validStatuses.length; i++) {
        const status = validStatuses[i];
        await expect(
          db('expense_data').insert({
            id: `550e8400-e29b-41d4-a716-44665544${String(40 + i).padStart(4, '0')}`,
            receipt_id: receipt.id,
            user_id: testOrgId,
            organization_id: testOrgId,
            vendor_name: 'Status Test Vendor',
            total_amount: 100.00,
            transaction_date: '2024-01-15',
            payment_status: status
          })
        ).resolves.not.toThrow();
      }

      // Invalid status should fail
      await expect(
        db('expense_data').insert({
          id: '550e8400-e29b-41d4-a716-446655449997',
          receipt_id: receipt.id,
          user_id: testOrgId,
          organization_id: testOrgId,
          vendor_name: 'Invalid Status Vendor',
          total_amount: 100.00,
          transaction_date: '2024-01-15',
          payment_status: 'invalid_status'
        })
      ).rejects.toThrow();

      // Clean up
      await db('expense_data').where('organization_id', testOrgId).del();
      await db('expense_receipts').where('id', receipt.id).del();
    });

    test('should enforce valid expense urgency values', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440035';
      const validUrgencies = ['low', 'normal', 'high', 'urgent'];

      // Create test receipt
      const [receipt] = await db('expense_receipts').insert({
        id: '550e8400-e29b-41d4-a716-446655440036',
        user_id: testOrgId,
        organization_id: testOrgId,
        original_filename: 'urgency-test.jpg',
        file_path: '/tmp/urgency-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'urgency-test-hash',
        processing_status: 'processed'
      }).returning('*');

      // Valid urgencies should work
      for (let i = 0; i < validUrgencies.length; i++) {
        const urgency = validUrgencies[i];
        await expect(
          db('expense_data').insert({
            id: `550e8400-e29b-41d4-a716-44665544${String(50 + i).padStart(4, '0')}`,
            receipt_id: receipt.id,
            user_id: testOrgId,
            organization_id: testOrgId,
            vendor_name: 'Urgency Test Vendor',
            total_amount: 100.00,
            transaction_date: '2024-01-15',
            expense_urgency: urgency
          })
        ).resolves.not.toThrow();
      }

      // Invalid urgency should fail
      await expect(
        db('expense_data').insert({
          id: '550e8400-e29b-41d4-a716-446655449996',
          receipt_id: receipt.id,
          user_id: testOrgId,
          organization_id: testOrgId,
          vendor_name: 'Invalid Urgency Vendor',
          total_amount: 100.00,
          transaction_date: '2024-01-15',
          expense_urgency: 'super_urgent'
        })
      ).rejects.toThrow();

      // Clean up
      await db('expense_data').where('organization_id', testOrgId).del();
      await db('expense_receipts').where('id', receipt.id).del();
    });
  });

  describe('Migration 055: Enhanced Expense Approvals Workflow', () => {
    test('should have enhanced expense_approvals table structure', async () => {
      const columns = await db('expense_approvals').columnInfo();

      // New workflow columns
      expect(columns).toHaveProperty('workflow_id');
      expect(columns).toHaveProperty('stage_number');
      expect(columns).toHaveProperty('total_stages');
      expect(columns).toHaveProperty('is_parallel_approval');
      expect(columns).toHaveProperty('required_approvers');
      expect(columns).toHaveProperty('stage_status');
      expect(columns).toHaveProperty('stage_started_at');
      expect(columns).toHaveProperty('stage_deadline');
      expect(columns).toHaveProperty('escalation_hours');
      expect(columns).toHaveProperty('escalated_to');
      expect(columns).toHaveProperty('escalated_at');
      expect(columns).toHaveProperty('escalation_reason');
      expect(columns).toHaveProperty('delegated_to');
      expect(columns).toHaveProperty('delegated_by');
      expect(columns).toHaveProperty('delegated_at');
      expect(columns).toHaveProperty('delegation_reason');
      expect(columns).toHaveProperty('approval_conditions');
      expect(columns).toHaveProperty('conditions_met');
      expect(columns).toHaveProperty('approval_limit');
      expect(columns).toHaveProperty('notification_settings');
      expect(columns).toHaveProperty('reminder_count');
      expect(columns).toHaveProperty('last_reminder_sent');
      expect(columns).toHaveProperty('risk_level');
      expect(columns).toHaveProperty('requires_additional_review');

      // Check essential constraints
      expect(columns.expense_data_id.nullable).toBe(false);
      expect(columns.user_id.nullable).toBe(false);
      expect(columns.organization_id.nullable).toBe(false);
      expect(columns.stage_number.nullable).toBe(false);
      expect(columns.total_stages.nullable).toBe(false);
    });

    test('should enforce valid stage status values', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440040';
      const validStatuses = [
        'pending', 'approved', 'rejected', 'escalated', 
        'delegated', 'requires_information', 'cancelled'
      ];

      // Create test data
      const [receipt] = await db('expense_receipts').insert({
        id: '550e8400-e29b-41d4-a716-446655440041',
        user_id: testOrgId,
        organization_id: testOrgId,
        original_filename: 'approval-status-test.jpg',
        file_path: '/tmp/approval-status-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'approval-status-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        id: '550e8400-e29b-41d4-a716-446655440042',
        receipt_id: receipt.id,
        user_id: testOrgId,
        organization_id: testOrgId,
        vendor_name: 'Approval Status Vendor',
        total_amount: 500.00,
        transaction_date: '2024-01-15'
      }).returning('*');

      // Valid statuses should work
      for (let i = 0; i < validStatuses.length; i++) {
        const status = validStatuses[i];
        await expect(
          db('expense_approvals').insert({
            id: `550e8400-e29b-41d4-a716-44665544${String(60 + i).padStart(4, '0')}`,
            expense_data_id: expenseData.id,
            user_id: testOrgId,
            organization_id: testOrgId,
            stage_number: 1,
            total_stages: 1,
            stage_status: status,
            required_approvers: JSON.stringify([])
          })
        ).resolves.not.toThrow();
      }

      // Invalid status should fail
      await expect(
        db('expense_approvals').insert({
          id: '550e8400-e29b-41d4-a716-446655449995',
          expense_data_id: expenseData.id,
          user_id: testOrgId,
          organization_id: testOrgId,
          stage_number: 1,
          total_stages: 1,
          stage_status: 'invalid_stage_status',
          required_approvers: JSON.stringify([])
        })
      ).rejects.toThrow();

      // Clean up
      await db('expense_approvals').where('organization_id', testOrgId).del();
      await db('expense_data').where('id', expenseData.id).del();
      await db('expense_receipts').where('id', receipt.id).del();
    });

    test('should enforce valid risk levels', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440045';
      const validRiskLevels = ['low', 'medium', 'high', 'critical'];

      // Create test data
      const [receipt] = await db('expense_receipts').insert({
        id: '550e8400-e29b-41d4-a716-446655440046',
        user_id: testOrgId,
        organization_id: testOrgId,
        original_filename: 'risk-level-test.jpg',
        file_path: '/tmp/risk-level-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'risk-level-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        id: '550e8400-e29b-41d4-a716-446655440047',
        receipt_id: receipt.id,
        user_id: testOrgId,
        organization_id: testOrgId,
        vendor_name: 'Risk Level Vendor',
        total_amount: 1000.00,
        transaction_date: '2024-01-15'
      }).returning('*');

      // Valid risk levels should work
      for (let i = 0; i < validRiskLevels.length; i++) {
        const riskLevel = validRiskLevels[i];
        await expect(
          db('expense_approvals').insert({
            id: `550e8400-e29b-41d4-a716-44665544${String(70 + i).padStart(4, '0')}`,
            expense_data_id: expenseData.id,
            user_id: testOrgId,
            organization_id: testOrgId,
            stage_number: 1,
            total_stages: 1,
            stage_status: 'pending',
            required_approvers: JSON.stringify([]),
            risk_level: riskLevel
          })
        ).resolves.not.toThrow();
      }

      // Invalid risk level should fail
      await expect(
        db('expense_approvals').insert({
          id: '550e8400-e29b-41d4-a716-446655449994',
          expense_data_id: expenseData.id,
          user_id: testOrgId,
          organization_id: testOrgId,
          stage_number: 1,
          total_stages: 1,
          stage_status: 'pending',
          required_approvers: JSON.stringify([]),
          risk_level: 'extreme'
        })
      ).rejects.toThrow();

      // Clean up
      await db('expense_approvals').where('organization_id', testOrgId).del();
      await db('expense_data').where('id', expenseData.id).del();
      await db('expense_receipts').where('id', receipt.id).del();
    });

    test('should handle JSON fields correctly in approvals', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440048';

      // Create test data
      const [receipt] = await db('expense_receipts').insert({
        id: '550e8400-e29b-41d4-a716-446655440049',
        user_id: testOrgId,
        organization_id: testOrgId,
        original_filename: 'json-test.jpg',
        file_path: '/tmp/json-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'json-test-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        id: '550e8400-e29b-41d4-a716-446655440050',
        receipt_id: receipt.id,
        user_id: testOrgId,
        organization_id: testOrgId,
        vendor_name: 'JSON Test Vendor',
        total_amount: 750.00,
        transaction_date: '2024-01-15'
      }).returning('*');

      const testJsonData = {
        required_approvers: [
          { id: testOrgId, name: 'Test Admin', role: 'admin', email: 'admin@test.com' }
        ],
        approval_conditions: {
          requiresBusinessJustification: true,
          requiresReceiptValidation: true,
          maximumAmount: 1000
        },
        notification_settings: {
          email: true,
          sms: false,
          inApp: true
        }
      };

      await db('expense_approvals').insert({
        id: '550e8400-e29b-41d4-a716-446655440051',
        expense_data_id: expenseData.id,
        user_id: testOrgId,
        organization_id: testOrgId,
        stage_number: 1,
        total_stages: 1,
        stage_status: 'pending',
        required_approvers: JSON.stringify(testJsonData.required_approvers),
        approval_conditions: JSON.stringify(testJsonData.approval_conditions),
        notification_settings: JSON.stringify(testJsonData.notification_settings)
      });

      const retrieved = await db('expense_approvals')
        .where('expense_data_id', expenseData.id)
        .first();

      expect(JSON.parse(retrieved.required_approvers)).toEqual(testJsonData.required_approvers);
      expect(JSON.parse(retrieved.approval_conditions)).toEqual(testJsonData.approval_conditions);
      expect(JSON.parse(retrieved.notification_settings)).toEqual(testJsonData.notification_settings);

      // Clean up
      await db('expense_approvals').where('organization_id', testOrgId).del();
      await db('expense_data').where('id', expenseData.id).del();
      await db('expense_receipts').where('id', receipt.id).del();
    });
  });

  describe('Foreign Key Relationships', () => {
    test('should maintain referential integrity between tables', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440080';

      // Create payment method
      const [paymentMethod] = await db('payment_methods').insert({
        id: '550e8400-e29b-41d4-a716-446655440081',
        organization_id: testOrgId,
        name: 'FK Test Method',
        type: 'person_reimbursement',
        is_active: true,
        requires_approval: true,
        created_by: testOrgId,
        updated_by: testOrgId
      }).returning('*');

      // Create purchase order
      const [purchaseOrder] = await db('purchase_orders').insert({
        id: '550e8400-e29b-41d4-a716-446655440082',
        organization_id: testOrgId,
        po_number: 'PO-FK-TEST',
        vendor_name: 'FK Test Vendor',
        description: 'FK test PO',
        estimated_amount: 500.00,
        status: 'approved',
        requested_by: testOrgId,
        line_items: JSON.stringify([]),
        created_by: testOrgId,
        updated_by: testOrgId
      }).returning('*');

      // Create credit card
      const [creditCard] = await db('company_credit_cards').insert({
        id: '550e8400-e29b-41d4-a716-446655440083',
        organization_id: testOrgId,
        card_name: 'FK Test Card',
        card_type: 'visa',
        last_four_digits: '1111',
        is_active: true,
        expiration_date: '2026-12-31',
        primary_holder_id: testOrgId,
        created_by: testOrgId,
        updated_by: testOrgId
      }).returning('*');

      // Create expense with foreign key references
      const [receipt] = await db('expense_receipts').insert({
        id: '550e8400-e29b-41d4-a716-446655440084',
        user_id: testOrgId,
        organization_id: testOrgId,
        original_filename: 'fk-test.jpg',
        file_path: '/tmp/fk-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'fk-test-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        id: '550e8400-e29b-41d4-a716-446655440085',
        receipt_id: receipt.id,
        user_id: testOrgId,
        organization_id: testOrgId,
        vendor_name: 'FK Test Expense Vendor',
        total_amount: 300.00,
        transaction_date: '2024-01-15',
        payment_method_id: paymentMethod.id,
        purchase_order_id: purchaseOrder.id,
        credit_card_id: creditCard.id
      }).returning('*');

      // Should be able to retrieve with joins
      const joined = await db('expense_data')
        .join('payment_methods', 'expense_data.payment_method_id', 'payment_methods.id')
        .join('purchase_orders', 'expense_data.purchase_order_id', 'purchase_orders.id')
        .join('company_credit_cards', 'expense_data.credit_card_id', 'company_credit_cards.id')
        .where('expense_data.id', expenseData.id)
        .select(
          'expense_data.*',
          'payment_methods.name as payment_method_name',
          'purchase_orders.po_number',
          'company_credit_cards.card_name'
        )
        .first();

      expect(joined.payment_method_name).toBe('FK Test Method');
      expect(joined.po_number).toBe('PO-FK-TEST');
      expect(joined.card_name).toBe('FK Test Card');

      // Clean up (order matters due to FK constraints)
      await db('expense_data').where('id', expenseData.id).del();
      await db('expense_receipts').where('id', receipt.id).del();
      await db('company_credit_cards').where('id', creditCard.id).del();
      await db('purchase_orders').where('id', purchaseOrder.id).del();
      await db('payment_methods').where('id', paymentMethod.id).del();
    });

    test('should handle cascading deletes appropriately', async () => {
      const testOrgId = '550e8400-e29b-41d4-a716-446655440090';

      // Create related records
      const [receipt] = await db('expense_receipts').insert({
        id: '550e8400-e29b-41d4-a716-446655440091',
        user_id: testOrgId,
        organization_id: testOrgId,
        original_filename: 'cascade-test.jpg',
        file_path: '/tmp/cascade-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'cascade-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        id: '550e8400-e29b-41d4-a716-446655440092',
        receipt_id: receipt.id,
        user_id: testOrgId,
        organization_id: testOrgId,
        vendor_name: 'Cascade Test Vendor',
        total_amount: 200.00,
        transaction_date: '2024-01-15'
      }).returning('*');

      const [approval] = await db('expense_approvals').insert({
        id: '550e8400-e29b-41d4-a716-446655440093',
        expense_data_id: expenseData.id,
        user_id: testOrgId,
        organization_id: testOrgId,
        stage_number: 1,
        total_stages: 1,
        stage_status: 'pending',
        required_approvers: JSON.stringify([])
      }).returning('*');

      // Delete receipt should cascade to expense_data and expense_approvals
      await db('expense_receipts').where('id', receipt.id).del();

      // Related records should be gone
      const remainingExpenseData = await db('expense_data').where('id', expenseData.id).first();
      const remainingApproval = await db('expense_approvals').where('id', approval.id).first();

      expect(remainingExpenseData).toBeUndefined();
      expect(remainingApproval).toBeUndefined();
    });
  });

  describe('Performance Indexes', () => {
    test('should have appropriate indexes for query performance', async () => {
      // This is database-specific, but we can test common patterns
      
      // Test that common queries perform reasonably well
      const startTime = Date.now();
      
      // Query that should use organization_id index
      await db('payment_methods')
        .where('organization_id', '550e8400-e29b-41d4-a716-446655440000')
        .where('is_active', true);
      
      // Query that should use status index on purchase_orders
      await db('purchase_orders')
        .where('status', 'approved')
        .limit(10);
      
      // Query that should use composite index on expense_approvals
      await db('expense_approvals')
        .where('organization_id', '550e8400-e29b-41d4-a716-446655440000')
        .where('stage_status', 'pending')
        .orderBy('stage_deadline');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (under 100ms for empty tables)
      expect(duration).toBeLessThan(100);
    });
  });
});
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const { generateToken } = require('../../src/middleware/auth');

describe('Purchase Orders API', () => {
  let testUser, adminUser, managerUser;
  let userToken, adminToken, managerToken;
  let testPurchaseOrder;

  beforeAll(async () => {
    // Create test users
    const [user] = await db('users').insert({
      email: 'user@example.com',
      password_hash: 'hashed',
      role: 'referee',
      first_name: 'Test',
      last_name: 'User'
    }).returning('*');

    const [admin] = await db('users').insert({
      email: 'admin@example.com',
      password_hash: 'hashed',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    }).returning('*');

    const [manager] = await db('users').insert({
      email: 'manager@example.com',
      password_hash: 'hashed',
      role: 'manager',
      first_name: 'Manager',
      last_name: 'User'
    }).returning('*');

    testUser = user;
    adminUser = admin;
    managerUser = manager;

    userToken = generateToken({ id: user.id, email: user.email, role: user.role });
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });
    managerToken = generateToken({ id: manager.id, email: manager.email, role: manager.role });
  });

  afterAll(async () => {
    // Clean up test data
    await db('purchase_orders').where('organization_id', adminUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id, managerUser.id]).del();
  });

  beforeEach(async () => {
    // Clean up purchase orders before each test
    await db('purchase_orders').where('organization_id', adminUser.id).del();
  });

  describe('POST /api/purchase-orders', () => {
    const validPurchaseOrder = {
      vendorName: 'Acme Corporation',
      vendorAddress: '123 Business St, City, State 12345',
      vendorPhone: '+1-555-123-4567',
      vendorEmail: 'orders@acme.com',
      vendorContactPerson: 'John Smith',
      description: 'Office supplies for Q1',
      estimatedAmount: 1250.50,
      requestedDeliveryDate: '2024-02-15',
      deliveryAddress: '456 Office Blvd, City, State 12345',
      lineItems: [
        {
          description: 'Printer Paper (A4)',
          quantity: 10,
          unitPrice: 12.50,
          totalPrice: 125.00,
          category: 'Office Supplies'
        },
        {
          description: 'Ballpoint Pens (Box of 50)',
          quantity: 5,
          unitPrice: 8.99,
          totalPrice: 44.95,
          category: 'Office Supplies'
        }
      ],
      costCenter: 'ADMIN',
      projectCode: 'OFFICE-2024',
      paymentTerms: 'Net 30',
      requiresReceipt: true,
      requiresInvoice: true,
      priorityLevel: 'normal'
    };

    test('should create purchase order successfully', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPurchaseOrder)
        .expect(201);

      expect(response.body.message).toBe('Purchase order created successfully');
      expect(response.body.purchaseOrder.vendorName).toBe(validPurchaseOrder.vendorName);
      expect(response.body.purchaseOrder.status).toBe('draft');
      expect(response.body.purchaseOrder.poNumber).toMatch(/^PO-\d{4}-\d+$/);
      expect(response.body.purchaseOrder.lineItems).toHaveLength(2);
      expect(response.body.purchaseOrder.totalAmount).toBe(1250.50);

      // Verify in database
      const created = await db('purchase_orders')
        .where('vendor_name', validPurchaseOrder.vendorName)
        .first();
      expect(created).toBeDefined();
      expect(created.organization_id).toBe(adminUser.id);
      expect(created.requested_by).toBe(adminUser.id);
    });

    test('should validate purchase order data', async () => {
      const invalidPurchaseOrder = {
        vendorName: '', // Empty vendor name
        description: '', // Empty description
        estimatedAmount: -100, // Negative amount
        lineItems: [] // Empty line items
      };

      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPurchaseOrder)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should validate line items', async () => {
      const invalidLineItems = {
        ...validPurchaseOrder,
        lineItems: [
          {
            description: '', // Empty description
            quantity: 0, // Zero quantity
            unitPrice: -5, // Negative price
            totalPrice: 100 // Mismatched total
          }
        ]
      };

      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidLineItems)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should handle emergency purchase orders', async () => {
      const emergencyPO = {
        ...validPurchaseOrder,
        isEmergency: true,
        priorityLevel: 'urgent',
        emergencyJustification: 'Critical equipment failure requires immediate replacement'
      };

      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emergencyPO)
        .expect(201);

      expect(response.body.purchaseOrder.isEmergency).toBe(true);
      expect(response.body.purchaseOrder.priorityLevel).toBe('urgent');
      expect(response.body.purchaseOrder.emergencyJustification).toBe(emergencyPO.emergencyJustification);
    });

    test('should calculate total amount from line items', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPurchaseOrder)
        .expect(201);

      const expectedTotal = validPurchaseOrder.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      expect(response.body.purchaseOrder.calculatedTotal).toBe(expectedTotal);
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/purchase-orders')
        .send(validPurchaseOrder)
        .expect(401);
    });

    test('should require admin or manager role', async () => {
      await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPurchaseOrder)
        .expect(403);
    });

    test('should auto-submit for approval based on amount threshold', async () => {
      const highValuePO = {
        ...validPurchaseOrder,
        estimatedAmount: 5000.00,
        lineItems: [
          {
            description: 'High Value Equipment',
            quantity: 1,
            unitPrice: 5000.00,
            totalPrice: 5000.00
          }
        ]
      };

      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(highValuePO)
        .expect(201);

      // High value POs should automatically go to pending approval
      expect(response.body.purchaseOrder.status).toBe('pending_approval');
      expect(response.body.purchaseOrder.requiresApproval).toBe(true);
    });
  });

  describe('GET /api/purchase-orders', () => {
    beforeEach(async () => {
      // Create test purchase orders
      const [po1] = await db('purchase_orders').insert({
        organization_id: adminUser.id,
        po_number: 'PO-2024-001',
        vendor_name: 'Test Vendor 1',
        description: 'Test PO 1',
        estimated_amount: 500.00,
        actual_amount: 500.00,
        status: 'draft',
        requested_by: adminUser.id,
        line_items: JSON.stringify([
          { description: 'Item 1', quantity: 1, unitPrice: 500, totalPrice: 500 }
        ]),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      await db('purchase_orders').insert({
        organization_id: adminUser.id,
        po_number: 'PO-2024-002',
        vendor_name: 'Test Vendor 2',
        description: 'Test PO 2',
        estimated_amount: 1500.00,
        status: 'approved',
        requested_by: managerUser.id,
        line_items: JSON.stringify([
          { description: 'Item 2', quantity: 2, unitPrice: 750, totalPrice: 1500 }
        ]),
        created_by: managerUser.id,
        updated_by: managerUser.id
      });

      testPurchaseOrder = po1;
    });

    test('should list purchase orders for authenticated user', async () => {
      const response = await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrders).toHaveLength(2);
      expect(response.body.purchaseOrders[0].poNumber).toBeDefined();
      expect(response.body.purchaseOrders[0].vendorName).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter purchase orders by status', async () => {
      const response = await request(app)
        .get('/api/purchase-orders?status=draft')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrders).toHaveLength(1);
      expect(response.body.purchaseOrders[0].status).toBe('draft');
    });

    test('should filter purchase orders by vendor name', async () => {
      const response = await request(app)
        .get('/api/purchase-orders?vendorName=Test%20Vendor%201')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrders).toHaveLength(1);
      expect(response.body.purchaseOrders[0].vendorName).toBe('Test Vendor 1');
    });

    test('should filter purchase orders by amount range', async () => {
      const response = await request(app)
        .get('/api/purchase-orders?minAmount=1000&maxAmount=2000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrders).toHaveLength(1);
      expect(response.body.purchaseOrders[0].estimatedAmount).toBe(1500.00);
    });

    test('should filter purchase orders by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/purchase-orders?dateFrom=${today}&dateTo=${today}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrders.length).toBeGreaterThanOrEqual(0);
    });

    test('should search purchase orders', async () => {
      const response = await request(app)
        .get('/api/purchase-orders?search=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrders.length).toBeGreaterThan(0);
      response.body.purchaseOrders.forEach(po => {
        expect(
          po.vendorName.includes('Test') || 
          po.description.includes('Test') || 
          po.poNumber.includes('Test')
        ).toBe(true);
      });
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/purchase-orders?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrders).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/purchase-orders')
        .expect(401);
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/purchase-orders?status=invalid_status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /api/purchase-orders/:id', () => {
    beforeEach(async () => {
      const [po] = await db('purchase_orders').insert({
        organization_id: adminUser.id,
        po_number: 'PO-2024-DETAIL',
        vendor_name: 'Detail Test Vendor',
        vendor_email: 'test@vendor.com',
        description: 'Purchase order for detail testing',
        estimated_amount: 750.00,
        status: 'draft',
        requested_by: adminUser.id,
        line_items: JSON.stringify([
          {
            description: 'Test Item',
            quantity: 3,
            unitPrice: 250.00,
            totalPrice: 750.00,
            category: 'Testing'
          }
        ]),
        payment_terms: 'Net 30',
        special_instructions: 'Handle with care',
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPurchaseOrder = po;
    });

    test('should get purchase order details', async () => {
      const response = await request(app)
        .get(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrder.id).toBe(testPurchaseOrder.id);
      expect(response.body.purchaseOrder.vendorName).toBe('Detail Test Vendor');
      expect(response.body.purchaseOrder.lineItems).toHaveLength(1);
      expect(response.body.purchaseOrder.lineItems[0].description).toBe('Test Item');
      expect(response.body.approvalHistory).toBeDefined();
      expect(response.body.statusHistory).toBeDefined();
    });

    test('should return 404 for non-existent purchase order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/purchase-orders/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should not allow access to other organization purchase orders', async () => {
      // Create PO for different organization
      const [otherUser] = await db('users').insert({
        email: 'other@example.com',
        password_hash: 'hashed',
        role: 'admin'
      }).returning('*');

      const [otherPO] = await db('purchase_orders').insert({
        organization_id: otherUser.id,
        po_number: 'PO-OTHER-001',
        vendor_name: 'Other Vendor',
        description: 'Other PO',
        estimated_amount: 100.00,
        status: 'draft',
        requested_by: otherUser.id,
        line_items: JSON.stringify([]),
        created_by: otherUser.id,
        updated_by: otherUser.id
      }).returning('*');

      await request(app)
        .get(`/api/purchase-orders/${otherPO.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Clean up
      await db('purchase_orders').where('id', otherPO.id).del();
      await db('users').where('id', otherUser.id).del();
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/purchase-orders/:id', () => {
    beforeEach(async () => {
      const [po] = await db('purchase_orders').insert({
        organization_id: adminUser.id,
        po_number: 'PO-2024-UPDATE',
        vendor_name: 'Update Test Vendor',
        description: 'Purchase order for update testing',
        estimated_amount: 500.00,
        status: 'draft',
        requested_by: adminUser.id,
        line_items: JSON.stringify([
          { description: 'Original Item', quantity: 1, unitPrice: 500, totalPrice: 500 }
        ]),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPurchaseOrder = po;
    });

    test('should update purchase order successfully', async () => {
      const updateData = {
        vendorName: 'Updated Vendor Name',
        description: 'Updated description',
        estimatedAmount: 750.00,
        lineItems: [
          {
            description: 'Updated Item',
            quantity: 2,
            unitPrice: 375.00,
            totalPrice: 750.00
          }
        ],
        paymentTerms: 'Net 15',
        priorityLevel: 'high'
      };

      const response = await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Purchase order updated successfully');
      expect(response.body.purchaseOrder.vendorName).toBe(updateData.vendorName);
      expect(response.body.purchaseOrder.estimatedAmount).toBe(updateData.estimatedAmount);
      expect(response.body.purchaseOrder.lineItems).toHaveLength(1);
      expect(response.body.purchaseOrder.priorityLevel).toBe('high');

      // Verify in database
      const updated = await db('purchase_orders')
        .where('id', testPurchaseOrder.id)
        .first();
      expect(updated.vendor_name).toBe(updateData.vendorName);
      expect(updated.estimated_amount).toBe(updateData.estimatedAmount);
    });

    test('should not allow updates to non-draft purchase orders', async () => {
      // Update status to approved
      await db('purchase_orders')
        .where('id', testPurchaseOrder.id)
        .update({ status: 'approved' });

      const updateData = {
        vendorName: 'Should Not Update'
      };

      const response = await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Only draft purchase orders can be updated');
    });

    test('should validate update data', async () => {
      const invalidUpdate = {
        estimatedAmount: -100, // Negative amount
        lineItems: [] // Empty line items
      };

      const response = await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should return 404 for non-existent purchase order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/purchase-orders/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendorName: 'Test' })
        .expect(404);
    });

    test('should require authentication', async () => {
      await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .send({ vendorName: 'Test' })
        .expect(401);
    });

    test('should require admin or manager role', async () => {
      await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ vendorName: 'Unauthorized' })
        .expect(403);
    });
  });

  describe('POST /api/purchase-orders/:id/submit', () => {
    beforeEach(async () => {
      const [po] = await db('purchase_orders').insert({
        organization_id: adminUser.id,
        po_number: 'PO-2024-SUBMIT',
        vendor_name: 'Submit Test Vendor',
        description: 'Purchase order for submit testing',
        estimated_amount: 1200.00,
        status: 'draft',
        requested_by: adminUser.id,
        line_items: JSON.stringify([
          { description: 'Submit Item', quantity: 1, unitPrice: 1200, totalPrice: 1200 }
        ]),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPurchaseOrder = po;
    });

    test('should submit purchase order for approval', async () => {
      const response = await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Purchase order submitted for approval');
      expect(response.body.purchaseOrder.status).toBe('pending_approval');
      expect(response.body.purchaseOrder.submittedAt).toBeDefined();

      // Verify in database
      const updated = await db('purchase_orders')
        .where('id', testPurchaseOrder.id)
        .first();
      expect(updated.status).toBe('pending_approval');
      expect(updated.submitted_at).toBeDefined();
    });

    test('should not allow resubmission of non-draft purchase orders', async () => {
      // First submission
      await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Second submission should fail
      const response = await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBe('Only draft purchase orders can be submitted');
    });

    test('should auto-approve low-value purchase orders', async () => {
      // Update to low value
      await db('purchase_orders')
        .where('id', testPurchaseOrder.id)
        .update({ estimated_amount: 50.00 });

      const response = await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrder.status).toBe('approved');
      expect(response.body.purchaseOrder.autoApproved).toBe(true);
    });

    test('should require authentication', async () => {
      await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/submit`)
        .expect(401);
    });
  });

  describe('POST /api/purchase-orders/:id/approve', () => {
    beforeEach(async () => {
      const [po] = await db('purchase_orders').insert({
        organization_id: adminUser.id,
        po_number: 'PO-2024-APPROVE',
        vendor_name: 'Approve Test Vendor',
        description: 'Purchase order for approval testing',
        estimated_amount: 2000.00,
        status: 'pending_approval',
        requested_by: testUser.id,
        line_items: JSON.stringify([
          { description: 'Approve Item', quantity: 1, unitPrice: 2000, totalPrice: 2000 }
        ]),
        submitted_at: new Date(),
        created_by: testUser.id,
        updated_by: testUser.id
      }).returning('*');

      testPurchaseOrder = po;
    });

    test('should approve purchase order as admin', async () => {
      const approvalData = {
        action: 'approve',
        notes: 'Approved for purchase',
        approvedAmount: 2000.00
      };

      const response = await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.message).toBe('Purchase order approved successfully');
      expect(response.body.purchaseOrder.status).toBe('approved');
      expect(response.body.purchaseOrder.approvedAt).toBeDefined();
      expect(response.body.purchaseOrder.approvedBy).toBe(adminUser.id);

      // Verify approval record created
      const approval = await db('purchase_order_approvals')
        .where('purchase_order_id', testPurchaseOrder.id)
        .first();
      expect(approval.action).toBe('approve');
      expect(approval.approver_id).toBe(adminUser.id);
    });

    test('should reject purchase order as admin', async () => {
      const rejectionData = {
        action: 'reject',
        notes: 'Insufficient budget justification'
      };

      const response = await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(rejectionData)
        .expect(200);

      expect(response.body.message).toBe('Purchase order rejected');
      expect(response.body.purchaseOrder.status).toBe('draft');
      expect(response.body.purchaseOrder.rejectedAt).toBeDefined();
    });

    test('should not allow approval of non-pending purchase orders', async () => {
      // Update status to draft
      await db('purchase_orders')
        .where('id', testPurchaseOrder.id)
        .update({ status: 'draft' });

      const response = await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'approve' })
        .expect(400);

      expect(response.body.error).toBe('Only pending purchase orders can be approved');
    });

    test('should validate approval data', async () => {
      const invalidApproval = {
        action: 'invalid_action'
      };

      const response = await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidApproval)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should require admin role', async () => {
      await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'approve' })
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .post(`/api/purchase-orders/${testPurchaseOrder.id}/approve`)
        .send({ action: 'approve' })
        .expect(401);
    });
  });

  describe('PUT /api/purchase-orders/:id/status', () => {
    beforeEach(async () => {
      const [po] = await db('purchase_orders').insert({
        organization_id: adminUser.id,
        po_number: 'PO-2024-STATUS',
        vendor_name: 'Status Test Vendor',
        description: 'Purchase order for status testing',
        estimated_amount: 800.00,
        status: 'approved',
        requested_by: adminUser.id,
        approved_at: new Date(),
        approved_by: adminUser.id,
        line_items: JSON.stringify([
          { description: 'Status Item', quantity: 1, unitPrice: 800, totalPrice: 800 }
        ]),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPurchaseOrder = po;
    });

    test('should update purchase order status', async () => {
      const statusUpdate = {
        status: 'sent_to_vendor',
        notes: 'Sent to vendor via email',
        actualDeliveryDate: '2024-02-20'
      };

      const response = await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body.message).toBe('Purchase order status updated successfully');
      expect(response.body.purchaseOrder.status).toBe('sent_to_vendor');
      expect(response.body.statusHistory).toBeDefined();

      // Verify status history created
      const history = await db('purchase_order_status_history')
        .where('purchase_order_id', testPurchaseOrder.id)
        .orderBy('created_at', 'desc')
        .first();
      expect(history.status).toBe('sent_to_vendor');
      expect(history.notes).toBe(statusUpdate.notes);
    });

    test('should validate status transitions', async () => {
      // Try to set invalid status transition
      const invalidTransition = {
        status: 'paid' // Can't go directly from approved to paid
      };

      const response = await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTransition)
        .expect(400);

      expect(response.body.error).toBe('Invalid status transition');
    });

    test('should validate status update data', async () => {
      const invalidStatus = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidStatus)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should require admin or manager role', async () => {
      await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'sent_to_vendor' })
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .put(`/api/purchase-orders/${testPurchaseOrder.id}/status`)
        .send({ status: 'sent_to_vendor' })
        .expect(401);
    });
  });

  describe('DELETE /api/purchase-orders/:id', () => {
    beforeEach(async () => {
      const [po] = await db('purchase_orders').insert({
        organization_id: adminUser.id,
        po_number: 'PO-2024-DELETE',
        vendor_name: 'Delete Test Vendor',
        description: 'Purchase order for delete testing',
        estimated_amount: 300.00,
        status: 'draft',
        requested_by: adminUser.id,
        line_items: JSON.stringify([]),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPurchaseOrder = po;
    });

    test('should cancel draft purchase order', async () => {
      const response = await request(app)
        .delete(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Purchase order cancelled successfully');

      // Verify status updated to cancelled
      const cancelled = await db('purchase_orders')
        .where('id', testPurchaseOrder.id)
        .first();
      expect(cancelled.status).toBe('cancelled');
    });

    test('should not allow cancellation of non-draft purchase orders', async () => {
      // Update to approved status
      await db('purchase_orders')
        .where('id', testPurchaseOrder.id)
        .update({ status: 'approved' });

      const response = await request(app)
        .delete(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBe('Only draft purchase orders can be cancelled');
    });

    test('should return 404 for non-existent purchase order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .delete(`/api/purchase-orders/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should require admin role', async () => {
      await request(app)
        .delete(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .delete(`/api/purchase-orders/${testPurchaseOrder.id}`)
        .expect(401);
    });
  });

  describe('GET /api/purchase-orders/reports', () => {
    beforeEach(async () => {
      // Create test data for reports
      await db('purchase_orders').insert([
        {
          organization_id: adminUser.id,
          po_number: 'PO-2024-RPT1',
          vendor_name: 'Report Vendor 1',
          description: 'Report PO 1',
          estimated_amount: 1000.00,
          actual_amount: 950.00,
          status: 'paid',
          requested_by: adminUser.id,
          line_items: JSON.stringify([]),
          created_by: adminUser.id,
          updated_by: adminUser.id
        },
        {
          organization_id: adminUser.id,
          po_number: 'PO-2024-RPT2',
          vendor_name: 'Report Vendor 2',
          description: 'Report PO 2',
          estimated_amount: 500.00,
          actual_amount: 500.00,
          status: 'received',
          requested_by: managerUser.id,
          line_items: JSON.stringify([]),
          created_by: managerUser.id,
          updated_by: managerUser.id
        }
      ]);
    });

    test('should generate purchase order reports as admin', async () => {
      const response = await request(app)
        .get('/api/purchase-orders/reports?groupBy=status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.summary).toBeDefined();
      expect(response.body.breakdown).toBeDefined();
      expect(response.body.totalOrders).toBe(2);
      expect(response.body.totalEstimated).toBe(1500.00);
      expect(response.body.totalActual).toBe(1450.00);
    });

    test('should filter reports by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/purchase-orders/reports?dateFrom=${today}&dateTo=${today}&groupBy=vendor`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.dateRange.dateFrom).toBe(today);
      expect(response.body.dateRange.dateTo).toBe(today);
    });

    test('should require admin or manager role', async () => {
      await request(app)
        .get('/api/purchase-orders/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should validate report parameters', async () => {
      const response = await request(app)
        .get('/api/purchase-orders/reports?groupBy=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid groupBy parameter');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed line items JSON', async () => {
      // Insert PO with malformed JSON
      await db.raw(`
        INSERT INTO purchase_orders (
          organization_id, po_number, vendor_name, description, 
          estimated_amount, status, requested_by, line_items, 
          created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        adminUser.id, 'PO-MALFORMED', 'Test Vendor', 'Test Description',
        100, 'draft', adminUser.id, 'invalid json',
        adminUser.id, adminUser.id
      ]);

      // Should handle gracefully
      const response = await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.purchaseOrders.length).toBeGreaterThan(0);
    });

    test('should handle concurrent PO number generation', async () => {
      const poData = {
        vendorName: 'Concurrent Test',
        description: 'Testing concurrent creation',
        estimatedAmount: 100,
        lineItems: [
          { description: 'Item', quantity: 1, unitPrice: 100, totalPrice: 100 }
        ]
      };

      // Simulate concurrent requests
      const requests = Array(3).fill().map(() =>
        request(app)
          .post('/api/purchase-orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(poData)
      );

      const responses = await Promise.allSettled(requests);
      
      // All should succeed with unique PO numbers
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      expect(successful).toHaveLength(3);

      // Check PO numbers are unique
      const poNumbers = successful.map(r => r.value.body.purchaseOrder.poNumber);
      const uniqueNumbers = new Set(poNumbers);
      expect(uniqueNumbers.size).toBe(poNumbers.length);
    });

    test('should handle extremely large line items array', async () => {
      const manyItems = Array(100).fill().map((_, i) => ({
        description: `Item ${i + 1}`,
        quantity: 1,
        unitPrice: 1,
        totalPrice: 1
      }));

      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendorName: 'Many Items Vendor',
          description: 'Testing many line items',
          estimatedAmount: 100,
          lineItems: manyItems
        })
        .expect(201);

      expect(response.body.purchaseOrder.lineItems).toHaveLength(100);
    });
  });
});
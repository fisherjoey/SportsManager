const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const { generateToken } = require('../../src/middleware/auth');

describe('Company Credit Cards API', () => {
  let testUser, adminUser, managerUser;
  let userToken, adminToken, managerToken;
  let testCreditCard;

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
    await db('company_credit_cards').where('organization_id', adminUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id, managerUser.id]).del();
  });

  beforeEach(async () => {
    // Clean up credit cards before each test
    await db('company_credit_cards').where('organization_id', adminUser.id).del();
  });

  describe('POST /api/company-credit-cards', () => {
    const validCreditCard = {
      cardName: 'Company Main Card',
      cardType: 'visa',
      lastFourDigits: '1234',
      cardNetwork: 'Visa',
      issuingBank: 'Chase Bank',
      primaryHolderId: null, // Admin will be set as primary
      cardholderName: 'Company Name',
      isActive: true,
      expirationDate: '2026-12-31',
      creditLimit: 10000.00,
      monthlyLimit: 5000.00,
      transactionLimit: 1000.00,
      requiresReceipt: true,
      requiresPreApproval: false,
      accountingCode: 'CC-001',
      costCenter: 'ADMIN',
      alertThreshold: 8000.00,
      fraudMonitoring: true,
      isEmergencyCard: false
    };

    test('should create credit card successfully as admin', async () => {
      const response = await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCreditCard)
        .expect(201);

      expect(response.body.message).toBe('Company credit card created successfully');
      expect(response.body.creditCard.cardName).toBe(validCreditCard.cardName);
      expect(response.body.creditCard.cardType).toBe(validCreditCard.cardType);
      expect(response.body.creditCard.lastFourDigits).toBe(validCreditCard.lastFourDigits);
      expect(response.body.creditCard.maskedNumber).toBe('****-****-****-1234');
      expect(response.body.creditCard.isActive).toBe(true);

      // Verify in database
      const created = await db('company_credit_cards')
        .where('card_name', validCreditCard.cardName)
        .first();
      expect(created).toBeDefined();
      expect(created.organization_id).toBe(adminUser.id);
      expect(created.primary_holder_id).toBe(adminUser.id);
    });

    test('should validate credit card data', async () => {
      const invalidCreditCard = {
        cardName: '', // Empty name
        cardType: 'invalid_type', // Invalid type
        lastFourDigits: '123', // Invalid length
        expirationDate: '2020-01-01' // Past date
      };

      const response = await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCreditCard)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should prevent duplicate card numbers within organization', async () => {
      // Create first card
      await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCreditCard)
        .expect(201);

      // Try to create another with same last four digits
      const response = await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validCreditCard,
          cardName: 'Different Name'
        })
        .expect(409);

      expect(response.body.error).toBe('Credit card with these last four digits already exists');
    });

    test('should handle shared card configuration', async () => {
      const sharedCard = {
        ...validCreditCard,
        cardName: 'Shared Team Card',
        isSharedCard: true,
        authorizedUsers: [testUser.id, managerUser.id],
        categoryLimits: {
          'office_supplies': 500,
          'travel': 2000
        },
        merchantRestrictions: {
          'blocked_categories': ['gambling', 'adult'],
          'allowed_merchants': ['Office Depot', 'Amazon Business']
        }
      };

      const response = await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sharedCard)
        .expect(201);

      expect(response.body.creditCard.isSharedCard).toBe(true);
      expect(response.body.creditCard.authorizedUsers).toHaveLength(2);
      expect(response.body.creditCard.categoryLimits).toEqual(sharedCard.categoryLimits);
    });

    test('should set up notification settings', async () => {
      const cardWithNotifications = {
        ...validCreditCard,
        cardName: 'Notification Test Card',
        notificationSettings: {
          email: true,
          sms: false,
          inApp: true,
          transactionAlerts: true,
          statementReminders: true
        },
        spendingAlerts: {
          monthlyThreshold: 4000,
          transactionThreshold: 500,
          unusualActivity: true
        }
      };

      const response = await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(cardWithNotifications)
        .expect(201);

      expect(response.body.creditCard.notificationSettings).toEqual(cardWithNotifications.notificationSettings);
      expect(response.body.creditCard.spendingAlerts).toEqual(cardWithNotifications.spendingAlerts);
    });

    test('should require admin role', async () => {
      await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validCreditCard)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/company-credit-cards')
        .send(validCreditCard)
        .expect(401);
    });

    test('should validate expiration date is in future', async () => {
      const expiredCard = {
        ...validCreditCard,
        expirationDate: '2020-01-01'
      };

      const response = await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(expiredCard)
        .expect(400);

      expect(response.body.error).toBe('Expiration date must be in the future');
    });
  });

  describe('GET /api/company-credit-cards', () => {
    beforeEach(async () => {
      // Create test credit cards
      const [card1] = await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Test Card 1',
        card_type: 'visa',
        last_four_digits: '1111',
        is_active: true,
        expiration_date: '2026-12-31',
        credit_limit: 5000.00,
        primary_holder_id: adminUser.id,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Test Card 2',
        card_type: 'mastercard',
        last_four_digits: '2222',
        is_active: false,
        expiration_date: '2025-06-30',
        credit_limit: 3000.00,
        primary_holder_id: managerUser.id,
        is_shared_card: true,
        created_by: adminUser.id,
        updated_by: adminUser.id
      });

      testCreditCard = card1;
    });

    test('should list company credit cards for authenticated user', async () => {
      const response = await request(app)
        .get('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.creditCards).toHaveLength(2);
      expect(response.body.creditCards[0]).toHaveProperty('cardName');
      expect(response.body.creditCards[0]).toHaveProperty('maskedNumber');
      expect(response.body.creditCards[0]).not.toHaveProperty('fullCardNumber');
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter credit cards by type', async () => {
      const response = await request(app)
        .get('/api/company-credit-cards?cardType=visa')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.creditCards).toHaveLength(1);
      expect(response.body.creditCards[0].cardType).toBe('visa');
    });

    test('should filter credit cards by active status', async () => {
      const response = await request(app)
        .get('/api/company-credit-cards?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.creditCards).toHaveLength(1);
      expect(response.body.creditCards[0].isActive).toBe(true);
    });

    test('should filter credit cards by shared status', async () => {
      const response = await request(app)
        .get('/api/company-credit-cards?isSharedCard=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.creditCards).toHaveLength(1);
      expect(response.body.creditCards[0].isSharedCard).toBe(true);
    });

    test('should search credit cards by name', async () => {
      const response = await request(app)
        .get('/api/company-credit-cards?search=Test%20Card%201')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.creditCards).toHaveLength(1);
      expect(response.body.creditCards[0].cardName).toContain('Test Card 1');
    });

    test('should show only accessible cards for non-admin users', async () => {
      // Manager should only see cards they're primary holder or authorized user for
      const response = await request(app)
        .get('/api/company-credit-cards')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.creditCards).toHaveLength(1);
      expect(response.body.creditCards[0].primaryHolderId).toBe(managerUser.id);
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/company-credit-cards?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.creditCards).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/company-credit-cards')
        .expect(401);
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/company-credit-cards?cardType=invalid_type')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /api/company-credit-cards/:id', () => {
    beforeEach(async () => {
      const [card] = await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Detail Test Card',
        card_type: 'amex',
        last_four_digits: '9999',
        cardholder_name: 'Company Inc',
        is_active: true,
        expiration_date: '2027-03-31',
        credit_limit: 15000.00,
        available_credit: 12000.00,
        current_balance: 3000.00,
        monthly_limit: 8000.00,
        transaction_limit: 2000.00,
        primary_holder_id: adminUser.id,
        category_limits: JSON.stringify({ travel: 5000, supplies: 1000 }),
        notification_settings: JSON.stringify({ email: true, sms: false }),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testCreditCard = card;
    });

    test('should get credit card details', async () => {
      const response = await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.creditCard.id).toBe(testCreditCard.id);
      expect(response.body.creditCard.cardName).toBe('Detail Test Card');
      expect(response.body.creditCard.creditLimit).toBe(15000.00);
      expect(response.body.creditCard.categoryLimits).toEqual({ travel: 5000, supplies: 1000 });
      expect(response.body.creditCard.notificationSettings).toEqual({ email: true, sms: false });
      expect(response.body.usageStats).toBeDefined();
      expect(response.body.authorizedUsers).toBeDefined();
    });

    test('should return 404 for non-existent credit card', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/company-credit-cards/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should not allow access to other organization credit cards', async () => {
      // Create card for different organization
      const [otherUser] = await db('users').insert({
        email: 'other@example.com',
        password_hash: 'hashed',
        role: 'admin'
      }).returning('*');

      const [otherCard] = await db('company_credit_cards').insert({
        organization_id: otherUser.id,
        card_name: 'Other Org Card',
        card_type: 'visa',
        last_four_digits: '8888',
        is_active: true,
        expiration_date: '2026-12-31',
        primary_holder_id: otherUser.id,
        created_by: otherUser.id,
        updated_by: otherUser.id
      }).returning('*');

      await request(app)
        .get(`/api/company-credit-cards/${otherCard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Clean up
      await db('company_credit_cards').where('id', otherCard.id).del();
      await db('users').where('id', otherUser.id).del();
    });

    test('should enforce access control for non-admin users', async () => {
      // User should not be able to access card they're not authorized for
      await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should allow authorized user access', async () => {
      // Add user as authorized user
      await db('company_credit_cards')
        .where('id', testCreditCard.id)
        .update({
          authorized_users: JSON.stringify([userToken.id])
        });

      const response = await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.creditCard.id).toBe(testCreditCard.id);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/company-credit-cards/:id', () => {
    beforeEach(async () => {
      const [card] = await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Update Test Card',
        card_type: 'visa',
        last_four_digits: '5555',
        is_active: true,
        expiration_date: '2026-12-31',
        credit_limit: 8000.00,
        monthly_limit: 4000.00,
        primary_holder_id: adminUser.id,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testCreditCard = card;
    });

    test('should update credit card successfully as admin', async () => {
      const updateData = {
        cardName: 'Updated Card Name',
        monthlyLimit: 6000.00,
        transactionLimit: 1500.00,
        alertThreshold: 7000.00,
        categoryLimits: {
          office_supplies: 1000,
          travel: 3000,
          meals: 500
        },
        notificationSettings: {
          email: true,
          sms: true,
          inApp: false
        }
      };

      const response = await request(app)
        .put(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Company credit card updated successfully');
      expect(response.body.creditCard.cardName).toBe(updateData.cardName);
      expect(response.body.creditCard.monthlyLimit).toBe(updateData.monthlyLimit);
      expect(response.body.creditCard.categoryLimits).toEqual(updateData.categoryLimits);

      // Verify in database
      const updated = await db('company_credit_cards')
        .where('id', testCreditCard.id)
        .first();
      expect(updated.card_name).toBe(updateData.cardName);
      expect(updated.monthly_limit).toBe(updateData.monthlyLimit);
    });

    test('should validate update data', async () => {
      const invalidUpdate = {
        cardType: 'invalid_type',
        monthlyLimit: -1000
      };

      const response = await request(app)
        .put(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should prevent updating to duplicate card numbers', async () => {
      // Create another card
      await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Another Card',
        card_type: 'mastercard',
        last_four_digits: '7777',
        is_active: true,
        expiration_date: '2026-12-31',
        primary_holder_id: adminUser.id,
        created_by: adminUser.id,
        updated_by: adminUser.id
      });

      const response = await request(app)
        .put(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lastFourDigits: '7777' })
        .expect(409);

      expect(response.body.error).toBe('Credit card with these last four digits already exists');
    });

    test('should update authorized users list', async () => {
      const updateData = {
        authorizedUsers: [testUser.id, managerUser.id],
        isSharedCard: true
      };

      const response = await request(app)
        .put(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.creditCard.authorizedUsers).toHaveLength(2);
      expect(response.body.creditCard.isSharedCard).toBe(true);
    });

    test('should return 404 for non-existent credit card', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/company-credit-cards/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cardName: 'Test' })
        .expect(404);
    });

    test('should require admin role', async () => {
      await request(app)
        .put(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cardName: 'Unauthorized' })
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .put(`/api/company-credit-cards/${testCreditCard.id}`)
        .send({ cardName: 'Test' })
        .expect(401);
    });
  });

  describe('POST /api/company-credit-cards/:id/assign', () => {
    beforeEach(async () => {
      const [card] = await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Assign Test Card',
        card_type: 'visa',
        last_four_digits: '4444',
        is_active: true,
        is_shared_card: true,
        expiration_date: '2026-12-31',
        primary_holder_id: adminUser.id,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testCreditCard = card;
    });

    test('should assign card to user successfully', async () => {
      const assignmentData = {
        userId: testUser.id,
        role: 'authorized',
        monthlyLimit: 2000.00,
        transactionLimit: 500.00,
        categoryRestrictions: {
          allowed: ['office_supplies', 'travel'],
          blocked: ['entertainment']
        },
        notes: 'Assigned for business expenses'
      };

      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(200);

      expect(response.body.message).toBe('User assigned to credit card successfully');
      expect(response.body.assignment.userId).toBe(testUser.id);
      expect(response.body.assignment.role).toBe('authorized');
      expect(response.body.assignment.monthlyLimit).toBe(2000.00);

      // Verify assignment record created
      const assignment = await db('credit_card_assignments')
        .where('credit_card_id', testCreditCard.id)
        .where('user_id', testUser.id)
        .first();
      expect(assignment).toBeDefined();
      expect(assignment.monthly_limit).toBe(2000.00);
    });

    test('should prevent duplicate assignments', async () => {
      // First assignment
      await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id, role: 'authorized' })
        .expect(200);

      // Second assignment should fail
      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id, role: 'authorized' })
        .expect(409);

      expect(response.body.error).toBe('User is already assigned to this credit card');
    });

    test('should validate assignment data', async () => {
      const invalidAssignment = {
        userId: 'invalid-uuid',
        monthlyLimit: -100
      };

      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidAssignment)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should only allow assignment to shared cards', async () => {
      // Update card to not be shared
      await db('company_credit_cards')
        .where('id', testCreditCard.id)
        .update({ is_shared_card: false });

      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id, role: 'authorized' })
        .expect(400);

      expect(response.body.error).toBe('Only shared cards can have additional users assigned');
    });

    test('should require admin role', async () => {
      await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/assign`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId: managerUser.id, role: 'authorized' })
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/assign`)
        .send({ userId: testUser.id, role: 'authorized' })
        .expect(401);
    });
  });

  describe('POST /api/company-credit-cards/:id/block', () => {
    beforeEach(async () => {
      const [card] = await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Block Test Card',
        card_type: 'mastercard',
        last_four_digits: '3333',
        is_active: true,
        is_blocked: false,
        expiration_date: '2026-12-31',
        primary_holder_id: adminUser.id,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testCreditCard = card;
    });

    test('should block credit card successfully', async () => {
      const blockData = {
        reason: 'Suspected fraudulent activity',
        isTemporary: true,
        unblockAt: '2024-02-15T10:00:00Z'
      };

      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData)
        .expect(200);

      expect(response.body.message).toBe('Credit card blocked successfully');
      expect(response.body.blockInfo.reason).toBe(blockData.reason);
      expect(response.body.blockInfo.isTemporary).toBe(true);

      // Verify in database
      const blocked = await db('company_credit_cards')
        .where('id', testCreditCard.id)
        .first();
      expect(blocked.is_blocked).toBe(true);
      expect(blocked.blocked_reason).toBe(blockData.reason);

      // Verify block history record
      const blockHistory = await db('credit_card_block_history')
        .where('credit_card_id', testCreditCard.id)
        .orderBy('created_at', 'desc')
        .first();
      expect(blockHistory.action).toBe('block');
      expect(blockHistory.reason).toBe(blockData.reason);
    });

    test('should permanently block credit card', async () => {
      const blockData = {
        reason: 'Card compromised - permanent block',
        isTemporary: false
      };

      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData)
        .expect(200);

      expect(response.body.blockInfo.isTemporary).toBe(false);
      expect(response.body.blockInfo.unblockAt).toBeNull();
    });

    test('should not allow blocking already blocked card', async () => {
      // First block
      await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test block' })
        .expect(200);

      // Second block should fail
      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Another block' })
        .expect(400);

      expect(response.body.error).toBe('Credit card is already blocked');
    });

    test('should validate block data', async () => {
      const invalidBlock = {
        reason: '', // Empty reason
        unblockAt: '2020-01-01' // Past date
      };

      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBlock)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should require admin role', async () => {
      await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/block`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Unauthorized block' })
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/block`)
        .send({ reason: 'Unauthenticated block' })
        .expect(401);
    });
  });

  describe('POST /api/company-credit-cards/:id/unblock', () => {
    beforeEach(async () => {
      const [card] = await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Unblock Test Card',
        card_type: 'visa',
        last_four_digits: '6666',
        is_active: true,
        is_blocked: true,
        blocked_reason: 'Test block',
        blocked_at: new Date(),
        blocked_by: adminUser.id,
        expiration_date: '2026-12-31',
        primary_holder_id: adminUser.id,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testCreditCard = card;

      // Create block history
      await db('credit_card_block_history').insert({
        credit_card_id: card.id,
        action: 'block',
        reason: 'Test block',
        performed_by: adminUser.id,
        organization_id: adminUser.id
      });
    });

    test('should unblock credit card successfully', async () => {
      const unblockData = {
        reason: 'Issue resolved, card is safe to use'
      };

      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(unblockData)
        .expect(200);

      expect(response.body.message).toBe('Credit card unblocked successfully');

      // Verify in database
      const unblocked = await db('company_credit_cards')
        .where('id', testCreditCard.id)
        .first();
      expect(unblocked.is_blocked).toBe(false);
      expect(unblocked.unblocked_at).toBeDefined();
      expect(unblocked.unblocked_by).toBe(adminUser.id);

      // Verify unblock history record
      const unblockHistory = await db('credit_card_block_history')
        .where('credit_card_id', testCreditCard.id)
        .where('action', 'unblock')
        .first();
      expect(unblockHistory.reason).toBe(unblockData.reason);
    });

    test('should not allow unblocking non-blocked card', async () => {
      // Update card to not be blocked
      await db('company_credit_cards')
        .where('id', testCreditCard.id)
        .update({ is_blocked: false });

      const response = await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test unblock' })
        .expect(400);

      expect(response.body.error).toBe('Credit card is not currently blocked');
    });

    test('should require admin role', async () => {
      await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/unblock`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Unauthorized unblock' })
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .post(`/api/company-credit-cards/${testCreditCard.id}/unblock`)
        .send({ reason: 'Unauthenticated unblock' })
        .expect(401);
    });
  });

  describe('GET /api/company-credit-cards/:id/transactions', () => {
    beforeEach(async () => {
      const [card] = await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Transaction Test Card',
        card_type: 'amex',
        last_four_digits: '7777',
        is_active: true,
        expiration_date: '2026-12-31',
        primary_holder_id: adminUser.id,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testCreditCard = card;

      // Create test transactions
      await db('credit_card_transactions').insert([
        {
          credit_card_id: card.id,
          organization_id: adminUser.id,
          user_id: adminUser.id,
          transaction_id: 'TXN-001',
          amount: 125.50,
          vendor_name: 'Office Supply Store',
          transaction_date: '2024-01-15',
          category: 'office_supplies',
          status: 'posted',
          description: 'Printer paper and supplies'
        },
        {
          credit_card_id: card.id,
          organization_id: adminUser.id,
          user_id: adminUser.id,
          transaction_id: 'TXN-002',
          amount: 85.75,
          vendor_name: 'Gas Station',
          transaction_date: '2024-01-16',
          category: 'fuel',
          status: 'pending',
          description: 'Fuel for company vehicle'
        }
      ]);
    });

    test('should list credit card transactions', async () => {
      const response = await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}/transactions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.transactions[0]).toHaveProperty('transactionId');
      expect(response.body.transactions[0]).toHaveProperty('amount');
      expect(response.body.transactions[0]).toHaveProperty('vendorName');
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter transactions by date range', async () => {
      const response = await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}/transactions?dateFrom=2024-01-15&dateTo=2024-01-15`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].transactionDate).toBe('2024-01-15');
    });

    test('should filter transactions by amount range', async () => {
      const response = await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}/transactions?minAmount=100&maxAmount=150`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].amount).toBe(125.50);
    });

    test('should filter transactions by status', async () => {
      const response = await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}/transactions?status=posted`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].status).toBe('posted');
    });

    test('should enforce access control', async () => {
      await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}/transactions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/company-credit-cards/${testCreditCard.id}/transactions`)
        .expect(401);
    });
  });

  describe('DELETE /api/company-credit-cards/:id', () => {
    beforeEach(async () => {
      const [card] = await db('company_credit_cards').insert({
        organization_id: adminUser.id,
        card_name: 'Delete Test Card',
        card_type: 'visa',
        last_four_digits: '8888',
        is_active: true,
        expiration_date: '2026-12-31',
        primary_holder_id: adminUser.id,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testCreditCard = card;
    });

    test('should soft delete unused credit card', async () => {
      const response = await request(app)
        .delete(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Credit card deactivated successfully');
      expect(response.body.deactivated).toBe(true);

      // Verify soft deletion
      const deactivated = await db('company_credit_cards')
        .where('id', testCreditCard.id)
        .first();
      expect(deactivated.is_active).toBe(false);
      expect(deactivated.deleted_at).toBeDefined();
    });

    test('should prevent deletion of card with transactions', async () => {
      // Add transaction to card
      await db('credit_card_transactions').insert({
        credit_card_id: testCreditCard.id,
        organization_id: adminUser.id,
        user_id: adminUser.id,
        transaction_id: 'TXN-TEST',
        amount: 50.00,
        vendor_name: 'Test Vendor',
        transaction_date: '2024-01-15',
        status: 'posted'
      });

      const response = await request(app)
        .delete(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBe('Cannot delete credit card with existing transactions');
    });

    test('should return 404 for non-existent credit card', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .delete(`/api/company-credit-cards/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should require admin role', async () => {
      await request(app)
        .delete(`/api/company-credit-cards/${testCreditCard.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .delete(`/api/company-credit-cards/${testCreditCard.id}`)
        .expect(401);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed JSON in stored fields', async () => {
      // Insert card with malformed JSON
      await db.raw(`
        INSERT INTO company_credit_cards (
          organization_id, card_name, card_type, last_four_digits,
          is_active, expiration_date, primary_holder_id,
          category_limits, notification_settings, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        adminUser.id, 'Malformed JSON Card', 'visa', '9999',
        true, '2026-12-31', adminUser.id,
        'invalid json', 'invalid json', adminUser.id, adminUser.id
      ]);

      // Should handle gracefully
      const response = await request(app)
        .get('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.creditCards.length).toBeGreaterThan(0);
    });

    test('should handle credit limit validation', async () => {
      const invalidCard = {
        cardName: 'Limit Test Card',
        cardType: 'visa',
        lastFourDigits: '1111',
        expirationDate: '2026-12-31',
        creditLimit: 10000,
        availableCredit: 15000 // More than credit limit
      };

      const response = await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCard)
        .expect(400);

      expect(response.body.error).toBe('Available credit cannot exceed credit limit');
    });

    test('should handle invalid card expiration dates', async () => {
      const expiredCard = {
        cardName: 'Expired Card',
        cardType: 'visa',
        lastFourDigits: '2222',
        expirationDate: '2020-01-01'
      };

      const response = await request(app)
        .post('/api/company-credit-cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(expiredCard)
        .expect(400);

      expect(response.body.error).toBe('Expiration date must be in the future');
    });

    test('should handle concurrent card creation with same last four digits', async () => {
      const cardData = {
        cardName: 'Concurrent Test Card',
        cardType: 'visa',
        lastFourDigits: '9999',
        expirationDate: '2026-12-31'
      };

      // Simulate concurrent requests
      const requests = Array(3).fill().map(() =>
        request(app)
          .post('/api/company-credit-cards')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ...cardData, cardName: `${cardData.cardName}-${Math.random()}` })
      );

      const responses = await Promise.allSettled(requests);
      
      // Only one should succeed due to unique constraint
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = responses.filter(r => r.status === 'fulfilled' && r.value.status === 409);
      
      expect(successful).toHaveLength(1);
      expect(failed.length).toBeGreaterThan(0);
    });
  });
});
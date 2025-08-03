const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT tokens for testing
const generateToken = (user, expiresIn = '1d') => {
  return jwt.sign(
    { 
      userId: user.id, 
      id: user.id, // Add both for compatibility
      email: user.email, 
      role: user.role,
      roles: user.roles || [user.role]
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn }
  );
};

describe('Expense Reimbursement Performance Tests', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;
  let testCategory;

  beforeAll(async () => {
    // Create test users
    const [user] = await db('users').insert({
      email: 'perf-user@example.com',
      password_hash: 'hashed',
      role: 'referee'
    }).returning('*');

    testUser = user;
    authToken = generateToken({ id: user.id, email: user.email, role: user.role });

    const [admin] = await db('users').insert({
      email: 'perf-admin@example.com',
      password_hash: 'hashed',
      role: 'admin'
    }).returning('*');

    adminUser = admin;
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });

    // Create test category
    const [category] = await db('expense_categories').insert({
      organization_id: user.id,
      name: 'Performance Test Category',
      code: 'PERF',
      keywords: JSON.stringify(['performance', 'test']),
      active: true
    }).returning('*');

    testCategory = category;
  });

  afterAll(async () => {
    // Clean up all test data
    await db('user_earnings').where('organization_id', testUser.id).del();
    await db('expense_reimbursements').where('organization_id', testUser.id).del();
    await db('expense_approvals').where('organization_id', testUser.id).del();
    await db('expense_data').where('organization_id', testUser.id).del();
    await db('expense_receipts').where('organization_id', testUser.id).del();
    await db('expense_categories').where('organization_id', testUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id]).del();
  });

  describe('Large Dataset Performance', () => {
    let receipts = [];
    let reimbursements = [];

    beforeAll(async () => {
      // Create large dataset for performance testing
      console.log('Creating large dataset for performance tests...');
      
      const batchSize = 100;
      const totalRecords = 1000;
      
      for (let batch = 0; batch < totalRecords / batchSize; batch++) {
        const receiptBatch = [];
        const expenseDataBatch = [];
        const approvalBatch = [];
        
        for (let i = 0; i < batchSize; i++) {
          const index = batch * batchSize + i;
          receiptBatch.push({
            user_id: testUser.id,
            organization_id: testUser.id,
            original_filename: `perf-receipt-${index}.pdf`,
            file_path: `/tmp/perf-receipt-${index}.pdf`,
            file_type: 'pdf',
            mime_type: 'application/pdf',
            file_size: 1024 + (index % 5000), // Vary file sizes
            file_hash: `perf-hash-${index}`,
            processing_status: 'processed'
          });
        }
        
        // Insert receipts in batch
        const insertedReceipts = await db('expense_receipts').insert(receiptBatch).returning('*');
        receipts.push(...insertedReceipts);
        
        // Create corresponding expense data
        for (let i = 0; i < insertedReceipts.length; i++) {
          const receipt = insertedReceipts[i];
          const index = batch * batchSize + i;
          
          expenseDataBatch.push({
            receipt_id: receipt.id,
            user_id: testUser.id,
            organization_id: testUser.id,
            vendor_name: `Performance Vendor ${index}`,
            total_amount: (Math.random() * 500 + 10).toFixed(2), // Random amounts $10-$510
            transaction_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            category_id: testCategory.id,
            category_name: testCategory.name,
            description: `Performance test expense ${index}`
          });
        }
        
        const insertedExpenseData = await db('expense_data').insert(expenseDataBatch).returning('*');
        
        // Create approvals
        for (let i = 0; i < insertedExpenseData.length; i++) {
          const expenseData = insertedExpenseData[i];
          
          approvalBatch.push({
            expense_data_id: expenseData.id,
            receipt_id: expenseData.receipt_id,
            user_id: testUser.id,
            organization_id: testUser.id,
            status: 'approved',
            approver_id: adminUser.id,
            approved_amount: expenseData.total_amount,
            requested_amount: expenseData.total_amount,
            approved_at: new Date()
          });
        }
        
        await db('expense_approvals').insert(approvalBatch);
        
        console.log(`Created batch ${batch + 1}/${totalRecords / batchSize} (${insertedReceipts.length} records)`);
      }
      
      console.log(`Created ${receipts.length} receipts for performance testing`);
    });

    afterAll(async () => {
      // Clean up large dataset
      console.log('Cleaning up performance test data...');
      await db('user_earnings').where('organization_id', testUser.id).del();
      await db('expense_reimbursements').where('organization_id', testUser.id).del();
      await db('expense_approvals').where('organization_id', testUser.id).del();
      await db('expense_data').where('organization_id', testUser.id).del();
      await db('expense_receipts').where('organization_id', testUser.id).del();
      console.log('Performance test data cleanup complete');
    });

    test('should handle large reimbursement list query efficiently', async () => {
      // Create some reimbursements from the receipts
      const sampleReceipts = receipts.slice(0, 100);
      const reimbursementBatch = [];
      
      for (const receipt of sampleReceipts) {
        // Update expense data to assign reimbursement user
        await db('expense_data')
          .where('receipt_id', receipt.id)
          .update({
            reimbursement_user_id: testUser.id,
            is_reimbursable: true
          });
        
        const expenseData = await db('expense_data')
          .where('receipt_id', receipt.id)
          .first();
        
        reimbursementBatch.push({
          expense_data_id: expenseData.id,
          receipt_id: receipt.id,
          reimbursement_user_id: testUser.id,
          organization_id: testUser.id,
          approved_amount: expenseData.total_amount,
          status: ['pending', 'scheduled', 'paid'][Math.floor(Math.random() * 3)],
          payment_method: 'payroll',
          pay_period: `2024-0${Math.floor(Math.random() * 12) + 1}`,
          processed_by: adminUser.id
        });
      }
      
      await db('expense_reimbursements').insert(reimbursementBatch);
      
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/expenses/reimbursements?limit=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.reimbursements).toHaveLength(50);
      expect(response.body.pagination).toBeDefined();
      
      // Performance assertion - should complete within 2 seconds
      expect(responseTime).toBeLessThan(2000);
      console.log(`Large reimbursement list query completed in ${responseTime}ms`);
    });

    test('should handle earnings query with large dataset efficiently', async () => {
      // Create earnings for performance testing
      const earningsBatch = [];
      
      for (let i = 0; i < 500; i++) {
        earningsBatch.push({
          user_id: testUser.id,
          organization_id: testUser.id,
          earning_type: i % 2 === 0 ? 'reimbursement' : 'referee_pay',
          amount: (Math.random() * 200 + 25).toFixed(2),
          description: `Performance earning ${i}`,
          reference_id: `ref-${i}`,
          reference_type: i % 2 === 0 ? 'expense_reimbursement' : 'game_assignment',
          pay_period: `2024-0${Math.floor(i / 50) + 1}`,
          earned_date: new Date(2024, Math.floor(i / 50), (i % 30) + 1),
          payment_status: ['pending', 'scheduled', 'paid'][i % 3]
        });
      }
      
      await db('user_earnings').insert(earningsBatch);
      
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/expenses/users/${testUser.id}/earnings?limit=100`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.earnings).toHaveLength(100);
      expect(response.body.summary).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      
      // Performance assertion
      expect(responseTime).toBeLessThan(1500);
      console.log(`Large earnings query completed in ${responseTime}ms`);
    });

    test('should handle filtered reimbursement queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/expenses/reimbursements?status=pending&payPeriod=2024-01&limit=25')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.reimbursements).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      
      // Performance assertion for filtered queries
      expect(responseTime).toBeLessThan(1000);
      console.log(`Filtered reimbursement query completed in ${responseTime}ms`);
    });
  });

  describe('Concurrent Request Handling', () => {
    let testReceipts = [];

    beforeAll(async () => {
      // Create test receipts for concurrency testing
      const receiptBatch = [];
      const expenseDataBatch = [];
      
      for (let i = 0; i < 50; i++) {
        receiptBatch.push({
          user_id: testUser.id,
          organization_id: testUser.id,
          original_filename: `concurrent-receipt-${i}.pdf`,
          file_path: `/tmp/concurrent-receipt-${i}.pdf`,
          file_type: 'pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_hash: `concurrent-hash-${i}`,
          processing_status: 'processed'
        });
      }
      
      const insertedReceipts = await db('expense_receipts').insert(receiptBatch).returning('*');
      testReceipts = insertedReceipts;
      
      for (const receipt of insertedReceipts) {
        expenseDataBatch.push({
          receipt_id: receipt.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          vendor_name: 'Concurrent Vendor',
          total_amount: 100.00,
          transaction_date: new Date(),
          category_id: testCategory.id
        });
      }
      
      const insertedExpenseData = await db('expense_data').insert(expenseDataBatch).returning('*');
      
      // Create approvals
      const approvalBatch = [];
      for (const expenseData of insertedExpenseData) {
        approvalBatch.push({
          expense_data_id: expenseData.id,
          receipt_id: expenseData.receipt_id,
          user_id: testUser.id,
          organization_id: testUser.id,
          status: 'approved',
          approver_id: adminUser.id,
          approved_amount: 100.00,
          requested_amount: 100.00,
          approved_at: new Date()
        });
      }
      
      await db('expense_approvals').insert(approvalBatch);
    });

    afterAll(async () => {
      // Clean up concurrent test data
      for (const receipt of testReceipts) {
        await db('user_earnings').where('user_id', testUser.id).del();
        await db('expense_reimbursements').where('receipt_id', receipt.id).del();
        await db('expense_approvals').where('receipt_id', receipt.id).del();
        await db('expense_data').where('receipt_id', receipt.id).del();
        await db('expense_receipts').where('id', receipt.id).del();
      }
    });

    test('should handle concurrent reimbursement assignments', async () => {
      const startTime = Date.now();
      
      // Make 20 concurrent assignment requests
      const assignmentPromises = testReceipts.slice(0, 20).map(receipt => 
        request(app)
          .post(`/api/expenses/receipts/${receipt.id}/assign-reimbursement`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: testUser.id,
            notes: 'Concurrent assignment test'
          })
      );
      
      const results = await Promise.allSettled(assignmentPromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Most assignments should succeed
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 200
      ).length;
      
      expect(successful).toBeGreaterThan(15); // At least 75% success rate
      
      // Should complete all requests within reasonable time
      expect(totalTime).toBeLessThan(5000);
      console.log(`20 concurrent assignments completed in ${totalTime}ms (${successful} successful)`);
    });

    test('should handle concurrent reimbursement creations', async () => {
      // First assign reimbursements to users
      const assignedReceipts = testReceipts.slice(20, 30);
      
      for (const receipt of assignedReceipts) {
        await db('expense_data')
          .where('receipt_id', receipt.id)
          .update({
            reimbursement_user_id: testUser.id,
            is_reimbursable: true
          });
      }
      
      const startTime = Date.now();
      
      // Make concurrent reimbursement creation requests
      const creationPromises = assignedReceipts.map(receipt =>
        request(app)
          .post(`/api/expenses/receipts/${receipt.id}/create-reimbursement`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            paymentMethod: 'payroll',
            payPeriod: '2024-02'
          })
      );
      
      const results = await Promise.allSettled(creationPromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 200
      ).length;
      
      expect(successful).toBeGreaterThan(7); // At least 70% success rate
      expect(totalTime).toBeLessThan(3000);
      console.log(`10 concurrent reimbursement creations completed in ${totalTime}ms (${successful} successful)`);
    });

    test('should handle concurrent status updates', async () => {
      // Create some reimbursements first
      const statusUpdateReceipts = testReceipts.slice(30, 40);
      const reimbursementIds = [];
      
      for (const receipt of statusUpdateReceipts) {
        await db('expense_data')
          .where('receipt_id', receipt.id)
          .update({
            reimbursement_user_id: testUser.id,
            is_reimbursable: true
          });
        
        const expenseData = await db('expense_data')
          .where('receipt_id', receipt.id)
          .first();
        
        const [reimbursement] = await db('expense_reimbursements').insert({
          expense_data_id: expenseData.id,
          receipt_id: receipt.id,
          reimbursement_user_id: testUser.id,
          organization_id: testUser.id,
          approved_amount: 100.00,
          status: 'scheduled',
          processed_by: adminUser.id
        }).returning('*');
        
        reimbursementIds.push(reimbursement.id);
        
        // Create corresponding earning
        await db('user_earnings').insert({
          user_id: testUser.id,
          organization_id: testUser.id,
          earning_type: 'reimbursement',
          amount: 100.00,
          description: 'Concurrent test reimbursement',
          reference_id: reimbursement.id,
          reference_type: 'expense_reimbursement',
          pay_period: '2024-02',
          earned_date: new Date(),
          payment_status: 'scheduled'
        });
      }
      
      const startTime = Date.now();
      
      // Make concurrent status update requests
      const statusUpdatePromises = reimbursementIds.map(id =>
        request(app)
          .put(`/api/expenses/reimbursements/${id}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            status: 'paid',
            paidAmount: 100.00,
            paymentReference: `REF-${id.slice(-6)}`
          })
      );
      
      const results = await Promise.allSettled(statusUpdatePromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 200
      ).length;
      
      expect(successful).toBeGreaterThan(7); // At least 70% success rate
      expect(totalTime).toBeLessThan(2000);
      console.log(`10 concurrent status updates completed in ${totalTime}ms (${successful} successful)`);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should not leak memory during large operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/expenses/reimbursements?limit=10')
          .set('Authorization', `Bearer ${adminToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`Memory increase after 100 operations: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });

    test('should handle database connections efficiently', async () => {
      // Get initial connection count
      const initialConnections = await db.raw("SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'")
        .then(result => result.rows[0].count)
        .catch(() => 0); // Fallback for non-PostgreSQL databases
      
      // Make many concurrent requests
      const requests = Array(50).fill().map(() =>
        request(app)
          .get(`/api/expenses/users/${testUser.id}/earnings?limit=5`)
          .set('Authorization', `Bearer ${adminToken}`)
      );
      
      await Promise.all(requests);
      
      // Check final connection count
      const finalConnections = await db.raw("SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'")
        .then(result => result.rows[0].count)
        .catch(() => 0);
      
      // Connection count should not have grown significantly
      const connectionIncrease = finalConnections - initialConnections;
      expect(connectionIncrease).toBeLessThan(10);
      console.log(`Database connection increase: ${connectionIncrease}`);
    });
  });

  describe('Query Optimization', () => {
    test('should use database indexes efficiently', async () => {
      // Test queries that should use indexes
      const queries = [
        // User earnings by user_id and pay_period (should use compound index)
        () => request(app)
          .get(`/api/expenses/users/${testUser.id}/earnings?payPeriod=2024-02`)
          .set('Authorization', `Bearer ${adminToken}`),
        
        // Reimbursements by status (should use index)
        () => request(app)
          .get('/api/expenses/reimbursements?status=pending')
          .set('Authorization', `Bearer ${adminToken}`),
        
        // Reimbursements by user (should use index)
        () => request(app)
          .get(`/api/expenses/reimbursements?userId=${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
      ];
      
      for (const query of queries) {
        const startTime = Date.now();
        const response = await query();
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        expect(endTime - startTime).toBeLessThan(500); // Should be fast with proper indexes
      }
    });

    test('should paginate large result sets efficiently', async () => {
      // Test that pagination doesn't degrade performance significantly
      const pageSizes = [10, 25, 50, 100];
      const results = [];
      
      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get(`/api/expenses/reimbursements?limit=${pageSize}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.push({ pageSize, responseTime });
        expect(response.body.reimbursements.length).toBeLessThanOrEqual(pageSize);
      }
      
      // Response times should not increase dramatically with page size
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      expect(maxResponseTime).toBeLessThan(1000);
      
      console.log('Pagination performance:', results);
    });
  });
});
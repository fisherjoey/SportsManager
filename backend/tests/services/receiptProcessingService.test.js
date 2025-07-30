const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const receiptProcessingService = require('../../src/services/receiptProcessingService');
const db = require('../../src/config/database');

// Mock the AI services
jest.mock('../../src/services/aiServices', () => ({
  performOCR: jest.fn(),
  extractReceiptData: jest.fn(),
  categorizeExpense: jest.fn()
}));

const aiServices = require('../../src/services/aiServices');

// Mock email service
jest.mock('../../src/services/emailService', () => ({
  sendEmail: jest.fn()
}));

describe('ReceiptProcessingService', () => {
  let testUserId;
  let testOrganizationId;
  let testFile;
  let testReceiptId;

  beforeAll(async () => {
    // Create test user and organization
    const [user] = await db('users').insert({
      email: 'test@example.com',
      password_hash: 'hashed',
      role: 'admin'
    }).returning('*');

    testUserId = user.id;
    testOrganizationId = user.id; // Using user as organization for simplicity

    // Create test categories
    await db('expense_categories').insert({
      organization_id: testOrganizationId,
      name: 'Travel',
      code: 'TRAVEL',
      keywords: JSON.stringify(['gas', 'fuel', 'travel']),
      active: true
    });
  });

  beforeEach(async () => {
    // Clear AI service mocks
    jest.clearAllMocks();
    
    // Create a test file
    testFile = {
      originalname: 'test-receipt.jpg',
      path: path.join(__dirname, 'temp-test-file.jpg'),
      mimetype: 'image/jpeg',
      size: 1024
    };

    // Create a dummy file
    await fs.writeFile(testFile.path, 'dummy image content');
  });

  afterEach(async () => {
    // Clean up test files
    if (testFile && testFile.path && await fs.pathExists(testFile.path)) {
      await fs.remove(testFile.path);
    }

    // Clean up test receipts
    if (testReceiptId) {
      await db('expense_receipts').where('id', testReceiptId).del();
      testReceiptId = null;
    }
  });

  afterAll(async () => {
    // Clean up test data
    await db('users').where('id', testUserId).del();
    await db('expense_categories').where('organization_id', testOrganizationId).del();
  });

  describe('saveReceiptFile', () => {
    test('should save receipt file successfully', async () => {
      const receipt = await receiptProcessingService.saveReceiptFile(
        testFile,
        testUserId,
        testOrganizationId
      );

      expect(receipt).toBeDefined();
      expect(receipt.user_id).toBe(testUserId);
      expect(receipt.organization_id).toBe(testOrganizationId);
      expect(receipt.original_filename).toBe(testFile.originalname);
      expect(receipt.processing_status).toBe('uploaded');
      expect(receipt.file_hash).toBeDefined();

      testReceiptId = receipt.id;

      // Verify file was moved
      expect(await fs.pathExists(receipt.file_path)).toBe(true);
    });

    test('should detect duplicate receipts', async () => {
      // Save the file once
      const receipt1 = await receiptProcessingService.saveReceiptFile(
        testFile,
        testUserId,
        testOrganizationId
      );

      testReceiptId = receipt1.id;

      // Create a new file object with same content
      const duplicateFile = {
        ...testFile,
        path: path.join(__dirname, 'duplicate-test-file.jpg')
      };
      await fs.writeFile(duplicateFile.path, 'dummy image content');

      // Try to save duplicate
      await expect(
        receiptProcessingService.saveReceiptFile(
          duplicateFile,
          testUserId,
          testOrganizationId
        )
      ).rejects.toThrow('Duplicate receipt detected');

      // Clean up duplicate file
      await fs.remove(duplicateFile.path);
    });

    test('should handle missing file error', async () => {
      const invalidFile = {
        ...testFile,
        path: '/non/existent/path.jpg'
      };

      await expect(
        receiptProcessingService.saveReceiptFile(
          invalidFile,
          testUserId,
          testOrganizationId
        )
      ).rejects.toThrow();
    });
  });

  describe('processReceipt', () => {
    beforeEach(async () => {
      // Create a test receipt
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUserId,
        organization_id: testOrganizationId,
        original_filename: 'test-receipt.jpg',
        file_path: testFile.path,
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: crypto.createHash('sha256').update('test').digest('hex'),
        processing_status: 'uploaded'
      }).returning('*');

      testReceiptId = receipt.id;
    });

    test('should process receipt successfully with AI services', async () => {
      // Mock AI service responses
      aiServices.performOCR.mockResolvedValue({
        text: 'Shell Gas Station\nTotal: $45.67\nDate: 2024-01-15',
        confidence: 0.85,
        processingTime: 1500
      });

      aiServices.extractReceiptData.mockResolvedValue({
        vendorName: 'Shell Gas Station',
        totalAmount: 45.67,
        transactionDate: '2024-01-15',
        confidence: 0.9,
        tokensUsed: 150,
        model: 'gpt-4o-mini'
      });

      aiServices.categorizeExpense.mockResolvedValue({
        categoryId: 'test-category-id',
        categoryName: 'Travel',
        confidence: 0.8,
        reasoning: 'Gas station expense'
      });

      const results = await receiptProcessingService.processReceipt(testReceiptId);

      expect(results).toBeDefined();
      expect(results.receiptId).toBe(testReceiptId);
      expect(results.ocrResults).toBeDefined();
      expect(results.extractedData).toBeDefined();
      expect(results.categorization).toBeDefined();
      expect(results.errors).toHaveLength(0);

      // Verify AI services were called
      expect(aiServices.performOCR).toHaveBeenCalledWith(testFile.path);
      expect(aiServices.extractReceiptData).toHaveBeenCalled();
      expect(aiServices.categorizeExpense).toHaveBeenCalled();

      // Verify receipt status was updated
      const updatedReceipt = await db('expense_receipts').where('id', testReceiptId).first();
      expect(updatedReceipt.processing_status).toBe('processed');
      expect(updatedReceipt.processed_at).toBeDefined();

      // Verify expense data was saved
      const expenseData = await db('expense_data').where('receipt_id', testReceiptId).first();
      expect(expenseData).toBeDefined();
      expect(expenseData.vendor_name).toBe('Shell Gas Station');
      expect(expenseData.total_amount).toBe('45.67');
    });

    test('should handle OCR failure gracefully', async () => {
      aiServices.performOCR.mockRejectedValue(new Error('OCR service unavailable'));

      const results = await receiptProcessingService.processReceipt(testReceiptId);

      expect(results.errors).toContain('OCR failed: OCR service unavailable');
      expect(results.ocrResults).toBeNull();
      expect(results.extractedData).toBeNull();

      // Verify receipt status
      const updatedReceipt = await db('expense_receipts').where('id', testReceiptId).first();
      expect(updatedReceipt.processing_status).toBe('failed');
    });

    test('should handle partial processing with manual review', async () => {
      // Mock OCR success but low confidence extraction
      aiServices.performOCR.mockResolvedValue({
        text: 'Blurry receipt text...',
        confidence: 0.4,
        processingTime: 1500
      });

      aiServices.extractReceiptData.mockResolvedValue({
        vendorName: null,
        totalAmount: null,
        confidence: 0.3,
        tokensUsed: 100,
        model: 'gpt-4o-mini'
      });

      const results = await receiptProcessingService.processReceipt(testReceiptId);

      expect(results.extractedData.confidence).toBe(0.3);

      // Verify receipt requires manual review
      const updatedReceipt = await db('expense_receipts').where('id', testReceiptId).first();
      expect(updatedReceipt.processing_status).toBe('manual_review');

      const expenseData = await db('expense_data').where('receipt_id', testReceiptId).first();
      expect(expenseData.requires_manual_review).toBe(true);
    });

    test('should not process already processed receipt', async () => {
      // Update receipt status to processed
      await db('expense_receipts')
        .where('id', testReceiptId)
        .update({ processing_status: 'processed' });

      await expect(
        receiptProcessingService.processReceipt(testReceiptId)
      ).rejects.toThrow('Receipt already processed or in progress: processed');
    });

    test('should not process non-existent receipt', async () => {
      const fakeReceiptId = crypto.randomUUID();

      await expect(
        receiptProcessingService.processReceipt(fakeReceiptId)
      ).rejects.toThrow('Receipt not found');
    });
  });

  describe('requiresManualReview', () => {
    test('should identify receipts requiring manual review', async () => {
      // Create test receipt and expense data
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUserId,
        organization_id: testOrganizationId,
        original_filename: 'low-confidence.jpg',
        file_path: '/tmp/test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'test-hash-2',
        processing_status: 'processed'
      }).returning('*');

      await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUserId,
        organization_id: testOrganizationId,
        extraction_confidence: 0.5, // Low confidence
        requires_manual_review: true
      });

      const needsReview = await receiptProcessingService.requiresManualReview(receipt);
      expect(needsReview).toBe(true);

      // Clean up
      await db('expense_receipts').where('id', receipt.id).del();
    });

    test('should identify receipts that do not require manual review', async () => {
      // Create test receipt with high confidence
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUserId,
        organization_id: testOrganizationId,
        original_filename: 'high-confidence.jpg',
        file_path: '/tmp/test2.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'test-hash-3',
        processing_status: 'processed'
      }).returning('*');

      await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUserId,
        organization_id: testOrganizationId,
        vendor_name: 'Test Vendor',
        total_amount: 25.50,
        extraction_confidence: 0.9,
        requires_manual_review: false
      });

      const needsReview = await receiptProcessingService.requiresManualReview(receipt);
      expect(needsReview).toBe(false);

      // Clean up
      await db('expense_receipts').where('id', receipt.id).del();
    });
  });

  describe('deleteReceipt', () => {
    test('should delete receipt and associated data', async () => {
      // Create test receipt
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUserId,
        organization_id: testOrganizationId,
        original_filename: 'to-delete.jpg',
        file_path: testFile.path,
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'delete-hash',
        processing_status: 'uploaded'
      }).returning('*');

      await receiptProcessingService.deleteReceipt(receipt.id, testUserId);

      // Verify receipt was deleted
      const deletedReceipt = await db('expense_receipts').where('id', receipt.id).first();
      expect(deletedReceipt).toBeUndefined();

      // Verify file was deleted
      expect(await fs.pathExists(testFile.path)).toBe(false);
    });

    test('should not delete receipt belonging to different user', async () => {
      // Create different user
      const [otherUser] = await db('users').insert({
        email: 'other@example.com',
        password_hash: 'hashed',
        role: 'referee'
      }).returning('*');

      // Create receipt for other user
      const [receipt] = await db('expense_receipts').insert({
        user_id: otherUser.id,
        organization_id: otherUser.id,
        original_filename: 'other-user.jpg',
        file_path: '/tmp/other.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'other-hash',
        processing_status: 'uploaded'
      }).returning('*');

      await expect(
        receiptProcessingService.deleteReceipt(receipt.id, testUserId)
      ).rejects.toThrow('Receipt not found or access denied');

      // Clean up
      await db('expense_receipts').where('id', receipt.id).del();
      await db('users').where('id', otherUser.id).del();
    });
  });
});
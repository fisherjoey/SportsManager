const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const db = require('../config/database');
const aiServices = require('./aiServices');
const emailService = require('./emailService');

class ReceiptProcessingService {
  constructor() {
    this.uploadDir = process.env.RECEIPT_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'receipts');
    this.ensureUploadDirectory();
  }

  async ensureUploadDirectory() {
    try {
      await fs.ensureDir(this.uploadDir);
      console.log(`Receipt upload directory ready: ${this.uploadDir}`);
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Save uploaded receipt file and create database record
   * @param {Object} file - Multer file object
   * @param {string} userId - User ID who uploaded
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Receipt record
   */
  async saveReceiptFile(file, userId, organizationId) {
    try {
      // Generate file hash for duplicate detection
      const fileBuffer = await fs.readFile(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Check for duplicates
      const existingReceipt = await db('expense_receipts')
        .where({ file_hash: fileHash, user_id: userId })
        .first();
        
      if (existingReceipt) {
        await fs.remove(file.path); // Clean up temp file
        throw new Error('Duplicate receipt detected');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${Date.now()}_${crypto.randomUUID()}${fileExtension}`;
      const finalPath = path.join(this.uploadDir, uniqueFilename);
      
      // Move file to final location
      await fs.move(file.path, finalPath);
      
      // Create database record
      const receiptData = {
        user_id: userId,
        organization_id: organizationId,
        original_filename: file.originalname,
        file_path: finalPath,
        file_type: this.getFileType(file.mimetype),
        mime_type: file.mimetype,
        file_size: file.size,
        file_hash: fileHash,
        processing_status: 'uploaded'
      };

      const [receipt] = await db('expense_receipts').insert(receiptData).returning('*');
      
      console.log(`Receipt saved: ${receipt.id} - ${file.originalname}`);
      return receipt;
    } catch (error) {
      // Clean up temp file on error
      if (file.path && await fs.pathExists(file.path)) {
        await fs.remove(file.path);
      }
      throw error;
    }
  }

  /**
   * Process receipt through AI pipeline
   * @param {string} receiptId - Receipt ID to process
   * @returns {Promise<Object>} Processing results
   */
  async processReceipt(receiptId) {
    const receipt = await db('expense_receipts').where('id', receiptId).first();
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (receipt.processing_status !== 'uploaded') {
      throw new Error(`Receipt already processed or in progress: ${receipt.processing_status}`);
    }

    try {
      // Update status to processing
      await db('expense_receipts')
        .where('id', receiptId)
        .update({ processing_status: 'processing' });

      const results = {
        receiptId,
        ocrResults: null,
        extractedData: null,
        categorization: null,
        errors: []
      };

      // Step 1: Perform OCR
      try {
        console.log(`Starting OCR for receipt: ${receiptId}`);
        results.ocrResults = await this.performOCRWithLogging(receipt);
      } catch (error) {
        console.error('OCR failed:', error);
        results.errors.push(`OCR failed: ${error.message}`);
      }

      // Step 2: Extract structured data
      if (results.ocrResults && results.ocrResults.text) {
        try {
          console.log(`Extracting data for receipt: ${receiptId}`);
          results.extractedData = await this.extractDataWithLogging(receipt, results.ocrResults.text);
        } catch (error) {
          console.error('Data extraction failed:', error);
          results.errors.push(`Data extraction failed: ${error.message}`);
        }
      }

      // Step 3: Categorize expense
      if (results.extractedData) {
        try {
          console.log(`Categorizing expense for receipt: ${receiptId}`);
          results.categorization = await this.categorizeWithLogging(receipt, results.extractedData);
        } catch (error) {
          console.error('Categorization failed:', error);
          results.errors.push(`Categorization failed: ${error.message}`);
        }
      }

      // Step 4: Save results to database
      await this.saveProcessingResults(receipt, results);

      // Step 5: Send notification if configured
      if (process.env.ACCOUNTING_EMAIL) {
        await this.sendAccountingNotification(receipt, results);
      }

      const finalStatus = results.errors.length === 0 ? 'processed' : 
                         results.extractedData ? 'manual_review' : 'failed';

      await db('expense_receipts')
        .where('id', receiptId)
        .update({ 
          processing_status: finalStatus,
          processed_at: new Date(),
          processing_notes: results.errors.join('; ')
        });

      console.log(`Receipt processing completed: ${receiptId} - Status: ${finalStatus}`);
      return results;
      
    } catch (error) {
      console.error(`Receipt processing failed: ${receiptId}`, error);
      
      await db('expense_receipts')
        .where('id', receiptId)
        .update({ 
          processing_status: 'failed',
          processing_notes: error.message
        });
      
      throw error;
    }
  }

  /**
   * Perform OCR with logging
   * @private
   */
  async performOCRWithLogging(receipt) {
    const logId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      await db('ai_processing_logs').insert({
        id: logId,
        receipt_id: receipt.id,
        user_id: receipt.user_id,
        organization_id: receipt.organization_id,
        service_type: 'ocr',
        service_provider: 'google_vision',
        status: 'started',
        started_at: new Date()
      });

      const results = await aiServices.performOCR(receipt.file_path);
      const processingTime = Date.now() - startTime;

      await db('ai_processing_logs')
        .where('id', logId)
        .update({
          status: 'completed',
          output_data: JSON.stringify(results),
          processing_time_ms: processingTime,
          confidence_score: results.confidence,
          completed_at: new Date()
        });

      // Update receipt with OCR text
      await db('expense_receipts')
        .where('id', receipt.id)
        .update({ raw_ocr_text: results.text });

      return results;
    } catch (error) {
      await db('ai_processing_logs')
        .where('id', logId)
        .update({
          status: 'failed',
          error_message: error.message,
          processing_time_ms: Date.now() - startTime,
          completed_at: new Date()
        });
      throw error;
    }
  }

  /**
   * Extract data with logging
   * @private
   */
  async extractDataWithLogging(receipt, ocrText) {
    const logId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      await db('ai_processing_logs').insert({
        id: logId,
        receipt_id: receipt.id,
        user_id: receipt.user_id,
        organization_id: receipt.organization_id,
        service_type: 'llm',
        service_provider: 'deepseek',
        status: 'started',
        input_data: ocrText.substring(0, 1000), // First 1000 chars
        started_at: new Date()
      });

      const results = await aiServices.extractReceiptData(ocrText, receipt.original_filename);
      const processingTime = Date.now() - startTime;

      await db('ai_processing_logs')
        .where('id', logId)
        .update({
          status: 'completed',
          output_data: JSON.stringify(results),
          processing_time_ms: processingTime,
          confidence_score: results.confidence,
          tokens_used: results.tokensUsed,
          cost_usd: this.estimateDeepSeekCost(results.tokensUsed, results.model),
          completed_at: new Date()
        });

      return results;
    } catch (error) {
      await db('ai_processing_logs')
        .where('id', logId)
        .update({
          status: 'failed',
          error_message: error.message,
          processing_time_ms: Date.now() - startTime,
          completed_at: new Date()
        });
      throw error;
    }
  }

  /**
   * Categorize with logging
   * @private
   */
  async categorizeWithLogging(receipt, extractedData) {
    const categories = await db('expense_categories')
      .where({ organization_id: receipt.organization_id, active: true })
      .select('id', 'name', 'code', 'keywords', 'vendor_patterns');

    const logId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      await db('ai_processing_logs').insert({
        id: logId,
        receipt_id: receipt.id,
        user_id: receipt.user_id,
        organization_id: receipt.organization_id,
        service_type: 'categorization',
        service_provider: aiServices.openaiClient ? 'deepseek' : 'keyword_matching',
        status: 'started',
        started_at: new Date()
      });

      const results = await aiServices.categorizeExpense(extractedData, categories);
      const processingTime = Date.now() - startTime;

      await db('ai_processing_logs')
        .where('id', logId)
        .update({
          status: 'completed',
          output_data: JSON.stringify(results),
          processing_time_ms: processingTime,
          confidence_score: results.confidence,
          tokens_used: results.tokensUsed || 0,
          cost_usd: results.tokensUsed ? this.estimateDeepSeekCost(results.tokensUsed, 'deepseek-chat') : 0,
          completed_at: new Date()
        });

      return results;
    } catch (error) {
      await db('ai_processing_logs')
        .where('id', logId)
        .update({
          status: 'failed',
          error_message: error.message,
          processing_time_ms: Date.now() - startTime,
          completed_at: new Date()
        });
      throw error;
    }
  }

  /**
   * Save processing results to database
   * @private
   */
  async saveProcessingResults(receipt, results) {
    if (!results.extractedData) return;

    const expenseData = {
      receipt_id: receipt.id,
      user_id: receipt.user_id,
      organization_id: receipt.organization_id,
      vendor_name: results.extractedData.vendorName,
      vendor_address: results.extractedData.vendorAddress,
      vendor_phone: results.extractedData.vendorPhone,
      total_amount: results.extractedData.totalAmount,
      tax_amount: results.extractedData.taxAmount,
      subtotal_amount: results.extractedData.subtotalAmount,
      transaction_date: results.extractedData.transactionDate,
      transaction_time: results.extractedData.transactionTime,
      receipt_number: results.extractedData.receiptNumber,
      payment_method: results.extractedData.paymentMethod,
      line_items: JSON.stringify(results.extractedData.lineItems || []),
      ai_extracted_fields: JSON.stringify(results.extractedData),
      extraction_confidence: results.extractedData.confidence,
      requires_manual_review: results.extractedData.confidence < 0.7 || results.errors.length > 0
    };

    // Add categorization if available
    if (results.categorization) {
      expenseData.category_id = results.categorization.categoryId;
      expenseData.category_name = results.categorization.categoryName;
      expenseData.field_confidence_scores = JSON.stringify({
        categorization: results.categorization.confidence
      });
    }

    await db('expense_data').insert(expenseData);
  }

  /**
   * Send notification to accounting department
   * @private
   */
  async sendAccountingNotification(receipt, results) {
    try {
      const user = await db('users').where('id', receipt.user_id).first();
      const extractedData = results.extractedData;

      if (!extractedData) return;

      const emailData = {
        to: process.env.ACCOUNTING_EMAIL,
        subject: `New Expense Receipt: ${extractedData.vendorName} - $${extractedData.totalAmount}`,
        html: this.generateAccountingEmailHTML(user, receipt, extractedData, results)
      };

      await emailService.sendEmail(emailData);
      console.log(`Accounting notification sent for receipt: ${receipt.id}`);
    } catch (error) {
      console.error('Failed to send accounting notification:', error);
    }
  }

  /**
   * Generate HTML email for accounting notifications
   * @private
   */
  generateAccountingEmailHTML(user, receipt, extractedData, results) {
    const confidenceColor = extractedData.confidence >= 0.8 ? '#10B981' : 
                           extractedData.confidence >= 0.6 ? '#F59E0B' : '#EF4444';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Expense Receipt Processed</h2>
        
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Receipt Information</h3>
          <p><strong>Submitted by:</strong> ${user.email}</p>
          <p><strong>File:</strong> ${receipt.original_filename}</p>
          <p><strong>Upload Date:</strong> ${new Date(receipt.uploaded_at).toLocaleString()}</p>
          <p><strong>Processing Confidence:</strong> 
            <span style="color: ${confidenceColor}; font-weight: bold;">
              ${Math.round(extractedData.confidence * 100)}%
            </span>
          </p>
        </div>

        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Extracted Data</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Vendor:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${extractedData.vendorName || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Amount:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">$${extractedData.totalAmount || '0.00'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Date:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${extractedData.transactionDate || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Category:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${results.categorization?.categoryName || 'Uncategorized'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Payment Method:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${extractedData.paymentMethod || 'N/A'}</td></tr>
          </table>
        </div>

        ${results.errors.length > 0 ? `
        <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #DC2626;">Processing Issues</h3>
          <ul style="color: #DC2626;">
            ${results.errors.map(error => `<li>${error}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280;">
          <p>This email was automatically generated by the Sports Management App expense processing system.</p>
          <p>Receipt ID: ${receipt.id}</p>
        </div>
      </div>
    `;
  }

  /**
   * Get file type from mime type
   * @private
   */
  getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'other';
  }

  /**
   * Estimate DeepSeek API costs
   * @private
   */
  estimateDeepSeekCost(tokens, model) {
    // DeepSeek cost estimates in USD (as of 2025)
    const costPerToken = {
      'deepseek-chat': 0.0000002,  // $0.2 per 1M tokens
      'deepseek-coder': 0.0000002  // $0.2 per 1M tokens
    };
    
    return tokens * (costPerToken[model] || costPerToken['deepseek-chat']);
  }

  /**
   * Check if receipt needs manual review
   * @param {Object} receipt - Receipt record
   * @returns {Promise<boolean>}
   */
  async requiresManualReview(receipt) {
    const expenseData = await db('expense_data')
      .where('receipt_id', receipt.id)
      .first();
      
    if (!expenseData) return true;
    
    return expenseData.requires_manual_review ||
           expenseData.extraction_confidence < 0.7 ||
           !expenseData.total_amount ||
           !expenseData.vendor_name;
  }

  /**
   * Delete receipt and associated data
   * @param {string} receiptId - Receipt ID to delete
   * @param {string} userId - User requesting deletion
   */
  async deleteReceipt(receiptId, userId) {
    const receipt = await db('expense_receipts')
      .where({ id: receiptId, user_id: userId })
      .first();
      
    if (!receipt) {
      throw new Error('Receipt not found or access denied');
    }

    // Delete file
    if (await fs.pathExists(receipt.file_path)) {
      await fs.remove(receipt.file_path);
    }

    // Database cleanup handled by CASCADE foreign keys
    await db('expense_receipts').where('id', receiptId).del();
    
    console.log(`Receipt deleted: ${receiptId}`);
  }
}

module.exports = new ReceiptProcessingService();
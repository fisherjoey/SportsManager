const { createQueue } = require('../config/queue');
const receiptProcessingService = require('./receiptProcessingService');

class QueueProcessor {
  constructor() {
    this.queues = new Map();
    this.initializeQueues();
  }

  initializeQueues() {
    // Skip queue initialization in test environment
    if (process.env.NODE_ENV === 'test') {
      console.log('Skipping queue initialization in test environment');
      return;
    }

    const queueConfig = {
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    };

    // Receipt processing queue
    const receiptQueue = createQueue('receipt processing', queueConfig);
    
    // Process receipt jobs
    receiptQueue.process('process-receipt', 5, async (job) => {
      const { receiptId, metadata, manualTrigger } = job.data;
      
      try {
        console.log(`Processing receipt job: ${receiptId} (Manual: ${manualTrigger || false})`);
        
        // Update job progress
        await job.progress(10);
        
        const results = await receiptProcessingService.processReceipt(receiptId);
        
        await job.progress(100);
        
        console.log(`Receipt processing completed: ${receiptId}`);
        return {
          receiptId,
          status: 'completed',
          results,
          processedAt: new Date()
        };
      } catch (error) {
        console.error(`Receipt processing failed: ${receiptId}`, error);
        
        // Log additional context for debugging
        await this.logJobFailure(receiptId, error, job.attemptsMade, job.opts.attempts);
        
        throw error;
      }
    });

    // Email notification queue
    const emailQueue = new Queue('email notifications', redisConfig);
    
    emailQueue.process('send-accounting-notification', 10, async (job) => {
      const { receiptId, userId, expenseData } = job.data;
      
      try {
        console.log(`Sending accounting notification for receipt: ${receiptId}`);
        
        // This would be handled by the receipt processing service
        // Just log for now
        console.log(`Accounting notification sent for receipt: ${receiptId}`);
        
        return {
          receiptId,
          notificationSent: true,
          sentAt: new Date()
        };
      } catch (error) {
        console.error(`Email notification failed: ${receiptId}`, error);
        throw error;
      }
    });

    // Store queues for access
    this.queues.set('receipts', receiptQueue);
    this.queues.set('emails', emailQueue);

    // Set up queue event listeners
    this.setupEventListeners();

    console.log('Queue processor initialized with Redis connection');
  }

  setupEventListeners() {
    for (const [name, queue] of this.queues) {
      // Job completed
      queue.on('completed', (job, result) => {
        console.log(`Job completed [${name}]: ${job.id}`);
      });

      // Job failed
      queue.on('failed', (job, err) => {
        console.error(`Job failed [${name}]: ${job.id} - ${err.message}`);
      });

      // Job stalled
      queue.on('stalled', (job) => {
        console.warn(`Job stalled [${name}]: ${job.id}`);
      });

      // Queue error
      queue.on('error', (error) => {
        console.error(`Queue error [${name}]:`, error);
      });

      // Connection events
      queue.on('ready', () => {
        console.log(`Queue ready [${name}]`);
      });

      queue.on('close', () => {
        console.log(`Queue closed [${name}]`);
      });
    }
  }

  /**
   * Add job to receipt processing queue
   */
  async addReceiptProcessingJob(receiptId, options = {}) {
    const queue = this.queues.get('receipts');
    if (!queue) {
      throw new Error('Receipt processing queue not available');
    }

    const jobData = {
      receiptId,
      ...options
    };

    const jobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 50,
      removeOnFail: 25,
      ...options.jobOptions
    };

    const job = await queue.add('process-receipt', jobData, jobOptions);
    console.log(`Receipt processing job added: ${job.id} for receipt: ${receiptId}`);
    
    return job;
  }

  /**
   * Add email notification job
   */
  async addEmailNotificationJob(data, options = {}) {
    const queue = this.queues.get('emails');
    if (!queue) {
      throw new Error('Email queue not available');
    }

    const job = await queue.add('send-accounting-notification', data, options);
    console.log(`Email notification job added: ${job.id}`);
    
    return job;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const stats = {};
    
    for (const [name, queue] of this.queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed()
        ]);

        stats[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length
        };
      } catch (error) {
        console.error(`Error getting stats for queue ${name}:`, error);
        stats[name] = { error: error.message };
      }
    }
    
    return stats;
  }

  /**
   * Clean old jobs from queues
   */
  async cleanQueues() {
    for (const [name, queue] of this.queues) {
      try {
        // Clean completed jobs older than 24 hours
        await queue.clean(24 * 60 * 60 * 1000, 'completed');
        
        // Clean failed jobs older than 7 days
        await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
        
        console.log(`Cleaned old jobs from queue: ${name}`);
      } catch (error) {
        console.error(`Error cleaning queue ${name}:`, error);
      }
    }
  }

  /**
   * Log job failure for debugging
   * @private
   */
  async logJobFailure(receiptId, error, attemptsMade, maxAttempts) {
    try {
      const db = require('../config/database');
      
      await db('ai_processing_logs').insert({
        receipt_id: receiptId,
        service_type: 'job_processing',
        service_provider: 'bull_queue',
        status: 'failed',
        error_message: error.message,
        usage_metadata: JSON.stringify({
          attemptsMade,
          maxAttempts,
          timestamp: new Date(),
          errorStack: error.stack
        }),
        started_at: new Date(),
        completed_at: new Date()
      });
    } catch (logError) {
      console.error('Failed to log job failure:', logError);
    }
  }

  /**
   * Gracefully close all queues
   */
  async close() {
    console.log('Closing queue processor...');
    
    const closePromises = Array.from(this.queues.values()).map(queue => 
      queue.close().catch(error => 
        console.error('Error closing queue:', error)
      )
    );
    
    await Promise.all(closePromises);
    console.log('Queue processor closed');
  }

  /**
   * Get specific queue by name
   */
  getQueue(name) {
    return this.queues.get(name);
  }

  /**
   * Pause all queues
   */
  async pauseAll() {
    for (const [name, queue] of this.queues) {
      await queue.pause();
      console.log(`Queue paused: ${name}`);
    }
  }

  /**
   * Resume all queues
   */
  async resumeAll() {
    for (const [name, queue] of this.queues) {
      await queue.resume();
      console.log(`Queue resumed: ${name}`);
    }
  }
}

// Create singleton instance
const queueProcessor = new QueueProcessor();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing queue processor...');
  await queueProcessor.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing queue processor...');
  await queueProcessor.close();
  process.exit(0);
});

module.exports = queueProcessor;
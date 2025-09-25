/**
 * @fileoverview Queue Configuration
 * @description TypeScript queue configuration with Bull and Redis support
 * Includes mock queue for testing environments
 */

import Bull from 'bull';
import { RedisOptions } from 'ioredis';

// Generic job data interface for type safety
export interface JobData {
  [key: string]: any;
}

// Specific job interfaces for type safety
export interface EmailJobData extends JobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface AssignmentJobData extends JobData {
  gameId: string;
  refereeIds?: string[];
  constraints?: Record<string, any>;
  deadline?: Date;
}

export interface NotificationJobData extends JobData {
  userId: string;
  type: 'email' | 'sms' | 'push';
  content: Record<string, any>;
  scheduledFor?: Date;
}

// Union type for all job data types
export type AllJobData = EmailJobData | AssignmentJobData | NotificationJobData | JobData;

// Enhanced job options interface with Bull-specific typing
export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  repeat?: any;
  backoff?: any;
  lifo?: boolean;
  timeout?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  jobId?: Bull.JobId;
}

// Job processing options
export interface ProcessOptions {
  concurrency?: number;
  stalledInterval?: number;
  maxStalledCount?: number;
}

// Queue events for type safety
export type QueueEventType =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'resumed'
  | 'cleaned'
  | 'drained'
  | 'removed'
  | 'stalled'
  | 'progress';

// Job status type
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

// Enhanced mock job interface for testing
export interface MockJob<T = JobData> {
  id: Bull.JobId;
  data: T;
  options: JobOptions;
  processedOn: number | null;
  finishedOn: number | null;
  failedReason?: string;
  stacktrace?: string[];
  progress?: number;
  delay?: number;
  timestamp?: number;
  attemptsMade?: number;
  returnvalue?: any;
}

// Mock job result interface
export interface MockJobResult<T = any> {
  job: MockJob;
  result?: T;
  error?: Error;
}

// Enhanced process callback function types
export type ProcessCallbackFunction<T = JobData, R = any> = (
  job: Bull.Job<T>,
  done?: Bull.DoneCallback
) => Promise<R> | R;

export type ProcessCallbackWithConcurrency<T = JobData, R = any> = {
  concurrency: number;
  process: ProcessCallbackFunction<T, R>;
};

// Event handler types
export type JobEventHandler<T = JobData> = (job: Bull.Job<T>) => void;
export type JobProgressHandler<T = JobData> = (job: Bull.Job<T>, progress: number) => void;
export type JobErrorHandler<T = JobData> = (job: Bull.Job<T>, error: Error) => void;
export type JobCompletedHandler<T = JobData, R = any> = (job: Bull.Job<T>, result: R) => void;

// Enhanced mock queue class for testing environments
export class MockQueueClass<T = JobData> {
  public readonly name: string;
  public jobs: MockJob<T>[];
  public handler?: ProcessCallbackFunction<T>;
  private jobIdCounter: number;
  private eventHandlers: Map<string, Function[]>;
  private _isPaused: boolean;
  private isProcessing: boolean;

  constructor(name: string) {
    this.name = name;
    this.jobs = [];
    this.jobIdCounter = 1;
    this.eventHandlers = new Map();
    this._isPaused = false;
    this.isProcessing = false;
  }

  // Mock implementation for Bull queue compatibility
  async isPaused(): Promise<boolean> {
    return this._isPaused;
  }

  async add(data: T, options: JobOptions = {}): Promise<MockJob<T>> {
    if (this._isPaused) {
      throw new Error('Queue is paused');
    }

    const timestamp = Date.now();
    const job: MockJob<T> = {
      id: options.jobId || this.jobIdCounter++,
      data,
      options,
      processedOn: null,
      finishedOn: null,
      progress: 0,
      delay: options.delay || 0,
      timestamp,
      attemptsMade: 0
    };

    this.jobs.push(job);
    this.emit('waiting', job);

    // Simulate processing delay
    if (options.delay) {
      setTimeout(() => {
        this.emit('delayed', job);
      }, options.delay);
    }

    return job;
  }

  async process(handler: ProcessCallbackFunction<T>): Promise<void>;
  async process(concurrency: number, handler: ProcessCallbackFunction<T>): Promise<void>;
  async process(
    handlerOrConcurrency: ProcessCallbackFunction<T> | number,
    handler?: ProcessCallbackFunction<T>
  ): Promise<void> {
    if (typeof handlerOrConcurrency === 'function') {
      this.handler = handlerOrConcurrency;
    } else if (typeof handlerOrConcurrency === 'number' && handler) {
      this.handler = handler;
    }

    // In mock mode, we store the handler but don't process automatically
    this.isProcessing = true;
  }

  // Manual job processing for testing
  async processJob(jobId: Bull.JobId): Promise<MockJobResult<T>> {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job || !this.handler) {
      throw new Error('Job not found or no handler set');
    }

    try {
      job.processedOn = Date.now();
      this.emit('active', job);

      const result = await this.handler(job as any);

      job.finishedOn = Date.now();
      job.returnvalue = result;
      this.emit('completed', job, result);

      return { job, result };
    } catch (error) {
      job.failedReason = (error as Error).message;
      job.stacktrace = (error as Error).stack?.split('\n');
      this.emit('failed', job, error);

      return { job, error: error as Error };
    }
  }

  async close(): Promise<void> {
    this.isProcessing = false;
    this.jobs = [];
    this.eventHandlers.clear();
    this.emit('closed');
  }

  async empty(): Promise<void> {
    const removedJobs = this.jobs.length;
    this.jobs = [];
    this.emit('cleaned', removedJobs);
  }

  async getJobs(types?: JobStatus[]): Promise<MockJob<T>[]> {
    if (!types) {
      return [...this.jobs];
    }

    return this.jobs.filter(job => {
      if (types.includes('waiting') && !job.processedOn) return true;
      if (types.includes('active') && job.processedOn && !job.finishedOn) return true;
      if (types.includes('completed') && job.finishedOn && !job.failedReason) return true;
      if (types.includes('failed') && job.failedReason) return true;
      return false;
    });
  }

  async pause(): Promise<void> {
    this._isPaused = true;
    this.emit('paused');
  }

  async resume(): Promise<void> {
    this._isPaused = false;
    this.emit('resumed');
  }

  on(event: string, handler: (...args: any[]) => void): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler?: (...args: any[]) => void): this {
    if (handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    } else {
      this.eventHandlers.delete(event);
    }
    return this;
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in mock queue event handler for ${event}:`, error);
        }
      });
    }
  }

  // Additional methods for testing
  async getJobById(id: string | number): Promise<MockJob<T> | undefined> {
    return this.jobs.find(job => job.id === id);
  }

  async getJobCounts(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    return {
      waiting: this.jobs.filter(job => !job.processedOn).length,
      active: 0, // Mock doesn't track active jobs
      completed: this.jobs.filter(job => job.finishedOn).length,
      failed: 0 // Mock doesn't track failed jobs
    };
  }
}

// Enhanced Redis connection options interface
export interface RedisConnectionOptions extends Partial<RedisOptions> {
  host?: string;
  port?: number;
  password?: string;
  username?: string;
  db?: number;
  family?: 4 | 6;
  keepAlive?: number;
  connectionName?: string;
  retryStrategy?: (times: number) => number | null;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
}

// Enhanced queue creation options interface
export interface QueueCreationOptions {
  redis?: RedisConnectionOptions;
  defaultJobOptions?: JobOptions;
  prefix?: string;
  settings?: any;
  metrics?: {
    maxDataPoints?: number;
  };
}

// Queue health status interface
export interface QueueHealth {
  name: string;
  isHealthy: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  error?: string;
}

// Queue metrics interface
export interface QueueMetrics {
  jobCounts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  processingRate: number;
  avgProcessingTime: number;
  errorRate: number;
}

// Environment helper functions
const isTestEnvironment = (): boolean => process.env.NODE_ENV === 'test';
const isRedisDisabled = (): boolean => process.env.DISABLE_REDIS === 'true';

// Default Redis connection options
const getDefaultRedisOptions = (): RedisConnectionOptions => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number): number | null => {
    if (times > 3) {
      console.error(`Failed to connect to Redis after ${times} attempts`);
      return null;
    }
    return Math.min(times * 100, 3000);
  }
});

// Enhanced default job options with environment-based configuration
const getDefaultJobOptions = (): JobOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE || (isProduction ? '100' : '50'), 10),
    removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL || '50', 10),
    attempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS || '3', 10),
    backoff: 'exponential',
    timeout: parseInt(process.env.QUEUE_JOB_TIMEOUT || '60000', 10), // 1 minute default
    priority: 5 // normal priority
  };
};

// Priority mapping for semantic priorities
const priorityMap: Record<string, number> = {
  'low': 1,
  'normal': 5,
  'high': 10,
  'critical': 20
};

// Helper to normalize priority
const normalizePriority = (priority?: number | string): number => {
  if (typeof priority === 'string') {
    return priorityMap[priority] || priorityMap.normal;
  }
  return priority || priorityMap.normal;
};

// Enhanced factory function to create appropriate queue based on environment
export function createQueue<T = AllJobData>(
  name: string,
  options: QueueCreationOptions = {}
): Bull.Queue<T> | MockQueueClass<T> {
  // Validate queue name
  if (!name || typeof name !== 'string') {
    throw new Error('Queue name must be a non-empty string');
  }

  // Use mock queue in test environment or when Redis is disabled
  if (isTestEnvironment() || isRedisDisabled()) {
    console.log(`📋 Queue: Using MockQueue for "${name}" (test mode or Redis disabled)`);
    return new MockQueueClass<T>(name);
  }

  // Production queue with Redis
  const defaultOptions: QueueCreationOptions = {
    redis: getDefaultRedisOptions(),
    defaultJobOptions: getDefaultJobOptions(),
    prefix: process.env.QUEUE_PREFIX || 'sportsmanager',
    settings: {
      stalledInterval: parseInt(process.env.QUEUE_STALLED_INTERVAL || '30000', 10),
      maxStalledCount: parseInt(process.env.QUEUE_MAX_STALLED_COUNT || '1', 10),
      retryProcessDelay: parseInt(process.env.QUEUE_RETRY_PROCESS_DELAY || '5000', 10)
    }
  };

  const mergedOptions: QueueCreationOptions = {
    ...defaultOptions,
    ...options,
    redis: {
      ...defaultOptions.redis,
      ...options.redis
    },
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      ...options.defaultJobOptions
    },
    settings: {
      ...defaultOptions.settings,
      ...options.settings
    }
  };

  // Ensure priority is always a number
  if (mergedOptions.defaultJobOptions?.priority !== undefined) {
    mergedOptions.defaultJobOptions.priority = normalizePriority(
      mergedOptions.defaultJobOptions.priority
    );
  }

  console.log(`📋 Queue: Creating Redis-backed queue "${name}" with options:`, {
    redis: {
      host: mergedOptions.redis?.host,
      port: mergedOptions.redis?.port,
      db: mergedOptions.redis?.db
    },
    prefix: mergedOptions.prefix
  });

  return new Bull<T>(name, mergedOptions);
}

// Enhanced queue manager for handling multiple queues
export class QueueManager {
  private queues: Map<string, Bull.Queue | MockQueueClass> = new Map();
  private queueOptions: Map<string, QueueCreationOptions> = new Map();

  public createQueue<T = AllJobData>(
    name: string,
    options?: QueueCreationOptions
  ): Bull.Queue<T> | MockQueueClass<T> {
    if (this.queues.has(name)) {
      console.warn(`Queue "${name}" already exists, returning existing instance`);
      return this.queues.get(name) as Bull.Queue<T> | MockQueueClass<T>;
    }

    const queue = createQueue<T>(name, options);
    this.queues.set(name, queue);

    if (options) {
      this.queueOptions.set(name, options);
    }

    // Setup common event handlers for monitoring
    this.setupQueueMonitoring(queue, name);

    return queue;
  }

  public getQueue<T = AllJobData>(name: string): Bull.Queue<T> | MockQueueClass<T> | undefined {
    return this.queues.get(name) as Bull.Queue<T> | MockQueueClass<T> | undefined;
  }

  public hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  public async removeQueue(name: string): Promise<boolean> {
    const queue = this.queues.get(name);
    if (!queue) {
      return false;
    }

    try {
      await queue.close();
      this.queues.delete(name);
      this.queueOptions.delete(name);
      console.log(`✅ Queue Manager: Removed queue "${name}"`);
      return true;
    } catch (error) {
      console.error(`Error removing queue "${name}":`, error);
      return false;
    }
  }

  public async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.entries()).map(async ([name, queue]) => {
      try {
        await queue.close();
        console.log(`✅ Closed queue: ${name}`);
      } catch (error) {
        console.error(`Error closing queue "${name}":`, error);
      }
    });

    await Promise.all(closePromises);
    this.queues.clear();
    this.queueOptions.clear();
    console.log('✅ Queue Manager: All queues closed');
  }

  public getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  public getQueueCount(): number {
    return this.queues.size;
  }

  public getQueueOptions(name: string): QueueCreationOptions | undefined {
    return this.queueOptions.get(name);
  }

  public async getQueueMetrics(name: string): Promise<QueueMetrics | null> {
    const queue = this.queues.get(name);
    if (!queue) {
      return null;
    }

    try {
      if (queue instanceof MockQueueClass) {
        const jobs = await queue.getJobs();
        return {
          jobCounts: {
            waiting: jobs.filter(j => !j.processedOn).length,
            active: 0,
            completed: jobs.filter(j => j.finishedOn && !j.failedReason).length,
            failed: jobs.filter(j => j.failedReason).length,
            delayed: 0,
            paused: 0
          },
          processingRate: 0,
          avgProcessingTime: 0,
          errorRate: 0
        };
      }

      // For Bull queues
      const bullQueue = queue as Bull.Queue;
      const jobCounts = await bullQueue.getJobCounts();

      return {
        jobCounts: {
          waiting: jobCounts.waiting || 0,
          active: jobCounts.active || 0,
          completed: jobCounts.completed || 0,
          failed: jobCounts.failed || 0,
          delayed: jobCounts.delayed || 0,
          paused: 0
        },
        processingRate: 0, // Would need historical data to calculate
        avgProcessingTime: 0, // Would need historical data to calculate
        errorRate: jobCounts.failed && jobCounts.completed ?
          jobCounts.failed / (jobCounts.failed + jobCounts.completed) : 0
      };
    } catch (error) {
      console.error(`Error getting metrics for queue "${name}":`, error);
      return null;
    }
  }

  private setupQueueMonitoring(queue: Bull.Queue | MockQueueClass, name: string): void {
    // Common monitoring for both Bull and Mock queues
    queue.on('error', (error) => {
      console.error(`❌ Queue "${name}" error:`, error);
    });

    queue.on('waiting', (jobId) => {
      console.debug(`📄 Queue "${name}": Job ${jobId} waiting`);
    });

    queue.on('active', (job) => {
      console.debug(`⚙️ Queue "${name}": Job ${job.id} started`);
    });

    queue.on('completed', (job, result) => {
      console.debug(`✅ Queue "${name}": Job ${job.id} completed`);
    });

    queue.on('failed', (job, error) => {
      console.error(`❌ Queue "${name}": Job ${job.id} failed:`, error.message);
    });

    queue.on('stalled', (job) => {
      console.warn(`⚠️ Queue "${name}": Job ${job.id} stalled`);
    });
  }
}

// Export singleton queue manager
export const queueManager = new QueueManager();

// Enhanced health check for individual queue
export const healthCheckQueue = async (queue: Bull.Queue | MockQueueClass): Promise<QueueHealth> => {
  const queueName = queue.name;

  try {
    if (queue instanceof MockQueueClass) {
      const jobs = await queue.getJobs();
      return {
        name: queueName,
        isHealthy: true,
        waiting: jobs.filter(j => !j.processedOn).length,
        active: 0,
        completed: jobs.filter(j => j.finishedOn && !j.failedReason).length,
        failed: jobs.filter(j => j.failedReason).length,
        delayed: 0,
        paused: false
      };
    }

    // For Bull queues
    const bullQueue = queue as Bull.Queue;
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      bullQueue.getWaiting(),
      bullQueue.getActive(),
      bullQueue.getCompleted(),
      bullQueue.getFailed(),
      bullQueue.getDelayed()
    ]);

    const isPaused = await bullQueue.isPaused();

    return {
      name: queueName,
      isHealthy: true,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: isPaused
    };
  } catch (error) {
    return {
      name: queueName,
      isHealthy: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: false,
      error: (error as Error).message
    };
  }
};

// Health check for all queues
export const healthCheckQueues = async (): Promise<{
  isHealthy: boolean;
  queues: QueueHealth[];
  summary: {
    totalQueues: number;
    healthyQueues: number;
    totalJobs: number;
  };
}> => {
  if (isTestEnvironment() || isRedisDisabled()) {
    return {
      isHealthy: true,
      queues: [],
      summary: { totalQueues: 0, healthyQueues: 0, totalJobs: 0 }
    };
  }

  try {
    // Get all queues from the queue manager
    const queueNames = queueManager.getQueueNames();
    const healthChecks = await Promise.all(
      queueNames.map(async (name) => {
        const queue = queueManager.getQueue(name);
        return queue ? healthCheckQueue(queue) : null;
      })
    );

    const validHealthChecks = healthChecks.filter(Boolean) as QueueHealth[];
    const healthyQueues = validHealthChecks.filter(q => q.isHealthy);
    const totalJobs = validHealthChecks.reduce(
      (sum, q) => sum + q.waiting + q.active + q.completed + q.failed + q.delayed,
      0
    );

    return {
      isHealthy: healthyQueues.length === validHealthChecks.length,
      queues: validHealthChecks,
      summary: {
        totalQueues: validHealthChecks.length,
        healthyQueues: healthyQueues.length,
        totalJobs
      }
    };
  } catch (error) {
    console.error('Queue health check failed:', error);
    return {
      isHealthy: false,
      queues: [],
      summary: { totalQueues: 0, healthyQueues: 0, totalJobs: 0 }
    };
  }
};

// Export the MockQueue class and utility functions
export const MockQueue = MockQueueClass;

// Utility function to create typed queues
export const createTypedQueue = {
  email: (name: string, options?: QueueCreationOptions) =>
    createQueue<EmailJobData>(name, options),
  assignment: (name: string, options?: QueueCreationOptions) =>
    createQueue<AssignmentJobData>(name, options),
  notification: (name: string, options?: QueueCreationOptions) =>
    createQueue<NotificationJobData>(name, options),
  generic: <T extends JobData>(name: string, options?: QueueCreationOptions) =>
    createQueue<T>(name, options)
};

// Queue event emitter helpers
export const setupQueueEventHandlers = <T = JobData>(
  queue: Bull.Queue<T>,
  handlers: Partial<{
    onWaiting: (jobId: Bull.JobId) => void;
    onActive: JobEventHandler<T>;
    onCompleted: JobCompletedHandler<T>;
    onFailed: JobErrorHandler<T>;
    onProgress: JobProgressHandler<T>;
    onStalled: JobEventHandler<T>;
    onRemoved: JobEventHandler<T>;
  }>
): void => {
  if (handlers.onWaiting) queue.on('waiting', handlers.onWaiting);
  if (handlers.onActive) queue.on('active', handlers.onActive);
  if (handlers.onCompleted) queue.on('completed', handlers.onCompleted);
  if (handlers.onFailed) queue.on('failed', handlers.onFailed);
  if (handlers.onProgress) queue.on('progress', handlers.onProgress);
  if (handlers.onStalled) queue.on('stalled', handlers.onStalled);
  if (handlers.onRemoved) queue.on('removed', handlers.onRemoved);
};

// Helper to add job with normalized priority
export const addJobWithPriority = async <T = JobData>(
  queue: Bull.Queue<T> | MockQueueClass<T>,
  jobData: T,
  priority: number | 'low' | 'normal' | 'high' | 'critical',
  options: Omit<JobOptions, 'priority'> = {}
): Promise<any> => {
  const normalizedPriority = normalizePriority(priority);
  return queue.add(jobData, { ...options, priority: normalizedPriority });
};

// Export default function and all types
export default createQueue;

// Re-export Bull types for convenience
export type { Job, JobId, DoneCallback } from 'bull';
export { default as Bull } from 'bull';

// Type guards
export const isBullQueue = (queue: any): queue is Bull.Queue => {
  return queue && typeof queue.add === 'function' && typeof queue.process === 'function' && !(queue instanceof MockQueueClass);
};

export const isMockQueue = (queue: any): queue is MockQueueClass => {
  return queue instanceof MockQueueClass;
};

// Constants
export const QUEUE_EVENTS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  CLEANED: 'cleaned',
  DRAINED: 'drained',
  REMOVED: 'removed',
  STALLED: 'stalled',
  PROGRESS: 'progress'
} as const;

export const JOB_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 20
} as const;
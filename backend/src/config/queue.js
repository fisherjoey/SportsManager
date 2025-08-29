const Queue = require('bull');

// In test environment, use a mock queue that doesn't require Redis
class MockQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
  }

  async add(data, options = {}) {
    const job = {
      id: Date.now(),
      data,
      options,
      processedOn: null,
      finishedOn: null
    };
    this.jobs.push(job);
    return job;
  }

  async process(handler) {
    // In tests, we don't actually process jobs
    this.handler = handler;
  }

  async close() {
    // No-op for mock
  }

  async empty() {
    this.jobs = [];
  }

  async getJobs() {
    return this.jobs;
  }

  on() {
    // No-op for mock - ignore event listeners
    return this;
  }
}

// Factory function to create appropriate queue based on environment
function createQueue(name, options = {}) {
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_REDIS === 'true') {
    return new MockQueue(name);
  }
  
  // Production queue with Redis
  const defaultOptions = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error(`Failed to connect to Redis after ${times} attempts`);
          return null;
        }
        return Math.min(times * 100, 3000);
      }
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  };

  return new Queue(name, { ...defaultOptions, ...options });
}

module.exports = {
  createQueue,
  MockQueue
};
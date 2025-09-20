/**
 * @fileoverview Queue Configuration Bridge
 * @description JavaScript bridge for backward compatibility during TS migration
 * This file re-exports the TypeScript queue configuration
 */

// Import TypeScript configuration
const queue = require('./queue.ts');

// Re-export the createQueue function as default for JavaScript compatibility
module.exports = queue.default;

// Export all utilities for JavaScript compatibility
module.exports.createQueue = queue.createQueue;
module.exports.MockQueue = queue.MockQueue;
module.exports.MockQueueClass = queue.MockQueueClass;
module.exports.queueManager = queue.queueManager;
module.exports.healthCheckQueues = queue.healthCheckQueues;
module.exports.healthCheckQueue = queue.healthCheckQueue;
module.exports.createTypedQueue = queue.createTypedQueue;
module.exports.setupQueueEventHandlers = queue.setupQueueEventHandlers;
module.exports.addJobWithPriority = queue.addJobWithPriority;
module.exports.isBullQueue = queue.isBullQueue;
module.exports.isMockQueue = queue.isMockQueue;
module.exports.QUEUE_EVENTS = queue.QUEUE_EVENTS;
module.exports.JOB_PRIORITIES = queue.JOB_PRIORITIES;

// Export Bull for direct access
module.exports.Bull = queue.Bull;

// Legacy compatibility aliases
module.exports.QueueManager = queue.QueueManager;
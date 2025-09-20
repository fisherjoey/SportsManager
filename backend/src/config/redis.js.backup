/**
 * @fileoverview Redis Configuration
 * 
 * Configures Redis client for caching and queue management
 * Falls back gracefully when Redis is not available
 */

const redis = require('redis');

let client = null;

// Only initialize Redis if not disabled
if (!process.env.DISABLE_REDIS) {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    client = redis.createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log('❌ Redis: Max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });

    client.on('connect', () => {
      console.log('✅ Redis: Connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis: Ready');
      client.isReady = true;
    });

    client.on('end', () => {
      console.log('❌ Redis: Disconnected');
      client.isReady = false;
    });

    // Connect to Redis
    client.connect().catch(err => {
      console.error('❌ Redis: Failed to connect:', err.message);
      client = null;
    });
  } catch (error) {
    console.warn('⚠️ Redis: Initialization failed:', error.message);
    client = null;
  }
} else {
  console.log('ℹ️ Redis: Disabled by DISABLE_REDIS environment variable');
}

module.exports = client;
/**
 * @fileoverview Redis Configuration
 * @description TypeScript Redis client configuration for caching and queue management
 * Falls back gracefully when Redis is not available
 */

// Use require to avoid dependency issues during migration
const redis = require('redis');

// Define Redis client type with basic interface
export interface RedisClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  quit(): Promise<void>;
  ping(): Promise<string>;
  on(event: string, handler: (...args: any[]) => void): void;
  flushAll(): Promise<string>;
  [key: string]: any;
}

// Extended client interface with our custom properties
export interface ExtendedRedisClient extends RedisClient {
  isReady?: boolean;
  connectionId?: string;
  lastPingTime?: Date;
}

// Redis connection events
export type RedisConnectionEvent = 'connect' | 'ready' | 'error' | 'end' | 'reconnecting';

// Redis connection metrics
export interface RedisMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  reconnections: number;
  lastConnectionAttempt?: Date;
  uptime?: number;
}

// Redis configuration interface with comprehensive options
export interface RedisConfig {
  url: string;
  socket: {
    connectTimeout: number;
    reconnectStrategy: (retries: number) => number | false;
    keepAlive?: number;
    noDelay?: boolean;
  };
  username?: string;
  password?: string;
  database?: number;
  name?: string;
  commandTimeout?: number;
}

// Redis connection pool configuration
export interface RedisPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
}

// Enhanced connection state tracking
export interface RedisConnectionState {
  client: ExtendedRedisClient | null;
  isConnected: boolean;
  isReady: boolean;
  isDisabled: boolean;
  connectionStartTime?: Date;
  lastError?: Error;
  metrics: RedisMetrics;
  config: RedisConfig | null;
}

// Initialize connection state with metrics
const connectionState: RedisConnectionState = {
  client: null,
  isConnected: false,
  isReady: false,
  isDisabled: false,
  config: null,
  metrics: {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnections: 0
  }
};

let client: ExtendedRedisClient | null = null;

// Environment variable helpers with comprehensive type safety
const getRedisUrl = (): string => {
  const url = process.env.REDIS_URL || process.env.REDISCLOUD_URL || 'redis://localhost:6379';
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
    throw new Error('Invalid Redis URL format. Must start with redis:// or rediss://');
  }
  return url;
};

const isRedisDisabled = (): boolean => {
  return process.env.DISABLE_REDIS === 'true' || process.env.NODE_ENV === 'test';
};

const getRedisDatabase = (): number => {
  const db = process.env.REDIS_DATABASE || process.env.REDIS_DB || '0';
  const parsed = parseInt(db, 10);
  return isNaN(parsed) ? 0 : parsed;
};

const getRedisPassword = (): string | undefined => {
  return process.env.REDIS_PASSWORD || process.env.REDIS_AUTH || undefined;
};

const getRedisConnectionTimeout = (): number => {
  const timeout = process.env.REDIS_CONNECT_TIMEOUT || '5000';
  const parsed = parseInt(timeout, 10);
  return isNaN(parsed) ? 5000 : parsed;
};

// Enhanced reconnection strategy with exponential backoff and metrics
const createReconnectStrategy = () => {
  return (retries: number): number | false => {
    connectionState.metrics.reconnections++;

    const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || '10', 10);
    if (retries > maxRetries) {
      console.log(`❌ Redis: Max reconnection attempts reached (${maxRetries})`);
      return false;
    }

    // Exponential backoff with jitter
    const baseDelay = parseInt(process.env.REDIS_RETRY_DELAY || '100', 10);
    const maxDelay = parseInt(process.env.REDIS_MAX_RETRY_DELAY || '30000', 10);
    const jitter = Math.random() * 0.1; // 10% jitter
    const delay = Math.min(baseDelay * Math.pow(2, retries - 1), maxDelay);

    const finalDelay = Math.floor(delay * (1 + jitter));
    console.log(`🔄 Redis: Reconnection attempt ${retries}/${maxRetries} in ${finalDelay}ms`);

    return finalDelay;
  };
};

// Enhanced configuration factory
const createRedisConfig = (): RedisConfig => {
  const config: RedisConfig = {
    url: getRedisUrl(),
    socket: {
      connectTimeout: getRedisConnectionTimeout(),
      reconnectStrategy: createReconnectStrategy(),
      keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE || '30000', 10),
      noDelay: true
    },
    database: getRedisDatabase(),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10)
  };

  const password = getRedisPassword();
  if (password) {
    config.password = password;
  }

  const username = process.env.REDIS_USERNAME;
  if (username) {
    config.username = username;
  }

  return config;
};

// Enhanced Redis client initialization with comprehensive error handling
const initializeRedis = async (): Promise<void> => {
  if (isRedisDisabled()) {
    connectionState.isDisabled = true;
    console.log('ℹ️ Redis: Disabled by environment configuration');
    return;
  }

  try {
    connectionState.metrics.connectionAttempts++;
    connectionState.metrics.lastConnectionAttempt = new Date();
    connectionState.connectionStartTime = new Date();

    const config = createRedisConfig();
    connectionState.config = config;

    client = redis.createClient(config) as ExtendedRedisClient;
    connectionState.client = client;

    // Generate unique connection ID for tracking
    client.connectionId = `redis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Enhanced event handlers with proper typing and metrics
    client.on('error', (err: Error) => {
      console.error('❌ Redis Client Error:', {
        message: err.message,
        stack: err.stack,
        connectionId: client?.connectionId,
        timestamp: new Date().toISOString()
      });
      connectionState.lastError = err;
      connectionState.isConnected = false;
      connectionState.isReady = false;
      connectionState.metrics.failedConnections++;
    });

    client.on('connect', () => {
      console.log('✅ Redis: Connected', {
        connectionId: client?.connectionId,
        url: config.url.replace(/:\/\/[^@]*@/, '://***@'), // Hide credentials
        database: config.database,
        timestamp: new Date().toISOString()
      });
      connectionState.isConnected = true;
      connectionState.metrics.successfulConnections++;
    });

    client.on('ready', () => {
      console.log('✅ Redis: Ready', {
        connectionId: client?.connectionId,
        uptime: connectionState.connectionStartTime ?
          Date.now() - connectionState.connectionStartTime.getTime() : 0
      });
      if (client) {
        client.isReady = true;
        client.lastPingTime = new Date();
      }
      connectionState.isReady = true;
    });

    client.on('end', () => {
      console.log('❌ Redis: Disconnected', {
        connectionId: client?.connectionId,
        timestamp: new Date().toISOString()
      });
      if (client) {
        client.isReady = false;
      }
      connectionState.isConnected = false;
      connectionState.isReady = false;
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis: Reconnecting', {
        connectionId: client?.connectionId,
        timestamp: new Date().toISOString()
      });
    });

    // Connect to Redis with timeout
    await client.connect();

    // Perform initial ping to verify connection
    await client.ping();

  } catch (error) {
    const redisError = error as Error;
    console.warn('⚠️ Redis: Initialization failed:', {
      message: redisError.message,
      stack: redisError.stack,
      timestamp: new Date().toISOString()
    });
    connectionState.lastError = redisError;
    connectionState.metrics.failedConnections++;
    client = null;
    connectionState.client = null;
  }
};

// Utility functions for Redis operations
export const getRedisClient = (): ExtendedRedisClient | null => {
  return client;
};

export const isRedisAvailable = (): boolean => {
  return client !== null && client.isReady === true;
};

export const getConnectionState = (): Readonly<RedisConnectionState> => {
  return { ...connectionState };
};

// Enhanced health check function with detailed metrics
export const healthCheck = async (): Promise<{
  isHealthy: boolean;
  isConnected: boolean;
  isReady: boolean;
  responseTime?: number;
  error?: string;
  metrics?: RedisMetrics;
}> => {
  if (connectionState.isDisabled) {
    return {
      isHealthy: true, // Consider disabled as healthy
      isConnected: false,
      isReady: false,
      metrics: connectionState.metrics
    };
  }

  if (!client || !client.isReady) {
    return {
      isHealthy: false,
      isConnected: connectionState.isConnected,
      isReady: false,
      error: 'Client not ready or not available',
      metrics: connectionState.metrics
    };
  }

  try {
    const startTime = Date.now();
    const pong = await client.ping();
    const responseTime = Date.now() - startTime;

    if (client && typeof client.lastPingTime !== 'undefined') {
      client.lastPingTime = new Date();
    }

    return {
      isHealthy: pong === 'PONG',
      isConnected: connectionState.isConnected,
      isReady: connectionState.isReady,
      responseTime,
      metrics: connectionState.metrics
    };
  } catch (error) {
    const healthError = error as Error;
    console.error('Redis health check failed:', {
      message: healthError.message,
      connectionId: client?.connectionId,
      timestamp: new Date().toISOString()
    });

    return {
      isHealthy: false,
      isConnected: connectionState.isConnected,
      isReady: false,
      error: healthError.message,
      metrics: connectionState.metrics
    };
  }
};

// Get comprehensive Redis metrics
export const getMetrics = (): RedisMetrics & { uptime?: number } => {
  const metrics = { ...connectionState.metrics };

  if (connectionState.connectionStartTime) {
    metrics.uptime = Date.now() - connectionState.connectionStartTime.getTime();
  }

  return metrics;
};

// Enhanced graceful shutdown with proper cleanup
export const closeRedisConnection = async (force: boolean = false): Promise<void> => {
  if (!client) {
    console.log('ℹ️ Redis: No client to close');
    return;
  }

  try {
    const connectionId = client.connectionId;

    if (force) {
      await client.disconnect();
      console.log('✅ Redis: Connection forcefully disconnected', { connectionId });
    } else {
      await client.quit();
      console.log('✅ Redis: Connection closed gracefully', { connectionId });
    }
  } catch (error) {
    const shutdownError = error as Error;
    console.error('❌ Redis: Error during shutdown:', {
      message: shutdownError.message,
      stack: shutdownError.stack,
      connectionId: client?.connectionId,
      timestamp: new Date().toISOString()
    });

    // Force disconnect if graceful shutdown fails
    if (!force) {
      try {
        await client.disconnect();
      } catch (forceError) {
        console.error('❌ Redis: Force disconnect also failed:', (forceError as Error).message);
      }
    }
  } finally {
    // Reset all connection state
    client = null;
    connectionState.client = null;
    connectionState.isConnected = false;
    connectionState.isReady = false;
    connectionState.connectionStartTime = undefined;

    console.log('🧹 Redis: Connection state cleaned up');
  }
};

// Flush all Redis data (dangerous - use with caution)
export const flushAll = async (): Promise<boolean> => {
  if (!client || !client.isReady) {
    throw new Error('Redis client is not ready');
  }

  try {
    await client.flushAll();
    console.warn('⚠️ Redis: All data flushed from Redis');
    return true;
  } catch (error) {
    console.error('❌ Redis: Failed to flush data:', (error as Error).message);
    return false;
  }
};

// Initialize Redis on module load
initializeRedis().catch((error) => {
  console.error('Failed to initialize Redis:', error);
});

// Export the client (will be null if disabled or failed to connect)
export default client;
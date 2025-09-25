/**
 * Performance Monitoring Configuration
 *
 * Monitors and alerts on performance issues
 */

export const performanceConfig = {
  // Event loop lag threshold in milliseconds
  eventLoopLagThreshold: 100, // Warn if event loop is blocked for > 100ms

  // Memory thresholds
  memoryThresholds: {
    heapUsedPercent: 80, // Warn at 80% heap usage
    rssLimit: 1024 * 1024 * 1024 // 1GB RSS limit
  },

  // Database query performance
  queryTimeThreshold: 1000, // Warn for queries taking > 1 second

  // API response time targets
  apiResponseTargets: {
    p50: 100,  // 50th percentile target: 100ms
    p95: 500,  // 95th percentile target: 500ms
    p99: 1000  // 99th percentile target: 1 second
  }
};

/**
 * Check if event loop lag is acceptable
 */
export function isEventLoopHealthy(lag: number): boolean {
  return lag < performanceConfig.eventLoopLagThreshold;
}

/**
 * Get performance status
 */
export function getPerformanceStatus(lag: number): 'healthy' | 'warning' | 'critical' {
  if (lag < 100) return 'healthy';
  if (lag < 500) return 'warning';
  return 'critical';
}
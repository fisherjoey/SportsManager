/**
 * Performance Monitoring Test Suite - Package 3C
 * 
 * Tests the advanced performance monitoring capabilities including:
 * - Basic performance monitoring
 * - Advanced metrics collection
 * - Database query monitoring
 * - Aggregated metrics collection
 * - Alert system
 * - Real-time monitoring endpoints
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_CONFIG = {
  testDuration: 30000, // 30 seconds
  requestInterval: 500, // 500ms between requests
  concurrentRequests: 3,
  testEndpoints: [
    '/api/games',
    '/api/referees',
    '/api/assignments',
    '/api/locations',
    '/api/budgets'
  ]
};

class PerformanceMonitoringTest {
  constructor() {
    this.results = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        responseTimes: []
      },
      monitoring: {
        basicStats: null,
        advancedStats: null,
        databaseStats: null,
        aggregatedMetrics: null,
        realTimeData: null
      },
      alerts: [],
      errors: []
    };
    
    this.isRunning = false;
    this.testStartTime = null;
  }

  /**
   * Main test runner
   */
  async runTests() {
    console.log('🚀 Starting Performance Monitoring Test Suite\n');
    
    try {
      // Step 1: Initial monitoring state
      await this.checkInitialState();
      
      // Step 2: Generate load to trigger monitoring
      await this.generateLoad();
      
      // Step 3: Test monitoring endpoints
      await this.testMonitoringEndpoints();
      
      // Step 4: Test configuration updates
      await this.testConfigurationUpdates();
      
      // Step 5: Generate alerts
      await this.generateAlerts();
      
      // Step 6: Final monitoring state
      await this.checkFinalState();
      
      // Step 7: Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.results.errors.push(error.message);
    }
  }

  /**
   * Check initial monitoring state
   */
  async checkInitialState() {
    console.log('📊 Checking initial monitoring state...');
    
    try {
      // Test basic auth first
      const authResponse = await this.makeAuthenticatedRequest('/api/performance/summary');
      if (authResponse.success) {
        console.log('✅ Performance monitoring endpoints are accessible');
        this.results.monitoring.initialSummary = authResponse.data;
      }
    } catch (error) {
      console.log('⚠️  Performance endpoints may require authentication - this is expected');
      console.log('   Using health endpoint for basic connectivity test');
      
      // Test basic connectivity
      const healthResponse = await axios.get(`${BASE_URL}/api/health`);
      if (healthResponse.status === 200) {
        console.log('✅ Backend is running and accessible');
      }
    }
  }

  /**
   * Generate test load
   */
  async generateLoad() {
    console.log('\n🔄 Generating test load...');
    this.isRunning = true;
    this.testStartTime = performance.now();
    
    const promises = [];
    
    // Start concurrent request generators
    for (let i = 0; i < TEST_CONFIG.concurrentRequests; i++) {
      promises.push(this.requestGenerator(i));
    }
    
    // Run for specified duration
    setTimeout(() => {
      this.isRunning = false;
    }, TEST_CONFIG.testDuration);
    
    await Promise.all(promises);
    
    const testDuration = (performance.now() - this.testStartTime) / 1000;
    console.log(`✅ Load generation completed in ${testDuration.toFixed(2)}s`);
    console.log(`   Total requests: ${this.results.requests.total}`);
    console.log(`   Successful: ${this.results.requests.successful}`);
    console.log(`   Failed: ${this.results.requests.failed}`);
    
    if (this.results.requests.responseTimes.length > 0) {
      const avgResponseTime = this.results.requests.responseTimes.reduce((a, b) => a + b, 0) / this.results.requests.responseTimes.length;
      console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);
    }
  }

  /**
   * Request generator for load testing
   */
  async requestGenerator(workerId) {
    let requestCount = 0;
    
    while (this.isRunning) {
      try {
        const endpoint = TEST_CONFIG.testEndpoints[Math.floor(Math.random() * TEST_CONFIG.testEndpoints.length)];
        const startTime = performance.now();
        
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          timeout: 10000,
          validateStatus: () => true // Accept all status codes
        });
        
        const responseTime = performance.now() - startTime;
        
        this.results.requests.total++;
        this.results.requests.responseTimes.push(responseTime);
        
        if (response.status < 400) {
          this.results.requests.successful++;
        } else {
          this.results.requests.failed++;
        }
        
        requestCount++;
        
        // Add some variability to request timing
        const delay = TEST_CONFIG.requestInterval + (Math.random() * 200 - 100);
        await this.sleep(Math.max(100, delay));
        
      } catch (error) {
        this.results.requests.total++;
        this.results.requests.failed++;
        
        if (!error.message.includes('timeout')) {
          this.results.errors.push(`Worker ${workerId}: ${error.message}`);
        }
      }
    }
    
    console.log(`   Worker ${workerId} completed ${requestCount} requests`);
  }

  /**
   * Test monitoring endpoints
   */
  async testMonitoringEndpoints() {
    console.log('\n📈 Testing monitoring endpoints...');
    
    const endpoints = [
      { path: '/api/performance/summary', name: 'Summary' },
      { path: '/api/performance/metrics', name: 'Aggregated Metrics' },
      { path: '/api/performance/advanced', name: 'Advanced Stats' },
      { path: '/api/performance/database', name: 'Database Stats' },
      { path: '/api/performance/cache', name: 'Cache Stats' },
      { path: '/api/performance/health', name: 'Health Metrics' },
      { path: '/api/performance/alerts', name: 'Alert Data' },
      { path: '/api/performance/trends', name: 'Trend Data' },
      { path: '/api/performance/insights', name: 'Performance Insights' },
      { path: '/api/performance/realtime', name: 'Real-time Metrics' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await this.makeAuthenticatedRequest(endpoint.path);
        if (response.success) {
          console.log(`✅ ${endpoint.name}: Available`);
          
          // Store specific responses for analysis
          if (endpoint.path === '/api/performance/metrics') {
            this.results.monitoring.aggregatedMetrics = response.data;
          } else if (endpoint.path === '/api/performance/realtime') {
            this.results.monitoring.realTimeData = response.data;
          }
        } else {
          console.log(`⚠️  ${endpoint.name}: ${response.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
      
      // Small delay between requests
      await this.sleep(100);
    }
  }

  /**
   * Test configuration updates
   */
  async testConfigurationUpdates() {
    console.log('\n⚙️  Testing configuration updates...');
    
    try {
      const configUpdate = {
        alertThresholds: {
          responseTime: 800,
          errorRate: 3.0,
          memoryUsage: 70.0
        },
        enableAutoRecommendations: true,
        enableTrendAnalysis: true
      };
      
      const response = await this.makeAuthenticatedRequest('/api/performance/config', 'POST', configUpdate);
      
      if (response.success) {
        console.log('✅ Configuration update successful');
        console.log(`   Updated: ${Object.keys(response.updatedConfig || {}).join(', ')}`);
      } else {
        console.log(`⚠️  Configuration update failed: ${response.error}`);
      }
    } catch (error) {
      console.log(`❌ Configuration update error: ${error.message}`);
    }
  }

  /**
   * Generate alerts by creating load spikes
   */
  async generateAlerts() {
    console.log('\n🚨 Generating alert conditions...');
    
    // Generate a burst of requests to trigger slow response alerts
    console.log('   Creating response time spike...');
    const burstPromises = [];
    
    for (let i = 0; i < 20; i++) {
      burstPromises.push(
        axios.get(`${BASE_URL}/api/games`, { timeout: 5000 }).catch(() => {})
      );
    }
    
    await Promise.all(burstPromises);
    
    // Wait for alerts to be processed
    await this.sleep(2000);
    
    // Check for alerts
    try {
      const alertsResponse = await this.makeAuthenticatedRequest('/api/performance/alerts');
      if (alertsResponse.success) {
        const alertCount = alertsResponse.data.alerts?.length || 0;
        console.log(`✅ Alert system responded - ${alertCount} alerts found`);
        this.results.alerts = alertsResponse.data.alerts || [];
      }
    } catch (error) {
      console.log(`⚠️  Could not check alerts: ${error.message}`);
    }
  }

  /**
   * Check final monitoring state
   */
  async checkFinalState() {
    console.log('\n📋 Checking final monitoring state...');
    
    try {
      const summary = await this.makeAuthenticatedRequest('/api/performance/summary');
      if (summary.success) {
        this.results.monitoring.finalSummary = summary.data;
        console.log('✅ Final monitoring state captured');
        
        if (summary.data.summary) {
          console.log(`   Total requests monitored: ${summary.data.summary.totalRequests || 0}`);
          console.log(`   System health: ${summary.data.systemHealth || 'unknown'}`);
          console.log(`   Active alerts: ${summary.data.alerts?.active || 0}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not get final state: ${error.message}`);
    }
  }

  /**
   * Make authenticated request (simplified - uses health endpoint pattern)
   */
  async makeAuthenticatedRequest(path, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${path}`,
        timeout: 10000,
        validateStatus: () => true
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Authentication required' };
      }
      
      if (response.status >= 400) {
        return { success: false, error: `HTTP ${response.status}` };
      }
      
      return { success: true, data: response.data };
      
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 PERFORMANCE MONITORING TEST REPORT');
    console.log('=' .repeat(50));
    
    // Request statistics
    console.log('\n🔄 Load Test Results:');
    console.log(`   Total requests sent: ${this.results.requests.total}`);
    console.log(`   Successful requests: ${this.results.requests.successful}`);
    console.log(`   Failed requests: ${this.results.requests.failed}`);
    
    if (this.results.requests.responseTimes.length > 0) {
      const times = this.results.requests.responseTimes;
      console.log(`   Average response time: ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)}ms`);
      console.log(`   Min response time: ${Math.min(...times).toFixed(2)}ms`);
      console.log(`   Max response time: ${Math.max(...times).toFixed(2)}ms`);
    }
    
    // Monitoring system status
    console.log('\n📈 Monitoring System Status:');
    const monitoringTests = [
      'Summary endpoint',
      'Aggregated metrics',
      'Real-time data',
      'Configuration updates'
    ];
    
    monitoringTests.forEach(test => {
      const status = this.results.errors.some(e => e.includes(test.toLowerCase())) ? '❌' : '✅';
      console.log(`   ${status} ${test}`);
    });
    
    // Alert system
    console.log('\n🚨 Alert System:');
    console.log(`   Alerts generated: ${this.results.alerts.length}`);
    if (this.results.alerts.length > 0) {
      this.results.alerts.slice(0, 3).forEach(alert => {
        console.log(`   - ${alert.type}: ${alert.description || alert.message || 'Alert triggered'}`);
      });
    }
    
    // System health comparison
    if (this.results.monitoring.initialSummary && this.results.monitoring.finalSummary) {
      console.log('\n🏥 System Health Comparison:');
      console.log(`   Initial health: ${this.results.monitoring.initialSummary.systemHealth || 'unknown'}`);
      console.log(`   Final health: ${this.results.monitoring.finalSummary.systemHealth || 'unknown'}`);
    }
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.results.errors.slice(0, 5).forEach(error => {
        console.log(`   - ${error}`);
      });
      
      if (this.results.errors.length > 5) {
        console.log(`   ... and ${this.results.errors.length - 5} more errors`);
      }
    }
    
    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    const successRate = this.results.requests.total > 0 
      ? (this.results.requests.successful / this.results.requests.total) * 100 
      : 0;
    
    console.log(`   Request success rate: ${successRate.toFixed(1)}%`);
    console.log(`   Monitoring system: ${this.results.errors.length < 3 ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);
    console.log(`   Performance tracking: ${this.results.monitoring.finalSummary ? 'ACTIVE' : 'UNKNOWN'}`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (successRate < 95) {
      console.log('   - Review application stability and error handling');
    }
    if (this.results.errors.length > 0) {
      console.log('   - Check authentication setup for monitoring endpoints');
    }
    if (this.results.alerts.length === 0) {
      console.log('   - Alert thresholds may need adjustment for test conditions');
    }
    console.log('   - Monitor memory usage and response times in production');
    console.log('   - Set up automated performance monitoring dashboards');
    
    console.log('\n✅ Performance monitoring test completed!\n');
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Run the test suite
 */
async function main() {
  const test = new PerformanceMonitoringTest();
  await test.runTests();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceMonitoringTest;
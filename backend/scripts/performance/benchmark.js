#!/usr/bin/env node

/**
 * Comprehensive Performance Benchmarking and Regression Detection System
 * 
 * This script provides:
 * - API endpoint benchmarking
 * - Memory usage monitoring
 * - Query performance trending
 * - Automated regression detection
 * - Performance alerts and notifications
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { spawn } = require('child_process');

class PerformanceBenchmark {
  constructor(options = {}) {
    this.options = {
      baseUrl: options.baseUrl || 'http://localhost:3000',
      outputDir: options.outputDir || 'quality-reports/performance',
      iterations: options.iterations || 10,
      warmupRuns: options.warmupRuns || 3,
      thresholds: {
        responseTime: options.responseTimeThreshold || 1000, // ms
        memoryIncrease: options.memoryIncreaseThreshold || 10, // MB
        regressionPercentage: options.regressionPercentage || 20, // %
        errorRate: options.errorRateThreshold || 5 // %
      },
      concurrency: options.concurrency || 1,
      ...options
    };
    
    this.results = {
      endpoints: [],
      memory: [],
      summary: {},
      regressions: [],
      trends: {}
    };
    
    this.authToken = null;
  }

  /**
   * Run comprehensive performance benchmark
   */
  async runBenchmark() {
    console.log('🚀 Starting comprehensive performance benchmark...\n');
    
    const startTime = performance.now();
    
    try {
      // Ensure output directory exists
      this.ensureOutputDir();
      
      // Load historical data for trend analysis
      await this.loadHistoricalData();
      
      // Authenticate if needed
      await this.authenticate();
      
      // Run endpoint benchmarks
      await this.benchmarkEndpoints();
      
      // Monitor memory usage
      await this.monitorMemoryUsage();
      
      // Detect performance regressions
      await this.detectRegressions();
      
      // Generate trends and insights
      this.generateTrends();
      
      // Generate summary
      this.generateSummary();
      
      // Save results
      await this.saveResults();
      
      const endTime = performance.now();
      console.log(`\n✅ Performance benchmark completed in ${Math.round(endTime - startTime)}ms`);
      
      // Display summary
      this.displaySummary();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Performance benchmark failed:', error.message);
      throw error;
    }
  }

  /**
   * Load historical performance data
   */
  async loadHistoricalData() {
    try {
      const historyPath = path.join(this.options.outputDir, 'performance-history.json');
      if (fs.existsSync(historyPath)) {
        const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        this.historicalData = data;
        console.log(`📊 Loaded ${data.length} historical benchmark records`);
      } else {
        this.historicalData = [];
        console.log('📊 No historical data found - creating baseline');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load historical data:', error.message);
      this.historicalData = [];
    }
  }

  /**
   * Authenticate with the API
   */
  async authenticate() {
    try {
      // Try to get authentication token
      const response = await axios.post(`${this.options.baseUrl}/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      }, { timeout: 5000 });
      
      if (response.data.token) {
        this.authToken = response.data.token;
        console.log('🔐 Authentication successful');
      }
    } catch (error) {
      console.log('⚠️ Authentication failed - proceeding without auth');
    }
  }

  /**
   * Benchmark API endpoints
   */
  async benchmarkEndpoints() {
    console.log('🎯 Benchmarking API endpoints...');
    
    const endpoints = this.getEndpointsToTest();
    
    for (const endpoint of endpoints) {
      console.log(`  Testing ${endpoint.method} ${endpoint.path}...`);
      
      try {
        const results = await this.benchmarkEndpoint(endpoint);
        this.results.endpoints.push(results);
        
        console.log(`    ✓ Avg: ${Math.round(results.avgResponseTime)}ms, Min: ${Math.round(results.minResponseTime)}ms, Max: ${Math.round(results.maxResponseTime)}ms`);
        
      } catch (error) {
        console.warn(`    ⚠️ Failed to benchmark ${endpoint.path}: ${error.message}`);
        
        this.results.endpoints.push({
          ...endpoint,
          error: error.message,
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          errorRate: 100
        });
      }
    }
  }

  /**
   * Get list of endpoints to test
   */
  getEndpointsToTest() {
    return [
      // Health check endpoints
      { method: 'GET', path: '/health', name: 'Health Check', auth: false },
      
      // Authentication endpoints
      { method: 'POST', path: '/auth/login', name: 'Login', auth: false,
        data: { email: 'test@example.com', password: 'testpassword' } },
      
      // User endpoints
      { method: 'GET', path: '/api/users', name: 'List Users', auth: true },
      { method: 'GET', path: '/api/users/me', name: 'Get Current User', auth: true },
      
      // Games endpoints
      { method: 'GET', path: '/api/games', name: 'List Games', auth: true },
      { method: 'GET', path: '/api/games?limit=10', name: 'List Games (Paginated)', auth: true },
      
      // Assignments endpoints
      { method: 'GET', path: '/api/assignments', name: 'List Assignments', auth: true },
      
      // Reports endpoints
      { method: 'GET', path: '/api/reports/performance', name: 'Performance Report', auth: true },
      
      // Budget endpoints
      { method: 'GET', path: '/api/budgets', name: 'List Budgets', auth: true },
      
      // Referee endpoints
      { method: 'GET', path: '/api/referees', name: 'List Referees', auth: true },
      
      // Teams endpoints
      { method: 'GET', path: '/api/teams', name: 'List Teams', auth: true },
      
      // Leagues endpoints
      { method: 'GET', path: '/api/leagues', name: 'List Leagues', auth: true }
    ];
  }

  /**
   * Benchmark a single endpoint
   */
  async benchmarkEndpoint(endpoint) {
    const results = {
      ...endpoint,
      responseTimes: [],
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      successCount: 0,
      errorCount: 0,
      errorRate: 0,
      throughput: 0,
      memoryUsage: []
    };
    
    // Warmup runs
    for (let i = 0; i < this.options.warmupRuns; i++) {
      try {
        await this.makeRequest(endpoint);
      } catch (error) {
        // Ignore warmup errors
      }
    }
    
    // Actual benchmark runs
    const startTime = performance.now();
    
    for (let i = 0; i < this.options.iterations; i++) {
      const runStart = performance.now();
      const initialMemory = process.memoryUsage().heapUsed;
      
      try {
        await this.makeRequest(endpoint);
        
        const responseTime = performance.now() - runStart;
        results.responseTimes.push(responseTime);
        results.successCount++;
        
        // Track memory usage
        const finalMemory = process.memoryUsage().heapUsed;
        results.memoryUsage.push(finalMemory - initialMemory);
        
        // Update min/max
        results.minResponseTime = Math.min(results.minResponseTime, responseTime);
        results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
        
      } catch (error) {
        results.errorCount++;
      }
      
      // Add small delay between requests to avoid overwhelming the server
      if (i < this.options.iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    const totalTime = performance.now() - startTime;
    
    // Calculate statistics
    if (results.responseTimes.length > 0) {
      results.avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
      
      // Calculate percentiles
      const sorted = results.responseTimes.sort((a, b) => a - b);
      results.p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)];
      results.p99ResponseTime = sorted[Math.floor(sorted.length * 0.99)];
    }
    
    results.errorRate = (results.errorCount / this.options.iterations) * 100;
    results.throughput = (results.successCount / totalTime) * 1000; // requests per second
    
    return results;
  }

  /**
   * Make HTTP request to endpoint
   */
  async makeRequest(endpoint) {
    const config = {
      method: endpoint.method,
      url: `${this.options.baseUrl}${endpoint.path}`,
      timeout: 10000,
      headers: {}
    };
    
    // Add authentication if required
    if (endpoint.auth && this.authToken) {
      config.headers.Authorization = `Bearer ${this.authToken}`;
    }
    
    // Add request data if provided
    if (endpoint.data) {
      config.data = endpoint.data;
    }
    
    const response = await axios(config);
    return response.data;
  }

  /**
   * Monitor memory usage over time
   */
  async monitorMemoryUsage() {
    console.log('💾 Monitoring memory usage...');
    
    const measurements = [];
    const duration = 30000; // 30 seconds
    const interval = 1000; // 1 second
    const iterations = duration / interval;
    
    for (let i = 0; i < iterations; i++) {
      const memUsage = process.memoryUsage();
      measurements.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      });
      
      // Make some API calls during monitoring
      if (i % 5 === 0 && this.results.endpoints.length > 0) {
        try {
          const randomEndpoint = this.results.endpoints[0];
          await this.makeRequest(randomEndpoint);
        } catch (error) {
          // Ignore errors during memory monitoring
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    this.results.memory = measurements;
    
    // Calculate memory statistics
    const heapUsages = measurements.map(m => m.heapUsed);
    const avgHeapUsage = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;
    const maxHeapUsage = Math.max(...heapUsages);
    const minHeapUsage = Math.min(...heapUsages);
    
    console.log(`  ✓ Memory monitoring completed`);
    console.log(`    Avg heap: ${this.formatBytes(avgHeapUsage)}`);
    console.log(`    Max heap: ${this.formatBytes(maxHeapUsage)}`);
    console.log(`    Memory variance: ${this.formatBytes(maxHeapUsage - minHeapUsage)}`);
  }

  /**
   * Detect performance regressions
   */
  async detectRegressions() {
    console.log('🔍 Detecting performance regressions...');
    
    if (this.historicalData.length === 0) {
      console.log('  ⚠️ No historical data available for regression detection');
      return;
    }
    
    // Get the most recent historical benchmark for comparison
    const lastBenchmark = this.historicalData[this.historicalData.length - 1];
    
    for (const currentResult of this.results.endpoints) {
      // Find corresponding historical result
      const historicalResult = lastBenchmark.endpoints.find(
        e => e.path === currentResult.path && e.method === currentResult.method
      );
      
      if (!historicalResult || currentResult.error || historicalResult.error) {
        continue;
      }
      
      // Check for response time regression
      const responseTimeIncrease = ((currentResult.avgResponseTime - historicalResult.avgResponseTime) / historicalResult.avgResponseTime) * 100;
      
      if (responseTimeIncrease > this.options.thresholds.regressionPercentage) {
        this.results.regressions.push({
          type: 'response_time',
          endpoint: `${currentResult.method} ${currentResult.path}`,
          current: Math.round(currentResult.avgResponseTime),
          previous: Math.round(historicalResult.avgResponseTime),
          increase: Math.round(responseTimeIncrease),
          severity: responseTimeIncrease > 50 ? 'critical' : 'warning'
        });
      }
      
      // Check for error rate regression
      const errorRateIncrease = currentResult.errorRate - historicalResult.errorRate;
      
      if (errorRateIncrease > this.options.thresholds.errorRate) {
        this.results.regressions.push({
          type: 'error_rate',
          endpoint: `${currentResult.method} ${currentResult.path}`,
          current: currentResult.errorRate.toFixed(1),
          previous: historicalResult.errorRate.toFixed(1),
          increase: errorRateIncrease.toFixed(1),
          severity: errorRateIncrease > 20 ? 'critical' : 'warning'
        });
      }
      
      // Check for throughput regression
      const throughputDecrease = ((historicalResult.throughput - currentResult.throughput) / historicalResult.throughput) * 100;
      
      if (throughputDecrease > this.options.thresholds.regressionPercentage) {
        this.results.regressions.push({
          type: 'throughput',
          endpoint: `${currentResult.method} ${currentResult.path}`,
          current: currentResult.throughput.toFixed(2),
          previous: historicalResult.throughput.toFixed(2),
          decrease: Math.round(throughputDecrease),
          severity: throughputDecrease > 50 ? 'critical' : 'warning'
        });
      }
    }
    
    console.log(`  ✓ Found ${this.results.regressions.length} performance regressions`);
  }

  /**
   * Generate performance trends
   */
  generateTrends() {
    console.log('📈 Generating performance trends...');
    
    const trends = {
      responseTime: {},
      errorRate: {},
      throughput: {},
      memory: {}
    };
    
    // Analyze trends over historical data
    if (this.historicalData.length > 0) {
      // Group data by endpoint
      for (const endpoint of this.results.endpoints) {
        const key = `${endpoint.method} ${endpoint.path}`;
        
        // Extract historical data for this endpoint
        const historicalValues = this.historicalData.map(benchmark => {
          const historical = benchmark.endpoints.find(
            e => e.path === endpoint.path && e.method === endpoint.method
          );
          return historical ? {
            timestamp: benchmark.timestamp,
            responseTime: historical.avgResponseTime,
            errorRate: historical.errorRate,
            throughput: historical.throughput
          } : null;
        }).filter(Boolean);
        
        if (historicalValues.length > 1) {
          // Calculate trend direction
          const responseTimeTrend = this.calculateTrend(historicalValues.map(v => v.responseTime));
          const errorRateTrend = this.calculateTrend(historicalValues.map(v => v.errorRate));
          const throughputTrend = this.calculateTrend(historicalValues.map(v => v.throughput));
          
          trends.responseTime[key] = {
            direction: responseTimeTrend.direction,
            change: responseTimeTrend.change,
            confidence: responseTimeTrend.confidence
          };
          
          trends.errorRate[key] = {
            direction: errorRateTrend.direction,
            change: errorRateTrend.change,
            confidence: errorRateTrend.confidence
          };
          
          trends.throughput[key] = {
            direction: throughputTrend.direction,
            change: throughputTrend.change,
            confidence: throughputTrend.confidence
          };
        }
      }
    }
    
    this.results.trends = trends;
    console.log('  ✓ Trend analysis completed');
  }

  /**
   * Calculate trend direction and magnitude
   */
  calculateTrend(values) {
    if (values.length < 2) {
      return { direction: 'stable', change: 0, confidence: 'low' };
    }
    
    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;
    
    const changePercentage = (slope / avgY) * 100;
    
    let direction = 'stable';
    if (changePercentage > 5) direction = 'increasing';
    else if (changePercentage < -5) direction = 'decreasing';
    
    let confidence = 'low';
    if (Math.abs(changePercentage) > 20) confidence = 'high';
    else if (Math.abs(changePercentage) > 10) confidence = 'medium';
    
    return {
      direction,
      change: Math.round(changePercentage),
      confidence
    };
  }

  /**
   * Generate summary
   */
  generateSummary() {
    const summary = {
      overallHealth: 'good',
      criticalRegressions: 0,
      warnings: 0,
      endpointsTested: this.results.endpoints.length,
      avgResponseTime: 0,
      slowestEndpoint: null,
      fastestEndpoint: null,
      highestErrorRate: 0,
      recommendations: [],
      timestamp: new Date().toISOString()
    };
    
    // Calculate overall metrics
    const validEndpoints = this.results.endpoints.filter(e => !e.error);
    
    if (validEndpoints.length > 0) {
      summary.avgResponseTime = Math.round(
        validEndpoints.reduce((sum, e) => sum + e.avgResponseTime, 0) / validEndpoints.length
      );
      
      summary.slowestEndpoint = validEndpoints.reduce((slowest, current) => 
        current.avgResponseTime > slowest.avgResponseTime ? current : slowest
      );
      
      summary.fastestEndpoint = validEndpoints.reduce((fastest, current) => 
        current.avgResponseTime < fastest.avgResponseTime ? current : fastest
      );
      
      summary.highestErrorRate = Math.max(...validEndpoints.map(e => e.errorRate));
    }
    
    // Count regressions by severity
    summary.criticalRegressions = this.results.regressions.filter(r => r.severity === 'critical').length;
    summary.warnings = this.results.regressions.filter(r => r.severity === 'warning').length;
    
    // Determine overall health
    if (summary.criticalRegressions > 0) {
      summary.overallHealth = 'critical';
    } else if (summary.warnings > 3 || summary.avgResponseTime > this.options.thresholds.responseTime) {
      summary.overallHealth = 'warning';
    } else if (summary.warnings > 0 || summary.avgResponseTime > this.options.thresholds.responseTime * 0.8) {
      summary.overallHealth = 'fair';
    }
    
    // Generate recommendations
    summary.recommendations = this.generateRecommendations();
    
    this.results.summary = summary;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Recommendations based on regressions
    if (this.results.regressions.length > 0) {
      const responseTimeRegressions = this.results.regressions.filter(r => r.type === 'response_time');
      if (responseTimeRegressions.length > 0) {
        recommendations.push({
          type: 'response_time',
          priority: 'high',
          message: `${responseTimeRegressions.length} endpoints showing response time regressions`
        });
      }
      
      const errorRegressions = this.results.regressions.filter(r => r.type === 'error_rate');
      if (errorRegressions.length > 0) {
        recommendations.push({
          type: 'error_rate',
          priority: 'critical',
          message: `${errorRegressions.length} endpoints showing increased error rates`
        });
      }
    }
    
    // Recommendations based on absolute performance
    const slowEndpoints = this.results.endpoints.filter(
      e => !e.error && e.avgResponseTime > this.options.thresholds.responseTime
    );
    
    if (slowEndpoints.length > 0) {
      recommendations.push({
        type: 'slow_endpoints',
        priority: 'medium',
        message: `${slowEndpoints.length} endpoints exceed response time threshold`
      });
    }
    
    // Memory recommendations
    if (this.results.memory.length > 0) {
      const heapUsages = this.results.memory.map(m => m.heapUsed);
      const maxHeap = Math.max(...heapUsages);
      
      if (maxHeap > 500 * 1024 * 1024) { // 500MB
        recommendations.push({
          type: 'memory_usage',
          priority: 'medium',
          message: `High memory usage detected (${this.formatBytes(maxHeap)})`
        });
      }
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Save results to files
   */
  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save detailed results
    fs.writeFileSync(
      path.join(this.options.outputDir, `benchmark-${timestamp}.json`),
      JSON.stringify(this.results, null, 2)
    );
    
    // Save summary report
    fs.writeFileSync(
      path.join(this.options.outputDir, 'latest-benchmark-summary.json'),
      JSON.stringify(this.results.summary, null, 2)
    );
    
    // Update historical data
    const benchmarkRecord = {
      timestamp: new Date().toISOString(),
      endpoints: this.results.endpoints,
      summary: this.results.summary
    };
    
    this.historicalData.push(benchmarkRecord);
    
    // Keep only last 30 benchmark records
    if (this.historicalData.length > 30) {
      this.historicalData = this.historicalData.slice(-30);
    }
    
    fs.writeFileSync(
      path.join(this.options.outputDir, 'performance-history.json'),
      JSON.stringify(this.historicalData, null, 2)
    );
    
    // Generate HTML report
    await this.generateHTMLReport(timestamp);
    
    // Generate alerts if needed
    await this.generateAlerts();
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(timestamp) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Benchmark Report - ${timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .health { font-size: 2em; font-weight: bold; }
        .health.good { color: #4CAF50; }
        .health.fair { color: #FF9800; }
        .health.warning { color: #FF5722; }
        .health.critical { color: #F44336; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #2196F3; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .endpoint { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 3px; }
        .regression { margin: 10px 0; padding: 10px; background: #ffebee; border-radius: 3px; }
        .regression.critical { background: #ffcdd2; }
        .recommendation { margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Benchmark Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <div class="health ${this.results.summary.overallHealth}">
            Performance Health: ${this.results.summary.overallHealth.toUpperCase()}
        </div>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="metric">Endpoints Tested: ${this.results.summary.endpointsTested}</div>
        <div class="metric">Avg Response Time: ${this.results.summary.avgResponseTime}ms</div>
        <div class="metric">Critical Regressions: ${this.results.summary.criticalRegressions}</div>
        <div class="metric">Warnings: ${this.results.summary.warnings}</div>
        <div class="metric">Highest Error Rate: ${this.results.summary.highestErrorRate.toFixed(1)}%</div>
    </div>
    
    ${this.generateEndpointsSection()}
    ${this.generateRegressionsSection()}
    ${this.generateTrendsSection()}
    ${this.generateRecommendationsSection()}
</body>
</html>`;
    
    fs.writeFileSync(
      path.join(this.options.outputDir, `benchmark-report-${timestamp}.html`),
      html
    );
  }

  /**
   * Generate endpoints section for HTML report
   */
  generateEndpointsSection() {
    return `
    <div class="section">
        <h2>Endpoint Performance</h2>
        <table>
            <tr>
                <th>Endpoint</th>
                <th>Avg Response Time</th>
                <th>P95</th>
                <th>P99</th>
                <th>Error Rate</th>
                <th>Throughput</th>
            </tr>
            ${this.results.endpoints.map(endpoint => `
                <tr>
                    <td>${endpoint.method} ${endpoint.path}</td>
                    <td>${endpoint.error ? 'ERROR' : Math.round(endpoint.avgResponseTime) + 'ms'}</td>
                    <td>${endpoint.error ? '-' : Math.round(endpoint.p95ResponseTime) + 'ms'}</td>
                    <td>${endpoint.error ? '-' : Math.round(endpoint.p99ResponseTime) + 'ms'}</td>
                    <td>${endpoint.error ? '100%' : endpoint.errorRate.toFixed(1) + '%'}</td>
                    <td>${endpoint.error ? '-' : endpoint.throughput.toFixed(2) + ' req/s'}</td>
                </tr>
            `).join('')}
        </table>
    </div>`;
  }

  /**
   * Generate regressions section for HTML report
   */
  generateRegressionsSection() {
    if (this.results.regressions.length === 0) {
      return '<div class="section"><h2>Performance Regressions</h2><p>No regressions detected</p></div>';
    }
    
    return `
    <div class="section">
        <h2>Performance Regressions</h2>
        ${this.results.regressions.map(regression => `
            <div class="regression ${regression.severity}">
                <strong>${regression.endpoint}</strong> - ${regression.type.replace('_', ' ')}
                <br>Current: ${regression.current} | Previous: ${regression.previous}
                <br>Change: ${regression.type === 'throughput' ? 'decreased' : 'increased'} by ${regression.increase || regression.decrease}${regression.type === 'error_rate' ? '%' : regression.type === 'throughput' ? '%' : 'ms'}
            </div>
        `).join('')}
    </div>`;
  }

  /**
   * Generate trends section for HTML report
   */
  generateTrendsSection() {
    return `
    <div class="section">
        <h2>Performance Trends</h2>
        <p>Trend analysis based on historical data (${this.historicalData.length} data points)</p>
        ${Object.keys(this.results.trends.responseTime).length === 0 ? 
          '<p>Insufficient historical data for trend analysis</p>' :
          `<h3>Response Time Trends</h3>
           ${Object.entries(this.results.trends.responseTime).map(([endpoint, trend]) => `
               <div class="endpoint">
                   <strong>${endpoint}:</strong> ${trend.direction} 
                   (${trend.change > 0 ? '+' : ''}${trend.change}%, confidence: ${trend.confidence})
               </div>
           `).join('')}`
        }
    </div>`;
  }

  /**
   * Generate recommendations section for HTML report
   */
  generateRecommendationsSection() {
    return `
    <div class="section">
        <h2>Recommendations</h2>
        ${this.results.summary.recommendations.map(rec => 
          `<div class="recommendation"><strong>${rec.priority.toUpperCase()}:</strong> ${rec.message}</div>`
        ).join('')}
    </div>`;
  }

  /**
   * Generate alerts for critical issues
   */
  async generateAlerts() {
    const criticalIssues = this.results.regressions.filter(r => r.severity === 'critical');
    
    if (criticalIssues.length > 0) {
      const alertMessage = `CRITICAL PERFORMANCE REGRESSION DETECTED:\n${criticalIssues.map(issue => 
        `- ${issue.endpoint}: ${issue.type} ${issue.type === 'throughput' ? 'decreased' : 'increased'} by ${issue.increase || issue.decrease}${issue.type === 'error_rate' ? '%' : issue.type === 'throughput' ? '%' : 'ms'}`
      ).join('\n')}`;
      
      // Save alert to file
      fs.writeFileSync(
        path.join(this.options.outputDir, `CRITICAL-ALERT-${Date.now()}.txt`),
        alertMessage
      );
      
      console.log('\n🚨 CRITICAL PERFORMANCE ALERT GENERATED');
      console.log(alertMessage);
    }
  }

  /**
   * Display summary in console
   */
  displaySummary() {
    console.log('\n🚀 PERFORMANCE BENCHMARK SUMMARY');
    console.log('=================================');
    console.log(`Overall Health: ${this.results.summary.overallHealth.toUpperCase()}`);
    console.log(`Endpoints Tested: ${this.results.summary.endpointsTested}`);
    console.log(`Average Response Time: ${this.results.summary.avgResponseTime}ms`);
    console.log(`Critical Regressions: ${this.results.summary.criticalRegressions}`);
    console.log(`Warnings: ${this.results.summary.warnings}`);
    
    if (this.results.summary.slowestEndpoint) {
      console.log(`Slowest Endpoint: ${this.results.summary.slowestEndpoint.method} ${this.results.summary.slowestEndpoint.path} (${Math.round(this.results.summary.slowestEndpoint.avgResponseTime)}ms)`);
    }
    
    if (this.results.summary.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      this.results.summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }
    
    console.log(`\n📁 Reports saved to: ${this.options.outputDir}/`);
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'base-url') options.baseUrl = value;
    else if (key === 'iterations') options.iterations = parseInt(value);
    else if (key === 'threshold') options.responseTimeThreshold = parseInt(value);
    else if (key === 'regression') options.regressionPercentage = parseInt(value);
    else if (key === 'output') options.outputDir = value;
  }
  
  const benchmark = new PerformanceBenchmark(options);
  
  benchmark.runBenchmark()
    .then(results => {
      // Exit with error code if critical regressions found
      const criticalRegressions = results.summary.criticalRegressions;
      if (criticalRegressions > 0) {
        console.log('\n❌ Critical performance regressions detected');
        process.exit(1);
      } else if (results.summary.warnings > 0) {
        console.log('\n⚠️ Performance warnings detected');
        process.exit(0);
      } else {
        console.log('\n✅ Performance benchmark passed');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('💥 Benchmark failed:', error.message);
      process.exit(1);
    });
}

module.exports = PerformanceBenchmark;
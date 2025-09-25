#!/usr/bin/env node

/**
 * Monitoring Dashboard Generator
 * 
 * Creates HTML dashboards for monitoring system health, performance, and quality metrics.
 * Integrates with all maintenance tools to provide a unified view.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

class MonitoringDashboard {
  constructor(options = {}) {
    this.options = {
      port: options.port || 8080,
      refreshInterval: options.refreshInterval || 30000, // 30 seconds
      reportsDir: options.reportsDir || 'quality-reports',
      title: options.title || 'Sports Management App - Monitoring Dashboard',
      ...options
    };
    
    this.server = null;
    this.data = {
      lastUpdate: null,
      codeQuality: null,
      databaseHealth: null,
      performance: null,
      alerts: [],
      trends: {}
    };
  }

  /**
   * Start the monitoring dashboard server
   */
  async start() {
    console.log('🚀 Starting monitoring dashboard...');
    
    // Load initial data
    await this.loadAllData();
    
    // Create HTTP server
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
    
    // Start server
    this.server.listen(this.options.port, () => {
      console.log(`✅ Dashboard running at http://localhost:${this.options.port}`);
      console.log(`📊 Auto-refresh every ${this.options.refreshInterval / 1000} seconds`);
    });
    
    // Set up auto-refresh
    setInterval(() => {
      this.loadAllData();
    }, this.options.refreshInterval);
    
    return this.server;
  }

  /**
   * Stop the monitoring dashboard server
   */
  async stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 Dashboard stopped');
    }
  }

  /**
   * Handle HTTP requests
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    try {
      switch (pathname) {
        case '/':
          await this.serveDashboard(res);
          break;
          
        case '/api/data':
          await this.serveData(res);
          break;
          
        case '/api/refresh':
          await this.loadAllData();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'refreshed', timestamp: new Date() }));
          break;
          
        case '/api/alerts':
          await this.serveAlerts(res);
          break;
          
        case '/health':
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
          break;
          
        default:
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
      }
    } catch (error) {
      console.error('Dashboard request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Serve the main dashboard HTML
   */
  async serveDashboard(res) {
    const html = this.generateDashboardHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve dashboard data as JSON
   */
  async serveData(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.data));
  }

  /**
   * Serve alerts data
   */
  async serveAlerts(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.data.alerts));
  }

  /**
   * Load all monitoring data from reports
   */
  async loadAllData() {
    try {
      this.data.lastUpdate = new Date().toISOString();
      
      // Load code quality data
      await this.loadCodeQualityData();
      
      // Load database health data
      await this.loadDatabaseHealthData();
      
      // Load performance data
      await this.loadPerformanceData();
      
      // Generate alerts
      this.generateAlerts();
      
      // Update trends
      this.updateTrends();
      
      console.log(`📊 Dashboard data updated at ${this.data.lastUpdate}`);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error.message);
    }
  }

  /**
   * Load code quality data
   */
  async loadCodeQualityData() {
    try {
      const qualityPath = path.join(this.options.reportsDir, 'latest-quality-summary.json');
      if (fs.existsSync(qualityPath)) {
        this.data.codeQuality = JSON.parse(fs.readFileSync(qualityPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load code quality data:', error.message);
    }
  }

  /**
   * Load database health data
   */
  async loadDatabaseHealthData() {
    try {
      const healthPath = path.join(this.options.reportsDir, 'database', 'latest-health-summary.json');
      if (fs.existsSync(healthPath)) {
        this.data.databaseHealth = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load database health data:', error.message);
    }
  }

  /**
   * Load performance data
   */
  async loadPerformanceData() {
    try {
      const perfPath = path.join(this.options.reportsDir, 'performance', 'latest-benchmark-summary.json');
      if (fs.existsSync(perfPath)) {
        this.data.performance = JSON.parse(fs.readFileSync(perfPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load performance data:', error.message);
    }
  }

  /**
   * Generate alerts based on current data
   */
  generateAlerts() {
    this.data.alerts = [];
    
    // Code quality alerts
    if (this.data.codeQuality) {
      if (this.data.codeQuality.overallScore < 70) {
        this.data.alerts.push({
          type: 'critical',
          category: 'code-quality',
          message: `Code quality score is critically low: ${this.data.codeQuality.overallScore}/100`,
          timestamp: new Date().toISOString()
        });
      } else if (this.data.codeQuality.overallScore < 85) {
        this.data.alerts.push({
          type: 'warning',
          category: 'code-quality',
          message: `Code quality score needs improvement: ${this.data.codeQuality.overallScore}/100`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (this.data.codeQuality.issues.critical > 0) {
        this.data.alerts.push({
          type: 'critical',
          category: 'code-quality',
          message: `${this.data.codeQuality.issues.critical} critical code issues detected`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Database health alerts
    if (this.data.databaseHealth) {
      if (this.data.databaseHealth.overallHealth === 'critical' || this.data.databaseHealth.overallHealth === 'poor') {
        this.data.alerts.push({
          type: 'critical',
          category: 'database',
          message: `Database health is ${this.data.databaseHealth.overallHealth}`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (this.data.databaseHealth.criticalIssues > 0) {
        this.data.alerts.push({
          type: 'critical',
          category: 'database',
          message: `${this.data.databaseHealth.criticalIssues} critical database issues detected`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Performance alerts
    if (this.data.performance) {
      if (this.data.performance.overallHealth === 'critical') {
        this.data.alerts.push({
          type: 'critical',
          category: 'performance',
          message: 'Performance health is critical',
          timestamp: new Date().toISOString()
        });
      }
      
      if (this.data.performance.criticalRegressions > 0) {
        this.data.alerts.push({
          type: 'critical',
          category: 'performance',
          message: `${this.data.performance.criticalRegressions} critical performance regressions detected`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (this.data.performance.avgResponseTime > 1000) {
        this.data.alerts.push({
          type: 'warning',
          category: 'performance',
          message: `Average response time is high: ${this.data.performance.avgResponseTime}ms`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Update trend data
   */
  updateTrends() {
    // Load historical data and calculate trends
    try {
      // Load performance history
      const perfHistoryPath = path.join(this.options.reportsDir, 'performance', 'performance-history.json');
      if (fs.existsSync(perfHistoryPath)) {
        const history = JSON.parse(fs.readFileSync(perfHistoryPath, 'utf8'));
        this.data.trends.performance = this.calculatePerformanceTrends(history);
      }
      
      // Could add more trend calculations here for quality and database metrics
      
    } catch (error) {
      console.warn('Failed to update trends:', error.message);
    }
  }

  /**
   * Calculate performance trends
   */
  calculatePerformanceTrends(history) {
    if (history.length < 2) return null;
    
    const recent = history.slice(-7); // Last 7 data points
    const avgResponseTimes = recent.map(h => h.summary.avgResponseTime);
    
    if (avgResponseTimes.length < 2) return null;
    
    const firstValue = avgResponseTimes[0];
    const lastValue = avgResponseTimes[avgResponseTimes.length - 1];
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      direction: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
      change: Math.round(changePercent),
      dataPoints: avgResponseTimes.length
    };
  }

  /**
   * Generate the main dashboard HTML
   */
  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.options.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .last-update {
            color: #6c757d;
            font-size: 14px;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .card h2 {
            margin-bottom: 15px;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            background: #f8f9fa;
            border-radius: 4px;
        }
        
        .metric-label {
            font-weight: 500;
        }
        
        .metric-value {
            font-weight: bold;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-good { background: #27ae60; }
        .status-warning { background: #f39c12; }
        .status-critical { background: #e74c3c; }
        .status-unknown { background: #95a5a6; }
        
        .alerts-section {
            margin-bottom: 20px;
        }
        
        .alert {
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            border-left: 4px solid;
        }
        
        .alert-critical {
            background: #fdf2f2;
            border-left-color: #e74c3c;
            color: #721c24;
        }
        
        .alert-warning {
            background: #fefbf3;
            border-left-color: #f39c12;
            color: #8b5a2b;
        }
        
        .alert-info {
            background: #f0f9ff;
            border-left-color: #3498db;
            color: #1e3a8a;
        }
        
        .alert-timestamp {
            font-size: 12px;
            color: #6c757d;
            margin-top: 5px;
        }
        
        .refresh-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .refresh-btn:hover {
            background: #2980b9;
        }
        
        .trend-indicator {
            font-size: 12px;
            margin-left: 5px;
        }
        
        .trend-up { color: #e74c3c; }
        .trend-down { color: #27ae60; }
        .trend-stable { color: #95a5a6; }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #6c757d;
        }
        
        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            
            .container {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.options.title}</h1>
            <div class="last-update">
                Last updated: <span id="lastUpdate">Loading...</span>
                <button class="refresh-btn" onclick="refreshData()">Refresh</button>
            </div>
        </div>
        
        <div id="alerts" class="alerts-section"></div>
        
        <div class="dashboard-grid">
            <div class="card">
                <h2>Code Quality</h2>
                <div id="codeQuality" class="loading">Loading...</div>
            </div>
            
            <div class="card">
                <h2>Database Health</h2>
                <div id="databaseHealth" class="loading">Loading...</div>
            </div>
            
            <div class="card">
                <h2>Performance</h2>
                <div id="performance" class="loading">Loading...</div>
            </div>
            
            <div class="card">
                <h2>System Overview</h2>
                <div id="systemOverview" class="loading">Loading...</div>
            </div>
        </div>
    </div>

    <script>
        let dashboardData = null;
        
        // Load initial data
        loadDashboardData();
        
        // Auto-refresh every ${this.options.refreshInterval / 1000} seconds
        setInterval(loadDashboardData, ${this.options.refreshInterval});
        
        async function loadDashboardData() {
            try {
                const response = await fetch('/api/data');
                dashboardData = await response.json();
                updateDashboard();
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            }
        }
        
        async function refreshData() {
            try {
                await fetch('/api/refresh');
                loadDashboardData();
            } catch (error) {
                console.error('Failed to refresh data:', error);
            }
        }
        
        function updateDashboard() {
            if (!dashboardData) return;
            
            // Update last update time
            const lastUpdate = new Date(dashboardData.lastUpdate);
            document.getElementById('lastUpdate').textContent = lastUpdate.toLocaleString();
            
            // Update alerts
            updateAlerts();
            
            // Update code quality section
            updateCodeQuality();
            
            // Update database health section
            updateDatabaseHealth();
            
            // Update performance section
            updatePerformance();
            
            // Update system overview
            updateSystemOverview();
        }
        
        function updateAlerts() {
            const alertsContainer = document.getElementById('alerts');
            
            if (!dashboardData.alerts || dashboardData.alerts.length === 0) {
                alertsContainer.innerHTML = '';
                return;
            }
            
            alertsContainer.innerHTML = dashboardData.alerts.map(alert => \`
                <div class="alert alert-\${alert.type}">
                    <strong>[\${alert.category.toUpperCase()}]</strong> \${alert.message}
                    <div class="alert-timestamp">\${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
            \`).join('');
        }
        
        function updateCodeQuality() {
            const container = document.getElementById('codeQuality');
            const data = dashboardData.codeQuality;
            
            if (!data) {
                container.innerHTML = '<div class="loading">No data available</div>';
                return;
            }
            
            const status = getQualityStatus(data.overallScore);
            
            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">
                        <span class="status-indicator status-\${status}"></span>
                        Overall Score
                    </span>
                    <span class="metric-value">\${data.overallScore}/100</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Critical Issues</span>
                    <span class="metric-value">\${data.issues.critical}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">High Priority</span>
                    <span class="metric-value">\${data.issues.high}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Medium Priority</span>
                    <span class="metric-value">\${data.issues.medium}</span>
                </div>
            \`;
        }
        
        function updateDatabaseHealth() {
            const container = document.getElementById('databaseHealth');
            const data = dashboardData.databaseHealth;
            
            if (!data) {
                container.innerHTML = '<div class="loading">No data available</div>';
                return;
            }
            
            const status = getHealthStatus(data.overallHealth);
            
            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">
                        <span class="status-indicator status-\${status}"></span>
                        Health Status
                    </span>
                    <span class="metric-value">\${data.overallHealth.toUpperCase()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Health Score</span>
                    <span class="metric-value">\${data.metrics.score}/100</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Critical Issues</span>
                    <span class="metric-value">\${data.criticalIssues}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Warnings</span>
                    <span class="metric-value">\${data.warnings}</span>
                </div>
            \`;
        }
        
        function updatePerformance() {
            const container = document.getElementById('performance');
            const data = dashboardData.performance;
            
            if (!data) {
                container.innerHTML = '<div class="loading">No data available</div>';
                return;
            }
            
            const status = getHealthStatus(data.overallHealth);
            const trend = dashboardData.trends?.performance;
            const trendIndicator = trend ? getTrendIndicator(trend) : '';
            
            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">
                        <span class="status-indicator status-\${status}"></span>
                        Performance Health
                    </span>
                    <span class="metric-value">\${data.overallHealth.toUpperCase()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Response Time</span>
                    <span class="metric-value">\${data.avgResponseTime}ms\${trendIndicator}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Critical Regressions</span>
                    <span class="metric-value">\${data.criticalRegressions}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Warnings</span>
                    <span class="metric-value">\${data.warnings}</span>
                </div>
            \`;
        }
        
        function updateSystemOverview() {
            const container = document.getElementById('systemOverview');
            
            const totalAlerts = dashboardData.alerts.length;
            const criticalAlerts = dashboardData.alerts.filter(a => a.type === 'critical').length;
            
            let overallStatus = 'good';
            if (criticalAlerts > 0) {
                overallStatus = 'critical';
            } else if (totalAlerts > 0) {
                overallStatus = 'warning';
            }
            
            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">
                        <span class="status-indicator status-\${overallStatus}"></span>
                        Overall Status
                    </span>
                    <span class="metric-value">\${overallStatus.toUpperCase()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Alerts</span>
                    <span class="metric-value">\${totalAlerts}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Critical Alerts</span>
                    <span class="metric-value">\${criticalAlerts}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">System Uptime</span>
                    <span class="metric-value" id="uptime">Loading...</span>
                </div>
            \`;
            
            // Update uptime
            updateUptime();
        }
        
        function getQualityStatus(score) {
            if (score >= 85) return 'good';
            if (score >= 70) return 'warning';
            return 'critical';
        }
        
        function getHealthStatus(health) {
            switch(health) {
                case 'excellent':
                case 'good': return 'good';
                case 'fair':
                case 'warning': return 'warning';
                case 'poor':
                case 'critical': return 'critical';
                default: return 'unknown';
            }
        }
        
        function getTrendIndicator(trend) {
            if (!trend) return '';
            
            const arrow = trend.direction === 'increasing' ? '↗' : 
                         trend.direction === 'decreasing' ? '↘' : '→';
            const className = trend.direction === 'increasing' ? 'trend-up' : 
                             trend.direction === 'decreasing' ? 'trend-down' : 'trend-stable';
            
            return \` <span class="trend-indicator \${className}">\${arrow} \${trend.change}%</span>\`;
        }
        
        async function updateUptime() {
            try {
                const response = await fetch('/health');
                const health = await response.json();
                const uptimeHours = Math.floor(health.uptime / 3600);
                const uptimeMinutes = Math.floor((health.uptime % 3600) / 60);
                document.getElementById('uptime').textContent = \`\${uptimeHours}h \${uptimeMinutes}m\`;
            } catch (error) {
                console.error('Failed to get uptime:', error);
            }
        }
    </script>
</body>
</html>`;
  }

  /**
   * Generate a static dashboard HTML file
   */
  async generateStaticDashboard() {
    await this.loadAllData();
    
    const html = this.generateDashboardHTML();
    const outputPath = path.join(this.options.reportsDir, 'dashboard.html');
    
    fs.writeFileSync(outputPath, html);
    console.log(`📊 Static dashboard generated: ${outputPath}`);
    
    return outputPath;
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
    
    if (key === 'port') options.port = parseInt(value);
    else if (key === 'refresh') options.refreshInterval = parseInt(value) * 1000;
    else if (key === 'reports-dir') options.reportsDir = value;
    else if (key === 'static') options.generateStatic = true;
  }
  
  const dashboard = new MonitoringDashboard(options);
  
  if (options.generateStatic) {
    // Generate static dashboard and exit
    dashboard.generateStaticDashboard()
      .then(path => {
        console.log(`✅ Static dashboard generated at: ${path}`);
        process.exit(0);
      })
      .catch(error => {
        console.error('💥 Failed to generate static dashboard:', error.message);
        process.exit(1);
      });
  } else {
    // Start live dashboard server
    dashboard.start()
      .then(() => {
        console.log('📊 Dashboard is ready!');
        console.log(`   Open http://localhost:${dashboard.options.port} in your browser`);
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n🛑 Shutting down dashboard...');
          await dashboard.stop();
          process.exit(0);
        });
      })
      .catch(error => {
        console.error('💥 Failed to start dashboard:', error.message);
        process.exit(1);
      });
  }
}

module.exports = MonitoringDashboard;
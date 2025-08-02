#!/usr/bin/env node

/**
 * Alerting System for Maintenance Monitoring
 * 
 * Provides configurable alerting with multiple notification channels:
 * - Email notifications
 * - File-based alerts
 * - Webhook notifications
 * - Console logging
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer').createTransport || null;
const axios = require('axios');

class AlertingSystem {
  constructor(options = {}) {
    this.options = {
      alertsDir: options.alertsDir || 'quality-reports/alerts',
      configFile: options.configFile || 'alerts.config.json',
      channels: options.channels || ['file', 'console'],
      thresholds: {
        codeQuality: options.codeQualityThreshold || 70,
        databaseHealth: options.databaseHealthThreshold || 'fair',
        responseTime: options.responseTimeThreshold || 1000,
        errorRate: options.errorRateThreshold || 5,
        ...options.thresholds
      },
      ...options
    };
    
    this.config = this.loadConfig();
    this.alertHistory = this.loadAlertHistory();
  }

  /**
   * Load alerting configuration
   */
  loadConfig() {
    const configPath = this.options.configFile;
    
    const defaultConfig = {
      enabled: true,
      channels: {
        email: {
          enabled: false,
          smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || ''
            }
          },
          recipients: process.env.ALERT_RECIPIENTS?.split(',') || [],
          template: {
            subject: '[Sports Management] {severity} Alert: {category}',
            from: process.env.SMTP_FROM || 'alerts@sportsmanagement.com'
          }
        },
        webhook: {
          enabled: false,
          urls: [],
          timeout: 5000,
          retries: 3
        },
        file: {
          enabled: true,
          format: 'json',
          maxFiles: 100
        },
        console: {
          enabled: true,
          colorize: true
        }
      },
      rules: {
        debounce: 300000, // 5 minutes
        escalation: {
          enabled: true,
          criticalTimeout: 900000, // 15 minutes
          warningTimeout: 3600000 // 1 hour
        },
        filtering: {
          enableDuplicateFiltering: true,
          enableRateLimiting: true,
          maxAlertsPerHour: 10
        }
      }
    };
    
    try {
      if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...userConfig };
      }
    } catch (error) {
      console.warn('Failed to load alert config, using defaults:', error.message);
    }
    
    // Save default config
    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * Save alerting configuration
   */
  saveConfig(config) {
    try {
      fs.writeFileSync(this.options.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save alert config:', error.message);
    }
  }

  /**
   * Load alert history
   */
  loadAlertHistory() {
    const historyPath = path.join(this.options.alertsDir, 'alert-history.json');
    
    try {
      if (fs.existsSync(historyPath)) {
        return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load alert history:', error.message);
    }
    
    return [];
  }

  /**
   * Save alert history
   */
  saveAlertHistory() {
    try {
      this.ensureAlertsDir();
      const historyPath = path.join(this.options.alertsDir, 'alert-history.json');
      
      // Keep only last 1000 alerts
      if (this.alertHistory.length > 1000) {
        this.alertHistory = this.alertHistory.slice(-1000);
      }
      
      fs.writeFileSync(historyPath, JSON.stringify(this.alertHistory, null, 2));
    } catch (error) {
      console.error('Failed to save alert history:', error.message);
    }
  }

  /**
   * Send alert
   */
  async sendAlert(alert) {
    if (!this.config.enabled) {
      return;
    }
    
    // Validate alert
    if (!this.validateAlert(alert)) {
      console.error('Invalid alert format:', alert);
      return;
    }
    
    // Apply filtering rules
    if (!this.shouldSendAlert(alert)) {
      return;
    }
    
    // Normalize alert
    const normalizedAlert = this.normalizeAlert(alert);
    
    // Add to history
    this.alertHistory.push(normalizedAlert);
    this.saveAlertHistory();
    
    // Send to configured channels
    const results = await this.sendToChannels(normalizedAlert);
    
    console.log(`📢 Alert sent: ${normalizedAlert.category} - ${normalizedAlert.severity}`);
    
    return results;
  }

  /**
   * Validate alert format
   */
  validateAlert(alert) {
    return (
      alert &&
      typeof alert === 'object' &&
      alert.severity &&
      alert.category &&
      alert.message &&
      ['critical', 'warning', 'info'].includes(alert.severity)
    );
  }

  /**
   * Check if alert should be sent based on filtering rules
   */
  shouldSendAlert(alert) {
    const now = Date.now();
    const rules = this.config.rules;
    
    // Check rate limiting
    if (rules.filtering.enableRateLimiting) {
      const hourAgo = now - 3600000; // 1 hour ago
      const recentAlerts = this.alertHistory.filter(a => 
        new Date(a.timestamp).getTime() > hourAgo
      );
      
      if (recentAlerts.length >= rules.filtering.maxAlertsPerHour) {
        console.log('Alert rate limit reached, skipping alert');
        return false;
      }
    }
    
    // Check duplicate filtering
    if (rules.filtering.enableDuplicateFiltering) {
      const debounceTime = now - rules.debounce;
      const recentSimilarAlerts = this.alertHistory.filter(a => 
        a.category === alert.category &&
        a.severity === alert.severity &&
        a.message === alert.message &&
        new Date(a.timestamp).getTime() > debounceTime
      );
      
      if (recentSimilarAlerts.length > 0) {
        console.log('Similar alert sent recently, skipping duplicate');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Normalize alert format
   */
  normalizeAlert(alert) {
    return {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      severity: alert.severity,
      category: alert.category,
      message: alert.message,
      details: alert.details || {},
      source: alert.source || 'maintenance-system',
      tags: alert.tags || [],
      environment: process.env.NODE_ENV || 'development',
      hostname: require('os').hostname()
    };
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send alert to all configured channels
   */
  async sendToChannels(alert) {
    const results = {};
    
    // Send to file
    if (this.config.channels.file.enabled) {
      try {
        await this.sendToFile(alert);
        results.file = { success: true };
      } catch (error) {
        results.file = { success: false, error: error.message };
      }
    }
    
    // Send to console
    if (this.config.channels.console.enabled) {
      try {
        this.sendToConsole(alert);
        results.console = { success: true };
      } catch (error) {
        results.console = { success: false, error: error.message };
      }
    }
    
    // Send to email
    if (this.config.channels.email.enabled && this.config.channels.email.recipients.length > 0) {
      try {
        await this.sendToEmail(alert);
        results.email = { success: true };
      } catch (error) {
        results.email = { success: false, error: error.message };
      }
    }
    
    // Send to webhook
    if (this.config.channels.webhook.enabled && this.config.channels.webhook.urls.length > 0) {
      try {
        await this.sendToWebhook(alert);
        results.webhook = { success: true };
      } catch (error) {
        results.webhook = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  /**
   * Send alert to file
   */
  async sendToFile(alert) {
    this.ensureAlertsDir();
    
    const filename = `alert-${alert.id}.json`;
    const filepath = path.join(this.options.alertsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(alert, null, 2));
    
    // Also append to daily log
    const dateStr = new Date().toISOString().split('T')[0];
    const dailyLogPath = path.join(this.options.alertsDir, `alerts-${dateStr}.log`);
    const logEntry = `${alert.timestamp} [${alert.severity.toUpperCase()}] ${alert.category}: ${alert.message}\n`;
    
    fs.appendFileSync(dailyLogPath, logEntry);
  }

  /**
   * Send alert to console
   */
  sendToConsole(alert) {
    const timestamp = new Date(alert.timestamp).toLocaleString();
    const message = `[${timestamp}] [${alert.severity.toUpperCase()}] ${alert.category}: ${alert.message}`;
    
    if (this.config.channels.console.colorize) {
      switch (alert.severity) {
        case 'critical':
          console.error(`\x1b[31m🚨 ${message}\x1b[0m`);
          break;
        case 'warning':
          console.warn(`\x1b[33m⚠️ ${message}\x1b[0m`);
          break;
        default:
          console.log(`\x1b[36mℹ️ ${message}\x1b[0m`);
      }
    } else {
      console.log(message);
    }
  }

  /**
   * Send alert to email
   */
  async sendToEmail(alert) {
    if (!nodemailer) {
      throw new Error('Nodemailer not available for email alerts');
    }
    
    const emailConfig = this.config.channels.email;
    const transporter = nodemailer(emailConfig.smtp);
    
    const subject = emailConfig.template.subject
      .replace('{severity}', alert.severity.toUpperCase())
      .replace('{category}', alert.category);
    
    const htmlBody = this.generateEmailHTML(alert);
    const textBody = this.generateEmailText(alert);
    
    const mailOptions = {
      from: emailConfig.template.from,
      to: emailConfig.recipients.join(', '),
      subject: subject,
      text: textBody,
      html: htmlBody
    };
    
    await transporter.sendMail(mailOptions);
  }

  /**
   * Generate HTML email body
   */
  generateEmailHTML(alert) {
    const severityColor = {
      critical: '#e74c3c',
      warning: '#f39c12',
      info: '#3498db'
    }[alert.severity] || '#95a5a6';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; }
        .header { background: ${severityColor}; color: white; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .content { line-height: 1.6; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>${alert.severity.toUpperCase()} Alert</h2>
        </div>
        <div class="content">
            <h3>${alert.category}</h3>
            <p>${alert.message}</p>
            
            <div class="details">
                <strong>Alert Details:</strong><br>
                ID: ${alert.id}<br>
                Timestamp: ${new Date(alert.timestamp).toLocaleString()}<br>
                Environment: ${alert.environment}<br>
                Source: ${alert.source}<br>
                Hostname: ${alert.hostname}
            </div>
            
            ${Object.keys(alert.details).length > 0 ? `
            <div class="details">
                <strong>Additional Information:</strong><br>
                ${Object.entries(alert.details).map(([key, value]) => `${key}: ${value}`).join('<br>')}
            </div>
            ` : ''}
        </div>
        <div class="footer">
            This alert was generated automatically by the Sports Management App monitoring system.
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text email body
   */
  generateEmailText(alert) {
    return `
${alert.severity.toUpperCase()} ALERT

Category: ${alert.category}
Message: ${alert.message}

Alert Details:
- ID: ${alert.id}
- Timestamp: ${new Date(alert.timestamp).toLocaleString()}
- Environment: ${alert.environment}
- Source: ${alert.source}
- Hostname: ${alert.hostname}

${Object.keys(alert.details).length > 0 ? `
Additional Information:
${Object.entries(alert.details).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
` : ''}

This alert was generated automatically by the Sports Management App monitoring system.
`;
  }

  /**
   * Send alert to webhook
   */
  async sendToWebhook(alert) {
    const webhookConfig = this.config.channels.webhook;
    const promises = webhookConfig.urls.map(url => 
      this.sendWebhookRequest(url, alert, webhookConfig)
    );
    
    await Promise.all(promises);
  }

  /**
   * Send single webhook request with retries
   */
  async sendWebhookRequest(url, alert, config) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        await axios.post(url, {
          alert: alert,
          timestamp: alert.timestamp,
          severity: alert.severity,
          category: alert.category,
          message: alert.message
        }, {
          timeout: config.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Sports-Management-Alerts/1.0'
          }
        });
        
        return; // Success, exit retry loop
        
      } catch (error) {
        lastError = error;
        
        if (attempt < config.retries) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check system health and send alerts if needed
   */
  async checkSystemHealthAndAlert() {
    const alerts = [];
    
    try {
      // Check code quality
      const qualityAlert = await this.checkCodeQuality();
      if (qualityAlert) alerts.push(qualityAlert);
      
      // Check database health
      const dbAlert = await this.checkDatabaseHealth();
      if (dbAlert) alerts.push(dbAlert);
      
      // Check performance
      const perfAlert = await this.checkPerformance();
      if (perfAlert) alerts.push(perfAlert);
      
    } catch (error) {
      alerts.push({
        severity: 'critical',
        category: 'system-monitoring',
        message: `Health check failed: ${error.message}`,
        details: { error: error.stack }
      });
    }
    
    // Send all alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
    
    return alerts;
  }

  /**
   * Check code quality and return alert if needed
   */
  async checkCodeQuality() {
    try {
      const qualityPath = path.join('quality-reports', 'latest-quality-summary.json');
      if (!fs.existsSync(qualityPath)) return null;
      
      const data = JSON.parse(fs.readFileSync(qualityPath, 'utf8'));
      
      if (data.overallScore < this.options.thresholds.codeQuality) {
        return {
          severity: data.overallScore < 50 ? 'critical' : 'warning',
          category: 'code-quality',
          message: `Code quality score is ${data.overallScore}/100`,
          details: {
            score: data.overallScore,
            criticalIssues: data.issues.critical,
            highPriorityIssues: data.issues.high,
            threshold: this.options.thresholds.codeQuality
          }
        };
      }
      
      if (data.issues.critical > 0) {
        return {
          severity: 'critical',
          category: 'code-quality',
          message: `${data.issues.critical} critical code quality issues detected`,
          details: {
            criticalIssues: data.issues.critical,
            score: data.overallScore
          }
        };
      }
      
    } catch (error) {
      return {
        severity: 'warning',
        category: 'code-quality',
        message: 'Failed to check code quality',
        details: { error: error.message }
      };
    }
    
    return null;
  }

  /**
   * Check database health and return alert if needed
   */
  async checkDatabaseHealth() {
    try {
      const healthPath = path.join('quality-reports', 'database', 'latest-health-summary.json');
      if (!fs.existsSync(healthPath)) return null;
      
      const data = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
      
      const healthLevels = { excellent: 5, good: 4, fair: 3, poor: 2, critical: 1 };
      const thresholdLevel = healthLevels[this.options.thresholds.databaseHealth] || 3;
      const currentLevel = healthLevels[data.overallHealth] || 1;
      
      if (currentLevel < thresholdLevel) {
        return {
          severity: data.overallHealth === 'critical' ? 'critical' : 'warning',
          category: 'database-health',
          message: `Database health is ${data.overallHealth}`,
          details: {
            health: data.overallHealth,
            score: data.metrics.score,
            criticalIssues: data.criticalIssues,
            warnings: data.warnings
          }
        };
      }
      
      if (data.criticalIssues > 0) {
        return {
          severity: 'critical',
          category: 'database-health',
          message: `${data.criticalIssues} critical database issues detected`,
          details: {
            criticalIssues: data.criticalIssues,
            health: data.overallHealth
          }
        };
      }
      
    } catch (error) {
      return {
        severity: 'warning',
        category: 'database-health',
        message: 'Failed to check database health',
        details: { error: error.message }
      };
    }
    
    return null;
  }

  /**
   * Check performance and return alert if needed
   */
  async checkPerformance() {
    try {
      const perfPath = path.join('quality-reports', 'performance', 'latest-benchmark-summary.json');
      if (!fs.existsSync(perfPath)) return null;
      
      const data = JSON.parse(fs.readFileSync(perfPath, 'utf8'));
      
      if (data.avgResponseTime > this.options.thresholds.responseTime) {
        return {
          severity: data.avgResponseTime > this.options.thresholds.responseTime * 2 ? 'critical' : 'warning',
          category: 'performance',
          message: `Average response time is ${data.avgResponseTime}ms`,
          details: {
            avgResponseTime: data.avgResponseTime,
            threshold: this.options.thresholds.responseTime,
            slowestEndpoint: data.slowestEndpoint?.path
          }
        };
      }
      
      if (data.criticalRegressions > 0) {
        return {
          severity: 'critical',
          category: 'performance',
          message: `${data.criticalRegressions} critical performance regressions detected`,
          details: {
            criticalRegressions: data.criticalRegressions,
            overallHealth: data.overallHealth
          }
        };
      }
      
    } catch (error) {
      return {
        severity: 'warning',
        category: 'performance',
        message: 'Failed to check performance metrics',
        details: { error: error.message }
      };
    }
    
    return null;
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;
    
    const recentAlerts = {
      lastHour: this.alertHistory.filter(a => new Date(a.timestamp).getTime() > hourAgo),
      lastDay: this.alertHistory.filter(a => new Date(a.timestamp).getTime() > dayAgo),
      lastWeek: this.alertHistory.filter(a => new Date(a.timestamp).getTime() > weekAgo)
    };
    
    return {
      total: this.alertHistory.length,
      lastHour: recentAlerts.lastHour.length,
      lastDay: recentAlerts.lastDay.length,
      lastWeek: recentAlerts.lastWeek.length,
      bySeverity: {
        critical: this.alertHistory.filter(a => a.severity === 'critical').length,
        warning: this.alertHistory.filter(a => a.severity === 'warning').length,
        info: this.alertHistory.filter(a => a.severity === 'info').length
      },
      byCategory: this.groupAlertsByCategory()
    };
  }

  /**
   * Group alerts by category
   */
  groupAlertsByCategory() {
    const categories = {};
    
    this.alertHistory.forEach(alert => {
      if (!categories[alert.category]) {
        categories[alert.category] = 0;
      }
      categories[alert.category]++;
    });
    
    return categories;
  }

  /**
   * Ensure alerts directory exists
   */
  ensureAlertsDir() {
    if (!fs.existsSync(this.options.alertsDir)) {
      fs.mkdirSync(this.options.alertsDir, { recursive: true });
    }
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
    
    if (key === 'check-health') options.checkHealth = true;
    else if (key === 'test-alert') options.testAlert = value;
    else if (key === 'config') options.configFile = value;
    else if (key === 'alerts-dir') options.alertsDir = value;
  }
  
  const alerting = new AlertingSystem(options);
  
  if (options.checkHealth) {
    // Run health check and send alerts
    alerting.checkSystemHealthAndAlert()
      .then(alerts => {
        console.log(`✅ Health check completed. ${alerts.length} alerts generated.`);
        process.exit(0);
      })
      .catch(error => {
        console.error('💥 Health check failed:', error.message);
        process.exit(1);
      });
  } else if (options.testAlert) {
    // Send test alert
    const testAlert = {
      severity: options.testAlert,
      category: 'test',
      message: `Test ${options.testAlert} alert from CLI`,
      details: { timestamp: new Date().toISOString() }
    };
    
    alerting.sendAlert(testAlert)
      .then(results => {
        console.log('✅ Test alert sent:', results);
        process.exit(0);
      })
      .catch(error => {
        console.error('💥 Failed to send test alert:', error.message);
        process.exit(1);
      });
  } else {
    console.log('📢 Sports Management Alerting System');
    console.log('');
    console.log('Usage:');
    console.log('  node alerts.js --check-health');
    console.log('  node alerts.js --test-alert critical');
    console.log('  node alerts.js --test-alert warning');
    
    // Show stats
    const stats = alerting.getAlertStats();
    console.log('');
    console.log('Alert Statistics:');
    console.log(`  Total alerts: ${stats.total}`);
    console.log(`  Last hour: ${stats.lastHour}`);
    console.log(`  Last day: ${stats.lastDay}`);
    console.log(`  Last week: ${stats.lastWeek}`);
    console.log('');
    console.log('By severity:');
    console.log(`  Critical: ${stats.bySeverity.critical}`);
    console.log(`  Warning: ${stats.bySeverity.warning}`);
    console.log(`  Info: ${stats.bySeverity.info}`);
  }
}

module.exports = AlertingSystem;
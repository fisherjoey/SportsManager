#!/bin/bash

# Sports Management App - Maintenance System Setup Script
# This script sets up the comprehensive maintenance infrastructure

set -e

echo "🔧 Setting up Sports Management App Maintenance System..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the backend directory"
    exit 1
fi

if [ ! -f "src/server.js" ]; then
    print_error "Backend source files not found. Please run from the backend directory."
    exit 1
fi

print_info "Setting up maintenance system in: $(pwd)"
echo ""

# 1. Make scripts executable
print_info "Making maintenance scripts executable..."
chmod +x scripts/quality/check-code-quality.js
chmod +x scripts/database/health-check.js
chmod +x scripts/performance/benchmark.js
chmod +x scripts/monitoring/dashboard.js
chmod +x scripts/monitoring/alerts.js
chmod +x scripts/setup-maintenance.sh
print_status "Scripts are now executable"

# 2. Create necessary directories
print_info "Creating maintenance directories..."
mkdir -p quality-reports/{database,performance,alerts}
mkdir -p logs
mkdir -p uploads/temp
print_status "Directories created"

# 3. Verify dependencies
print_info "Checking dependencies..."
if ! npm list eslint > /dev/null 2>&1; then
    print_warning "ESLint not found in dependencies"
fi

if ! npm list prettier > /dev/null 2>&1; then
    print_warning "Prettier not found in dependencies"
fi

if ! npm list jest > /dev/null 2>&1; then
    print_warning "Jest not found in dependencies"
fi

if ! npm list madge > /dev/null 2>&1; then
    print_warning "Madge not found in dependencies"
fi

print_status "Dependency check completed"

# 4. Create default configuration files
print_info "Creating default configuration files..."

# Create alerts configuration if it doesn't exist
if [ ! -f "alerts.config.json" ]; then
    cat > alerts.config.json << 'EOF'
{
  "enabled": true,
  "channels": {
    "email": {
      "enabled": false,
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "",
          "pass": ""
        }
      },
      "recipients": [],
      "template": {
        "subject": "[Sports Management] {severity} Alert: {category}",
        "from": "alerts@sportsmanagement.com"
      }
    },
    "webhook": {
      "enabled": false,
      "urls": [],
      "timeout": 5000,
      "retries": 3
    },
    "file": {
      "enabled": true,
      "format": "json",
      "maxFiles": 100
    },
    "console": {
      "enabled": true,
      "colorize": true
    }
  },
  "rules": {
    "debounce": 300000,
    "escalation": {
      "enabled": true,
      "criticalTimeout": 900000,
      "warningTimeout": 3600000
    },
    "filtering": {
      "enableDuplicateFiltering": true,
      "enableRateLimiting": true,
      "maxAlertsPerHour": 10
    }
  }
}
EOF
    print_status "Created alerts.config.json"
else
    print_info "alerts.config.json already exists"
fi

# Create .env.example for maintenance configuration
if [ ! -f ".env.maintenance.example" ]; then
    cat > .env.maintenance.example << 'EOF'
# Maintenance System Configuration

# Database
DATABASE_URL=sqlite:./sports_management.db

# Monitoring
MONITORING_PORT=8080
REPORTS_DIR=quality-reports

# Quality Thresholds
CODE_QUALITY_THRESHOLD=70
DB_HEALTH_THRESHOLD=fair
PERFORMANCE_THRESHOLD=1000
REGRESSION_THRESHOLD=20

# Email Alerts (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=alerts@yourdomain.com
ALERT_RECIPIENTS=admin1@example.com,admin2@example.com

# Webhook Alerts (optional)
WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Environment
NODE_ENV=development
DEBUG=maintenance:*
EOF
    print_status "Created .env.maintenance.example"
else
    print_info ".env.maintenance.example already exists"
fi

# 5. Test individual components
print_info "Testing maintenance components..."

# Test code quality tool
print_info "Testing code quality checker..."
if node scripts/quality/check-code-quality.js --output quality-reports/test > /dev/null 2>&1; then
    print_status "Code quality checker working"
else
    print_warning "Code quality checker test failed"
fi

# Test database health (if database exists)
if [ -f "sports_management.db" ] || [ -f "test.db" ]; then
    print_info "Testing database health checker..."
    if node scripts/database/health-check.js --output quality-reports/test > /dev/null 2>&1; then
        print_status "Database health checker working"
    else
        print_warning "Database health checker test failed"
    fi
else
    print_warning "No database found - run 'npm run migrate' first to test database health checker"
fi

# Test alerting system
print_info "Testing alerting system..."
if node scripts/monitoring/alerts.js --test-alert info > /dev/null 2>&1; then
    print_status "Alerting system working"
else
    print_warning "Alerting system test failed"
fi

# Clean up test reports
rm -rf quality-reports/test

# 6. Set up git hooks (optional)
if [ -d ".git" ]; then
    print_info "Setting up git hooks..."
    
    # Create pre-commit hook
    if [ ! -f ".git/hooks/pre-commit" ]; then
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for Sports Management App

echo "🔍 Running pre-commit quality checks..."

# Run linting
if ! npm run lint; then
    echo "❌ Linting failed. Please fix errors before committing."
    exit 1
fi

# Run formatting check
if ! npm run format:check; then
    echo "❌ Code formatting check failed. Run 'npm run format' to fix."
    exit 1
fi

# Run quick tests
if ! npm run test 2>/dev/null; then
    echo "⚠️ Some tests are failing. Consider running full test suite."
fi

echo "✅ Pre-commit checks passed"
EOF
        chmod +x .git/hooks/pre-commit
        print_status "Git pre-commit hook installed"
    else
        print_info "Git pre-commit hook already exists"
    fi
else
    print_warning "Not a git repository - skipping git hooks setup"
fi

# 7. Create maintenance scripts
print_info "Creating convenience scripts..."

# Create daily maintenance script
cat > scripts/daily-maintenance.sh << 'EOF'
#!/bin/bash
# Daily maintenance script

echo "🧹 Running daily maintenance tasks..."

# Run code quality check
echo "📋 Checking code quality..."
npm run quality:check

# Run database health check with cleanup
echo "🏥 Checking database health..."
npm run db:cleanup

# Run performance benchmark
echo "⚡ Running performance benchmark..."
npm run performance:benchmark

# Check system health and send alerts
echo "🚨 Checking for alerts..."
node scripts/monitoring/alerts.js --check-health

echo "✅ Daily maintenance completed"
EOF
chmod +x scripts/daily-maintenance.sh

# Create weekly maintenance script
cat > scripts/weekly-maintenance.sh << 'EOF'
#!/bin/bash
# Weekly maintenance script

echo "🔧 Running weekly maintenance tasks..."

# Full maintenance suite
npm run maintenance:full

# Update performance baseline
echo "📊 Updating performance baseline..."
npm run performance:baseline

# Generate comprehensive reports
echo "📈 Generating dashboard..."
node scripts/monitoring/dashboard.js --static

echo "✅ Weekly maintenance completed"
EOF
chmod +x scripts/weekly-maintenance.sh

print_status "Maintenance scripts created"

# 8. Show setup summary
echo ""
echo "🎉 Maintenance system setup completed!"
echo ""
print_info "📁 Created directories:"
echo "   - quality-reports/"
echo "   - quality-reports/database/"
echo "   - quality-reports/performance/"
echo "   - quality-reports/alerts/"
echo ""

print_info "📋 Available commands:"
echo "   npm run quality:check       - Run code quality analysis"
echo "   npm run db:health           - Check database health"
echo "   npm run performance:benchmark - Run performance tests"
echo "   npm run maintenance:daily   - Run daily maintenance"
echo "   npm run maintenance:full    - Run full maintenance suite"
echo ""

print_info "🖥️ Monitoring tools:"
echo "   node scripts/monitoring/dashboard.js  - Start live dashboard"
echo "   node scripts/monitoring/alerts.js     - Manage alerts"
echo ""

print_info "🔧 Convenience scripts:"
echo "   ./scripts/daily-maintenance.sh   - Daily maintenance tasks"
echo "   ./scripts/weekly-maintenance.sh  - Weekly maintenance tasks"
echo ""

print_info "📚 Documentation:"
echo "   docs/MAINTENANCE.md - Complete maintenance guide"
echo ""

# Show next steps
print_info "🚀 Next steps:"
echo "1. Copy .env.maintenance.example to .env and configure"
echo "2. Set up database: npm run migrate && npm run seed"
echo "3. Test the system: npm run maintenance:daily"
echo "4. Start monitoring dashboard: node scripts/monitoring/dashboard.js"
echo "5. Configure alerts in alerts.config.json"
echo ""

# Check if database setup is needed
if [ ! -f "sports_management.db" ] && [ ! -f "test.db" ]; then
    print_warning "Database not found. Run 'npm run migrate && npm run seed' to set up."
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Copy .env.maintenance.example to .env and configure."
fi

print_status "Maintenance system is ready to use!"
echo ""
echo "Run 'npm run maintenance:daily' to test the system."
echo "View the dashboard at http://localhost:8080 after running: node scripts/monitoring/dashboard.js"
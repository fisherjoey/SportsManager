#!/bin/bash

# Enterprise API Testing Script
# Tests all enterprise endpoints for the Sports Management App backend
# Run this script to verify all enterprise functionality is working correctly

set -e  # Exit on any error

# Configuration
BASE_URL="http://localhost:3001"
AUTH_TOKEN=""  # Set your Bearer token here
TEST_USER_ID=""  # Set a valid user UUID for testing
TEST_EMPLOYEE_ID=""  # Set a valid employee UUID for testing
TEST_DEPARTMENT_ID=""  # Set a valid department UUID for testing

# Colors for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging function
log() {
    local level=$1
    local message=$2
    local color=""
    
    case $level in
        "INFO") color=$BLUE ;;
        "SUCCESS") color=$GREEN ;;
        "WARNING") color=$YELLOW ;;
        "ERROR") color=$RED ;;
    esac
    
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message${NC}"
}

# Function to make API call and validate response
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local expected_status=${5:-200}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log "INFO" "Testing: $description"
    log "INFO" "Method: $method | Endpoint: $endpoint"
    
    # Prepare curl command
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    # Add authentication header if token is provided
    if [ -n "$AUTH_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi
    
    # Add content-type for POST/PUT requests
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    fi
    
    # Add data if provided
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    # Complete the curl command
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    # Execute the request
    local response=$(eval $curl_cmd)
    local http_code="${response: -3}"
    local body="${response%???}"
    
    # Validate response
    if [ "$http_code" -eq "$expected_status" ] || [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "SUCCESS" "✓ PASSED - HTTP $http_code"
        
        # Pretty print JSON response if it's not empty
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo "$body" | python3 -m json.tool 2>/dev/null | head -20 || echo "$body"
        fi
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "ERROR" "✗ FAILED - Expected HTTP $expected_status, got HTTP $http_code"
        log "ERROR" "Response: $body"
    fi
    
    echo "----------------------------------------"
    sleep 0.5  # Brief pause between requests
}

# Pre-flight checks
preflight_checks() {
    log "INFO" "Starting Enterprise API Test Suite"
    log "INFO" "Base URL: $BASE_URL"
    
    if [ -z "$AUTH_TOKEN" ]; then
        log "WARNING" "AUTH_TOKEN not set. Some authenticated endpoints may fail."
        read -p "Enter your Bearer token (or press Enter to continue without): " AUTH_TOKEN
    fi
    
    if [ -z "$TEST_USER_ID" ]; then
        log "WARNING" "TEST_USER_ID not set. Some user-specific tests may fail."
        read -p "Enter a valid user UUID (or press Enter to skip): " TEST_USER_ID
    fi
    
    # Test basic connectivity
    log "INFO" "Testing basic connectivity..."
    test_endpoint "GET" "/health" "Health Check" "" 200
}

# EMPLOYEE MANAGEMENT TESTS
test_employee_management() {
    log "INFO" "=== TESTING EMPLOYEE MANAGEMENT MODULE ==="
    
    # Test departments
    test_endpoint "GET" "/api/employees/departments" "Get all departments with hierarchy"
    test_endpoint "GET" "/api/employees/departments?active=true" "Get active departments only"
    
    # Test department creation
    local dept_data='{
        "name": "Test Department",
        "description": "Department created for API testing",
        "cost_center": "TC001",
        "budget_allocated": 50000
    }'
    test_endpoint "POST" "/api/employees/departments" "Create new department" "$dept_data" 201
    
    # Test job positions
    test_endpoint "GET" "/api/employees/positions" "Get all job positions"
    test_endpoint "GET" "/api/employees/positions?level=Senior" "Get senior level positions"
    test_endpoint "GET" "/api/employees/positions?active=true" "Get active positions only"
    
    # Test position creation (requires valid department_id)
    if [ -n "$TEST_DEPARTMENT_ID" ]; then
        local position_data='{
            "title": "Test Position",
            "description": "Position created for API testing",
            "department_id": "'$TEST_DEPARTMENT_ID'",
            "level": "Mid",
            "min_salary": 50000,
            "max_salary": 75000,
            "required_skills": ["Testing", "API"],
            "responsibilities": "Test API endpoints"
        }'
        test_endpoint "POST" "/api/employees/positions" "Create new job position" "$position_data" 201
    fi
    
    # Test employees
    test_endpoint "GET" "/api/employees" "Get all employees"
    test_endpoint "GET" "/api/employees?page=1&limit=25" "Get employees with pagination"
    test_endpoint "GET" "/api/employees?employment_status=active" "Get active employees only"
    
    if [ -n "$TEST_EMPLOYEE_ID" ]; then
        test_endpoint "GET" "/api/employees/$TEST_EMPLOYEE_ID" "Get specific employee by ID"
        test_endpoint "GET" "/api/employees/$TEST_EMPLOYEE_ID/evaluations" "Get employee evaluations"
        test_endpoint "GET" "/api/employees/$TEST_EMPLOYEE_ID/training" "Get employee training records"
        test_endpoint "GET" "/api/employees/$TEST_EMPLOYEE_ID/training?status=completed" "Get completed training records"
    fi
    
    # Test employee statistics
    test_endpoint "GET" "/api/employees/stats/overview" "Get employee statistics overview"
}

# ASSET TRACKING TESTS
test_asset_management() {
    log "INFO" "=== TESTING ASSET TRACKING MODULE ==="
    
    # Test assets
    test_endpoint "GET" "/api/assets" "Get all assets"
    test_endpoint "GET" "/api/assets?page=1&limit=25" "Get assets with pagination"
    test_endpoint "GET" "/api/assets?status=available" "Get available assets"
    test_endpoint "GET" "/api/assets?condition=good" "Get assets in good condition"
    test_endpoint "GET" "/api/assets?category=IT" "Get IT assets"
    test_endpoint "GET" "/api/assets?search=laptop" "Search assets by keyword"
    
    # Test asset creation
    local asset_data='{
        "asset_tag": "TEST-001",
        "name": "Test Laptop",
        "description": "Laptop for API testing",
        "category": "IT",
        "subcategory": "Computer",
        "brand": "Dell",
        "model": "Latitude 5520",
        "purchase_date": "2024-01-15",
        "purchase_cost": 1200.00,
        "current_value": 1000.00,
        "condition": "excellent",
        "status": "available"
    }'
    test_endpoint "POST" "/api/assets" "Create new asset" "$asset_data" 201
    
    # Test asset maintenance
    test_endpoint "GET" "/api/assets/maintenance" "Get all maintenance records"
    test_endpoint "GET" "/api/assets/maintenance?status=scheduled" "Get scheduled maintenance"
    test_endpoint "GET" "/api/assets/maintenance?maintenance_type=routine" "Get routine maintenance"
    
    # Test asset categories
    test_endpoint "GET" "/api/assets/categories" "Get asset categories"
    
    # Test asset checkout/checkin
    test_endpoint "GET" "/api/assets/checkout-history" "Get checkout history"
    test_endpoint "GET" "/api/assets/checkout-history?status=checked_out" "Get active checkouts"
    
    # Test asset statistics
    test_endpoint "GET" "/api/assets/stats/overview" "Get asset statistics overview"
    test_endpoint "GET" "/api/assets/stats/by-category" "Get assets by category"
    test_endpoint "GET" "/api/assets/stats/by-status" "Get assets by status"
    test_endpoint "GET" "/api/assets/stats/maintenance-due" "Get assets due for maintenance"
}

# DOCUMENT MANAGEMENT TESTS
test_document_management() {
    log "INFO" "=== TESTING DOCUMENT MANAGEMENT MODULE ==="
    
    # Test documents
    test_endpoint "GET" "/api/documents" "Get all documents"
    test_endpoint "GET" "/api/documents?page=1&limit=25" "Get documents with pagination"
    test_endpoint "GET" "/api/documents?category=policy" "Get policy documents"
    test_endpoint "GET" "/api/documents?status=active" "Get active documents"
    test_endpoint "GET" "/api/documents?search=handbook" "Search documents"
    
    # Test document categories
    test_endpoint "GET" "/api/documents/categories" "Get document categories"
    
    # Test document templates
    test_endpoint "GET" "/api/documents/templates" "Get document templates"
    
    # Test document acknowledgments
    test_endpoint "GET" "/api/documents/acknowledgments" "Get document acknowledgments"
    
    if [ -n "$TEST_USER_ID" ]; then
        test_endpoint "GET" "/api/documents/acknowledgments?user_id=$TEST_USER_ID" "Get user acknowledgments"
    fi
    
    # Test document statistics
    test_endpoint "GET" "/api/documents/stats/overview" "Get document statistics"
    test_endpoint "GET" "/api/documents/stats/by-category" "Get documents by category stats"
    test_endpoint "GET" "/api/documents/stats/acknowledgment-rates" "Get acknowledgment rates"
}

# COMPLIANCE TRACKING TESTS
test_compliance_management() {
    log "INFO" "=== TESTING COMPLIANCE TRACKING MODULE ==="
    
    # Test compliance requirements
    test_endpoint "GET" "/api/compliance" "Get all compliance requirements"
    test_endpoint "GET" "/api/compliance?page=1&limit=25" "Get compliance with pagination"
    test_endpoint "GET" "/api/compliance?status=active" "Get active compliance requirements"
    test_endpoint "GET" "/api/compliance?compliance_type=safety" "Get safety compliance"
    test_endpoint "GET" "/api/compliance?frequency=monthly" "Get monthly compliance checks"
    
    # Test compliance audits
    test_endpoint "GET" "/api/compliance/audits" "Get compliance audits"
    test_endpoint "GET" "/api/compliance/audits?status=pending" "Get pending audits"
    test_endpoint "GET" "/api/compliance/audits/upcoming" "Get upcoming audits"
    test_endpoint "GET" "/api/compliance/audits/overdue" "Get overdue audits"
    
    # Test incidents
    test_endpoint "GET" "/api/compliance/incidents" "Get all incidents"
    test_endpoint "GET" "/api/compliance/incidents?severity=high" "Get high severity incidents"
    test_endpoint "GET" "/api/compliance/incidents?status=open" "Get open incidents"
    test_endpoint "GET" "/api/compliance/incidents?incident_type=safety" "Get safety incidents"
    
    # Test incident creation
    local incident_data='{
        "incident_type": "safety",
        "severity": "medium",
        "incident_date": "2024-01-15T10:00:00Z",
        "description": "Test incident for API validation",
        "immediate_actions_taken": "Area secured and documented"
    }'
    test_endpoint "POST" "/api/compliance/incidents" "Create new incident" "$incident_data" 201
    
    # Test risk assessments
    test_endpoint "GET" "/api/compliance/risks" "Get risk assessments"
    test_endpoint "GET" "/api/compliance/risks?risk_level=high" "Get high risk items"
    test_endpoint "GET" "/api/compliance/risks?category=operational" "Get operational risks"
    
    # Test compliance statistics
    test_endpoint "GET" "/api/compliance/stats/overview" "Get compliance statistics"
    test_endpoint "GET" "/api/compliance/stats/by-type" "Get compliance by type"
    test_endpoint "GET" "/api/compliance/stats/incident-trends" "Get incident trends"
}

# COMMUNICATIONS TESTS
test_communications() {
    log "INFO" "=== TESTING COMMUNICATIONS MODULE ==="
    
    # Test announcements
    test_endpoint "GET" "/api/communications/announcements" "Get all announcements"
    test_endpoint "GET" "/api/communications/announcements?status=active" "Get active announcements"
    test_endpoint "GET" "/api/communications/announcements?priority=high" "Get high priority announcements"
    test_endpoint "GET" "/api/communications/announcements?target_audience=all_employees" "Get employee announcements"
    
    # Test notification preferences
    test_endpoint "GET" "/api/communications/preferences" "Get notification preferences"
    
    if [ -n "$TEST_USER_ID" ]; then
        test_endpoint "GET" "/api/communications/preferences/$TEST_USER_ID" "Get user notification preferences"
    fi
    
    # Test message templates
    test_endpoint "GET" "/api/communications/templates" "Get message templates"
    test_endpoint "GET" "/api/communications/templates?category=policy" "Get policy templates"
    
    # Test communication logs
    test_endpoint "GET" "/api/communications/logs" "Get communication logs"
    test_endpoint "GET" "/api/communications/logs?status=sent" "Get sent communications"
    test_endpoint "GET" "/api/communications/logs?communication_type=email" "Get email communications"
    
    # Test communication statistics
    test_endpoint "GET" "/api/communications/stats/overview" "Get communication statistics"
    test_endpoint "GET" "/api/communications/stats/engagement" "Get engagement statistics"
}

# BUDGET MANAGEMENT TESTS
test_budget_management() {
    log "INFO" "=== TESTING BUDGET MANAGEMENT MODULE ==="
    
    # Test budgets
    test_endpoint "GET" "/api/budgets" "Get all budgets"
    test_endpoint "GET" "/api/budgets?page=1&limit=25" "Get budgets with pagination"
    test_endpoint "GET" "/api/budgets?fiscal_year=2024" "Get budgets for fiscal year 2024"
    test_endpoint "GET" "/api/budgets?status=active" "Get active budgets"
    test_endpoint "GET" "/api/budgets?category=operations" "Get operational budgets"
    
    # Test budget categories
    test_endpoint "GET" "/api/budgets/categories" "Get budget categories"
    
    # Test budget allocations
    test_endpoint "GET" "/api/budgets/allocations" "Get budget allocations"
    
    if [ -n "$TEST_DEPARTMENT_ID" ]; then
        test_endpoint "GET" "/api/budgets/allocations?department_id=$TEST_DEPARTMENT_ID" "Get department allocations"
    fi
    
    # Test budget vs actual analysis
    test_endpoint "GET" "/api/budgets/analysis/variance" "Get budget variance analysis"
    test_endpoint "GET" "/api/budgets/analysis/utilization" "Get budget utilization analysis"
    test_endpoint "GET" "/api/budgets/analysis/trends" "Get budget trend analysis"
    
    # Test budget statistics
    test_endpoint "GET" "/api/budgets/stats/overview" "Get budget overview statistics"
    test_endpoint "GET" "/api/budgets/stats/by-category" "Get budget stats by category"
    test_endpoint "GET" "/api/budgets/stats/alerts" "Get budget alerts"
}

# EXPENSE PROCESSING TESTS
test_expense_management() {
    log "INFO" "=== TESTING EXPENSE PROCESSING MODULE ==="
    
    # Test expenses
    test_endpoint "GET" "/api/expenses" "Get all expenses"
    test_endpoint "GET" "/api/expenses?page=1&limit=25" "Get expenses with pagination"
    test_endpoint "GET" "/api/expenses?status=pending" "Get pending expenses"
    test_endpoint "GET" "/api/expenses?status=approved" "Get approved expenses"
    test_endpoint "GET" "/api/expenses?category=travel" "Get travel expenses"
    test_endpoint "GET" "/api/expenses?date_from=2024-01-01" "Get expenses from date"
    test_endpoint "GET" "/api/expenses?date_to=2024-12-31" "Get expenses to date"
    
    if [ -n "$TEST_EMPLOYEE_ID" ]; then
        test_endpoint "GET" "/api/expenses?employee_id=$TEST_EMPLOYEE_ID" "Get employee expenses"
    fi
    
    # Test expense categories
    test_endpoint "GET" "/api/expenses/categories" "Get expense categories"
    
    # Test expense reports
    test_endpoint "GET" "/api/expenses/reports" "Get expense reports"
    test_endpoint "GET" "/api/expenses/reports?status=submitted" "Get submitted expense reports"
    
    # Test expense approval workflow
    test_endpoint "GET" "/api/expenses/approvals/pending" "Get pending approvals"
    test_endpoint "GET" "/api/expenses/approvals/history" "Get approval history"
    
    # Test expense statistics
    test_endpoint "GET" "/api/expenses/stats/overview" "Get expense statistics"
    test_endpoint "GET" "/api/expenses/stats/by-category" "Get expenses by category"
    test_endpoint "GET" "/api/expenses/stats/by-employee" "Get expenses by employee"
    test_endpoint "GET" "/api/expenses/stats/trends" "Get expense trends"
}

# FINANCIAL REPORTING TESTS
test_financial_reporting() {
    log "INFO" "=== TESTING FINANCIAL REPORTING MODULE ==="
    
    # Test financial reports
    test_endpoint "GET" "/api/financial-reports" "Get all financial reports"
    test_endpoint "GET" "/api/financial-reports?report_type=budget_summary" "Get budget summary reports"
    test_endpoint "GET" "/api/financial-reports?report_type=expense_analysis" "Get expense analysis reports"
    test_endpoint "GET" "/api/financial-reports?period=monthly" "Get monthly reports"
    test_endpoint "GET" "/api/financial-reports?year=2024" "Get reports for 2024"
    
    # Test report templates
    test_endpoint "GET" "/api/financial-reports/templates" "Get report templates"
    
    # Test financial summaries
    test_endpoint "GET" "/api/financial-reports/summaries/monthly" "Get monthly financial summary"
    test_endpoint "GET" "/api/financial-reports/summaries/quarterly" "Get quarterly financial summary"
    test_endpoint "GET" "/api/financial-reports/summaries/annual" "Get annual financial summary"
    
    # Test budget vs actual reports
    test_endpoint "GET" "/api/financial-reports/budget-vs-actual" "Get budget vs actual report"
    test_endpoint "GET" "/api/financial-reports/budget-vs-actual?period=Q1" "Get Q1 budget vs actual"
    
    # Test cost center analysis
    test_endpoint "GET" "/api/financial-reports/cost-centers" "Get cost center analysis"
    
    if [ -n "$TEST_DEPARTMENT_ID" ]; then
        test_endpoint "GET" "/api/financial-reports/cost-centers?department_id=$TEST_DEPARTMENT_ID" "Get department cost analysis"
    fi
    
    # Test financial KPIs
    test_endpoint "GET" "/api/financial-reports/kpis" "Get financial KPIs"
    test_endpoint "GET" "/api/financial-reports/kpis/trends" "Get KPI trends"
}

# ACCOUNTING INTEGRATION TESTS
test_accounting_integration() {
    log "INFO" "=== TESTING ACCOUNTING INTEGRATION MODULE ==="
    
    # Test GL accounts
    test_endpoint "GET" "/api/accounting/accounts" "Get chart of accounts"
    test_endpoint "GET" "/api/accounting/accounts?account_type=asset" "Get asset accounts"
    test_endpoint "GET" "/api/accounting/accounts?account_type=expense" "Get expense accounts"
    test_endpoint "GET" "/api/accounting/accounts?active=true" "Get active accounts"
    
    # Test journal entries
    test_endpoint "GET" "/api/accounting/journal-entries" "Get journal entries"
    test_endpoint "GET" "/api/accounting/journal-entries?status=posted" "Get posted entries"
    test_endpoint "GET" "/api/accounting/journal-entries?date_from=2024-01-01" "Get entries from date"
    
    # Test trial balance
    test_endpoint "GET" "/api/accounting/trial-balance" "Get trial balance"
    test_endpoint "GET" "/api/accounting/trial-balance?as_of_date=2024-12-31" "Get trial balance as of date"
    
    # Test account reconciliation
    test_endpoint "GET" "/api/accounting/reconciliation" "Get reconciliation status"
    test_endpoint "GET" "/api/accounting/reconciliation/bank-accounts" "Get bank account reconciliations"
    
    # Test export functions
    test_endpoint "GET" "/api/accounting/export/quickbooks" "Get QuickBooks export data"
    test_endpoint "GET" "/api/accounting/export/excel" "Get Excel export data"
    
    # Test sync status
    test_endpoint "GET" "/api/accounting/sync/status" "Get sync status with external systems"
    test_endpoint "GET" "/api/accounting/sync/logs" "Get sync logs"
}

# ORGANIZATIONAL ANALYTICS TESTS
test_organizational_analytics() {
    log "INFO" "=== TESTING ORGANIZATIONAL ANALYTICS MODULE ==="
    
    # Test employee analytics
    test_endpoint "GET" "/api/analytics/organizational/employees" "Get employee analytics"
    test_endpoint "GET" "/api/analytics/organizational/employees/headcount" "Get headcount analytics"
    test_endpoint "GET" "/api/analytics/organizational/employees/turnover" "Get turnover analytics"
    test_endpoint "GET" "/api/analytics/organizational/employees/performance" "Get performance analytics"
    test_endpoint "GET" "/api/analytics/organizational/employees/demographics" "Get demographic analytics"
    
    # Test department analytics
    test_endpoint "GET" "/api/analytics/organizational/departments" "Get department analytics"
    test_endpoint "GET" "/api/analytics/organizational/departments/productivity" "Get productivity analytics"
    test_endpoint "GET" "/api/analytics/organizational/departments/costs" "Get cost analytics"
    
    # Test financial analytics
    test_endpoint "GET" "/api/analytics/organizational/financial" "Get financial analytics"
    test_endpoint "GET" "/api/analytics/organizational/financial/revenue" "Get revenue analytics"
    test_endpoint "GET" "/api/analytics/organizational/financial/expenses" "Get expense analytics"
    test_endpoint "GET" "/api/analytics/organizational/financial/profitability" "Get profitability analytics"
    
    # Test operational analytics
    test_endpoint "GET" "/api/analytics/organizational/operations" "Get operational analytics"
    test_endpoint "GET" "/api/analytics/organizational/operations/efficiency" "Get efficiency metrics"
    test_endpoint "GET" "/api/analytics/organizational/operations/resource-utilization" "Get resource utilization"
    
    # Test predictive analytics
    test_endpoint "GET" "/api/analytics/organizational/predictions/attrition" "Get attrition predictions"
    test_endpoint "GET" "/api/analytics/organizational/predictions/budget" "Get budget forecasts"
    
    # Test analytics dashboards
    test_endpoint "GET" "/api/analytics/organizational/dashboards/executive" "Get executive dashboard"
    test_endpoint "GET" "/api/analytics/organizational/dashboards/hr" "Get HR dashboard"
    test_endpoint "GET" "/api/analytics/organizational/dashboards/finance" "Get finance dashboard"
}

# WORKFLOW MANAGEMENT TESTS
test_workflow_management() {
    log "INFO" "=== TESTING WORKFLOW MANAGEMENT MODULE ==="
    
    # Test workflow definitions
    test_endpoint "GET" "/api/workflows" "Get all workflows"
    test_endpoint "GET" "/api/workflows?status=active" "Get active workflows"
    test_endpoint "GET" "/api/workflows?category=approval" "Get approval workflows"
    test_endpoint "GET" "/api/workflows?category=onboarding" "Get onboarding workflows"
    
    # Test workflow instances
    test_endpoint "GET" "/api/workflows/instances" "Get workflow instances"
    test_endpoint "GET" "/api/workflows/instances?status=running" "Get running workflows"
    test_endpoint "GET" "/api/workflows/instances?status=completed" "Get completed workflows"
    test_endpoint "GET" "/api/workflows/instances?status=failed" "Get failed workflows"
    
    # Test workflow tasks
    test_endpoint "GET" "/api/workflows/tasks" "Get workflow tasks"
    test_endpoint "GET" "/api/workflows/tasks/pending" "Get pending tasks"
    
    if [ -n "$TEST_USER_ID" ]; then
        test_endpoint "GET" "/api/workflows/tasks?assigned_to=$TEST_USER_ID" "Get user assigned tasks"
    fi
    
    # Test workflow templates
    test_endpoint "GET" "/api/workflows/templates" "Get workflow templates"
    test_endpoint "GET" "/api/workflows/templates?category=hr" "Get HR workflow templates"
    
    # Test workflow statistics
    test_endpoint "GET" "/api/workflows/stats/overview" "Get workflow statistics"
    test_endpoint "GET" "/api/workflows/stats/performance" "Get workflow performance metrics"
    test_endpoint "GET" "/api/workflows/stats/bottlenecks" "Get workflow bottleneck analysis"
}

# Generate test summary
generate_summary() {
    log "INFO" "=== TEST EXECUTION SUMMARY ==="
    log "INFO" "Total Tests: $TOTAL_TESTS"
    log "SUCCESS" "Passed Tests: $PASSED_TESTS"
    log "ERROR" "Failed Tests: $FAILED_TESTS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "SUCCESS" "All tests passed! ✓"
        exit 0
    else
        log "ERROR" "Some tests failed. Please review the output above."
        exit 1
    fi
}

# Main execution
main() {
    preflight_checks
    
    # Run all test modules
    test_employee_management
    test_asset_management
    test_document_management
    test_compliance_management
    test_communications
    test_budget_management
    test_expense_management
    test_financial_reporting
    test_accounting_integration
    test_organizational_analytics
    test_workflow_management
    
    generate_summary
}

# Help function
show_help() {
    echo "Enterprise API Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  -t, --token TOKEN    Set Bearer authentication token"
    echo "  -u, --url URL        Set base URL (default: http://localhost:3001)"
    echo "  -v, --verbose        Enable verbose output"
    echo ""
    echo "Environment Variables:"
    echo "  AUTH_TOKEN          Bearer token for authentication"
    echo "  BASE_URL           Base URL for API (default: http://localhost:3001)"
    echo "  TEST_USER_ID       Valid user UUID for testing"
    echo "  TEST_EMPLOYEE_ID   Valid employee UUID for testing"
    echo "  TEST_DEPARTMENT_ID Valid department UUID for testing"
    echo ""
    echo "Examples:"
    echo "  $0 --token 'your-jwt-token-here'"
    echo "  $0 --url 'https://api.yourapp.com'"
    echo "  AUTH_TOKEN='token' $0"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--token)
            AUTH_TOKEN="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if server is running
if ! curl -s "$BASE_URL/health" > /dev/null; then
    log "ERROR" "Cannot connect to server at $BASE_URL"
    log "ERROR" "Please ensure the server is running and accessible"
    exit 1
fi

# Execute main function
main
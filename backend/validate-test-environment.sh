#!/bin/bash

# Test Environment Validation Script
# Checks if the environment is ready for enterprise API testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    
    echo -e "${color}[$level] $message${NC}"
}

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
DATABASE_URL="${DATABASE_URL:-}"

check_server_connectivity() {
    log "INFO" "Checking server connectivity..."
    
    if curl -s --max-time 5 "$BASE_URL/health" > /dev/null 2>&1; then
        log "SUCCESS" "Server is reachable at $BASE_URL"
        return 0
    else
        log "ERROR" "Cannot connect to server at $BASE_URL"
        log "ERROR" "Make sure your server is running with: npm start"
        return 1
    fi
}

check_health_endpoints() {
    log "INFO" "Checking health endpoints..."
    
    local health_response=$(curl -s "$BASE_URL/health" 2>/dev/null || echo "")
    
    if [ -n "$health_response" ]; then
        log "SUCCESS" "Health endpoint is responding"
        echo "Response: $health_response" | head -3
    else
        log "ERROR" "Health endpoint is not responding"
        return 1
    fi
}

check_database_connection() {
    log "INFO" "Checking database connectivity..."
    
    if [ -z "$DATABASE_URL" ]; then
        log "WARNING" "DATABASE_URL not set, skipping database checks"
        return 0
    fi
    
    # Try to connect to database
    if command -v psql >/dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
            log "SUCCESS" "Database connection successful"
        else
            log "ERROR" "Cannot connect to database"
            return 1
        fi
    else
        log "WARNING" "psql not available, cannot test database connection"
    fi
}

check_required_tables() {
    log "INFO" "Checking required database tables..."
    
    if [ -z "$DATABASE_URL" ] || ! command -v psql >/dev/null 2>&1; then
        log "WARNING" "Skipping table checks (no DATABASE_URL or psql)"
        return 0
    fi
    
    local tables=(
        "users"
        "employees" 
        "departments"
        "job_positions"
        "assets"
        "documents"
        "budgets"
        "expenses"
    )
    
    local missing_tables=()
    
    for table in "${tables[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" >/dev/null 2>&1; then
            log "SUCCESS" "Table '$table' exists and accessible"
        else
            log "WARNING" "Table '$table' missing or inaccessible"
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        log "WARNING" "Missing tables: ${missing_tables[*]}"
        log "INFO" "Run database migrations or setup-test-data.sql"
    fi
}

check_test_data() {
    log "INFO" "Checking for test data..."
    
    if [ -z "$DATABASE_URL" ] || ! command -v psql >/dev/null 2>&1; then
        log "WARNING" "Skipping test data checks"
        return 0
    fi
    
    # Check for test department
    local test_dept_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM departments WHERE name LIKE '%Test%' OR name LIKE '%API%';" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$test_dept_count" -gt 0 ]; then
        log "SUCCESS" "Found $test_dept_count test department(s)"
    else
        log "WARNING" "No test departments found"
        log "INFO" "Consider running: psql -d your_db -f setup-test-data.sql"
    fi
    
    # Check for test users
    local test_user_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE email LIKE '%test%' OR name LIKE '%Test%';" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$test_user_count" -gt 0 ]; then
        log "SUCCESS" "Found $test_user_count test user(s)"
    else
        log "WARNING" "No test users found"
    fi
}

check_authentication() {
    log "INFO" "Checking authentication endpoints..."
    
    # Test if auth endpoints are available
    local auth_response=$(curl -s -w '%{http_code}' -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"test"}' 2>/dev/null || echo "000")
    
    local http_code="${auth_response: -3}"
    
    if [ "$http_code" = "400" ] || [ "$http_code" = "401" ] || [ "$http_code" = "422" ]; then
        log "SUCCESS" "Auth endpoint is responding (HTTP $http_code is expected for invalid credentials)"
    elif [ "$http_code" = "200" ]; then
        log "SUCCESS" "Auth endpoint is working (test credentials worked!)"
    else
        log "ERROR" "Auth endpoint issue (HTTP $http_code)"
        return 1
    fi
}

check_enterprise_endpoints() {
    log "INFO" "Checking enterprise endpoint availability..."
    
    local endpoints=(
        "/api/employees"
        "/api/assets" 
        "/api/documents"
        "/api/compliance"
        "/api/communications"
        "/api/budgets"
        "/api/expenses"
        "/api/financial-reports"
        "/api/accounting"
        "/api/analytics/organizational"
        "/api/workflows"
    )
    
    local available_count=0
    
    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -w '%{http_code}' "$BASE_URL$endpoint" 2>/dev/null || echo "000")
        local http_code="${response: -3}"
        
        # 401 (Unauthorized) is expected without auth token - this means endpoint exists
        if [ "$http_code" = "401" ] || [ "$http_code" = "200" ] || [ "$http_code" = "403" ]; then
            log "SUCCESS" "Endpoint $endpoint is available"
            available_count=$((available_count + 1))
        else
            log "WARNING" "Endpoint $endpoint may not be available (HTTP $http_code)"
        fi
    done
    
    log "INFO" "Found $available_count/${#endpoints[@]} enterprise endpoints"
    
    if [ $available_count -lt 8 ]; then
        log "WARNING" "Some enterprise endpoints may be missing"
        return 1
    fi
}

check_test_tools() {
    log "INFO" "Checking required tools..."
    
    local tools=("curl" "python3")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            log "SUCCESS" "$tool is available"
        else
            log "ERROR" "$tool is required but not installed"
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
}

generate_test_config() {
    log "INFO" "Generating test configuration suggestions..."
    
    if [ -z "$DATABASE_URL" ] || ! command -v psql >/dev/null 2>&1; then
        log "WARNING" "Cannot generate specific test IDs without database access"
        return 0
    fi
    
    # Get sample IDs from database
    local user_id=$(psql "$DATABASE_URL" -t -c "SELECT id FROM users WHERE active = true LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "")
    local employee_id=$(psql "$DATABASE_URL" -t -c "SELECT id FROM employees WHERE employment_status = 'active' LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "")
    local dept_id=$(psql "$DATABASE_URL" -t -c "SELECT id FROM departments WHERE active = true LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "")
    
    log "INFO" "Suggested test configuration:"
    echo "export BASE_URL=\"$BASE_URL\""
    echo "export AUTH_TOKEN=\"your-jwt-token-here\""
    
    if [ -n "$user_id" ]; then
        echo "export TEST_USER_ID=\"$user_id\""
    fi
    
    if [ -n "$employee_id" ]; then
        echo "export TEST_EMPLOYEE_ID=\"$employee_id\""
    fi
    
    if [ -n "$dept_id" ]; then
        echo "export TEST_DEPARTMENT_ID=\"$dept_id\""
    fi
}

show_next_steps() {
    log "INFO" "Next steps to run the enterprise API tests:"
    echo ""
    echo "1. Get an authentication token:"
    echo "   curl -X POST $BASE_URL/api/auth/login \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"email\":\"admin@example.com\",\"password\":\"your-password\"}'"
    echo ""
    echo "2. Run the test suite:"
    echo "   ./test-enterprise-api.sh --token \"your-jwt-token-here\""
    echo ""
    echo "3. Or set environment variables:"
    echo "   export AUTH_TOKEN=\"your-jwt-token-here\""
    echo "   ./test-enterprise-api.sh"
}

main() {
    log "INFO" "=== Enterprise API Test Environment Validation ==="
    log "INFO" "Base URL: $BASE_URL"
    echo ""
    
    local checks_passed=0
    local total_checks=0
    
    # Run all checks
    local checks=(
        "check_server_connectivity"
        "check_health_endpoints" 
        "check_test_tools"
        "check_authentication"
        "check_enterprise_endpoints"
        "check_database_connection"
        "check_required_tables"
        "check_test_data"
    )
    
    for check in "${checks[@]}"; do
        total_checks=$((total_checks + 1))
        if $check; then
            checks_passed=$((checks_passed + 1))
        fi
        echo ""
    done
    
    # Generate configuration
    generate_test_config
    echo ""
    
    # Summary
    log "INFO" "=== VALIDATION SUMMARY ==="
    log "INFO" "Checks passed: $checks_passed/$total_checks"
    
    if [ $checks_passed -eq $total_checks ]; then
        log "SUCCESS" "Environment is ready for testing! ✓"
        show_next_steps
        exit 0
    elif [ $checks_passed -ge $((total_checks * 3 / 4)) ]; then
        log "WARNING" "Environment is mostly ready. Review warnings above."
        show_next_steps
        exit 0
    else
        log "ERROR" "Environment needs attention before testing."
        log "ERROR" "Please address the errors above and run this script again."
        exit 1
    fi
}

# Show help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Enterprise API Test Environment Validation"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Environment Variables:"
    echo "  BASE_URL      Server URL (default: http://localhost:3001)"
    echo "  DATABASE_URL  PostgreSQL connection string"
    echo ""
    echo "This script validates that your environment is ready for"
    echo "comprehensive enterprise API testing."
    exit 0
fi

main
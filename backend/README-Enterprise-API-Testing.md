# Enterprise API Testing Suite

This comprehensive testing suite validates all enterprise API endpoints in the Sports Management App backend. The suite tests 11 major enterprise modules with over 100 individual endpoints.

## 🎯 What This Tests

### Enterprise Modules Covered:
- **Employee Management** (`/api/employees/*`) - Departments, positions, employees, evaluations, training
- **Asset Tracking** (`/api/assets/*`) - Assets, maintenance, checkout/checkin, categories
- **Document Management** (`/api/documents/*`) - Documents, templates, categories, acknowledgments
- **Compliance Tracking** (`/api/compliance/*`) - Requirements, audits, incidents, risk assessments
- **Communications** (`/api/communications/*`) - Announcements, preferences, templates, logs
- **Budget Management** (`/api/budgets/*`) - Budgets, allocations, variance analysis
- **Expense Processing** (`/api/expenses/*`) - Expenses, reports, approvals, categories
- **Financial Reporting** (`/api/financial-reports/*`) - Reports, summaries, KPIs
- **Accounting Integration** (`/api/accounting/*`) - Chart of accounts, journal entries, reconciliation
- **Organizational Analytics** (`/api/analytics/organizational/*`) - Employee, department, financial analytics
- **Workflow Management** (`/api/workflows/*`) - Workflow definitions, instances, tasks

## 🚀 Quick Start

### 1. Prepare Your Environment

```bash
# Ensure your server is running
npm start

# The server should be accessible at http://localhost:3001
```

### 2. Set Up Test Data (Recommended)

```bash
# Connect to your database and run:
psql -d your_database -f setup-test-data.sql

# This creates test records with known UUIDs for comprehensive testing
```

### 3. Get Authentication Token

```bash
# Login to get a Bearer token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Copy the token from the response
```

### 4. Run the Tests

```bash
# Basic usage with interactive token input
./test-enterprise-api.sh

# Or provide token directly
./test-enterprise-api.sh --token "your-jwt-token-here"

# Use custom server URL
./test-enterprise-api.sh --url "https://your-api-server.com" --token "token"
```

## 📋 Detailed Setup

### Configuration Options

#### Method 1: Command Line Arguments
```bash
./test-enterprise-api.sh \
  --token "your-jwt-token" \
  --url "http://localhost:3001" \
  --verbose
```

#### Method 2: Environment Variables
```bash
export AUTH_TOKEN="your-jwt-token"
export BASE_URL="http://localhost:3001"
export TEST_USER_ID="test-user-uuid-1234-5678-90ab-cdef12345678"
export TEST_EMPLOYEE_ID="test-emp-uuid-1234-5678-90ab-cdef12345678"
export TEST_DEPARTMENT_ID="test-dept-uuid-1234-5678-90ab-cdef12345678"

./test-enterprise-api.sh
```

#### Method 3: Configuration File
```bash
# Copy and customize the template
cp test-config-template.env test-config.env
# Edit test-config.env with your values
# Source it before running tests
source test-config.env && ./test-enterprise-api.sh
```

### Getting Required Test IDs

The script works best with actual database records. You can:

1. **Use the setup script** (recommended):
   ```bash
   psql -d your_database -f setup-test-data.sql
   ```

2. **Query existing records**:
   ```sql
   -- Get existing IDs from your database
   SELECT id as user_id FROM users WHERE role = 'admin' LIMIT 1;
   SELECT id as employee_id FROM employees LIMIT 1;
   SELECT id as department_id FROM departments WHERE active = true LIMIT 1;
   ```

3. **Let some tests use default/null values** - many endpoints work without specific IDs

## 📊 Understanding Test Results

### Output Format
```
[2024-01-15 10:30:45] [INFO] Testing: Get all employees
[2024-01-15 10:30:45] [INFO] Method: GET | Endpoint: /api/employees
[2024-01-15 10:30:45] [SUCCESS] ✓ PASSED - HTTP 200
{
  "employees": [...],
  "pagination": {...}
}
----------------------------------------
```

### Test Statistics
At the end of execution, you'll see:
```
=== TEST EXECUTION SUMMARY ===
Total Tests: 120
Passed Tests: 118
Failed Tests: 2
```

### Common Failure Reasons
- **401 Unauthorized**: Invalid or expired AUTH_TOKEN
- **403 Forbidden**: User doesn't have required role/permissions
- **404 Not Found**: Test IDs don't exist in database
- **500 Internal Error**: Server/database issues

## 🔧 Customization

### Adding New Tests
Edit `test-enterprise-api.sh` and add tests to the appropriate module function:

```bash
test_new_module() {
    log "INFO" "=== TESTING NEW MODULE ==="
    
    test_endpoint "GET" "/api/new-module" "Get all items"
    test_endpoint "POST" "/api/new-module" "Create item" '{"name":"test"}'
}
```

### Modifying Expected Status Codes
```bash
# Expect 201 for creation endpoints
test_endpoint "POST" "/api/employees" "Create employee" "$data" 201

# Expect 404 for non-existent resources  
test_endpoint "GET" "/api/employees/nonexistent" "Get missing employee" "" 404
```

### Adding Request Headers
Modify the `test_endpoint` function to add custom headers:
```bash
curl_cmd="$curl_cmd -H 'X-Custom-Header: value'"
```

## 🐛 Troubleshooting

### Server Connection Issues
```bash
# Test basic connectivity
curl -s http://localhost:3001/health

# Check if server is running
netstat -an | grep 3001
```

### Authentication Problems
```bash
# Verify token format (should be JWT)
echo "your-token" | base64 -d

# Test login endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### Database Issues
```bash
# Check database connection
psql -d your_database -c "SELECT COUNT(*) FROM users;"

# Verify test data exists
psql -d your_database -c "SELECT id, name FROM departments WHERE name LIKE '%Test%';"
```

### Permission Errors
- Ensure your user has admin/hr role for restricted endpoints
- Check middleware configuration in your routes
- Verify CORS settings if testing from browser

## 📈 Performance Considerations

### Response Time Monitoring
The script includes a 0.5-second delay between requests to avoid overwhelming the server. Adjust if needed:

```bash
# In the script, modify:
sleep 0.5  # Change this value
```

### Concurrent Testing
For load testing, run multiple instances:
```bash
# Terminal 1
./test-enterprise-api.sh --token "token1" &

# Terminal 2  
./test-enterprise-api.sh --token "token2" &
```

## 🔒 Security Notes

- **Never commit real tokens** to version control
- Use test databases, not production data
- Rotate tokens regularly
- Monitor API logs during testing
- Be cautious with DELETE endpoints (add confirmation prompts)

## 📝 Extending the Suite

### Adding Test Data Validation
```bash
# Validate response structure
validate_response() {
    local response=$1
    local expected_fields=("id" "name" "created_at")
    
    for field in "${expected_fields[@]}"; do
        if ! echo "$response" | grep -q "\"$field\""; then
            log "ERROR" "Missing required field: $field"
            return 1
        fi
    done
}
```

### Integration with CI/CD
```yaml
# GitHub Actions example
- name: Run Enterprise API Tests
  run: |
    export AUTH_TOKEN="${{ secrets.TEST_AUTH_TOKEN }}"
    export BASE_URL="${{ secrets.TEST_BASE_URL }}"
    ./test-enterprise-api.sh
```

## 📞 Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify your database schema matches the expected structure
3. Ensure all required environment variables are set
4. Test individual endpoints manually with curl/Postman
5. Review the authentication middleware configuration

## 🎉 Success Criteria

A successful test run should show:
- ✅ All health checks pass
- ✅ Authentication endpoints work
- ✅ CRUD operations function correctly
- ✅ Filtering and pagination work
- ✅ Statistics and analytics endpoints return data
- ✅ Error handling is appropriate (404s, 401s, etc.)

The goal is to achieve 95%+ test pass rate with meaningful error messages for any failures.
-- Setup Test Data for Enterprise API Testing
-- Run this script to create test records needed for comprehensive API testing

-- Note: Replace the UUIDs and data below with appropriate values for your environment
-- This script assumes you have the proper database schema in place

BEGIN;

-- Create test department (if it doesn't exist)
INSERT INTO departments (
    id, 
    name, 
    description, 
    cost_center, 
    budget_allocated, 
    active
) VALUES (
    'test-dept-uuid-1234-5678-90ab-cdef12345678',
    'API Test Department',
    'Department created for API testing purposes',
    'TEST001',
    100000.00,
    true
) ON CONFLICT (id) DO NOTHING;

-- Create test job position (if it doesn't exist)
INSERT INTO job_positions (
    id,
    title,
    description,
    department_id,
    level,
    min_salary,
    max_salary,
    active
) VALUES (
    'test-pos-uuid-1234-5678-90ab-cdef12345678',
    'API Test Position',
    'Position created for API testing purposes',
    'test-dept-uuid-1234-5678-90ab-cdef12345678',
    'Mid',
    50000.00,
    75000.00,
    true
) ON CONFLICT (id) DO NOTHING;

-- Create test user (if it doesn't exist)
INSERT INTO users (
    id,
    name,
    email,
    role,
    phone,
    active
) VALUES (
    'test-user-uuid-1234-5678-90ab-cdef12345678',
    'API Test User',
    'api-test@example.com',
    'employee',
    '+1-555-0123',
    true
) ON CONFLICT (email) DO NOTHING;

-- Create test employee (if it doesn't exist)
INSERT INTO employees (
    id,
    user_id,
    employee_id,
    department_id,
    position_id,
    hire_date,
    employment_type,
    employment_status,
    base_salary,
    pay_frequency
) VALUES (
    'test-emp-uuid-1234-5678-90ab-cdef12345678',
    'test-user-uuid-1234-5678-90ab-cdef12345678',
    'EMP-TEST-001',
    'test-dept-uuid-1234-5678-90ab-cdef12345678',
    'test-pos-uuid-1234-5678-90ab-cdef12345678',
    '2024-01-15',
    'full_time',
    'active',
    60000.00,
    'monthly'
) ON CONFLICT (employee_id) DO NOTHING;

-- Create test location (if it doesn't exist)
INSERT INTO locations (
    id,
    name,
    description,
    address,
    city,
    state,
    zip_code,
    country,
    active
) VALUES (
    'test-loc-uuid-1234-5678-90ab-cdef12345678',
    'API Test Location',
    'Location created for API testing purposes',
    '123 Test Street',
    'Test City',
    'TS',
    '12345',
    'United States',
    true
) ON CONFLICT (id) DO NOTHING;

-- Create test asset (if it doesn't exist)
INSERT INTO assets (
    id,
    asset_tag,
    name,
    description,
    category,
    subcategory,
    brand,
    model,
    serial_number,
    purchase_date,
    purchase_cost,
    current_value,
    location_id,
    condition,
    status
) VALUES (
    'test-asset-uuid-1234-5678-90ab-cdef12345678',
    'TEST-ASSET-001',
    'API Test Laptop',
    'Laptop created for API testing purposes',
    'IT',
    'Computer',
    'Dell',
    'Latitude 5520',
    'DL123456789',
    '2024-01-15',
    1200.00,
    1000.00,
    'test-loc-uuid-1234-5678-90ab-cdef12345678',
    'excellent',
    'available'
) ON CONFLICT (asset_tag) DO NOTHING;

-- Create test document (if documents table exists)
INSERT INTO documents (
    id,
    title,
    description,
    category,
    subcategory,
    file_path,
    file_size,
    mime_type,
    uploaded_by,
    effective_date,
    status,
    requires_acknowledgment
) VALUES (
    'test-doc-uuid-1234-5678-90ab-cdef12345678',
    'API Test Document',
    'Document created for API testing purposes',
    'policy',
    'general',
    '/uploads/test-document.pdf',
    1024,
    'application/pdf',
    'test-user-uuid-1234-5678-90ab-cdef12345678',
    '2024-01-15',
    'active',
    false
) ON CONFLICT (id) DO NOTHING;

-- Create test budget (if budgets table exists)
INSERT INTO budgets (
    id,
    name,
    description,
    fiscal_year,
    department_id,
    category,
    allocated_amount,
    spent_amount,
    committed_amount,
    status
) VALUES (
    'test-budget-uuid-1234-5678-90ab-cdef12345678',
    'API Test Budget',
    'Budget created for API testing purposes',
    2024,
    'test-dept-uuid-1234-5678-90ab-cdef12345678',
    'operations',
    50000.00,
    15000.00,
    5000.00,
    'active'
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Display the test data UUIDs for use in testing
SELECT 'Test Data Created Successfully!' as message;
SELECT 
    'TEST_USER_ID: test-user-uuid-1234-5678-90ab-cdef12345678' as test_ids
UNION ALL SELECT 'TEST_EMPLOYEE_ID: test-emp-uuid-1234-5678-90ab-cdef12345678'
UNION ALL SELECT 'TEST_DEPARTMENT_ID: test-dept-uuid-1234-5678-90ab-cdef12345678'
UNION ALL SELECT 'TEST_LOCATION_ID: test-loc-uuid-1234-5678-90ab-cdef12345678'
UNION ALL SELECT 'TEST_ASSET_ID: test-asset-uuid-1234-5678-90ab-cdef12345678';

-- Instructions for getting a valid AUTH_TOKEN
SELECT '
To get an AUTH_TOKEN:
1. Start your server: npm start
2. Use curl or Postman to login:
   curl -X POST http://localhost:3001/api/auth/login \
   -H "Content-Type: application/json" \
   -d {"email":"your-admin-email@example.com","password":"your-password"}
3. Copy the token from the response
4. Use it in the test script: ./test-enterprise-api.sh --token "your-token-here"
' as instructions;
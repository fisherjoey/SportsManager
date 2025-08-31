// Test permissions API directly
const fetch = require('node-fetch');

async function testPermissionsAPI() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwNjY3OTRjMS1jMmNjLTQ4MGQtYTE1MC01NTMzOThjNDg2MzQiLCJlbWFpbCI6ImFkbWluQGNtYmEuY2EiLCJyb2xlIjoiYWRtaW4iLCJyb2xlcyI6WyJhZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJhc3NpZ25tZW50czphcHByb3ZlIiwiYXNzaWdubWVudHM6YXV0b19hc3NpZ24iLCJhc3NpZ25tZW50czpjcmVhdGUiLCJhc3NpZ25tZW50czpkZWxldGUiLCJhc3NpZ25tZW50czpyZWFkIiwiYXNzaWdubWVudHM6dXBkYXRlIiwiY29tbXVuaWNhdGlvbjpicm9hZGNhc3QiLCJjb21tdW5pY2F0aW9uOm1hbmFnZSIsImNvbW11bmljYXRpb246c2VuZCIsImNvbnRlbnQ6Y3JlYXRlIiwiY29udGVudDpkZWxldGUiLCJjb250ZW50OnB1Ymxpc2giLCJjb250ZW50OnJlYWQiLCJjb250ZW50OnVwZGF0ZSIsImZpbmFuY2U6YXBwcm92ZSIsImZpbmFuY2U6Y3JlYXRlIiwiZmluYW5jZTptYW5hZ2UiLCJmaW5hbmNlOnJlYWQiLCJnYW1lczpjcmVhdGUiLCJnYW1lczpkZWxldGUiLCJnYW1lczpwdWJsaXNoIiwiZ2FtZXM6cmVhZCIsImdhbWVzOnVwZGF0ZSIsInJlZmVyZWVzOmV2YWx1YXRlIiwicmVmZXJlZXM6bWFuYWdlIiwicmVmZXJlZXM6cmVhZCIsInJlZmVyZWVzOnVwZGF0ZSIsInJlcG9ydHM6Y3JlYXRlIiwicmVwb3J0czpleHBvcnQiLCJyZXBvcnRzOmZpbmFuY2lhbCIsInJlcG9ydHM6cmVhZCIsInNldHRpbmdzOnJlYWQiLCJzZXR0aW5nczp1cGRhdGUiLCJ1c2VyczpjcmVhdGUiLCJ1c2VyczpyZWFkIiwidXNlcnM6dXBkYXRlIl0sImlhdCI6MTc1NjUxMjQxMiwiZXhwIjoxNzU3MTE3MjEyfQ.uxw2En2s2THHwcKz1GASRg-RGTvuTiauJahi07fEocA';

  console.log('Testing permissions API...\n');

  // Test 1: Get all permissions
  console.log('1. Fetching all permissions from backend...');
  try {
    const response = await fetch('http://localhost:3001/api/admin/permissions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response structure:', {
      success: data.success,
      hasData: !!data.data,
      hasPermissions: !!data.data?.permissions,
      permissionsType: typeof data.data?.permissions,
      isArray: Array.isArray(data.data?.permissions),
      categories: data.data?.permissions ? Object.keys(data.data.permissions) : []
    });
    
    if (data.data?.permissions) {
      const categories = Object.keys(data.data.permissions);
      console.log('\nPermission categories found:', categories);
      
      // Show sample permissions from first category
      if (categories.length > 0) {
        const firstCategory = categories[0];
        const perms = data.data.permissions[firstCategory];
        console.log(`\nSample permissions from "${firstCategory}":`, perms.slice(0, 2));
      }
    }
  } catch (error) {
    console.error('Error fetching permissions:', error.message);
  }

  // Test 2: Get a specific role
  console.log('\n2. Fetching Admin role details...');
  const adminRoleId = '12df1977-44c0-4787-abae-e2919272ce75';
  try {
    const response = await fetch(`http://localhost:3001/api/admin/roles/${adminRoleId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Role structure:', {
      success: data.success,
      hasData: !!data.data,
      hasRole: !!data.data?.role,
      roleHasPermissions: !!data.data?.role?.permissions,
      permissionsCount: data.data?.role?.permissions?.length || 0
    });
    
    if (data.data?.role?.permissions) {
      console.log('Admin role has', data.data.role.permissions.length, 'permissions');
      console.log('Sample permission:', data.data.role.permissions[0]);
    }
  } catch (error) {
    console.error('Error fetching role:', error.message);
  }
}

testPermissionsAPI();
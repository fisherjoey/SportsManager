const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testRBACSystem() {
  console.log('🧪 Testing Database-Driven RBAC System\n');
  
  try {
    // 1. Login as Super Admin
    console.log('1️⃣ Logging in as Super Admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'zfisher9@gmail.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`   ✅ Logged in as: ${user.email}`);
    console.log(`   Roles: ${JSON.stringify(user.roles || [user.role])}`);
    
    // Configure axios with auth token
    const api = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // 2. Get Page Registry
    console.log('\n2️⃣ Fetching page registry...');
    const pageRegistry = await api.get('/admin/access/page-registry');
    console.log(`   ✅ Found ${pageRegistry.data.data.length} pages in registry`);
    
    // 3. Get Super Admin role ID
    console.log('\n3️⃣ Fetching roles...');
    const rolesResponse = await api.get('/admin/roles');
    const superAdminRole = rolesResponse.data.data.roles.find(r => r.name === 'Super Admin');
    
    if (!superAdminRole) {
      throw new Error('Super Admin role not found');
    }
    console.log(`   ✅ Super Admin role ID: ${superAdminRole.id}`);
    
    // 4. Get current page access for Super Admin
    console.log('\n4️⃣ Fetching page access for Super Admin...');
    const pageAccessResponse = await api.get(`/admin/access/roles/${superAdminRole.id}/pages`);
    const pageAccess = pageAccessResponse.data.data.pageAccess;
    const allowedPages = pageAccess.filter(p => p.can_access);
    console.log(`   ✅ Super Admin has access to ${allowedPages.length}/${pageAccess.length} pages`);
    
    // 5. Get API registry
    console.log('\n5️⃣ Fetching API registry...');
    const apiRegistry = await api.get('/admin/access/api-registry');
    console.log(`   ✅ Found ${apiRegistry.data.data.length} API endpoints in registry`);
    
    // 6. Get API access for Super Admin
    console.log('\n6️⃣ Fetching API access for Super Admin...');
    const apiAccessResponse = await api.get(`/admin/access/roles/${superAdminRole.id}/apis`);
    const apiAccess = apiAccessResponse.data.data.apiAccess;
    const allowedAPIs = apiAccess.filter(a => a.can_access);
    console.log(`   ✅ Super Admin has access to ${allowedAPIs.length}/${apiAccess.length} API endpoints`);
    
    // 7. Check page access
    console.log('\n7️⃣ Testing page access checks...');
    const pageChecks = [
      'dashboard',
      'admin-access-control',
      'games',
      'referees'
    ];
    
    for (const page of pageChecks) {
      const checkResponse = await api.post('/admin/access/check-page', { page });
      const hasAccess = checkResponse.data.hasAccess;
      console.log(`   ${hasAccess ? '✅' : '❌'} Access to "${page}": ${hasAccess}`);
    }
    
    // 8. Check API access
    console.log('\n8️⃣ Testing API access checks...');
    const apiChecks = [
      { method: 'GET', endpoint: '/api/games' },
      { method: 'POST', endpoint: '/api/games' },
      { method: 'DELETE', endpoint: '/api/users/123' },
      { method: 'GET', endpoint: '/api/admin/roles' }
    ];
    
    for (const check of apiChecks) {
      const checkResponse = await api.post('/admin/access/check-api', check);
      const hasAccess = checkResponse.data.hasAccess;
      console.log(`   ${hasAccess ? '✅' : '❌'} Access to ${check.method} ${check.endpoint}: ${hasAccess}`);
    }
    
    // 9. Check feature flags
    console.log('\n9️⃣ Testing feature flags...');
    const featureResponse = await api.get(`/admin/access/roles/${superAdminRole.id}/features`);
    const features = featureResponse.data.data.features;
    console.log(`   ✅ Super Admin has ${features.filter(f => f.is_enabled).length}/${features.length} features enabled`);
    
    const featureChecks = ['ai_assignments', 'bulk_import', 'advanced_analytics'];
    for (const feature of featureChecks) {
      const checkResponse = await api.post('/admin/access/check-feature', { feature });
      const isEnabled = checkResponse.data.isEnabled;
      console.log(`   ${isEnabled ? '✅' : '❌'} Feature "${feature}": ${isEnabled ? 'Enabled' : 'Disabled'}`);
    }
    
    console.log('\n✨ Database-Driven RBAC System Test Complete!');
    console.log('   All access control is now managed through the database.');
    console.log('   No more hardcoded permissions!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.error('   Make sure the backend is running on port 3001');
    }
  }
}

// Run the test
testRBACSystem();
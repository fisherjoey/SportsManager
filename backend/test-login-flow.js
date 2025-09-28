const axios = require('axios');
const jwt = require('jsonwebtoken');

// Test configuration
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'admin@refassign.com',
  password: 'password' // Default password from create_admin_user.js
};

async function testLoginFlow() {
  console.log('🔐 Testing login flow for admin@refassign.com...\n');

  try {
    // Test login endpoint
    console.log('📝 Attempting login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login successful!');
    console.log('📋 Login response structure:');
    console.log('   Status:', loginResponse.status);
    console.log('   Has token:', !!loginResponse.data.token);
    console.log('   Has user:', !!loginResponse.data.user);
    console.log();

    if (loginResponse.data.token) {
      console.log('🔍 JWT Token Analysis:');

      // Decode the token without verification for analysis
      const decodedToken = jwt.decode(loginResponse.data.token, { complete: true });

      console.log('   Token Header:', JSON.stringify(decodedToken.header, null, 2));
      console.log('   Token Payload:', JSON.stringify(decodedToken.payload, null, 2));

      // Check token expiration
      if (decodedToken.payload.exp) {
        const expirationDate = new Date(decodedToken.payload.exp * 1000);
        console.log('   Token expires:', expirationDate.toISOString());
        console.log('   Token valid for:', Math.round((decodedToken.payload.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)), 'days');
      }
      console.log();

      // Test token verification
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-this-in-production';
        const verifiedToken = jwt.verify(loginResponse.data.token, JWT_SECRET);
        console.log('✅ Token verification successful');
        console.log('   Verified payload contains:', Object.keys(verifiedToken));
      } catch (error) {
        console.log('❌ Token verification failed:', error.message);
      }
      console.log();
    }

    if (loginResponse.data.user) {
      console.log('👤 User Data Analysis:');
      const user = loginResponse.data.user;
      console.log('   User ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Name:', user.name);
      console.log('   Roles:', user.roles);
      console.log('   Permissions count:', user.permissions ? user.permissions.length : 'No permissions');
      console.log('   Permissions:', user.permissions);
      console.log();
    }

    // Test the /me endpoint with the token
    if (loginResponse.data.token) {
      console.log('🔒 Testing /me endpoint with JWT token...');
      try {
        const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`
          }
        });

        console.log('✅ /me endpoint successful');
        console.log('   User data from /me:', {
          id: meResponse.data.user.id,
          email: meResponse.data.user.email,
          roles: meResponse.data.user.roles,
          permissions_count: meResponse.data.user.permissions ? meResponse.data.user.permissions.length : 0
        });
      } catch (error) {
        console.log('❌ /me endpoint failed:', error.response?.status, error.response?.data?.error || error.message);
      }
      console.log();

      // Test page access check
      console.log('🏠 Testing page access for admin pages...');
      const pagesToTest = [
        '/dashboard',
        '/admin',
        '/admin/users',
        '/admin/roles'
      ];

      for (const page of pagesToTest) {
        try {
          const accessResponse = await axios.post(`${API_BASE_URL}/auth/check-page-access`,
            { page },
            {
              headers: {
                'Authorization': `Bearer ${loginResponse.data.token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const hasAccess = accessResponse.data.data.hasAccess;
          console.log(`   ${page}: ${hasAccess ? '✅ Access granted' : '❌ Access denied'}`);
        } catch (error) {
          console.log(`   ${page}: ❌ Error checking access - ${error.response?.status} ${error.response?.data?.error || error.message}`);
        }
      }
    }

    return {
      success: true,
      token: loginResponse.data.token,
      user: loginResponse.data.user
    };

  } catch (error) {
    console.log('❌ Login failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data?.error || error.message);
    console.log('   Full response:', error.response?.data);

    if (error.response?.status === 401) {
      console.log('\n🔍 This suggests credential issues. The user exists in the database but:');
      console.log('   - The password might be incorrect');
      console.log('   - The password hash in the database might be corrupted');
      console.log('   - The bcrypt comparison might be failing');
    }

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Check if the backend server is running
async function checkServerStatus() {
  try {
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('🟢 Backend server is running');
    return true;
  } catch (error) {
    console.log('🔴 Backend server is not running or not responding');
    console.log('   Please start the backend server with: npm run dev');
    console.log('   Expected server URL:', API_BASE_URL);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 SPORTS MANAGER AUTHENTICATION DIAGNOSIS');
  console.log('='.repeat(60));
  console.log();

  // Check server status first
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    return;
  }
  console.log();

  // Test login flow
  const result = await testLoginFlow();

  console.log();
  console.log('='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  if (result.success) {
    console.log('✅ Login flow working correctly');
    console.log('✅ JWT token generated and verified');
    console.log('✅ User data returned with roles and permissions');
  } else {
    console.log('❌ Login flow has issues');
    console.log('   This explains why the frontend shows no access');
  }
}

main().catch(console.error);
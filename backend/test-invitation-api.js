/**
 * Test Invitation API Endpoint
 * Tests the actual API endpoint with different email addresses
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testInvitationAPI() {
  console.log('🧪 Testing Invitation API Endpoint...\n');

  // First, let's try to login as admin to get a token
  console.log('🔐 Attempting to get admin token...');
  
  try {
    const loginResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@example.com',
      password: 'admin123'
    });

    console.log(`Login response: ${loginResult.status}`);
    
    let adminToken = null;
    if (loginResult.status === 200 && loginResult.data.data?.token) {
      adminToken = loginResult.data.data.token;
      console.log('✅ Admin token obtained successfully');
    } else {
      console.log('❌ Could not get admin token, using test token');
      // For testing purposes, we'll create a mock JWT token
      adminToken = 'mock-admin-token-for-testing';
    }

    // Test cases for different email addresses
    const testCases = [
      {
        name: 'Verified Email',
        email: 'joey.fisher@ucalgary.ca',
        firstName: 'Joey',
        lastName: 'Fisher',
        role: 'referee'
      },
      {
        name: 'Unverified Email #1',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'referee'
      },
      {
        name: 'Unverified Email #2',
        email: 'another@anydomain.org',
        firstName: 'Another',
        lastName: 'User',
        role: 'admin'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📧 Testing: ${testCase.name} (${testCase.email})`);
      
      try {
        const result = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/api/invitations',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          }
        }, {
          email: testCase.email,
          first_name: testCase.firstName,
          last_name: testCase.lastName,
          role: testCase.role
        });

        console.log(`   Status: ${result.status}`);
        
        if (result.status === 201) {
          console.log('   ✅ Invitation created successfully');
          if (result.data.data?.emailResult?.logged) {
            console.log('   📝 Email logged due to testing restrictions');
          } else if (result.data.data?.emailResult?.data?.id) {
            console.log(`   📧 Email sent successfully (ID: ${result.data.data.emailResult.data.id})`);
          }
        } else if (result.status === 401) {
          console.log('   🔒 Authentication required (expected with mock token)');
        } else if (result.status === 409) {
          console.log('   ⚠️  User or invitation already exists');
        } else {
          console.log(`   ❌ Request failed: ${result.data.error || result.data.message || 'Unknown error'}`);
        }

      } catch (error) {
        console.log(`   💥 Request failed with exception: ${error.message}`);
      }

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
  }

  console.log('\n🎯 API test complete!');
}

// Run the test
testInvitationAPI().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
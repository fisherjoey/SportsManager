const http = require('http');

// Login and test role creation
async function testAPI() {
  // Step 1: Login
  console.log('Step 1: Logging in as admin...');
  const loginData = JSON.stringify({
    email: 'admin@sportsmanager.com',
    password: 'admin123'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  const token = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.token) {
            console.log('✓ Login successful');
            resolve(response.token);
          } else if (response.data?.token) {
            console.log('✓ Login successful');
            resolve(response.data.token);
          } else {
            console.error('✗ Login failed:', response);
            reject(new Error('Login failed'));
          }
        } catch (e) {
          console.error('✗ Parse error:', e.message);
          console.error('Response:', data);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  // Step 2: Test role creation with pages field
  console.log('\nStep 2: Testing role creation with pages field...');
  const roleData = JSON.stringify({
    name: 'test_role',
    description: 'test role description',
    permissions: ['user:view'],
    pages: []
  });

  const roleOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/roles',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(roleData)
    }
  };

  await new Promise((resolve, reject) => {
    const req = http.request(roleOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 201) {
            console.log('✓ Role created successfully');
            console.log('Response:', JSON.stringify(response, null, 2));
          } else {
            console.error(`✗ Role creation failed (${res.statusCode}):`, response);
          }
          resolve();
        } catch (e) {
          console.error('✗ Parse error:', e.message);
          console.error('Response:', data);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(roleData);
    req.end();
  });
}

testAPI().catch(console.error);

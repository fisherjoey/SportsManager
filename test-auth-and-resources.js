const fetch = require('node-fetch');

async function testResourcesAPI() {
  // First, login to get a token
  console.log('1. Logging in to get auth token...');
  
  try {
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'apitest@example.com',
        password: 'testpass123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok || !loginData.token) {
      console.error('Login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.log('✓ Login successful! Token obtained.');
    console.log('Token:', token.substring(0, 20) + '...');
    
    // Now test the resources endpoint
    console.log('\n2. Testing GET /api/resources...');
    
    const resourcesResponse = await fetch('http://localhost:3001/api/resources', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const resourcesData = await resourcesResponse.json();
    
    if (!resourcesResponse.ok) {
      console.error('Failed to fetch resources:', resourcesResponse.status, resourcesData);
      console.error('Full error:', JSON.stringify(resourcesData, null, 2));
    } else {
      console.log('✓ Resources fetched successfully!');
      console.log('Response:', JSON.stringify(resourcesData, null, 2).substring(0, 500) + '...');
    }

    // Test categories endpoint
    console.log('\n3. Testing GET /api/resources/categories...');
    
    const categoriesResponse = await fetch('http://localhost:3001/api/resources/categories', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const categoriesData = await categoriesResponse.json();
    
    if (!categoriesResponse.ok) {
      console.error('Failed to fetch categories:', categoriesResponse.status, categoriesData);
    } else {
      console.log('✓ Categories fetched successfully!');
      console.log('Response:', JSON.stringify(categoriesData, null, 2));
    }

    // Create a test resource
    console.log('\n4. Testing POST /api/resources (creating a resource)...');
    
    const newResource = {
      title: 'Test Resource',
      description: 'This is a test resource created via API',
      category_id: categoriesData.categories && categoriesData.categories[0]?.id || '1',
      type: 'document',
      content: 'Test content for the resource',
      metadata: {
        tags: ['test', 'api'],
        author: 'API Test Script'
      }
    };

    const createResponse = await fetch('http://localhost:3001/api/resources', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newResource)
    });

    const createData = await createResponse.json();
    
    if (!createResponse.ok) {
      console.error('Failed to create resource:', createResponse.status, createData);
      console.error('Full error:', JSON.stringify(createData, null, 2));
    } else {
      console.log('✓ Resource created successfully!');
      console.log('Created resource:', JSON.stringify(createData, null, 2));
    }

  } catch (error) {
    console.error('Error during API test:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testResourcesAPI();
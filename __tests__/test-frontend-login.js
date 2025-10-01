// Test frontend login via API
// Using built-in fetch in Node.js 18+

async function testLogin() {
  try {
    console.log('Testing login through frontend proxy at http://localhost:3005/api/auth/login');

    const response = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cmba.ca',
        password: 'admin123'
      })
    });

    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);

    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('Token received:', data.token ? 'Yes' : 'No');
      console.log('User data:', {
        id: data.user?.id,
        email: data.user?.email,
        roles: data.user?.roles
      });
    } else {
      console.log('❌ Login failed');
      console.log('Error:', data.error);
    }

  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

testLogin();
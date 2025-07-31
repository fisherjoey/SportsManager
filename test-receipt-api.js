const fetch = require('node-fetch');

async function testReceiptAPI() {
  try {
    // First, let's see what receipts exist
    const listResponse = await fetch('http://localhost:3001/api/expenses/receipts', {
      headers: {
        'Authorization': 'Bearer test-token' // We'll need a real token
      }
    });
    
    if (!listResponse.ok) {
      console.log('List receipts failed:', listResponse.status);
      // Let's try without auth for now
      const noAuthResponse = await fetch('http://localhost:3001/api/expenses/receipts');
      console.log('No auth response status:', noAuthResponse.status);
      return;
    }
    
    const receipts = await listResponse.json();
    console.log('Available receipts:', receipts.receipts?.slice(0, 2)); // Show first 2
    
    if (receipts.receipts && receipts.receipts.length > 0) {
      const receiptId = receipts.receipts[0].id;
      console.log('Testing receipt details for ID:', receiptId);
      
      // Get detailed receipt
      const detailResponse = await fetch(`http://localhost:3001/api/expenses/receipts/${receiptId}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      const receiptDetails = await detailResponse.json();
      console.log('Receipt details response:', JSON.stringify(receiptDetails, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testReceiptAPI();
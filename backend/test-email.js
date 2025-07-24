// Test script for Resend email integration
require('dotenv').config();
const emailService = require('./src/services/emailService');

async function testEmail() {
  try {
    console.log('Testing Resend email integration...');
    
    const result = await emailService.sendInvitationEmail({
      email: 'test@example.com', // Replace with your email for testing
      firstName: 'John',
      lastName: 'Doe',
      role: 'referee',
      invitationLink: 'http://localhost:3000/complete-signup?token=test123',
      invitedBy: 'System Administrator'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Email ID:', result.data?.id);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    if (error.message.includes('401')) {
      console.log('💡 Check your RESEND_API_KEY in .env file');
    }
  }
}

testEmail();
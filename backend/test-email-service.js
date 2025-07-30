/**
 * Test Email Service Directly
 * This script tests if the email service is working with the configured API key
 */

require('dotenv').config();
const emailService = require('./src/services/emailService');

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');
  
  // Check environment configuration
  console.log('Environment Configuration:');
  console.log(`- RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL || 'Using default'}`);
  console.log(`- FRONTEND_URL: ${process.env.FRONTEND_URL || 'Using default'}`);
  console.log('');

  // Test invitation email
  try {
    console.log('📧 Testing invitation email...');
    
    const result = await emailService.sendInvitationEmail({
      email: 'unverified@example.com', // Test with unverified email
      firstName: 'Test',
      lastName: 'User',
      role: 'referee',
      invitationLink: 'http://localhost:3000/complete-signup?token=test-token-123',
      invitedBy: 'Test Admin'
    });

    if (result && result.data) {
      console.log('✅ Invitation email sent successfully!');
      console.log(`   Email ID: ${result.data.id}`);
    } else if (result && result.success) {
      if (result.logged) {
        console.log('✅ Email logged due to testing restrictions');
        console.log(`   Message: ${result.message}`);
      } else {
        console.log('✅ Email service not configured - invitation logged to console');
      }
    } else {
      console.log('⚠️  Email service returned unexpected result:', result);
    }

  } catch (error) {
    console.log('❌ Invitation email failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }

  console.log('');

  // Test password reset email
  try {
    console.log('🔐 Testing password reset email...');
    
    const result = await emailService.sendPasswordResetEmail({
      email: 'unverified@example.com', // Test with unverified email
      firstName: 'Test',
      resetLink: 'http://localhost:3000/reset-password?token=reset-token-123'
    });

    if (result && result.data) {
      console.log('✅ Password reset email sent successfully!');
      console.log(`   Email ID: ${result.data.id}`);
    } else if (result && result.success) {
      if (result.logged) {
        console.log('✅ Email logged due to testing restrictions');
        console.log(`   Message: ${result.message}`);
      } else {
        console.log('✅ Email service not configured - reset logged to console');
      }
    } else {
      console.log('⚠️  Email service returned unexpected result:', result);
    }

  } catch (error) {
    console.log('❌ Password reset email failed:');
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n🎯 Email service test complete!');
}

// Run the test
testEmailService().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
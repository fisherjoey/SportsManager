#!/usr/bin/env node

/**
 * Simple AI Services Test
 */

require('dotenv').config();

async function testAIConfiguration() {
  console.log('🤖 Testing AI Configuration...\n');

  // Test OpenAI
  console.log('1. OpenAI API Configuration:');
  if (process.env.OPENAI_API_KEY) {
    console.log('   ✅ OpenAI API Key: Configured');
    
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: 'Say "AI test successful"' }],
        model: 'gpt-3.5-turbo',
        max_tokens: 10
      });
      
      console.log('   ✅ OpenAI API: WORKING');
      console.log('   📋 Response:', completion.choices[0].message.content);
    } catch (error) {
      console.log('   ❌ OpenAI API: ERROR');
      console.log('   📋 Error:', error.message);
    }
  } else {
    console.log('   ❌ OpenAI API Key: Not configured');
  }

  console.log('\n2. Google Vision API Configuration:');
  if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEY_FILE) {
    console.log('   ✅ Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('   ✅ Key File:', process.env.GOOGLE_CLOUD_KEY_FILE);
    
    try {
      const vision = require('@google-cloud/vision');
      const client = new vision.ImageAnnotatorClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
      });
      console.log('   ✅ Google Vision API: INITIALIZED');
    } catch (error) {
      console.log('   ❌ Google Vision API: ERROR');
      console.log('   📋 Error:', error.message);
    }
  } else {
    console.log('   ❌ Google Vision API: Not configured');
  }

  console.log('\n3. Redis Configuration:');
  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });
    
    await redis.ping();
    console.log('   ✅ Redis: CONNECTED');
    await redis.disconnect();
  } catch (error) {
    console.log('   ❌ Redis: ERROR');
    console.log('   📋 Error:', error.message);
  }

  console.log('\n4. File Upload System:');
  const fs = require('fs-extra');
  const uploadsDir = './uploads/receipts';
  
  if (await fs.pathExists(uploadsDir)) {
    console.log('   ✅ Upload Directory: Ready');
  } else {
    console.log('   ⚠️  Upload Directory: Creating...');
    await fs.ensureDir(uploadsDir);
    console.log('   ✅ Upload Directory: Created');
  }

  console.log('\n🎉 Configuration Test Complete!');
  console.log('\n📊 System Ready For:');
  console.log('   • 🧾 Receipt upload and AI processing');
  console.log('   • 💰 Budget tracking and financial management');
  console.log('   • 🏢 Organizational management');
  console.log('   • 📊 Advanced analytics and reporting');
  console.log('   • 🔒 Enterprise security and audit');
  
  process.exit(0);
}

testAIConfiguration().catch(console.error);
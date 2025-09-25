const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'sports-management-backend',
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'sports-management-backend',
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;
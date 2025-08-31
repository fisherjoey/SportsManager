const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const db = require('../../config/database');

// Test endpoint - no permission required, just authentication
router.get('/test', authenticateToken, async (req, res) => {
  console.log('Test roles endpoint hit');
  console.log('User:', req.user);
  
  try {
    // Get roles from database
    const roles = await db('roles')
      .select('*')
      .orderBy('name');
    
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        roles: req.user.roles
      },
      roles: roles,
      count: roles.length
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Public test endpoint - no authentication required
router.get('/public-test', async (req, res) => {
  console.log('Public test endpoint hit');
  
  try {
    const rolesCount = await db('roles').count('* as count');
    const permissionsCount = await db('permissions').count('* as count');
    
    res.json({
      success: true,
      message: 'RBAC system is configured',
      stats: {
        roles: rolesCount[0].count,
        permissions: permissionsCount[0].count
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
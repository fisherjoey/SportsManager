const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/users
 * Get all users (for admin dropdown selections)
 */
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await db('users')
      .select('id', 'email', 'role')
      .orderBy('email');

    res.json({
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users'
    });
  }
});

/**
 * GET /api/users/:id
 * Get a specific user
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        error: 'Not authorized to view this user'
      });
    }

    const user = await db('users')
      .select('id', 'email', 'role', 'created_at')
      .where('id', userId)
      .first();

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Failed to fetch user'
    });
  }
});

module.exports = router;
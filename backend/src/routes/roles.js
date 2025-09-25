const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Schema for role updates
const updateRolesSchema = Joi.object({
  roles: Joi.array().items(Joi.string()).required().min(1)
});

// GET /api/roles/available - Get list of available roles
router.get('/available', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Return predefined roles for now - can be made dynamic later
    const availableRoles = [
      {
        name: 'admin',
        description: 'Full system access'
      },
      {
        name: 'referee',
        description: 'Basic referee access to own games and profile'
      },
      {
        name: 'referee_coach',
        description: 'Access to assigned referees and their games'
      },
      {
        name: 'evaluator',
        description: 'Same as referee with evaluation capabilities'
      }
    ];

    res.json({
      success: true,
      data: { roles: availableRoles }
    });
  } catch (error) {
    console.error('Error fetching available roles:', error);
    res.status(500).json({ error: 'Failed to fetch available roles' });
  }
});

// PUT /api/roles/users/:userId - Update user roles (Admin only)
router.put('/users/:userId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = updateRolesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { userId } = req.params;
    const { roles } = value;

    // Validate roles exist in our system
    const validRoles = ['admin', 'referee', 'referee_coach', 'evaluator'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    
    if (invalidRoles.length > 0) {
      return res.status(400).json({ 
        error: `Invalid roles: ${invalidRoles.join(', ')}` 
      });
    }

    // Check if user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user roles
    await db('users')
      .where('id', userId)
      .update({ 
        roles: JSON.stringify(roles), // Store as JSON string for PostgreSQL array handling
        updated_at: db.fn.now()
      });

    // Fetch updated user
    const updatedUser = await db('users')
      .select('id', 'email', 'role', 'roles', 'name', 'created_at', 'updated_at')
      .where('id', userId)
      .first();

    // Parse roles back to array
    updatedUser.roles = updatedUser.roles || [updatedUser.role];

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'User roles updated successfully'
    });

  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Failed to update user roles' });
  }
});

// GET /api/roles/users/:userId - Get user roles
router.get('/users/:userId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db('users')
      .select('id', 'email', 'role', 'roles', 'name')
      .where('id', userId)
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure roles is always an array
    user.roles = user.roles || [user.role];

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { clearSettingsCache } = require('../utils/organization-settings');

// Get organization settings
router.get('/settings', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await db('organization_settings')
      .select('id', 'organization_name', 'payment_model', 'default_game_rate', 'availability_strategy', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc')
      .limit(1);
    
    if (result.length === 0) {
      // Create default settings if none exist
      const defaultResult = await db('organization_settings')
        .insert({
          organization_name: 'Sports Organization',
          payment_model: 'INDIVIDUAL',
          default_game_rate: null,
          availability_strategy: 'BLACKLIST'
        })
        .returning(['id', 'organization_name', 'payment_model', 'default_game_rate', 'availability_strategy', 'created_at', 'updated_at']);
      
      return res.json({
        success: true,
        data: defaultResult[0]
      });
    }
    
    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization settings'
    });
  }
});

// Update organization settings
router.put('/settings', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { organization_name, payment_model, default_game_rate, availability_strategy } = req.body;
    
    // Validation
    if (!organization_name || !payment_model) {
      return res.status(400).json({
        success: false,
        message: 'Organization name and payment model are required'
      });
    }
    
    if (!['INDIVIDUAL', 'FLAT_RATE'].includes(payment_model)) {
      return res.status(400).json({
        success: false,
        message: 'Payment model must be either INDIVIDUAL or FLAT_RATE'
      });
    }
    
    if (availability_strategy && !['WHITELIST', 'BLACKLIST'].includes(availability_strategy)) {
      return res.status(400).json({
        success: false,
        message: 'Availability strategy must be either WHITELIST or BLACKLIST'
      });
    }
    
    if (payment_model === 'FLAT_RATE' && (!default_game_rate || default_game_rate <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Default game rate is required and must be positive for FLAT_RATE model'
      });
    }
    
    // Get current settings to update
    const currentResult = await db('organization_settings')
      .select('id')
      .orderBy('created_at', 'desc')
      .limit(1);
    
    let result;
    if (currentResult.length === 0) {
      // Create new settings
      result = await db('organization_settings')
        .insert({
          organization_name,
          payment_model,
          default_game_rate: payment_model === 'FLAT_RATE' ? default_game_rate : null,
          availability_strategy: availability_strategy || 'BLACKLIST'
        })
        .returning(['id', 'organization_name', 'payment_model', 'default_game_rate', 'availability_strategy', 'created_at', 'updated_at']);
    } else {
      // Update existing settings
      result = await db('organization_settings')
        .where('id', currentResult[0].id)
        .update({
          organization_name,
          payment_model,
          default_game_rate: payment_model === 'FLAT_RATE' ? default_game_rate : null,
          availability_strategy: availability_strategy || 'BLACKLIST',
          updated_at: db.fn.now()
        })
        .returning(['id', 'organization_name', 'payment_model', 'default_game_rate', 'availability_strategy', 'created_at', 'updated_at']);
    }
    
    // Clear cache after update
    clearSettingsCache();
    
    res.json({
      success: true,
      data: result[0],
      message: 'Organization settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization settings'
    });
  }
});

module.exports = router;
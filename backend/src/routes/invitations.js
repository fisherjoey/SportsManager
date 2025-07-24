const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const crypto = require('crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');

const inviteSchema = Joi.object({
  email: Joi.string().email().required(),
  first_name: Joi.string().min(1).required(),
  last_name: Joi.string().min(1).required(),
  role: Joi.string().valid('referee', 'admin').default('referee')
});

const completeInvitationSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().max(20),
  location: Joi.string(),
  postal_code: Joi.string().max(10),
  level: Joi.string().valid('Recreational', 'Competitive', 'Elite'),
  max_distance: Joi.number().integer().min(1).max(200).default(25)
});

// POST /api/invitations - Create invitation (admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    console.log('Creating invitation - request body:', req.body);
    console.log('User making request:', req.user);
    
    const { error, value } = inviteSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details[0].message);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, first_name, last_name, role } = value;
    console.log('Validated data:', { email, first_name, last_name, role });

    // Check if user already exists
    console.log('Checking if user exists with email:', email);
    const existingUser = await db('users').where('email', email).first();
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    console.log('User does not exist, proceeding...');

    // Check if there's already a pending invitation
    const existingInvitation = await db('invitations')
      .where('email', email)
      .where('used', false)
      .where('expires_at', '>', new Date())
      .first();

    if (existingInvitation) {
      return res.status(409).json({ error: 'Invitation already sent to this email' });
    }

    // Get inviter details
    const inviter = await db('users').where('id', req.user.userId).first();
    const inviterName = inviter ? inviter.name : 'System Administrator';

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const [invitation] = await db('invitations').insert({
      email,
      first_name,
      last_name,
      role,
      invited_by: req.user.userId,
      token,
      expires_at: expiresAt
    }).returning('*');

    // Generate invitation link
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/complete-signup?token=${token}`;

    // Send invitation email
    try {
      await emailService.sendInvitationEmail({
        email,
        firstName: first_name,
        lastName: last_name,
        role,
        invitationLink,
        invitedBy: inviterName
      });
      console.log(`Invitation email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the entire request if email fails - invitation is still created
    }

    res.status(201).json({
      success: true,
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          role: invitation.role,
          expires_at: invitation.expires_at
        }
      },
      message: `Invitation sent to ${email}`
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// GET /api/invitations - Get all invitations (admin only)
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;
    
    let query = db('invitations')
      .leftJoin('users as inviter', 'invitations.invited_by', 'inviter.id')
      .select(
        'invitations.*',
        'inviter.email as invited_by_email'
      )
      .orderBy('invitations.created_at', 'desc');

    if (status === 'pending') {
      query = query.where('invitations.used', false)
        .where('invitations.expires_at', '>', new Date());
    } else if (status === 'used') {
      query = query.where('invitations.used', true);
    } else if (status === 'expired') {
      query = query.where('invitations.used', false)
        .where('invitations.expires_at', '<=', new Date());
    }

    const offset = (page - 1) * limit;
    const invitations = await query.limit(limit).offset(offset);

    res.json({
      success: true,
      data: { invitations }
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// GET /api/invitations/:token - Get invitation by token
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await db('invitations')
      .where('token', token)
      .where('used', false)
      .where('expires_at', '>', new Date())
      .first();

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    res.json({
      success: true,
      data: {
        invitation: {
          email: invitation.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          role: invitation.role
        }
      }
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
});

// POST /api/invitations/:token/complete - Complete invitation signup
router.post('/:token/complete', async (req, res) => {
  try {
    const { token } = req.params;
    const { error, value } = completeInvitationSchema.validate({ token, ...req.body });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { password, phone, location, postal_code, level, max_distance } = value;

    // Get invitation
    const invitation = await db('invitations')
      .where('token', token)
      .where('used', false)
      .where('expires_at', '>', new Date())
      .first();

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // Check if user already exists (double check)
    const existingUser = await db('users').where('email', invitation.email).first();
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const trx = await db.transaction();

    try {
      // Create user
      const [user] = await trx('users').insert({
        email: invitation.email,
        password_hash,
        role: invitation.role
      }).returning('*');

      let userData = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      // If referee, create referee record
      if (invitation.role === 'referee') {
        const [referee] = await trx('referees').insert({
          user_id: user.id,
          name: `${invitation.first_name} ${invitation.last_name}`,
          email: invitation.email,
          phone: phone || null,
          level: level || 'Recreational',
          location: location || null,
          postal_code: postal_code || null,
          max_distance: max_distance || 25,
          is_available: true
        }).returning('*');

        userData.referee = referee;
      }

      // Mark invitation as used
      await trx('invitations')
        .where('id', invitation.id)
        .update({
          used: true,
          used_at: new Date()
        });

      await trx.commit();

      // Generate JWT token
      const jwtToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          token: jwtToken,
          user: userData
        }
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error completing invitation:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Failed to complete signup' });
    }
  }
});

// DELETE /api/invitations/:id - Cancel invitation (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const invitation = await db('invitations').where('id', id).first();
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.used) {
      return res.status(400).json({ error: 'Cannot cancel used invitation' });
    }

    await db('invitations').where('id', id).del();

    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

module.exports = router;
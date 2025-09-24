// @ts-nocheck

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4: uuidv4  } from 'uuid';
import knex from '../config/database';
import EncryptionService from './EncryptionService';
import AuditService from './AuditService';

/**
 * Core Security Service for enterprise-grade security operations
 * Handles authentication, authorization, session management, and security monitoring
 */
class SecurityService {
  constructor() {
    this.encryptionService = new EncryptionService();
    this.auditService = new AuditService();
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.refreshTokenTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Enhanced user authentication with security monitoring
   */
  async authenticateUser(email, password, ipAddress, userAgent, additionalData = {}) {
    const startTime = Date.now();
    let user = null;
    let loginSuccessful = false;
    let failureReason = null;

    try {
      // Check for account lockout
      const isLocked = await this.isAccountLocked(email, ipAddress);
      if (isLocked) {
        failureReason = 'account_locked';
        await this.logLoginAttempt(email, ipAddress, false, failureReason, userAgent);
        throw new Error('Account temporarily locked due to too many failed attempts');
      }

      // Find user
      user = await knex('users').where({ email }).first();
      if (!user) {
        failureReason = 'user_not_found';
        await this.logLoginAttempt(email, ipAddress, false, failureReason, userAgent);
        throw new Error('Invalid credentials');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        failureReason = 'invalid_password';
        await this.logLoginAttempt(email, ipAddress, false, failureReason, userAgent);
        throw new Error('Invalid credentials');
      }

      loginSuccessful = true;

      // Check if MFA is enabled
      const mfaSettings = await this.getMFASettings(user.id);
      if (mfaSettings && mfaSettings.is_enabled) {
        return {
          success: true,
          requiresMFA: true,
          userId: user.id,
          mfaMethod: mfaSettings.method
        };
      }

      // Create session
      const session = await this.createUserSession(user, ipAddress, userAgent, additionalData);
      
      // Log successful login
      await this.logLoginAttempt(email, ipAddress, true, null, userAgent);
      
      // Create security event
      await this.createSecurityEvent({
        userId: user.id,
        eventType: 'successful_login',
        severity: 'low',
        ipAddress,
        userAgent,
        eventData: {
          loginDuration: Date.now() - startTime,
          mfaEnabled: false,
          ...additionalData
        }
      });

      return {
        success: true,
        user: this.sanitizeUser(user),
        session,
        tokens: {
          accessToken: session.session_token,
          refreshToken: session.refresh_token
        }
      };

    } catch (error) {
      // Log failed login attempt
      if (!loginSuccessful) {
        await this.logLoginAttempt(email, ipAddress, false, failureReason || 'unknown_error', userAgent);
        
        // Create security event for failed login
        await this.createSecurityEvent({
          userId: user?.id || null,
          eventType: 'failed_login',
          severity: 'medium',
          ipAddress,
          userAgent,
          eventData: {
            email,
            reason: failureReason,
            duration: Date.now() - startTime
          }
        });
      }

      throw error;
    }
  }

  /**
   * Complete MFA authentication
   */
  async completeMFAAuthentication(userId, mfaCode, ipAddress, userAgent) {
    try {
      const user = await knex('users').where({ id: userId }).first();
      if (!user) {
        throw new Error('User not found');
      }

      const mfaSettings = await this.getMFASettings(userId);
      if (!mfaSettings || !mfaSettings.is_enabled) {
        throw new Error('MFA not enabled for this user');
      }

      // Verify MFA code
      const isValidCode = await this.verifyMFACode(userId, mfaCode, mfaSettings.method);
      if (!isValidCode) {
        await this.incrementMFAFailedAttempts(userId);
        
        await this.createSecurityEvent({
          userId,
          eventType: 'mfa_failed',
          severity: 'high',
          ipAddress,
          userAgent,
          eventData: { method: mfaSettings.method }
        });

        throw new Error('Invalid MFA code');
      }

      // Reset failed attempts
      await this.resetMFAFailedAttempts(userId);

      // Create session
      const session = await this.createUserSession(user, ipAddress, userAgent, { mfaCompleted: true });

      // Log successful MFA completion
      await this.createSecurityEvent({
        userId,
        eventType: 'mfa_completed',
        severity: 'low',
        ipAddress,
        userAgent,
        eventData: { method: mfaSettings.method }
      });

      return {
        success: true,
        user: this.sanitizeUser(user),
        session,
        tokens: {
          accessToken: session.session_token,
          refreshToken: session.refresh_token
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new user session with enhanced security
   */
  async createUserSession(user, ipAddress, userAgent, additionalData = {}) {
    const sessionId = uuidv4();
    const sessionToken = this.generateSecureToken();
    const refreshToken = this.generateSecureToken();
    
    const expiresAt = new Date(Date.now() + this.sessionTimeout);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTokenTimeout);

    // Create device fingerprint
    const deviceFingerprint = this.createDeviceFingerprint(userAgent, additionalData);

    const session = {
      id: sessionId,
      user_id: user.id,
      session_token: sessionToken,
      refresh_token: refreshToken,
      device_fingerprint: deviceFingerprint,
      ip_address: ipAddress,
      user_agent: userAgent,
      location_data: additionalData.location || null,
      expires_at: expiresAt,
      last_activity: new Date(),
      created_at: new Date()
    };

    await knex('user_sessions').insert(session);

    // Create JWT tokens with additional security claims
    const accessToken = jwt.sign(
      {
        userId: user.id,
        sessionId,
        email: user.email,
        roles: user.roles || [user.role],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
        deviceFingerprint
      },
      process.env.JWT_SECRET
    );

    const refreshTokenJWT = jwt.sign(
      {
        userId: user.id,
        sessionId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(refreshExpiresAt.getTime() / 1000)
      },
      process.env.JWT_SECRET
    );

    return {
      ...session,
      session_token: accessToken,
      refresh_token: refreshTokenJWT
    };
  }

  /**
   * Validate and refresh JWT token
   */
  async refreshToken(refreshTokenJWT, ipAddress, userAgent) {
    try {
      const decoded = jwt.verify(refreshTokenJWT, process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const session = await knex('user_sessions')
        .where({ 
          id: decoded.sessionId,
          user_id: decoded.userId,
          is_active: true
        })
        .first();

      if (!session) {
        throw new Error('Session not found');
      }

      if (new Date() > new Date(session.expires_at)) {
        await this.invalidateSession(session.id);
        throw new Error('Session expired');
      }

      const user = await knex('users').where({ id: decoded.userId }).first();
      if (!user) {
        throw new Error('User not found');
      }

      // Create new session
      const newSession = await this.createUserSession(user, ipAddress, userAgent);

      // Invalidate old session
      await this.invalidateSession(session.id);

      return {
        success: true,
        tokens: {
          accessToken: newSession.session_token,
          refreshToken: newSession.refresh_token
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if account is locked due to failed attempts
   */
  async isAccountLocked(identifier, ipAddress) {
    const recentAttempts = await knex('login_attempts')
      .where('identifier', identifier)
      .orWhere('ip_address', ipAddress)
      .where('attempted_at', '>', new Date(Date.now() - this.lockoutDuration))
      .where('successful', false)
      .count('* as count')
      .first();

    return parseInt(recentAttempts.count) >= this.maxLoginAttempts;
  }

  /**
   * Log login attempt for security monitoring
   */
  async logLoginAttempt(identifier, ipAddress, successful, failureReason = null, userAgent = null) {
    await knex('login_attempts').insert({
      identifier,
      ip_address: ipAddress,
      successful,
      failure_reason: failureReason,
      user_agent: userAgent,
      attempted_at: new Date()
    });
  }

  /**
   * Create security event for monitoring
   */
  async createSecurityEvent(eventData) {
    const {
      userId,
      eventType,
      severity,
      ipAddress,
      userAgent,
      eventData: data,
      riskScore = null
    } = eventData;

    const event = {
      id: uuidv4(),
      user_id: userId,
      event_type: eventType,
      severity,
      ip_address: ipAddress,
      user_agent: userAgent,
      event_data: JSON.stringify(data),
      risk_score: riskScore,
      created_at: new Date()
    };

    await knex('security_events').insert(event);

    // Check if this event requires immediate attention
    if (severity === 'critical' || severity === 'high') {
      await this.handleHighSeverityEvent(event);
    }

    return event;
  }

  /**
   * Handle high severity security events
   */
  async handleHighSeverityEvent(event) {
    // Create security incident if needed
    if (event.severity === 'critical') {
      await this.createSecurityIncident({
        title: `Critical Security Event: ${event.event_type}`,
        description: `Automated incident created for critical security event`,
        severity: 'critical',
        affectedUserId: event.user_id,
        eventData: event
      });
    }

    // Additional automated responses can be added here
    // e.g., account lockout, admin notifications, etc.
  }

  /**
   * Create security incident
   */
  async createSecurityIncident(incidentData) {
    const {
      title,
      description,
      severity,
      affectedUserId = null,
      affectedResources = null,
      eventData = null
    } = incidentData;

    const incident = {
      id: uuidv4(),
      title,
      description,
      severity,
      affected_user_id: affectedUserId,
      affected_resources: affectedResources ? JSON.stringify(affectedResources) : null,
      timeline: JSON.stringify([{
        timestamp: new Date(),
        event: 'Incident created',
        details: 'Automated incident creation based on security event'
      }]),
      evidence: eventData ? JSON.stringify([eventData]) : null,
      detected_at: new Date(),
      created_at: new Date()
    };

    await knex('security_incidents').insert(incident);
    return incident;
  }

  /**
   * Validate session and update activity
   */
  async validateSession(sessionToken, ipAddress = null) {
    try {
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);
      
      const session = await knex('user_sessions')
        .where({ 
          id: decoded.sessionId,
          user_id: decoded.userId,
          is_active: true 
        })
        .first();

      if (!session) {
        throw new Error('Session not found');
      }

      if (new Date() > new Date(session.expires_at)) {
        await this.invalidateSession(session.id);
        throw new Error('Session expired');
      }

      // Update last activity
      await knex('user_sessions')
        .where({ id: session.id })
        .update({ last_activity: new Date() });

      // Verify device fingerprint if available
      if (decoded.deviceFingerprint && session.device_fingerprint) {
        if (decoded.deviceFingerprint !== session.device_fingerprint) {
          await this.createSecurityEvent({
            userId: decoded.userId,
            eventType: 'device_fingerprint_mismatch',
            severity: 'high',
            ipAddress: ipAddress || session.ip_address,
            userAgent: session.user_agent,
            eventData: {
              sessionId: session.id,
              expectedFingerprint: session.device_fingerprint,
              actualFingerprint: decoded.deviceFingerprint
            }
          });
        }
      }

      return {
        valid: true,
        session,
        user: decoded
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Invalidate user session
   */
  async invalidateSession(sessionId, reason = 'logout') {
    await knex('user_sessions')
      .where({ id: sessionId })
      .update({ 
        is_active: false,
        updated_at: new Date()
      });

    // Log session invalidation
    const session = await knex('user_sessions').where({ id: sessionId }).first();
    if (session) {
      await this.createSecurityEvent({
        userId: session.user_id,
        eventType: 'session_invalidated',
        severity: 'low',
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        eventData: {
          sessionId,
          reason,
          duration: new Date() - new Date(session.created_at)
        }
      });
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId) {
    return await knex('user_sessions')
      .where({ 
        user_id: userId, 
        is_active: true 
      })
      .where('expires_at', '>', new Date())
      .orderBy('last_activity', 'desc');
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const expiredSessions = await knex('user_sessions')
      .where('expires_at', '<', new Date())
      .where('is_active', true);

    for (const session of expiredSessions) {
      await this.invalidateSession(session.id, 'expired');
    }

    return expiredSessions.length;
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create device fingerprint
   */
  createDeviceFingerprint(userAgent, additionalData = {}) {
    const data = {
      userAgent,
      ...additionalData
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Sanitize user data for API responses
   */
  sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Get MFA settings for user
   */
  async getMFASettings(userId) {
    return await knex('mfa_settings')
      .where({ user_id: userId, is_enabled: true })
      .first();
  }

  /**
   * Verify MFA code
   */
  async verifyMFACode(userId, code, method) {
    // Implementation depends on MFA method
    // This is a placeholder for the actual MFA verification logic
    return true; // Simplified for now
  }

  /**
   * Increment MFA failed attempts
   */
  async incrementMFAFailedAttempts(userId) {
    await knex('mfa_settings')
      .where({ user_id: userId })
      .increment('failed_attempts', 1);
  }

  /**
   * Reset MFA failed attempts
   */
  async resetMFAFailedAttempts(userId) {
    await knex('mfa_settings')
      .where({ user_id: userId })
      .update({ failed_attempts: 0, locked_until: null });
  }

  /**
   * Check user permissions
   */
  async checkPermission(userId, resource, action) {
    // Get user roles
    const user = await knex('users').where({ id: userId }).first();
    if (!user) {
      return false;
    }

    const userRoles = user.roles || [user.role];
    
    // Admin always has access
    if (userRoles.includes('admin')) {
      return true;
    }

    // Check role-based permissions
    const rolePermissions = await knex('role_permissions')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .join('roles', 'role_permissions.role_id', 'roles.id')
      .whereIn('roles.name', userRoles)
      .where('permissions.resource', resource)
      .where('permissions.action', action)
      .where('permissions.is_active', true)
      .first();

    if (rolePermissions) {
      return true;
    }

    // Check user-specific permissions
    const userPermission = await knex('user_permissions')
      .join('permissions', 'user_permissions.permission_id', 'permissions.id')
      .where('user_permissions.user_id', userId)
      .where('permissions.resource', resource)
      .where('permissions.action', action)
      .where('permissions.is_active', true)
      .where(function() {
        this.whereNull('user_permissions.expires_at')
          .orWhere('user_permissions.expires_at', '>', new Date());
      })
      .first();

    return userPermission ? userPermission.granted : false;
  }
}

export default SecurityService;
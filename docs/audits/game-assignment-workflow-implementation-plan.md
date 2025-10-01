# Game Assignment Workflow - Implementation Plan

**Project:** SportsManager Assignment Notifications & Workflow Enhancements
**Created:** 2025-09-30
**Status:** Planning Phase
**Estimated Duration:** 8-10 weeks
**Priority:** CRITICAL

---

## Executive Summary

This document provides a detailed, actionable implementation plan for adding complete notification functionality to the game assignment workflow. The plan is broken into 4 phases with specific tasks, file changes, code examples, and testing requirements.

**Critical Missing Features Being Implemented:**
1. Email notifications for game assignments
2. SMS notifications for assignments and reminders
3. Decline reason tracking with UI
4. In-app notification system
5. Calendar integration
6. Assignor status notifications

---

## Phase 1: Email Notifications & Decline Reasons (Weeks 1-3)

**Priority:** CRITICAL
**Goal:** Enable email notifications for assignments and track decline reasons
**Estimated Effort:** 3 weeks

### Week 1: Email Infrastructure Setup

#### Task 1.1: Extend EmailService for Assignments
**File:** `backend/src/services/emailService.ts`

**Changes Required:**
```typescript
// Add to EmailService class

export interface AssignmentEmailData {
  email: string;
  firstName: string;
  lastName: string;
  assignment: {
    id: string;
    position: string;
    calculatedWage: number;
  };
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
    location: string;
    level: string;
    payRate: number;
    wageMultiplier?: number;
    wageMultiplierReason?: string;
  };
  assignor: {
    name: string;
    email: string;
  };
  acceptLink: string;
  declineLink: string;
}

export interface AssignorNotificationData {
  email: string;
  name: string;
  referee: {
    name: string;
    email: string;
  };
  game: {
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
  };
  status: 'accepted' | 'declined';
  declineReason?: string;
  declineCategory?: string;
}

/**
 * Send assignment notification email to referee
 */
async sendAssignmentEmail(data: AssignmentEmailData): Promise<EmailResult> {
  try {
    if (!this.isConfigured || !this.resend) {
      console.log('Email service not configured - assignment details:');
      console.log(`To: ${data.email}`);
      console.log(`Game: ${data.game.homeTeam} vs ${data.game.awayTeam}`);
      console.log(`Position: ${data.assignment.position}`);
      console.log(`Accept Link: ${data.acceptLink}`);
      return {
        success: true,
        message: 'Email service not configured - assignment logged to console'
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 Sending assignment email to: ${data.email}`);
      console.log(`🔗 Accept link: ${data.acceptLink}`);
    }

    const subject = `New Game Assignment: ${data.game.homeTeam} vs ${data.game.awayTeam}`;
    const htmlContent = this.generateAssignmentHtml(data);
    const textContent = this.generateAssignmentText(data);

    // Generate calendar attachment
    const icsAttachment = this.generateCalendarAttachment(data);

    const result = await this.resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      to: data.email,
      subject: subject,
      html: htmlContent,
      text: textContent,
      attachments: icsAttachment ? [icsAttachment] : []
    }) as ResendResponse;

    if (result.error) {
      return this.handleResendError(result.error, {
        type: 'assignment',
        email: data.email,
        link: data.acceptLink,
        userName: data.assignor.name
      });
    }

    console.log('Assignment email sent successfully:', result.data?.id);
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return this.handleEmailError(error as Error, {
      type: 'assignment',
      email: data.email,
      link: data.acceptLink,
      userName: data.assignor.name
    });
  }
}

/**
 * Send status change notification to assignor
 */
async sendAssignorNotification(data: AssignorNotificationData): Promise<EmailResult> {
  try {
    if (!this.isConfigured || !this.resend) {
      console.log('Email service not configured - assignor notification logged');
      return { success: true, message: 'Email service not configured' };
    }

    const subject = `Referee ${data.status === 'accepted' ? 'Accepted' : 'Declined'}: ${data.game.homeTeam} vs ${data.game.awayTeam}`;
    const htmlContent = this.generateAssignorNotificationHtml(data);
    const textContent = this.generateAssignorNotificationText(data);

    const result = await this.resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      to: data.email,
      subject: subject,
      html: htmlContent,
      text: textContent,
    }) as ResendResponse;

    if (result.error) {
      console.error('Failed to send assignor notification:', result.error);
      return { success: false, error: result.error.message || 'Unknown error' };
    }

    console.log('Assignor notification sent successfully:', result.data?.id);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error sending assignor notification:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Generate HTML for assignment email
 */
private generateAssignmentHtml(data: AssignmentEmailData): string {
  const wageDisplay = data.game.wageMultiplier && data.game.wageMultiplier !== 1.0
    ? `$${data.assignment.calculatedWage.toFixed(2)} (${data.game.wageMultiplier}x multiplier)`
    : `$${data.assignment.calculatedWage.toFixed(2)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Game Assignment</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 20px; }
        .game-details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .wage-highlight { background-color: #d1fae5; padding: 12px; border-radius: 6px; text-align: center; margin: 15px 0; }
        .wage-amount { font-size: 24px; font-weight: bold; color: #059669; }
        .button-container { text-align: center; margin: 25px 0; }
        .button {
          display: inline-block;
          padding: 12px 30px;
          margin: 0 10px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
        }
        .accept-button { background-color: #059669; color: white; }
        .decline-button { background-color: #dc2626; color: white; }
        .footer { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; font-size: 14px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏆 New Game Assignment</h1>
        </div>

        <div class="content">
          <p>Hello ${data.firstName},</p>

          <p>You have been assigned to referee the following game by ${data.assignor.name}:</p>

          <div class="game-details">
            <h3 style="margin-top: 0; color: #2563eb;">Game Details</h3>

            <div class="detail-row">
              <span class="detail-label">Teams:</span>
              <span class="detail-value">${data.game.homeTeam} vs ${data.game.awayTeam}</span>
            </div>

            <div class="detail-row">
              <span class="detail-label">Date & Time:</span>
              <span class="detail-value">${new Date(data.game.date).toLocaleDateString()} at ${data.game.time}</span>
            </div>

            <div class="detail-row">
              <span class="detail-label">Location:</span>
              <span class="detail-value">${data.game.location}</span>
            </div>

            <div class="detail-row">
              <span class="detail-label">Level:</span>
              <span class="detail-value">${data.game.level}</span>
            </div>

            <div class="detail-row">
              <span class="detail-label">Position:</span>
              <span class="detail-value">${data.assignment.position}</span>
            </div>
          </div>

          <div class="wage-highlight">
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Pay Rate</div>
            <div class="wage-amount">${wageDisplay}</div>
            ${data.game.wageMultiplierReason ? `<div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${data.game.wageMultiplierReason}</div>` : ''}
          </div>

          <p><strong>Please respond to this assignment as soon as possible:</strong></p>

          <div class="button-container">
            <a href="${data.acceptLink}" class="button accept-button">✓ Accept Assignment</a>
            <a href="${data.declineLink}" class="button decline-button">✗ Decline Assignment</a>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            <strong>Note:</strong> A calendar event is attached to this email. Add it to your calendar after accepting.
          </p>
        </div>

        <div class="footer">
          <p>If you have questions about this assignment, contact ${data.assignor.name} at ${data.assignor.email}</p>
          <p>This is an automated notification from SportsManager.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text for assignment email
 */
private generateAssignmentText(data: AssignmentEmailData): string {
  const wageDisplay = data.game.wageMultiplier && data.game.wageMultiplier !== 1.0
    ? `$${data.assignment.calculatedWage.toFixed(2)} (${data.game.wageMultiplier}x multiplier)`
    : `$${data.assignment.calculatedWage.toFixed(2)}`;

  return `
NEW GAME ASSIGNMENT

Hello ${data.firstName},

You have been assigned to referee the following game by ${data.assignor.name}:

GAME DETAILS
Teams: ${data.game.homeTeam} vs ${data.game.awayTeam}
Date & Time: ${new Date(data.game.date).toLocaleDateString()} at ${data.game.time}
Location: ${data.game.location}
Level: ${data.game.level}
Position: ${data.assignment.position}

PAY RATE: ${wageDisplay}
${data.game.wageMultiplierReason ? `Note: ${data.game.wageMultiplierReason}` : ''}

PLEASE RESPOND:
Accept: ${data.acceptLink}
Decline: ${data.declineLink}

If you have questions, contact ${data.assignor.name} at ${data.assignor.email}

This is an automated notification from SportsManager.
  `.trim();
}

/**
 * Generate calendar attachment (.ics file)
 */
private generateCalendarAttachment(data: AssignmentEmailData): any {
  const startDate = new Date(`${data.game.date}T${data.game.time}`);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SportsManager//Game Assignment//EN',
    'BEGIN:VEVENT',
    `UID:assignment-${data.assignment.id}@sportsmanager.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${data.game.homeTeam} vs ${data.game.awayTeam} (${data.assignment.position})`,
    `LOCATION:${data.game.location}`,
    `DESCRIPTION:Game Assignment\\n\\nTeams: ${data.game.homeTeam} vs ${data.game.awayTeam}\\nLevel: ${data.game.level}\\nPosition: ${data.assignment.position}\\nPay: $${data.assignment.calculatedWage}\\n\\nAssigned by: ${data.assignor.name}`,
    'STATUS:TENTATIVE',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Game in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return {
    filename: 'game-assignment.ics',
    content: Buffer.from(icsContent).toString('base64'),
    type: 'text/calendar'
  };
}

/**
 * Generate assignor notification HTML
 */
private generateAssignorNotificationHtml(data: AssignorNotificationData): string {
  const statusColor = data.status === 'accepted' ? '#059669' : '#dc2626';
  const statusIcon = data.status === 'accepted' ? '✓' : '✗';
  const statusText = data.status === 'accepted' ? 'ACCEPTED' : 'DECLINED';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .status-banner { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { background-color: #f8f9fa; padding: 20px; margin-top: 20px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="status-banner">
          <h1>${statusIcon} Assignment ${statusText}</h1>
        </div>
        <div class="content">
          <p>Hello ${data.name},</p>
          <p><strong>${data.referee.name}</strong> has <strong>${data.status}</strong> the assignment for:</p>
          <ul>
            <li><strong>Game:</strong> ${data.game.homeTeam} vs ${data.game.awayTeam}</li>
            <li><strong>Date:</strong> ${new Date(data.game.date).toLocaleDateString()} at ${data.game.time}</li>
          </ul>
          ${data.status === 'declined' && data.declineReason ? `
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
              <strong>Decline Reason:</strong><br>
              ${data.declineCategory ? `<em>${data.declineCategory}</em><br>` : ''}
              ${data.declineReason}
            </div>
          ` : ''}
          ${data.status === 'declined' ? '<p>You may need to reassign this game to another referee.</p>' : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate assignor notification text
 */
private generateAssignorNotificationText(data: AssignorNotificationData): string {
  return `
ASSIGNMENT ${data.status.toUpperCase()}

Hello ${data.name},

${data.referee.name} has ${data.status} the assignment for:

Game: ${data.game.homeTeam} vs ${data.game.awayTeam}
Date: ${new Date(data.game.date).toLocaleDateString()} at ${data.game.time}

${data.status === 'declined' && data.declineReason ? `
DECLINE REASON:
${data.declineCategory ? `Category: ${data.declineCategory}` : ''}
${data.declineReason}

You may need to reassign this game to another referee.
` : ''}

Contact: ${data.referee.email}
  `.trim();
}
```

**Testing Requirements:**
- [ ] Unit test: `sendAssignmentEmail()` with valid data
- [ ] Unit test: `sendAssignmentEmail()` with no Resend config
- [ ] Unit test: Calendar attachment generation
- [ ] Integration test: Full email delivery
- [ ] Manual test: Verify email appearance in Gmail, Outlook

---

#### Task 1.2: Integrate Email Sending into AssignmentService
**File:** `backend/src/services/AssignmentService.ts`

**Changes Required:**
```typescript
import emailService from './emailService';

// In createAssignment method, after line 272 (assignment creation):

async createAssignment(assignmentData: AssignmentCreationData, options: QueryOptions = {}): Promise<AssignmentCreationResult> {
  return await this.withTransaction(async (trx: Knex.Transaction) => {
    try {
      // ... existing code ...

      const assignment = await this.create(assignmentRecord, { transaction: trx });

      // Get wage breakdown for response
      const wageBreakdown: WageBreakdown = getWageBreakdown(
        referee.wage_per_game || game.pay_rate,
        game.wage_multiplier || 1.0,
        game.wage_multiplier_reason || '',
        orgSettings.payment_model || 'INDIVIDUAL',
        orgSettings.default_game_rate || 0,
        assignedRefereesCount
      );

      // Update game status
      await this._updateGameStatus(game_id, trx);

      // ====== NEW: Send email notification ======
      try {
        // Get assignor details
        const assignor = assigned_by
          ? await (trx as any)('users').where('id', assigned_by).first()
          : null;

        // Generate accept/decline links with signed tokens
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const acceptLink = `${baseUrl}/assignments/${assignment.id}/accept?token=${this._generateSignedToken(assignment.id, 'accept')}`;
        const declineLink = `${baseUrl}/assignments/${assignment.id}/decline?token=${this._generateSignedToken(assignment.id, 'decline')}`;

        // Send assignment notification email
        await emailService.sendAssignmentEmail({
          email: referee.email,
          firstName: referee.first_name || referee.name?.split(' ')[0] || 'Referee',
          lastName: referee.last_name || referee.name?.split(' ')[1] || '',
          assignment: {
            id: assignment.id,
            position: position.name,
            calculatedWage: assignment.calculated_wage || finalWage
          },
          game: {
            id: game.id,
            homeTeam: game.home_team_name || 'Home Team',
            awayTeam: game.away_team_name || 'Away Team',
            date: game.date_time,
            time: new Date(game.date_time).toTimeString().slice(0, 5),
            location: game.field || game.location || 'TBD',
            level: game.level || 'Recreational',
            payRate: game.base_wage || game.pay_rate,
            wageMultiplier: game.wage_multiplier,
            wageMultiplierReason: game.wage_multiplier_reason
          },
          assignor: {
            name: assignor?.name || 'Assignor',
            email: assignor?.email || process.env.ADMIN_EMAIL || 'admin@sportsmanager.com'
          },
          acceptLink,
          declineLink
        });

        console.log(`✅ Assignment notification sent to ${referee.email}`);
      } catch (emailError) {
        // Don't fail the assignment if email fails
        console.error('Failed to send assignment email:', emailError);
        // Add warning to response
        if (!conflictAnalysis.warnings) conflictAnalysis.warnings = [];
        conflictAnalysis.warnings.push('Assignment created but notification email failed');
      }
      // ====== END NEW CODE ======

      return {
        assignment,
        wageBreakdown,
        warnings: conflictAnalysis.warnings || []
      };

    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  });
}

/**
 * Generate signed token for accept/decline links
 * @private
 */
private _generateSignedToken(assignmentId: UUID, action: 'accept' | 'decline'): string {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'your-secret-key';

  return jwt.sign(
    {
      assignmentId,
      action,
      type: 'assignment-action'
    },
    secret,
    { expiresIn: '7d' } // Token valid for 7 days
  );
}
```

**Testing Requirements:**
- [ ] Unit test: Email sent after assignment creation
- [ ] Unit test: Assignment creation succeeds even if email fails
- [ ] Integration test: Full flow from API call to email delivery

---

### Week 2: Decline Reason Implementation

#### Task 2.1: Database Migration for Decline Reason
**File:** `backend/migrations/XXX_add_decline_reason_to_assignments.js`

**New Migration:**
```javascript
exports.up = function(knex) {
  return knex.schema.table('game_assignments', function(table) {
    table.text('decline_reason').nullable();
    table.string('decline_category', 50).nullable();
    table.timestamp('decline_timestamp').nullable();

    // Add check constraint for decline fields
    table.check(
      `(status != 'declined' AND decline_reason IS NULL AND decline_category IS NULL AND decline_timestamp IS NULL)
       OR
       (status = 'declined')`,
      [],
      'check_decline_fields_consistency'
    );
  });
};

exports.down = function(knex) {
  return knex.schema.table('game_assignments', function(table) {
    table.dropColumn('decline_reason');
    table.dropColumn('decline_category');
    table.dropColumn('decline_timestamp');
  });
};
```

**Run Migration:**
```bash
npm run migrate:latest
```

**Testing Requirements:**
- [ ] Test migration up
- [ ] Test migration down (rollback)
- [ ] Verify constraint works (decline fields only with declined status)

---

#### Task 2.2: Update Assignment API for Decline Reasons
**File:** `backend/src/routes/assignments.ts`

**Changes Required:**
```typescript
// Update the PATCH /:id/status endpoint validation

router.patch('/:id/status',
  authenticateToken,
  requireCerbosPermission({
    resource: 'assignment',
    action: 'change_status',
    getResourceId: (req: any) => req.params.id,
  }),
  validateParams(IdParamSchema),
  validateBody(Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').required(),
    decline_reason: Joi.string().when('status', {
      is: 'declined',
      then: Joi.string().max(500).optional(),
      otherwise: Joi.forbidden()
    }),
    decline_category: Joi.string().when('status', {
      is: 'declined',
      then: Joi.string().valid('schedule_conflict', 'distance', 'qualification', 'personal', 'other').optional(),
      otherwise: Joi.forbidden()
    })
  })),
  enhancedAsyncHandler(updateAssignmentStatus)
);
```

**Update Handler:**
```typescript
const updateAssignmentStatus = async (
  req: AuthenticatedRequest<{id: string}, {}, AssignmentStatusUpdateBody>,
  res: Response
): Promise<Response> => {
  const { status, decline_reason, decline_category } = (req as any).body;

  // Prepare update data
  const updateData: any = {
    assignment_id: (req as any).params.id,
    status
  };

  // Add decline fields if status is declined
  if (status === 'declined') {
    updateData.decline_reason = decline_reason;
    updateData.decline_category = decline_category;
    updateData.decline_timestamp = new Date();
  }

  // Use AssignmentService for single status update
  const results = await assignmentService.bulkUpdateAssignments([updateData]);

  if (results.summary.failedUpdates > 0) {
    const error = results.updateErrors[0];
    if (error.error === 'Assignment not found') {
      throw ErrorFactory.notFound('Assignment', (req as any).params.id);
    }
    throw new Error(error.error);
  }

  const updatedAssignment = results.updatedAssignments[0];

  // Track critical status changes
  if (status === 'accepted') {
    ProductionMonitor.logCriticalPath('assignment.accepted', {
      assignmentId: (req as any).params.id,
      userId: req.user.id
    });
  } else if (status === 'declined') {
    ProductionMonitor.logCriticalPath('assignment.declined', {
      assignmentId: (req as any).params.id,
      userId: req.user.id,
      reason: decline_category || 'not_specified'
    });
  }

  // ====== NEW: Send notification to assignor ======
  if (status === 'accepted' || status === 'declined') {
    try {
      // Get full assignment details for notification
      const assignmentDetails = await assignmentService.findById((req as any).params.id);
      if (assignmentDetails) {
        // Get game and assignor details
        const game = await db('games')
          .leftJoin('teams as home_teams', 'games.home_team_id', 'home_teams.id')
          .leftJoin('teams as away_teams', 'games.away_team_id', 'away_teams.id')
          .select(
            'games.*',
            'home_teams.name as home_team_name',
            'away_teams.name as away_team_name'
          )
          .where('games.id', assignmentDetails.game_id)
          .first();

        const assignor = assignmentDetails.assigned_by
          ? await db('users').where('id', assignmentDetails.assigned_by).first()
          : null;

        const referee = await db('users').where('id', req.user.id).first();

        if (game && assignor && referee) {
          await emailService.sendAssignorNotification({
            email: assignor.email,
            name: assignor.name,
            referee: {
              name: referee.name,
              email: referee.email
            },
            game: {
              homeTeam: game.home_team_name,
              awayTeam: game.away_team_name,
              date: game.date_time,
              time: new Date(game.date_time).toTimeString().slice(0, 5)
            },
            status,
            declineReason: decline_reason,
            declineCategory: decline_category
          });

          console.log(`✅ Assignor notification sent to ${assignor.email}`);
        }
      }
    } catch (emailError) {
      console.error('Failed to send assignor notification:', emailError);
      // Don't fail the status update if email fails
    }
  }
  // ====== END NEW CODE ======

  return ResponseFormatter.sendSuccess(res,
    { assignment: updatedAssignment },
    'Assignment status updated successfully'
  );
};
```

---

#### Task 2.3: Update AssignmentService to Handle Decline Fields
**File:** `backend/src/services/AssignmentService.ts`

**Changes in `bulkUpdateAssignments` method:**
```typescript
async bulkUpdateAssignments(updates: BulkUpdateData[], options: QueryOptions = {}): Promise<BulkUpdateResult> {
  // ... existing validation ...

  return await this.withTransaction(async (trx: Knex.Transaction) => {
    // ... existing code ...

    for (const updateData of updates) {
      try {
        const { assignment_id, status, calculated_wage, decline_reason, decline_category, decline_timestamp } = updateData as any;

        // ... existing validation ...

        // Build update object
        const updateObj: any = {
          status,
          updated_at: new Date()
        };

        if (calculated_wage !== undefined) {
          updateObj.calculated_wage = calculated_wage;
        }

        // Add decline fields if status is declined
        if (status === 'declined') {
          updateObj.decline_reason = decline_reason || null;
          updateObj.decline_category = decline_category || null;
          updateObj.decline_timestamp = decline_timestamp || new Date();
        }

        // Update assignment
        const [updatedAssignment] = await (trx as any)('game_assignments')
          .where('id', assignment_id)
          .update(updateObj)
          .returning('*');

        // ... rest of existing code ...
      } catch (error: any) {
        // ... error handling ...
      }
    }

    return results;
  });
}
```

---

#### Task 2.4: Frontend Decline Dialog Component
**File:** `frontend/components/DeclineAssignmentDialog.tsx` (NEW FILE)

**Create Component:**
```typescript
'use client'

import { useState } from 'react'
import { XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DeclineAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string, category: string) => void
  assignmentDetails: {
    homeTeam: string
    awayTeam: string
    date: string
    time: string
  }
}

const DECLINE_CATEGORIES = [
  { value: 'schedule_conflict', label: 'Schedule Conflict' },
  { value: 'distance', label: 'Too Far from Location' },
  { value: 'qualification', label: 'Not Qualified for This Level' },
  { value: 'personal', label: 'Personal Reasons' },
  { value: 'other', label: 'Other' },
]

export function DeclineAssignmentDialog({
  open,
  onOpenChange,
  onConfirm,
  assignmentDetails
}: DeclineAssignmentDialogProps) {
  const [category, setCategory] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!category) {
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(reason, category)
      // Reset form
      setCategory('')
      setReason('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to decline assignment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <XCircle className="h-5 w-5 mr-2" />
            Decline Game Assignment
          </DialogTitle>
          <DialogDescription>
            Please let us know why you're declining this assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Game Details */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-sm">
              {assignmentDetails.homeTeam} vs {assignmentDetails.awayTeam}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(assignmentDetails.date).toLocaleDateString()} at {assignmentDetails.time}
            </div>
          </div>

          {/* Decline Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Reason Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DECLINE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="reason">Additional Details (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Provide any additional context..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/500 characters
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Note:</strong> The assignor will be notified of your decline reason and may contact you for clarification.
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!category || isSubmitting}
          >
            {isSubmitting ? 'Declining...' : 'Confirm Decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

#### Task 2.5: Integrate Decline Dialog into My Assignments
**File:** `frontend/components/my-assignments.tsx`

**Changes Required:**
```typescript
// Add imports
import { DeclineAssignmentDialog } from '@/components/DeclineAssignmentDialog'

// Add state
const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
const [selectedAssignment, setSelectedAssignment] = useState<any>(null)

// Update handleAcceptDecline
const handleDecline = (assignment: any) => {
  setSelectedAssignment(assignment)
  setDeclineDialogOpen(true)
}

const handleConfirmDecline = async (reason: string, category: string) => {
  if (!selectedAssignment) return

  try {
    await api.updateAssignmentStatus(selectedAssignment.id, 'declined', {
      decline_reason: reason,
      decline_category: category
    })

    toast({
      title: 'Assignment declined',
      description: 'The assignor has been notified of your decision.'
    })

    // Refresh assignments
    fetchAssignments()
  } catch (error) {
    console.error('Failed to decline assignment:', error)
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to decline assignment.'
    })
  }
}

// Update decline button in UI
<Button
  size="mobile"
  variant="outline"
  onClick={() => handleDecline(assignment)} // Changed from handleAcceptDecline
  className="flex-1 text-red-600 border-red-600 hover:bg-red-50 active:bg-red-100"
>
  <XCircle className="h-4 w-4 mr-2" />
  Decline
</Button>

// Add dialog at end of component
<DeclineAssignmentDialog
  open={declineDialogOpen}
  onOpenChange={setDeclineDialogOpen}
  onConfirm={handleConfirmDecline}
  assignmentDetails={selectedAssignment ? {
    homeTeam: selectedAssignment.game?.homeTeam || 'Home',
    awayTeam: selectedAssignment.game?.awayTeam || 'Away',
    date: selectedAssignment.game?.date || '',
    time: selectedAssignment.game?.time || ''
  } : { homeTeam: '', awayTeam: '', date: '', time: '' }}
/>
```

---

#### Task 2.6: Update API Client
**File:** `frontend/lib/api.ts`

**Changes Required:**
```typescript
// Update updateAssignmentStatus method signature
async updateAssignmentStatus(
  assignmentId: string,
  status: 'accepted' | 'declined' | 'completed',
  options?: {
    decline_reason?: string
    decline_category?: string
  }
): Promise<{ success: boolean; data: any }> {
  const body: any = { status }

  if (status === 'declined' && options) {
    if (options.decline_reason) body.decline_reason = options.decline_reason
    if (options.decline_category) body.decline_category = options.decline_category
  }

  const response = await fetch(`${this.baseUrl}/assignments/${assignmentId}/status`, {
    method: 'PATCH',
    headers: this.getHeaders(),
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Failed to update assignment status: ${response.statusText}`)
  }

  return await response.json()
}
```

---

### Week 3: Testing & Refinement

#### Task 3.1: Comprehensive Testing
**Tests to Write:**

1. **Email Service Tests:** `backend/src/services/__tests__/emailService.test.ts`
2. **Assignment Service Tests:** `backend/src/services/__tests__/AssignmentService.test.ts`
3. **API Route Tests:** `backend/src/routes/__tests__/assignments.test.ts`
4. **Frontend Component Tests:** `frontend/components/__tests__/DeclineAssignmentDialog.test.tsx`

#### Task 3.2: Manual Testing Checklist
- [ ] Create assignment → Referee receives email
- [ ] Email has correct game details
- [ ] Email has accept/decline links
- [ ] Calendar attachment works
- [ ] Accept link updates status
- [ ] Decline opens dialog
- [ ] Decline saves reason to database
- [ ] Assignor receives acceptance notification
- [ ] Assignor receives decline notification with reason
- [ ] Email templates look good in Gmail
- [ ] Email templates look good in Outlook
- [ ] Mobile responsive email views

---

## Phase 2: SMS Notifications (Weeks 4-5)

**Priority:** HIGH
**Goal:** Enable SMS notifications for critical events
**Estimated Effort:** 2 weeks

### Week 4: SMS Service Implementation

#### Task 4.1: Install and Configure Twilio
**Environment Setup:**
```bash
npm install twilio
```

**Environment Variables (.env):**
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

#### Task 4.2: Create SMS Service
**File:** `backend/src/services/smsService.ts` (NEW FILE)

**Implementation:**
```typescript
import Twilio from 'twilio';

export interface AssignmentSMSData {
  phoneNumber: string;
  firstName: string;
  game: {
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
  };
  dashboardLink: string;
}

export interface ReminderSMSData {
  phoneNumber: string;
  firstName: string;
  game: {
    homeTeam: string;
    awayTeam: string;
    time: string;
    location: string;
  };
  hoursUntilGame: number;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logged?: boolean;
}

export class SMSService {
  private client: Twilio.Twilio | null = null;
  private isConfigured: boolean = false;
  private fromNumber: string = '';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';

    if (accountSid && authToken && this.fromNumber) {
      this.client = Twilio(accountSid, authToken);
      this.isConfigured = true;
      console.log('✅ SMS Service initialized with Twilio');
    } else {
      console.warn('⚠️ TWILIO credentials not set - SMS functionality will be disabled');
      this.isConfigured = false;
    }
  }

  /**
   * Send assignment notification SMS
   */
  async sendAssignmentSMS(data: AssignmentSMSData): Promise<SMSResult> {
    try {
      if (!this.isConfigured || !this.client) {
        console.log('SMS service not configured - assignment SMS logged:');
        console.log(`To: ${data.phoneNumber}`);
        console.log(`Message: New game assigned: ${data.game.homeTeam} vs ${data.game.awayTeam} on ${new Date(data.game.date).toLocaleDateString()} at ${data.game.time}`);
        return {
          success: true,
          logged: true
        };
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(data.phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      const message = this.formatAssignmentSMS(data);

      const result = await this.client.messages.create({
        to: data.phoneNumber,
        from: this.fromNumber,
        body: message
      });

      console.log(`✅ Assignment SMS sent to ${data.phoneNumber}: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid
      };

    } catch (error: any) {
      console.error('Failed to send assignment SMS:', error);
      return {
        success: false,
        error: error.message,
        logged: true
      };
    }
  }

  /**
   * Send game reminder SMS
   */
  async sendReminderSMS(data: ReminderSMSData): Promise<SMSResult> {
    try {
      if (!this.isConfigured || !this.client) {
        console.log('SMS service not configured - reminder SMS logged');
        return { success: true, logged: true };
      }

      if (!this.isValidPhoneNumber(data.phoneNumber)) {
        return { success: false, error: 'Invalid phone number format' };
      }

      const message = this.formatReminderSMS(data);

      const result = await this.client.messages.create({
        to: data.phoneNumber,
        from: this.fromNumber,
        body: message
      });

      console.log(`✅ Reminder SMS sent to ${data.phoneNumber}: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid
      };

    } catch (error: any) {
      console.error('Failed to send reminder SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format assignment notification SMS
   */
  private formatAssignmentSMS(data: AssignmentSMSData): string {
    const gameDate = new Date(data.game.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return `Hi ${data.firstName}, you've been assigned: ${data.game.homeTeam} vs ${data.game.awayTeam} on ${gameDate} at ${data.game.time}. Check your email or visit ${data.dashboardLink} to respond.`;
  }

  /**
   * Format reminder SMS
   */
  private formatReminderSMS(data: ReminderSMSData): string {
    return `⚽ Game Reminder: ${data.game.homeTeam} vs ${data.game.awayTeam} in ${data.hoursUntilGame} hours at ${data.game.time}. Location: ${data.game.location}`;
  }

  /**
   * Validate phone number format (E.164)
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164
   */
  static formatPhoneNumber(phoneNumber: string, countryCode: string = '+1'): string {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If already starts with country code, return with +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }

    // If 10 digits, add country code
    if (cleaned.length === 10) {
      return countryCode + cleaned;
    }

    // Return as-is if already formatted
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }

    return phoneNumber;
  }
}

export default new SMSService();
```

---

#### Task 4.3: Integrate SMS into Assignment Creation
**File:** `backend/src/services/AssignmentService.ts`

**Add after email notification code:**
```typescript
import smsService from './smsService';

// In createAssignment(), after email notification:

// Send SMS notification (if referee has phone number)
if (referee.phone) {
  try {
    const formattedPhone = SMSService.formatPhoneNumber(referee.phone);
    await smsService.sendAssignmentSMS({
      phoneNumber: formattedPhone,
      firstName: referee.first_name || referee.name?.split(' ')[0] || 'Referee',
      game: {
        homeTeam: game.home_team_name || 'Home Team',
        awayTeam: game.away_team_name || 'Away Team',
        date: game.date_time,
        time: new Date(game.date_time).toTimeString().slice(0, 5)
      },
      dashboardLink: `${baseUrl}/assignments`
    });
    console.log(`✅ Assignment SMS sent to ${referee.phone}`);
  } catch (smsError) {
    console.error('Failed to send assignment SMS:', smsError);
    // Don't fail assignment if SMS fails
  }
}
```

---

### Week 5: Game Reminders & SMS Preferences

#### Task 5.1: Create Reminder Job Scheduler
**File:** `backend/src/services/reminderScheduler.ts` (NEW FILE)

**Install Dependencies:**
```bash
npm install node-cron
```

**Implementation:**
```typescript
import cron from 'node-cron';
import db from '../config/database';
import emailService from './emailService';
import smsService from './smsService';

export class ReminderScheduler {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start the reminder scheduler
   * Runs every hour to check for upcoming games
   */
  start() {
    // Run every hour at :00 minutes
    const task = cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running game reminder check...');
      await this.sendReminders();
    });

    this.scheduledJobs.set('hourly-reminders', task);
    console.log('✅ Reminder scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.scheduledJobs.forEach((task, name) => {
      task.stop();
      console.log(`Stopped scheduler: ${name}`);
    });
    this.scheduledJobs.clear();
  }

  /**
   * Send reminders for upcoming games
   */
  private async sendReminders() {
    try {
      // Get accepted assignments for games in the next 2-3 hours
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

      const upcomingAssignments = await db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .join('users', 'game_assignments.user_id', 'users.id')
        .leftJoin('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .leftJoin('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .select(
          'game_assignments.*',
          'users.email',
          'users.name',
          'users.phone',
          'games.date_time',
          'games.field as location',
          'home_teams.name as home_team_name',
          'away_teams.name as away_team_name'
        )
        .where('game_assignments.status', 'accepted')
        .whereBetween('games.date_time', [twoHoursFromNow, threeHoursFromNow])
        .whereNull('game_assignments.reminder_sent_at'); // Only send once

      console.log(`Found ${upcomingAssignments.length} games needing reminders`);

      for (const assignment of upcomingAssignments) {
        await this.sendGameReminder(assignment);
      }

    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }

  /**
   * Send reminder for a single game
   */
  private async sendGameReminder(assignment: any) {
    try {
      const gameTime = new Date(assignment.date_time);
      const now = new Date();
      const hoursUntil = Math.round((gameTime.getTime() - now.getTime()) / (1000 * 60 * 60));

      // Send SMS reminder
      if (assignment.phone) {
        await smsService.sendReminderSMS({
          phoneNumber: assignment.phone,
          firstName: assignment.name?.split(' ')[0] || 'Referee',
          game: {
            homeTeam: assignment.home_team_name,
            awayTeam: assignment.away_team_name,
            time: gameTime.toTimeString().slice(0, 5),
            location: assignment.location
          },
          hoursUntilGame: hoursUntil
        });
      }

      // Mark reminder as sent
      await db('game_assignments')
        .where('id', assignment.id)
        .update({ reminder_sent_at: new Date() });

      console.log(`✅ Reminder sent for assignment ${assignment.id}`);

    } catch (error) {
      console.error(`Failed to send reminder for assignment ${assignment.id}:`, error);
    }
  }
}

export default new ReminderScheduler();
```

**Add column for tracking:**
```sql
-- Migration: XXX_add_reminder_sent_at.js
exports.up = function(knex) {
  return knex.schema.table('game_assignments', function(table) {
    table.timestamp('reminder_sent_at').nullable();
  });
};
```

---

#### Task 5.2: Start Scheduler in Server
**File:** `backend/src/server.ts`

**Add at startup:**
```typescript
import reminderScheduler from './services/reminderScheduler';

// After app.listen()
reminderScheduler.start();

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  reminderScheduler.stop();
  process.exit(0);
});
```

---

## Phase 3: In-App Notifications (Weeks 6-8)

**Priority:** MEDIUM
**Goal:** Build complete in-app notification system with real-time updates
**Estimated Effort:** 3 weeks

### Week 6: Database & Backend API

#### Task 6.1: Database Schema for Notifications
**File:** `backend/migrations/XXX_create_notifications.js`

```javascript
exports.up = function(knex) {
  return knex.schema
    .createTable('notifications', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('type', 50).notNullable(); // 'assignment', 'status_change', 'reminder', 'system'
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.string('link', 500).nullable();
      table.jsonb('metadata').nullable(); // Additional data (game_id, assignment_id, etc.)
      table.boolean('is_read').defaultTo(false);
      table.timestamp('read_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['user_id', 'is_read']);
      table.index(['user_id', 'created_at']);
      table.index('type');
    })
    .createTable('notification_preferences', function(table) {
      table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
      table.boolean('email_assignments').defaultTo(true);
      table.boolean('email_reminders').defaultTo(true);
      table.boolean('email_status_changes').defaultTo(true);
      table.boolean('sms_assignments').defaultTo(true);
      table.boolean('sms_reminders').defaultTo(true);
      table.boolean('in_app_enabled').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('notification_preferences')
    .dropTable('notifications');
};
```

---

#### Task 6.2: Create Notification Service
**File:** `backend/src/services/NotificationService.ts` (NEW FILE)

```typescript
import { BaseService } from './BaseService';
import { Database, UUID } from '../types';
import db from '../config/database';

export interface NotificationEntity {
  id: UUID;
  user_id: UUID;
  type: 'assignment' | 'status_change' | 'reminder' | 'system';
  title: string;
  message: string;
  link?: string;
  metadata?: any;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
}

export interface CreateNotificationData {
  user_id: UUID;
  type: NotificationEntity['type'];
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

export class NotificationService extends BaseService<NotificationEntity> {
  constructor(database: Database) {
    super('notifications', database);
  }

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<NotificationEntity> {
    // Check if user has in-app notifications enabled
    const prefs = await db('notification_preferences')
      .where('user_id', data.user_id)
      .first();

    if (prefs && !prefs.in_app_enabled) {
      console.log(`In-app notifications disabled for user ${data.user_id}`);
      return null as any;
    }

    const notification = await this.create(data);
    console.log(`✅ Notification created for user ${data.user_id}: ${data.title}`);

    // Emit WebSocket event (implement in Phase 3)
    // this.emitNotificationEvent(notification);

    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: UUID,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ notifications: NotificationEntity[]; unreadCount: number }> {
    const { unreadOnly = false, limit = 20, offset = 0 } = options;

    let query = db('notifications').where('user_id', userId);

    if (unreadOnly) {
      query = query.where('is_read', false);
    }

    const notifications = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count: unreadCount }] = await db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as count');

    return {
      notifications,
      unreadCount: parseInt(unreadCount as any)
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: UUID): Promise<void> {
    await db('notifications')
      .where('id', notificationId)
      .update({
        is_read: true,
        read_at: new Date()
      });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: UUID): Promise<number> {
    const updated = await db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date()
      });

    return updated;
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await db('notifications')
      .where('created_at', '<', cutoffDate)
      .where('is_read', true)
      .delete();

    console.log(`🗑️ Deleted ${deleted} old notifications`);
    return deleted;
  }
}

export default new NotificationService(db);
```

---

#### Task 6.3: Create Notification API Routes
**File:** `backend/src/routes/notifications.ts` (NEW FILE)

```typescript
import express, { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
const { authenticateToken } = require('../middleware/auth');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { ResponseFormatter } = require('../utils/response-formatters');
import notificationService from '../services/NotificationService';

const router = express.Router();

/**
 * GET /api/notifications - Get user's notifications
 */
const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = req.user!.id;
  const unreadOnly = (req.query.unread_only as string) === 'true';
  const limit = parseInt((req.query.limit as string) || '20');
  const offset = parseInt((req.query.offset as string) || '0');

  const result = await notificationService.getUserNotifications(userId, {
    unreadOnly,
    limit,
    offset
  });

  return ResponseFormatter.sendSuccess(res, result);
};

/**
 * GET /api/notifications/unread-count - Get unread count only
 */
const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = req.user!.id;

  const result = await notificationService.getUserNotifications(userId, {
    unreadOnly: true,
    limit: 0
  });

  return ResponseFormatter.sendSuccess(res, {
    unreadCount: result.unreadCount
  });
};

/**
 * PATCH /api/notifications/:id/read - Mark as read
 */
const markAsRead = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<Response> => {
  await notificationService.markAsRead(req.params.id);
  return ResponseFormatter.sendSuccess(res, { success: true });
};

/**
 * PATCH /api/notifications/mark-all-read - Mark all as read
 */
const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = req.user!.id;
  const count = await notificationService.markAllAsRead(userId);

  return ResponseFormatter.sendSuccess(res, {
    markedAsRead: count
  });
};

// Routes
router.get('/', authenticateToken, enhancedAsyncHandler(getNotifications));
router.get('/unread-count', authenticateToken, enhancedAsyncHandler(getUnreadCount));
router.patch('/:id/read', authenticateToken, enhancedAsyncHandler(markAsRead));
router.patch('/mark-all-read', authenticateToken, enhancedAsyncHandler(markAllAsRead));

export default router;
```

**Register in server:**
```typescript
// backend/src/server.ts
import notificationRoutes from './routes/notifications';
app.use('/api/notifications', notificationRoutes);
```

---

### Week 7: Frontend Components

#### Task 7.1: Notification Bell Component
**File:** `frontend/components/NotificationBell.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useApi } from '@/lib/api'
import { NotificationList } from './NotificationList'

export function NotificationBell() {
  const api = useApi()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Poll for unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const response = await api.getNotificationUnreadCount()
      setUnreadCount(response.data.unreadCount)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationList
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
```

---

#### Task 7.2: Notification List Component
**File:** `frontend/components/NotificationList.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { CheckCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

interface NotificationListProps {
  onMarkAllRead: () => void
  onClose: () => void
}

export function NotificationList({ onMarkAllRead, onClose }: NotificationListProps) {
  const api = useApi()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await api.getNotifications({ limit: 10 })
      setNotifications(response.data.notifications)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await api.markNotificationRead(notification.id)
    }

    if (notification.link) {
      router.push(notification.link)
    }

    onClose()
  }

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAllRead}
          className="text-xs"
        >
          <CheckCheck className="h-4 w-4 mr-1" />
          Mark all read
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                !notification.is_read ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="ml-2 h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
```

---

### Week 8: Integration & Real-time Updates

#### Task 8.1: Integrate Notifications into Assignment Flow
**File:** `backend/src/services/AssignmentService.ts`

**Add notification creation:**
```typescript
import notificationService from './NotificationService';

// In createAssignment(), after creating assignment:
await notificationService.createNotification({
  user_id: user_id,
  type: 'assignment',
  title: 'New Game Assignment',
  message: `You've been assigned to ${game.home_team_name} vs ${game.away_team_name} on ${new Date(game.date_time).toLocaleDateString()}`,
  link: `/assignments/${assignment.id}`,
  metadata: {
    game_id: game_id,
    assignment_id: assignment.id
  }
});

// In updateAssignmentStatus(), when referee accepts/declines:
if (status === 'accepted' || status === 'declined') {
  // Notify assignor
  if (assignmentDetails.assigned_by) {
    await notificationService.createNotification({
      user_id: assignmentDetails.assigned_by,
      type: 'status_change',
      title: `Assignment ${status}`,
      message: `${referee.name} ${status} the assignment for ${game.home_team_name} vs ${game.away_team_name}`,
      link: `/games/${assignmentDetails.game_id}`,
      metadata: {
        game_id: assignmentDetails.game_id,
        assignment_id: assignmentDetails.id,
        status
      }
    });
  }
}
```

---

#### Task 8.2: Add Notification Bell to Header
**File:** `frontend/components/Header.tsx` or appropriate layout

```typescript
import { NotificationBell } from '@/components/NotificationBell'

// In header component:
<div className="flex items-center gap-4">
  <NotificationBell />
  {/* other header items */}
</div>
```

---

## Phase 4: Enhancements & Analytics (Weeks 9-10)

**Priority:** LOW
**Goal:** Polish and analytics
**Estimated Effort:** 2 weeks

### Week 9: Calendar Integration & Polish

1. **Calendar Link Generation**
2. **Google Calendar Integration**
3. **Outlook Calendar Integration**
4. **UI/UX Polish**
5. **Error Handling Improvements**

### Week 10: Analytics & Monitoring

1. **Referee Response Time Tracking**
2. **Decline Reason Analytics Dashboard**
3. **Email/SMS Delivery Monitoring**
4. **Notification Performance Metrics**

---

## Testing Strategy

### Unit Tests (Per Phase)
- Email service methods
- SMS service methods
- Notification service methods
- API endpoint handlers
- Frontend components

### Integration Tests
- Full assignment workflow with notifications
- Email delivery end-to-end
- SMS delivery end-to-end
- Notification creation and retrieval

### E2E Tests (Playwright/Cypress)
- Create assignment → receive email/SMS
- Accept assignment → assignor notified
- Decline with reason → reason saved and displayed
- In-app notification workflow

---

## Deployment Checklist

### Environment Variables
```
# Email (Resend)
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM_NUMBER=+1234567890

# App URLs
FRONTEND_URL=https://app.sportsmanager.com
BACKEND_URL=https://api.sportsmanager.com

# JWT
JWT_SECRET=your-secret-key
```

### Database Migrations
```bash
# Run all migrations
npm run migrate:latest

# Verify tables created
psql -d sports_management -c "\dt"
```

### Service Monitoring
- [ ] Email delivery rate monitoring
- [ ] SMS delivery rate monitoring
- [ ] Notification queue monitoring
- [ ] Error rate alerts
- [ ] Cost monitoring (Resend + Twilio)

---

## Success Metrics

Track after implementation:

1. **Response Time**
   - Time from assignment to referee response
   - Target: < 4 hours average

2. **Acceptance Rate**
   - Percentage of assignments accepted
   - Target: > 80%

3. **Notification Delivery**
   - Email delivery rate: > 98%
   - SMS delivery rate: > 95%
   - In-app notification creation: 100%

4. **User Satisfaction**
   - Survey after implementation
   - Target NPS: > 8/10

5. **Decline Insights**
   - Track most common decline reasons
   - Identify systemic issues (travel distance, timing, etc.)

---

## Risk Mitigation

### Risks & Mitigation

1. **Email Deliverability**
   - Risk: Emails marked as spam
   - Mitigation: Use authenticated domain, implement SPF/DKIM/DMARC

2. **SMS Costs**
   - Risk: Unexpected high costs
   - Mitigation: Rate limiting, daily caps, user preferences

3. **Notification Overload**
   - Risk: Users overwhelmed by notifications
   - Mitigation: Granular preferences, digest options

4. **Performance**
   - Risk: Slow notification sending
   - Mitigation: Queue system (Bull + Redis)

---

## Budget

### Monthly Costs (Estimated)

| Service | Free Tier | Paid Tier | Estimated Cost |
|---------|-----------|-----------|----------------|
| Resend | 3,000 emails/month | $0.001/email | $10-30/month |
| Twilio | None | $0.0075/SMS | $15-45/month |
| Redis | Hosting | - | $10-20/month |
| Total | - | - | **$35-95/month** |

---

## Next Steps

1. **Review this plan** with team
2. **Set up development environment** (Resend, Twilio accounts)
3. **Create sprint tickets** from tasks
4. **Assign ownership** for each phase
5. **Schedule kickoff** for Phase 1
6. **Set up monitoring** and alerting

---

**Document Version:** 1.0
**Last Updated:** 2025-09-30
**Next Review:** After Phase 1 completion

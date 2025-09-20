/**
 * Bridge file for MentorshipService - Provides backward compatibility
 *
 * This file allows existing JavaScript code to continue using MentorshipService
 * while the implementation has been migrated to TypeScript.
 */

const MentorshipService = require('./MentorshipService.ts').default;

module.exports = MentorshipService;
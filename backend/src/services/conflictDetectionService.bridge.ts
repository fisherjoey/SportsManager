// @ts-nocheck

/**
 * JavaScript bridge for ConflictDetectionService
 *
 * This file provides backward compatibility for existing JavaScript code
 * that imports the conflict detection service. It re-exports all functions
 * from the TypeScript implementation.
 */

import conflictDetectionService from './conflictDetectionService';

export {
  checkRefereeDoubleBooking: conflictDetectionService.checkRefereeDoubleBooking,
  checkVenueConflict: conflictDetectionService.checkVenueConflict,
  validateRefereeQualifications: conflictDetectionService.validateRefereeQualifications,
  checkAssignmentConflicts: conflictDetectionService.checkAssignmentConflicts,
  checkGameSchedulingConflicts: conflictDetectionService.checkGameSchedulingConflicts,
  calculateEndTime: conflictDetectionService.calculateEndTime,
  addMinutes: conflictDetectionService.addMinutes,
  subtractMinutes: conflictDetectionService.subtractMinutes,
  checkTravelTimeConflict: conflictDetectionService.checkTravelTimeConflict,
  getMinutesBetween: conflictDetectionService.getMinutesBetween
};
// @ts-nocheck

/**
 * JavaScript bridge for ConflictDetectionService
 *
 * This file provides backward compatibility for existing JavaScript code
 * that imports the conflict detection service. It re-exports all functions
 * from the TypeScript implementation.
 */

import conflictDetectionService from './conflictDetectionService';

export const checkRefereeDoubleBooking = conflictDetectionService.checkRefereeDoubleBooking;
export const checkVenueConflict = conflictDetectionService.checkVenueConflict;
export const validateRefereeQualifications = conflictDetectionService.validateRefereeQualifications;
export const checkAssignmentConflicts = conflictDetectionService.checkAssignmentConflicts;
export const checkGameSchedulingConflicts = conflictDetectionService.checkGameSchedulingConflicts;
export const calculateEndTime = conflictDetectionService.calculateEndTime;
export const addMinutes = conflictDetectionService.addMinutes;
export const subtractMinutes = conflictDetectionService.subtractMinutes;
export const checkTravelTimeConflict = conflictDetectionService.checkTravelTimeConflict;
export const getMinutesBetween = conflictDetectionService.getMinutesBetween;
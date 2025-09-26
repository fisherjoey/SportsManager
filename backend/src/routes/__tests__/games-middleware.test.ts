/**
 * Smoke tests to verify games routes have Cerbos middleware attached
 * These don't require a running database or Cerbos instance
 */

import express, { Router } from 'express';

describe('Games Routes - Middleware Setup', () => {
  let gamesRouter: Router;

  beforeAll(() => {
    jest.mock('../../middleware/requireCerbosPermission', () => ({
      requireCerbosPermission: jest.fn(() => (req: any, res: any, next: any) => next()),
    }));

    jest.mock('../../middleware/cerbos-migration-helpers', () => ({
      getGameResourceAttributes: jest.fn().mockResolvedValue({
        organizationId: 'org-1',
        regionId: 'region-1',
        createdBy: 'user-1',
        status: 'scheduled',
      }),
    }));

    jest.mock('../../config/database', () => ({
      default: jest.fn(),
    }));
  });

  it('should have all expected routes defined', () => {
    const { requireCerbosPermission } = require('../../middleware/requireCerbosPermission');
    const mockCalls = (requireCerbosPermission as jest.Mock).mock.calls;

    // We expect 7 calls to requireCerbosPermission (one for each route)
    expect(mockCalls.length).toBeGreaterThanOrEqual(7);
  });

  it('should use correct resource type for all routes', () => {
    const { requireCerbosPermission } = require('../../middleware/requireCerbosPermission');
    const mockCalls = (requireCerbosPermission as jest.Mock).mock.calls;

    // All calls should use resource: 'game'
    mockCalls.forEach((call: any) => {
      const options = call[0];
      expect(options.resource).toBe('game');
    });
  });

  it('should use correct actions', () => {
    const { requireCerbosPermission } = require('../../middleware/requireCerbosPermission');
    const mockCalls = (requireCerbosPermission as jest.Mock).mock.calls;

    const actions = mockCalls.map((call: any) => call[0].action);

    // Should have list, view, create, update, delete actions
    expect(actions).toContain('list');
    expect(actions).toContain('view');
    expect(actions).toContain('create');
    expect(actions).toContain('update');
    expect(actions).toContain('delete');
  });

  it('should fetch resource attributes for specific game routes', () => {
    const { requireCerbosPermission } = require('../../middleware/requireCerbosPermission');
    const mockCalls = (requireCerbosPermission as jest.Mock).mock.calls;

    // Find routes that should fetch attributes (view, update, delete)
    const routesWithAttributes = mockCalls.filter((call: any) => {
      const options = call[0];
      return options.getResourceAttributes !== undefined;
    });

    // Should have at least 4 routes with resource attributes
    // (GET /:id, PUT /:id, PATCH /:id/status, DELETE /:id)
    expect(routesWithAttributes.length).toBeGreaterThanOrEqual(4);
  });

  it('should have custom error message for delete route', () => {
    const { requireCerbosPermission } = require('../../middleware/requireCerbosPermission');
    const mockCalls = (requireCerbosPermission as jest.Mock).mock.calls;

    // Find delete action
    const deleteRoute = mockCalls.find((call: any) => {
      const options = call[0];
      return options.action === 'delete';
    });

    expect(deleteRoute).toBeDefined();
    expect(deleteRoute[0].forbiddenMessage).toBe('You do not have permission to delete this game');
  });
});
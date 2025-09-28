/**
 * Admin Permissions Routes
 * Provides endpoints for managing permissions in the system
 */

import express, { Request, Response, NextFunction } from 'express'
import { authenticateToken } from '../../middleware/auth'
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission'

const router = express.Router()

// Define available permissions categorized by resource
const PERMISSIONS_BY_CATEGORY = {
  'User Management': [
    { id: 'user:view', name: 'View Users', description: 'View user information' },
    { id: 'user:view:list', name: 'View User List', description: 'View list of all users' },
    { id: 'user:view:details', name: 'View User Details', description: 'View detailed user information' },
    { id: 'user:create', name: 'Create Users', description: 'Create new users' },
    { id: 'user:update', name: 'Update Users', description: 'Update user information' },
    { id: 'user:delete', name: 'Delete Users', description: 'Delete users from the system' },
    { id: 'user:view:roles', name: 'View User Roles', description: 'View roles assigned to users' },
    { id: 'user:manage', name: 'Manage Users', description: 'Full user management permissions' },
  ],
  'Role Management': [
    { id: 'role:view', name: 'View Roles', description: 'View role information' },
    { id: 'role:view:list', name: 'View Role List', description: 'View list of all roles' },
    { id: 'role:view:details', name: 'View Role Details', description: 'View detailed role information' },
    { id: 'role:create', name: 'Create Roles', description: 'Create new roles' },
    { id: 'role:update', name: 'Update Roles', description: 'Update role information' },
    { id: 'role:delete', name: 'Delete Roles', description: 'Delete roles from the system' },
    { id: 'role:manage_permissions', name: 'Manage Role Permissions', description: 'Assign and remove permissions from roles' },
    { id: 'role:manage_users', name: 'Manage Role Users', description: 'Assign and remove users from roles' },
    { id: 'role:manage', name: 'Manage Roles', description: 'Full role management permissions' },
  ],
  'Game Management': [
    { id: 'game:view', name: 'View Games', description: 'View game information' },
    { id: 'game:view:list', name: 'View Game List', description: 'View list of all games' },
    { id: 'game:view:details', name: 'View Game Details', description: 'View detailed game information' },
    { id: 'game:create', name: 'Create Games', description: 'Create new games' },
    { id: 'game:update', name: 'Update Games', description: 'Update game information' },
    { id: 'game:delete', name: 'Delete Games', description: 'Delete games from the system' },
    { id: 'game:manage', name: 'Manage Games', description: 'Full game management permissions' },
  ],
  'Assignment Management': [
    { id: 'assignment:view', name: 'View Assignments', description: 'View assignment information' },
    { id: 'assignment:view:list', name: 'View Assignment List', description: 'View list of all assignments' },
    { id: 'assignment:view:details', name: 'View Assignment Details', description: 'View detailed assignment information' },
    { id: 'assignment:create', name: 'Create Assignments', description: 'Create new assignments' },
    { id: 'assignment:update', name: 'Update Assignments', description: 'Update assignment information' },
    { id: 'assignment:delete', name: 'Delete Assignments', description: 'Delete assignments' },
    { id: 'assignment:self', name: 'Self-Assign', description: 'Self-assign to games' },
    { id: 'assignment:manage', name: 'Manage Assignments', description: 'Full assignment management permissions' },
  ],
  'Referee Management': [
    { id: 'referee:view', name: 'View Referees', description: 'View referee information' },
    { id: 'referee:view:list', name: 'View Referee List', description: 'View list of all referees' },
    { id: 'referee:view:details', name: 'View Referee Details', description: 'View detailed referee information' },
    { id: 'referee:create', name: 'Create Referees', description: 'Create new referee profiles' },
    { id: 'referee:update', name: 'Update Referees', description: 'Update referee information' },
    { id: 'referee:delete', name: 'Delete Referees', description: 'Delete referee profiles' },
    { id: 'referee:evaluate', name: 'Evaluate Referees', description: 'Submit referee evaluations' },
    { id: 'referee:manage', name: 'Manage Referees', description: 'Full referee management permissions' },
  ],
  'Team Management': [
    { id: 'team:view', name: 'View Teams', description: 'View team information' },
    { id: 'team:view:list', name: 'View Team List', description: 'View list of all teams' },
    { id: 'team:view:details', name: 'View Team Details', description: 'View detailed team information' },
    { id: 'team:create', name: 'Create Teams', description: 'Create new teams' },
    { id: 'team:update', name: 'Update Teams', description: 'Update team information' },
    { id: 'team:delete', name: 'Delete Teams', description: 'Delete teams' },
    { id: 'team:manage', name: 'Manage Teams', description: 'Full team management permissions' },
  ],
  'League Management': [
    { id: 'league:view', name: 'View Leagues', description: 'View league information' },
    { id: 'league:view:list', name: 'View League List', description: 'View list of all leagues' },
    { id: 'league:view:details', name: 'View League Details', description: 'View detailed league information' },
    { id: 'league:create', name: 'Create Leagues', description: 'Create new leagues' },
    { id: 'league:update', name: 'Update Leagues', description: 'Update league information' },
    { id: 'league:delete', name: 'Delete Leagues', description: 'Delete leagues' },
    { id: 'league:manage', name: 'Manage Leagues', description: 'Full league management permissions' },
  ],
  'Financial Management': [
    { id: 'financial:view', name: 'View Financial Data', description: 'View financial information' },
    { id: 'financial:create', name: 'Create Financial Records', description: 'Create financial records' },
    { id: 'financial:update', name: 'Update Financial Records', description: 'Update financial information' },
    { id: 'financial:delete', name: 'Delete Financial Records', description: 'Delete financial records' },
    { id: 'financial:approve', name: 'Approve Financial Transactions', description: 'Approve financial transactions' },
    { id: 'financial:manage', name: 'Manage Finances', description: 'Full financial management permissions' },
    { id: 'expense:view', name: 'View Expenses', description: 'View expense records' },
    { id: 'expense:create', name: 'Create Expenses', description: 'Create expense records' },
    { id: 'expense:approve', name: 'Approve Expenses', description: 'Approve expense requests' },
    { id: 'budget:view', name: 'View Budgets', description: 'View budget information' },
    { id: 'budget:manage', name: 'Manage Budgets', description: 'Create and manage budgets' },
  ],
  'Organization Management': [
    { id: 'organization:view', name: 'View Organization', description: 'View organization information' },
    { id: 'organization:update', name: 'Update Organization', description: 'Update organization settings' },
    { id: 'organization:manage', name: 'Manage Organization', description: 'Full organization management' },
    { id: 'organization:view:analytics', name: 'View Analytics', description: 'View organizational analytics' },
    { id: 'employee:view', name: 'View Employees', description: 'View employee information' },
    { id: 'employee:create', name: 'Create Employees', description: 'Create employee records' },
    { id: 'employee:update', name: 'Update Employees', description: 'Update employee information' },
    { id: 'employee:delete', name: 'Delete Employees', description: 'Delete employee records' },
    { id: 'employee:manage', name: 'Manage Employees', description: 'Full employee management' },
  ],
  'System Administration': [
    { id: 'system:admin', name: 'System Admin', description: 'Full system administration access' },
    { id: 'system:manage', name: 'System Management', description: 'Manage system settings' },
    { id: 'system:view:logs', name: 'View System Logs', description: 'View system log files' },
    { id: 'system:view:audit', name: 'View Audit Logs', description: 'View audit trail logs' },
    { id: 'cerbos_policy:view', name: 'View Cerbos Policies', description: 'View Cerbos authorization policies' },
    { id: 'cerbos_policy:manage', name: 'Manage Cerbos Policies', description: 'Create and update Cerbos policies' },
    { id: 'maintenance:execute', name: 'Execute Maintenance', description: 'Run system maintenance tasks' },
  ],
}

// Flatten permissions for easier access
const ALL_PERMISSIONS = Object.values(PERMISSIONS_BY_CATEGORY).flat()

/**
 * GET /api/admin/permissions - Get all available permissions
 */
router.get('/', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view',
}), async (req: Request, res: Response): Promise<void> => {
  try {
    // Calculate statistics
    const statistics = {
      total: ALL_PERMISSIONS.length,
      categories: Object.keys(PERMISSIONS_BY_CATEGORY).length,
    }

    res.json({
      success: true,
      data: {
        permissions: PERMISSIONS_BY_CATEGORY,
        statistics,
        categories: Object.keys(PERMISSIONS_BY_CATEGORY),
      },
      message: 'Permissions retrieved successfully'
    })
  } catch (error) {
    console.error('Error retrieving permissions:', error)
    res.status(500).json({
      error: 'Failed to retrieve permissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/admin/permissions/flat - Get all permissions as a flat list
 */
router.get('/flat', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view',
}), async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        permissions: ALL_PERMISSIONS,
        total: ALL_PERMISSIONS.length,
      },
      message: 'Permissions retrieved successfully'
    })
  } catch (error) {
    console.error('Error retrieving permissions:', error)
    res.status(500).json({
      error: 'Failed to retrieve permissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/admin/permissions/category/:category - Get permissions by category
 */
router.get('/category/:category', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view',
}), async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params
    const permissions = PERMISSIONS_BY_CATEGORY[category as keyof typeof PERMISSIONS_BY_CATEGORY]

    if (!permissions) {
      res.status(404).json({
        error: 'Category not found',
        details: `Permission category "${category}" does not exist`
      })
      return
    }

    res.json({
      success: true,
      data: {
        category,
        permissions,
        count: permissions.length,
      },
      message: 'Permissions retrieved successfully'
    })
  } catch (error) {
    console.error('Error retrieving permissions by category:', error)
    res.status(500).json({
      error: 'Failed to retrieve permissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/admin/permissions/categories - Get all permission categories
 */
router.get('/categories', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view',
}), async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = Object.keys(PERMISSIONS_BY_CATEGORY).map(category => ({
      name: category,
      count: PERMISSIONS_BY_CATEGORY[category as keyof typeof PERMISSIONS_BY_CATEGORY].length,
    }))

    res.json({
      success: true,
      data: {
        categories,
        total: categories.length,
      },
      message: 'Permission categories retrieved successfully'
    })
  } catch (error) {
    console.error('Error retrieving permission categories:', error)
    res.status(500).json({
      error: 'Failed to retrieve permission categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
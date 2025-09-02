/**
 * @fileoverview RBAC Registry Routes
 * 
 * API endpoints for managing the automated RBAC registry system.
 * Handles scanning, registration, and configuration of permissions.
 */

const express = require('express')
const router = express.Router()
const RBACRegistryService = require('../../services/RBACRegistryService')
const { requirePermissions } = require('../../middleware/permissionCheck')
const logger = require('../../utils/logger')

// Initialize the registry service
let registryService = null

const initRegistryService = (req) => {
  if (!registryService) {
    registryService = new RBACRegistryService(req.db)
  }
  return registryService
}

/**
 * GET /api/admin/rbac-registry/scan
 * Perform automated scan of the codebase
 */
router.get('/scan', requirePermissions(['roles:manage']), async (req, res) => {
  try {
    logger.info('🔍 Starting RBAC registry scan via API...')
    
    const service = initRegistryService(req)
    const result = await service.performAutomatedScan()
    
    if (result.success) {
      res.json({
        success: true,
        message: 'RBAC scan completed successfully',
        data: result.data
      })
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      })
    }
  } catch (error) {
    logger.error('Failed to perform RBAC scan:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to perform RBAC scan',
      error: error.message
    })
  }
})

/**
 * GET /api/admin/rbac-registry/unconfigured
 * Get all unconfigured items that need admin attention
 */
router.get('/unconfigured', requirePermissions(['roles:read']), async (req, res) => {
  try {
    const service = initRegistryService(req)
    const unconfigured = await service.getUnconfiguredItems()
    
    res.json({
      success: true,
      data: unconfigured
    })
  } catch (error) {
    logger.error('Failed to get unconfigured items:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get unconfigured items',
      error: error.message
    })
  }
})

/**
 * GET /api/admin/rbac-registry/stats
 * Get registry statistics and overview
 */
router.get('/stats', requirePermissions(['roles:read']), async (req, res) => {
  try {
    const service = initRegistryService(req)
    const stats = await service.getRegistryStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Failed to get registry stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get registry stats',
      error: error.message
    })
  }
})

/**
 * POST /api/admin/rbac-registry/configure
 * Configure permissions for discovered items
 */
router.post('/configure', requirePermissions(['roles:manage']), async (req, res) => {
  try {
    const { type, items } = req.body
    
    if (!type || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. Expected type and items array.'
      })
    }

    const service = initRegistryService(req)
    const results = []
    
    // Process each item
    for (const item of items) {
      try {
        // Mark as configured
        let identifier
        switch (type) {
          case 'page':
            identifier = item.page_path
            break
          case 'endpoint':
            identifier = `${item.method} ${item.endpoint_path}`
            break
          case 'function':
            identifier = item.function_name
            break
          default:
            throw new Error(`Unknown type: ${type}`)
        }
        
        await service.markAsConfigured(type, identifier)
        results.push({ identifier, status: 'configured' })
        
        logger.info(`Configured ${type}: ${identifier}`)
      } catch (error) {
        results.push({ 
          identifier: item.id || 'unknown', 
          status: 'error', 
          error: error.message 
        })
      }
    }

    res.json({
      success: true,
      message: `Configured ${results.filter(r => r.status === 'configured').length} items`,
      data: { results }
    })
  } catch (error) {
    logger.error('Failed to configure items:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to configure items',
      error: error.message
    })
  }
})

/**
 * POST /api/admin/rbac-registry/auto-configure
 * Automatically configure items using templates and suggestions
 */
router.post('/auto-configure', requirePermissions(['roles:manage']), async (req, res) => {
  try {
    const { type, applyAll = false, categories = [] } = req.body
    
    const service = initRegistryService(req)
    const unconfigured = await service.getUnconfiguredItems()
    
    let itemsToProcess = unconfigured[`${type}s`] || []
    
    // Filter by categories if specified
    if (!applyAll && categories.length > 0) {
      itemsToProcess = itemsToProcess.filter(item => {
        const itemCategory = item.page_category || item.category || 'General'
        return categories.includes(itemCategory)
      })
    }
    
    const results = []
    
    // Auto-configure items
    for (const item of itemsToProcess) {
      try {
        let identifier
        switch (type) {
          case 'page':
            identifier = item.page_path
            // Add to PAGE_PERMISSIONS automatically
            await req.db('rbac_page_permissions').insert({
              page_path: item.page_path,
              required_permissions: JSON.stringify(item.suggested_permissions || []),
              created_by: req.user.id,
              created_at: req.db.fn.now()
            }).onConflict('page_path').merge()
            break
          case 'endpoint':
            identifier = `${item.method} ${item.endpoint_path}`
            // Add to API_PERMISSIONS automatically
            await req.db('rbac_api_permissions').insert({
              method: item.method,
              endpoint_path: item.endpoint_path,
              required_permissions: JSON.stringify(item.suggested_permissions || []),
              risk_level: item.risk_level,
              created_by: req.user.id,
              created_at: req.db.fn.now()
            }).onConflict(['method', 'endpoint_path']).merge()
            break
          case 'function':
            identifier = item.function_name
            // Log function for review
            break
        }
        
        await service.markAsConfigured(type, identifier)
        results.push({ identifier, status: 'auto-configured' })
        
      } catch (error) {
        results.push({ 
          identifier: item.id || 'unknown', 
          status: 'error', 
          error: error.message 
        })
      }
    }

    res.json({
      success: true,
      message: `Auto-configured ${results.filter(r => r.status === 'auto-configured').length} items`,
      data: { results }
    })
  } catch (error) {
    logger.error('Failed to auto-configure items:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to auto-configure items',
      error: error.message
    })
  }
})

/**
 * GET /api/admin/rbac-registry/scan-history
 * Get scan history
 */
router.get('/scan-history', requirePermissions(['roles:read']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const offset = parseInt(req.query.offset) || 0
    
    const history = await req.db('rbac_scan_history')
      .orderBy('scan_started_at', 'desc')
      .limit(limit)
      .offset(offset)
    
    const total = await req.db('rbac_scan_history').count('* as count').first()
    
    res.json({
      success: true,
      data: {
        history: history.map(h => ({
          ...h,
          scan_summary: h.scan_summary ? JSON.parse(h.scan_summary) : null
        })),
        pagination: {
          total: total.count,
          limit,
          offset,
          hasMore: offset + limit < total.count
        }
      }
    })
  } catch (error) {
    logger.error('Failed to get scan history:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get scan history',
      error: error.message
    })
  }
})

/**
 * POST /api/admin/rbac-registry/export-config
 * Export configuration updates for manual application
 */
router.post('/export-config', requirePermissions(['roles:read']), async (req, res) => {
  try {
    const service = initRegistryService(req)
    const unconfigured = await service.getUnconfiguredItems()
    
    // Generate configuration strings for manual application
    const configUpdates = {
      pagePermissions: [],
      apiPermissions: [],
      pageCategories: new Map()
    }
    
    // Generate PAGE_PERMISSIONS entries
    unconfigured.pages.forEach(page => {
      const permissions = page.suggested_permissions.map(p => 
        `PERMISSIONS.${p.toUpperCase().replace(':', '.')}`
      ).join(', ')
      configUpdates.pagePermissions.push(`  '${page.page_path}': [${permissions}],`)
      
      // Group by category for PAGE_CATEGORIES
      if (!configUpdates.pageCategories.has(page.page_category)) {
        configUpdates.pageCategories.set(page.page_category, [])
      }
      configUpdates.pageCategories.get(page.page_category).push(page)
    })
    
    // Generate API_PERMISSIONS entries
    unconfigured.endpoints.forEach(endpoint => {
      const permissions = endpoint.suggested_permissions.map(p => 
        `PERMISSIONS.${p.toUpperCase().replace(':', '.')}`
      ).join(', ')
      configUpdates.apiPermissions.push(`  '${endpoint.method} ${endpoint.endpoint_path}': [${permissions}],`)
    })
    
    // Generate configuration file content
    const timestamp = new Date().toISOString()
    const configContent = `
// ========================================
// AUTO-GENERATED RBAC CONFIGURATION UPDATE
// Generated: ${timestamp}
// New items found: ${unconfigured.pages.length + unconfigured.endpoints.length + unconfigured.functions.length}
// ========================================

// Add these entries to PAGE_PERMISSIONS in rbac-config.ts:
${configUpdates.pagePermissions.join('\n')}

// Add these entries to API_PERMISSIONS in rbac-config.ts:
${configUpdates.apiPermissions.join('\n')}

// Summary:
// - ${unconfigured.pages.length} new pages
// - ${unconfigured.endpoints.length} new API endpoints  
// - ${unconfigured.functions.length} new functions
`

    res.json({
      success: true,
      data: {
        configContent,
        summary: {
          pages: unconfigured.pages.length,
          endpoints: unconfigured.endpoints.length,
          functions: unconfigured.functions.length
        }
      }
    })
  } catch (error) {
    logger.error('Failed to export configuration:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to export configuration',
      error: error.message
    })
  }
})

/**
 * DELETE /api/admin/rbac-registry/clear-configured
 * Clear all configured items from registry tables
 */
router.delete('/clear-configured', requirePermissions(['roles:manage']), async (req, res) => {
  try {
    const deletedCounts = await Promise.all([
      req.db('rbac_pages').where('needs_configuration', false).del(),
      req.db('rbac_endpoints').where('needs_configuration', false).del(),
      req.db('rbac_functions').where('needs_configuration', false).del()
    ])
    
    const totalDeleted = deletedCounts.reduce((sum, count) => sum + count, 0)
    
    logger.info(`Cleared ${totalDeleted} configured items from registry`)
    
    res.json({
      success: true,
      message: `Cleared ${totalDeleted} configured items`,
      data: {
        pages: deletedCounts[0],
        endpoints: deletedCounts[1],
        functions: deletedCounts[2]
      }
    })
  } catch (error) {
    logger.error('Failed to clear configured items:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear configured items',
      error: error.message
    })
  }
})

module.exports = router
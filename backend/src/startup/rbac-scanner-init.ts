// @ts-nocheck

/**
 * @fileoverview RBAC Scanner Startup Integration
 * 
 * Initializes the RBAC registry scanner on server startup.
 * Performs automated scanning if enabled in environment.
 */

import RBACRegistryService from '../services/RBACRegistryService'
import logger from '../utils/logger'

class RBACStartupIntegration {
  constructor(dbService) {
    this.db = dbService
    this.registryService = null
    this.initialized = false
  }

  /**
   * Initialize the RBAC scanner integration
   */
  async initialize() {
    try {
      if (this.initialized) {
        logger.debug('RBAC scanner already initialized')
        return
      }

      logger.info('🔧 Initializing RBAC Scanner...')

      // Initialize the registry service
      this.registryService = new RBACRegistryService(this.db)

      // Create required tables if they don't exist
      await this.ensureTablesExist()

      // Perform startup scan if enabled
      if (this.shouldPerformStartupScan()) {
        await this.performStartupScan()
      }

      // Schedule periodic scans if enabled
      if (this.shouldSchedulePeriodicScans()) {
        this.schedulePeriodicScans()
      }

      this.initialized = true
      logger.success('✅ RBAC Scanner initialized successfully')
    } catch (error) {
      logger.error('❌ Failed to initialize RBAC Scanner:', error)
      // Don't throw - scanner failures shouldn't prevent server startup
    }
  }

  /**
   * Ensure required database tables exist
   */
  async ensureTablesExist() {
    try {
      // Check if registry tables exist
      const tableChecks = [
        this.db.schema.hasTable('rbac_pages'),
        this.db.schema.hasTable('rbac_endpoints'),
        this.db.schema.hasTable('rbac_functions'),
        this.db.schema.hasTable('rbac_scan_history')
      ]

      const tableExists = await Promise.all(tableChecks)
      const allTablesExist = tableExists.every(exists => exists)

      if (!allTablesExist) {
        logger.warn('⚠️  RBAC registry tables not found. Please run migrations.')
        logger.info('Run: npx knex migrate:latest to create required tables')
        return false
      }

      return true
    } catch (error) {
      logger.error('Failed to check table existence:', error)
      return false
    }
  }

  /**
   * Perform startup scan
   */
  async performStartupScan() {
    try {
      logger.info('🔍 Performing startup RBAC scan...')

      // Record scan start
      const scanRecord = await this.db('rbac_scan_history').insert({
        scan_started_at: this.db.fn.now(),
        scan_type: 'startup',
        status: 'running'
      }).returning('id')

      const scanId = Array.isArray(scanRecord) ? scanRecord[0] : scanRecord

      const startTime = Date.now()
      const result = await this.registryService.performAutomatedScan()
      const duration = Date.now() - startTime

      // Update scan record
      await this.db('rbac_scan_history').where('id', scanId).update({
        scan_completed_at: this.db.fn.now(),
        duration_ms: duration,
        pages_found: result.data?.scanResult?.pages?.length || 0,
        endpoints_found: result.data?.scanResult?.apiEndpoints?.length || 0,
        functions_found: result.data?.scanResult?.functions?.length || 0,
        new_items_registered: result.data?.registrationResult?.newItems || 0,
        scan_summary: JSON.stringify(result.data || {}),
        status: result.success ? 'completed' : 'failed',
        error_message: result.success ? null : result.message
      })

      if (result.success) {
        const newItems = result.data?.registrationResult?.newItems || 0
        if (newItems > 0) {
          logger.info(`📊 Startup scan found ${newItems} new items requiring configuration`)
        } else {
          logger.info('✅ Startup scan completed - no new items found')
        }
      } else {
        logger.warn('⚠️  Startup scan completed with warnings:', result.message)
      }
    } catch (error) {
      logger.error('❌ Startup scan failed:', error)
      // Update scan record to failed
      try {
        await this.db('rbac_scan_history')
          .where('scan_type', 'startup')
          .where('status', 'running')
          .update({
            status: 'failed',
            error_message: error.message,
            scan_completed_at: this.db.fn.now()
          })
      } catch (dbError) {
        logger.error('Failed to update scan record:', dbError)
      }
    }
  }

  /**
   * Schedule periodic scans
   */
  schedulePeriodicScans() {
    const intervalMinutes = parseInt(process.env.RBAC_SCAN_INTERVAL_MINUTES) || 60

    logger.info(`⏰ Scheduling periodic RBAC scans every ${intervalMinutes} minutes`)

    setInterval(async () => {
      try {
        logger.debug('🔄 Running scheduled RBAC scan...')
        const result = await this.registryService.performAutomatedScan()
        
        if (result.success && result.data?.registrationResult?.newItems > 0) {
          logger.info(`📊 Scheduled scan found ${result.data.registrationResult.newItems} new items`)
        }
      } catch (error) {
        logger.error('Scheduled RBAC scan failed:', error)
      }
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Check if startup scan should be performed
   */
  shouldPerformStartupScan() {
    const enableStartupScan = process.env.RBAC_ENABLE_STARTUP_SCAN
    
    // Default to enabled in development, disabled in production
    if (enableStartupScan === undefined) {
      return process.env.NODE_ENV !== 'production'
    }

    return ['true', '1', 'yes'].includes(enableStartupScan.toLowerCase())
  }

  /**
   * Check if periodic scans should be scheduled
   */
  shouldSchedulePeriodicScans() {
    const enablePeriodicScans = process.env.RBAC_ENABLE_PERIODIC_SCANS
    
    // Default to disabled (can be resource intensive)
    if (enablePeriodicScans === undefined) {
      return false
    }

    return ['true', '1', 'yes'].includes(enablePeriodicScans.toLowerCase())
  }

  /**
   * Get registry service instance
   */
  getRegistryService() {
    return this.registryService
  }

  /**
   * Get initialization status
   */
  isInitialized() {
    return this.initialized
  }

  /**
   * Manually trigger a scan
   */
  async triggerManualScan() {
    if (!this.registryService) {
      throw new Error('RBAC scanner not initialized')
    }

    logger.info('🔍 Manual RBAC scan triggered...')
    return await this.registryService.performAutomatedScan()
  }

  /**
   * Get scan statistics
   */
  async getScanStats() {
    if (!this.registryService) {
      throw new Error('RBAC scanner not initialized')
    }

    return await this.registryService.getRegistryStats()
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup() {
    logger.info('🧹 Cleaning up RBAC Scanner...')
    this.initialized = false
    // Additional cleanup if needed
  }
}

// Singleton instance
let instance = null

/**
 * Initialize the RBAC scanner (call once during server startup)
 */
async function initializeRBACScanner(dbService) {
  if (!instance) {
    instance = new RBACStartupIntegration(dbService)
  }
  
  await instance.initialize()
  return instance
}

/**
 * Get the initialized instance
 */
function getRBACScanner() {
  if (!instance) {
    throw new Error('RBAC Scanner not initialized. Call initializeRBACScanner() first.')
  }
  return instance
}

export {
  initializeRBACScanner,
  getRBACScanner,
  RBACStartupIntegration
}
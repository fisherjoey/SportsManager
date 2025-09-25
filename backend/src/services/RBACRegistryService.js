/**
 * @fileoverview RBAC Registry Service
 * 
 * Backend service for managing automated RBAC resource registration.
 * Handles scanning, registration, and synchronization of permissions.
 */

const fs = require('fs').promises
const path = require('path')
const logger = require('../utils/logger')

class RBACRegistryService {
  constructor(dbService) {
    this.db = dbService
    this.scanCache = new Map()
    this.lastScanTime = null
  }

  /**
   * Perform automated scan and register new resources
   */
  async performAutomatedScan() {
    try {
      logger.info('🔍 Starting automated RBAC scan...')
      
      const startTime = Date.now()
      const scanResult = await this.scanCodebase()
      
      // Register new resources
      const registrationResult = await this.registerNewResources(scanResult)
      
      // Update last scan time
      this.lastScanTime = new Date()
      
      const duration = Date.now() - startTime
      logger.info(`✅ RBAC scan completed in ${duration}ms`)
      logger.info(`📊 Registered ${registrationResult.newItems} new items`)
      
      return {
        success: true,
        data: {
          scanResult,
          registrationResult,
          duration
        }
      }
    } catch (error) {
      logger.error('Failed to perform automated RBAC scan:', error)
      return {
        success: false,
        message: 'Failed to perform automated scan',
        error: error.message
      }
    }
  }

  /**
   * Scan the codebase for new resources
   */
  async scanCodebase() {
    const rootDir = path.join(__dirname, '..', '..', '..')
    
    const [pages, apiEndpoints, functions] = await Promise.all([
      this.scanPages(rootDir),
      this.scanApiEndpoints(rootDir),
      this.scanFunctions(rootDir)
    ])

    return {
      pages,
      apiEndpoints,
      functions,
      timestamp: new Date()
    }
  }

  /**
   * Scan for Next.js pages
   */
  async scanPages(rootDir) {
    const pages = []
    const appDir = path.join(rootDir, 'app')
    
    const scanDirectory = async (dir, basePath = '') => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
            await scanDirectory(fullPath, path.join(basePath, entry.name))
          } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
            const routePath = basePath || '/'
            
            // Check if already registered
            if (!(await this.isPageRegistered(routePath))) {
              const fileContent = await fs.readFile(fullPath, 'utf-8')
              
              pages.push({
                path: routePath,
                name: this.generatePageName(routePath),
                category: this.categorizePagePath(routePath),
                description: this.extractPageDescription(fileContent) || `Page at ${routePath}`,
                filePath: fullPath,
                isProtected: this.detectPageProtection(fileContent),
                suggestedPermissions: this.suggestPagePermissions(routePath),
                autoDetected: true,
                needsConfiguration: true
              })
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist - skip
      }
    }
    
    await scanDirectory(appDir)
    return pages
  }

  /**
   * Scan for API endpoints
   */
  async scanApiEndpoints(rootDir) {
    const endpoints = []
    const routesDir = path.join(rootDir, 'backend', 'src', 'routes')
    
    const scanDirectory = async (dir, basePath = '') => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
            await scanDirectory(fullPath, path.join(basePath, entry.name))
          } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
            const fileContent = await fs.readFile(fullPath, 'utf-8')
            const discoveredEndpoints = await this.extractApiEndpoints(fileContent, fullPath, basePath)
            endpoints.push(...discoveredEndpoints)
          }
        }
      } catch (error) {
        // Directory doesn't exist - skip
      }
    }
    
    await scanDirectory(routesDir)
    return endpoints
  }

  /**
   * Scan for functions requiring permissions
   */
  async scanFunctions(rootDir) {
    const functions = []
    const srcDirs = [
      path.join(rootDir, 'backend', 'src'),
      path.join(rootDir, 'lib'),
      path.join(rootDir, 'components')
    ]

    for (const srcDir of srcDirs) {
      await this.scanDirectory(srcDir, '', async (filePath, relativePath) => {
        if ((filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) 
            && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
          
          const fileContent = await fs.readFile(filePath, 'utf-8')
          const discoveredFunctions = this.extractPermissionFunctions(fileContent, filePath, relativePath)
          functions.push(...discoveredFunctions)
        }
      })
    }

    return functions
  }

  /**
   * Register new resources in the database
   */
  async registerNewResources(scanResult) {
    const newItems = {
      pages: 0,
      endpoints: 0,
      functions: 0
    }

    // Register new pages
    for (const page of scanResult.pages) {
      if (page.needsConfiguration) {
        await this.registerPage(page)
        newItems.pages++
      }
    }

    // Register new endpoints
    for (const endpoint of scanResult.apiEndpoints) {
      if (endpoint.needsConfiguration) {
        await this.registerEndpoint(endpoint)
        newItems.endpoints++
      }
    }

    // Register new functions
    for (const func of scanResult.functions) {
      if (func.needsConfiguration) {
        await this.registerFunction(func)
        newItems.functions++
      }
    }

    return {
      newItems: newItems.pages + newItems.endpoints + newItems.functions,
      breakdown: newItems
    }
  }

  /**
   * Register a page in the database
   */
  async registerPage(page) {
    try {
      // Insert into rbac_pages table (create if not exists)
      await this.db.raw(`
        INSERT INTO rbac_pages (
          page_path, 
          page_name, 
          page_category, 
          page_description, 
          suggested_permissions,
          auto_detected,
          needs_configuration,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          page_name = VALUES(page_name),
          page_category = VALUES(page_category),
          page_description = VALUES(page_description),
          suggested_permissions = VALUES(suggested_permissions),
          auto_detected = VALUES(auto_detected),
          needs_configuration = VALUES(needs_configuration),
          updated_at = NOW()
      `, [
        page.path,
        page.name,
        page.category,
        page.description,
        JSON.stringify(page.suggestedPermissions),
        page.autoDetected,
        true
      ])

      logger.debug(`Registered page: ${page.path}`)
    } catch (error) {
      logger.error(`Failed to register page ${page.path}:`, error)
      throw error
    }
  }

  /**
   * Register an endpoint in the database
   */
  async registerEndpoint(endpoint) {
    try {
      await this.db.raw(`
        INSERT INTO rbac_endpoints (
          method, 
          endpoint_path, 
          controller, 
          action, 
          suggested_permissions,
          risk_level,
          auto_detected,
          needs_configuration,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          controller = VALUES(controller),
          action = VALUES(action),
          suggested_permissions = VALUES(suggested_permissions),
          risk_level = VALUES(risk_level),
          auto_detected = VALUES(auto_detected),
          needs_configuration = VALUES(needs_configuration),
          updated_at = NOW()
      `, [
        endpoint.method,
        endpoint.path,
        endpoint.controller,
        endpoint.action,
        JSON.stringify(endpoint.suggestedPermissions),
        endpoint.riskLevel,
        endpoint.autoDetected,
        true
      ])

      logger.debug(`Registered endpoint: ${endpoint.method} ${endpoint.path}`)
    } catch (error) {
      logger.error(`Failed to register endpoint ${endpoint.method} ${endpoint.path}:`, error)
      throw error
    }
  }

  /**
   * Register a function in the database
   */
  async registerFunction(func) {
    try {
      await this.db.raw(`
        INSERT INTO rbac_functions (
          function_name, 
          module_path, 
          category, 
          suggested_permissions,
          risk_level,
          auto_detected,
          needs_configuration,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          module_path = VALUES(module_path),
          category = VALUES(category),
          suggested_permissions = VALUES(suggested_permissions),
          risk_level = VALUES(risk_level),
          auto_detected = VALUES(auto_detected),
          needs_configuration = VALUES(needs_configuration),
          updated_at = NOW()
      `, [
        func.name,
        func.module,
        func.category,
        JSON.stringify(func.suggestedPermissions),
        func.riskLevel,
        func.autoDetected,
        true
      ])

      logger.debug(`Registered function: ${func.name}`)
    } catch (error) {
      logger.error(`Failed to register function ${func.name}:`, error)
      throw error
    }
  }

  /**
   * Get all unconfigured items
   */
  async getUnconfiguredItems() {
    try {
      const [pages, endpoints, functions] = await Promise.all([
        this.db.select('*').from('rbac_pages').where('needs_configuration', true),
        this.db.select('*').from('rbac_endpoints').where('needs_configuration', true),
        this.db.select('*').from('rbac_functions').where('needs_configuration', true)
      ])

      return {
        pages: pages.map(p => ({
          ...p,
          suggested_permissions: JSON.parse(p.suggested_permissions || '[]')
        })),
        endpoints: endpoints.map(e => ({
          ...e,
          suggested_permissions: JSON.parse(e.suggested_permissions || '[]')
        })),
        functions: functions.map(f => ({
          ...f,
          suggested_permissions: JSON.parse(f.suggested_permissions || '[]')
        }))
      }
    } catch (error) {
      logger.error('Failed to get unconfigured items:', error)
      throw error
    }
  }

  /**
   * Mark item as configured
   */
  async markAsConfigured(type, identifier) {
    try {
      const table = `rbac_${type}s`
      let whereClause

      switch (type) {
        case 'page':
          whereClause = { page_path: identifier }
          break
        case 'endpoint':
          const [method, path] = identifier.split(' ', 2)
          whereClause = { method, endpoint_path: path }
          break
        case 'function':
          whereClause = { function_name: identifier }
          break
        default:
          throw new Error(`Unknown type: ${type}`)
      }

      await this.db(table)
        .where(whereClause)
        .update({
          needs_configuration: false,
          configured_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        })

      logger.debug(`Marked ${type} ${identifier} as configured`)
    } catch (error) {
      logger.error(`Failed to mark ${type} ${identifier} as configured:`, error)
      throw error
    }
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats() {
    try {
      const [pageStats, endpointStats, functionStats] = await Promise.all([
        this.db('rbac_pages')
          .select(
            this.db.raw('COUNT(*) as total'),
            this.db.raw('SUM(needs_configuration = 1) as unconfigured'),
            this.db.raw('SUM(auto_detected = 1) as auto_detected')
          )
          .first(),
        this.db('rbac_endpoints')
          .select(
            this.db.raw('COUNT(*) as total'),
            this.db.raw('SUM(needs_configuration = 1) as unconfigured'),
            this.db.raw('SUM(auto_detected = 1) as auto_detected')
          )
          .first(),
        this.db('rbac_functions')
          .select(
            this.db.raw('COUNT(*) as total'),
            this.db.raw('SUM(needs_configuration = 1) as unconfigured'),
            this.db.raw('SUM(auto_detected = 1) as auto_detected')
          )
          .first()
      ])

      return {
        pages: pageStats,
        endpoints: endpointStats,
        functions: functionStats,
        lastScan: this.lastScanTime
      }
    } catch (error) {
      logger.error('Failed to get registry stats:', error)
      throw error
    }
  }

  // Helper methods

  async isPageRegistered(pagePath) {
    try {
      const count = await this.db('rbac_pages')
        .where('page_path', pagePath)
        .count('* as count')
        .first()
      
      return count.count > 0
    } catch (error) {
      // Table might not exist yet
      return false
    }
  }

  async isEndpointRegistered(method, path) {
    try {
      const count = await this.db('rbac_endpoints')
        .where({ method, endpoint_path: path })
        .count('* as count')
        .first()
      
      return count.count > 0
    } catch (error) {
      // Table might not exist yet
      return false
    }
  }

  shouldSkipDirectory(name) {
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build', '__tests__', '.test']
    return skipDirs.some(skip => name.includes(skip))
  }

  async scanDirectory(dir, relativePath, processor) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const newRelativePath = path.join(relativePath, entry.name)

        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          await this.scanDirectory(fullPath, newRelativePath, processor)
        } else if (entry.isFile()) {
          await processor(fullPath, newRelativePath)
        }
      }
    } catch (error) {
      // Directory doesn't exist - skip
    }
  }

  async extractApiEndpoints(content, filePath, relativePath) {
    const endpoints = []
    
    // Patterns to match route definitions
    const patterns = [
      /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/gi
    ]

    for (const pattern of patterns) {
      let match
      pattern.lastIndex = 0
      
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase()
        const endpoint = match[2]
        const handler = match[3] || 'handler'
        
        const fullPath = endpoint.startsWith('/') 
          ? `/api${endpoint}` 
          : `/api/${relativePath.replace('.js', '').replace('.ts', '')}${endpoint}`

        const isRegistered = await this.isEndpointRegistered(method, fullPath)
        
        if (!isRegistered) {
          endpoints.push({
            method,
            path: fullPath,
            controller: relativePath.replace(/\.(js|ts)$/, ''),
            action: handler,
            filePath,
            suggestedPermissions: this.suggestApiPermissions(method, fullPath),
            riskLevel: this.assessEndpointRisk(method, fullPath, content),
            autoDetected: true,
            needsConfiguration: true
          })
        }
      }
    }

    return endpoints
  }

  extractPermissionFunctions(content, filePath, relativePath) {
    const functions = []
    
    // Pattern to match function declarations
    const functionPatterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g
    ]

    functionPatterns.forEach(pattern => {
      let match
      pattern.lastIndex = 0
      
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1]
        
        if (this.needsPermissionCheck(functionName)) {
          const category = this.categorizeFunctionPath(relativePath)
          
          functions.push({
            name: functionName,
            module: relativePath.replace(/\.(js|ts|tsx)$/, ''),
            filePath,
            category,
            suggestedPermissions: this.suggestFunctionPermissions(functionName, category),
            riskLevel: this.assessFunctionRisk(functionName),
            autoDetected: true,
            needsConfiguration: true
          })
        }
      }
    })

    return functions
  }

  // Categorization and suggestion methods
  categorizePagePath(pagePath) {
    if (pagePath.includes('admin')) return 'Administration'
    if (pagePath.includes('financial') || pagePath.includes('finance')) return 'Financial'
    if (pagePath.includes('organization')) return 'Organization'
    if (pagePath.includes('analytics')) return 'Analytics'
    if (pagePath.includes('game') || pagePath.includes('referee') || pagePath.includes('league')) return 'Sports Management'
    if (pagePath.includes('profile') || pagePath.includes('settings')) return 'Account'
    return 'General'
  }

  categorizeFunctionPath(filePath) {
    if (filePath.includes('admin')) return 'administration'
    if (filePath.includes('finance') || filePath.includes('budget')) return 'finance'
    if (filePath.includes('game')) return 'games'
    if (filePath.includes('user')) return 'users'
    if (filePath.includes('role')) return 'roles'
    if (filePath.includes('report')) return 'reports'
    return 'general'
  }

  suggestPagePermissions(pagePath) {
    const suggestions = []
    
    if (pagePath.includes('admin')) suggestions.push('roles:read')
    if (pagePath.includes('user')) suggestions.push('users:read')
    if (pagePath.includes('game')) suggestions.push('games:read')
    if (pagePath.includes('financial')) suggestions.push('finance:read')
    if (pagePath.includes('report')) suggestions.push('reports:read')
    
    if (suggestions.length === 0) {
      const resource = this.extractResourceFromPath(pagePath)
      suggestions.push(`${resource}:read`)
    }
    
    return [...new Set(suggestions)]
  }

  suggestApiPermissions(method, path) {
    const resource = this.extractResourceFromApiPath(path)
    const actionMap = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    }
    
    const action = actionMap[method] || 'manage'
    return [`${resource}:${action}`]
  }

  suggestFunctionPermissions(functionName, category) {
    const name = functionName.toLowerCase()
    
    if (name.includes('delete') || name.includes('remove')) return [`${category}:delete`]
    if (name.includes('create') || name.includes('add')) return [`${category}:create`]
    if (name.includes('update') || name.includes('edit')) return [`${category}:update`]
    if (name.includes('approve')) return [`${category}:approve`]
    if (name.includes('manage')) return [`${category}:manage`]
    
    return [`${category}:read`]
  }

  extractResourceFromPath(pagePath) {
    const parts = pagePath.split('/').filter(p => p)
    if (parts.length > 0) {
      const resource = parts[parts.length - 1]
      if (resource.includes('admin')) return 'roles'
      if (resource.includes('user')) return 'users'
      if (resource.includes('game')) return 'games'
      if (resource.includes('financial')) return 'finance'
      return resource.replace(/s$/, '')
    }
    return 'general'
  }

  extractResourceFromApiPath(apiPath) {
    const parts = apiPath.split('/').filter(p => p && !p.startsWith(':'))
    if (parts.length >= 2) {
      return parts[2] || 'general'
    }
    return 'general'
  }

  detectPageProtection(content) {
    const protectionIndicators = [
      'RequirePermission',
      'ProtectedRoute',
      'usePermissions',
      'checkPermission',
      'requireAuth'
    ]
    
    return protectionIndicators.some(indicator => content.includes(indicator))
  }

  extractPageDescription(content) {
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) return titleMatch[1]
    
    const metaMatch = content.match(/<meta[^>]*description[^>]*content=["']([^"']+)["']/i)
    if (metaMatch) return metaMatch[1]
    
    return null
  }

  generatePageName(pagePath) {
    if (pagePath === '/') return 'Home'
    
    const parts = pagePath.split('/').filter(p => p)
    return parts
      .map(part => part.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '))
      .join(' - ')
  }

  needsPermissionCheck(functionName) {
    const name = functionName.toLowerCase()
    const sensitiveActions = [
      'delete', 'remove', 'create', 'add', 'update', 'edit', 'modify',
      'approve', 'reject', 'publish', 'unpublish', 'manage', 'admin'
    ]
    
    return sensitiveActions.some(action => name.includes(action))
  }

  assessEndpointRisk(method, path, content) {
    if (method === 'DELETE') return 'high'
    if (path.includes('admin')) return 'critical'
    if (path.includes('approve') || path.includes('manage')) return 'high'
    if (method === 'POST' || method === 'PUT') return 'medium'
    return 'low'
  }

  assessFunctionRisk(functionName) {
    const name = functionName.toLowerCase()
    
    if (name.includes('delete') || name.includes('remove')) return 'high'
    if (name.includes('admin') || name.includes('manage')) return 'critical'
    if (name.includes('approve') || name.includes('publish')) return 'high'
    if (name.includes('create') || name.includes('update')) return 'medium'
    return 'low'
  }
}

module.exports = RBACRegistryService
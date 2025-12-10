/**
 * @fileoverview Automated RBAC Scanner
 * 
 * This module automatically discovers and registers new:
 * - Pages and routes
 * - API endpoints 
 * - Functions requiring permissions
 * - Dashboard views
 * 
 * It ensures all new resources are automatically included in the RBAC system.
 */

import fs from 'fs/promises'
import path from 'path'

import { PermissionRegistry } from './permission-registry'
import { PERMISSIONS } from './permissions'

export interface ScanResult {
  pages: DiscoveredPage[]
  apiEndpoints: DiscoveredEndpoint[]
  functions: DiscoveredFunction[]
  dashboardViews: DiscoveredView[]
  newItems: number
  timestamp: Date
}

export interface DiscoveredPage {
  path: string
  name: string
  category: string
  description?: string
  filePath: string
  isProtected: boolean
  suggestedPermissions: string[]
  autoDetected: boolean
}

export interface DiscoveredEndpoint {
  method: string
  path: string
  controller: string
  action: string
  filePath: string
  suggestedPermissions: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  autoDetected: boolean
}

export interface DiscoveredFunction {
  name: string
  module: string
  filePath: string
  category: string
  suggestedPermissions: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  autoDetected: boolean
}

export interface DiscoveredView {
  key: string
  name: string
  category: string
  component: string
  filePath: string
  suggestedPermissions: string[]
  autoDetected: boolean
}

/**
 * Main scanner class that automatically discovers RBAC resources
 */
export class RBACScanner {
  private registry: PermissionRegistry
  private rootDir: string

  constructor(rootDir: string = process.cwd()) {
    this.registry = PermissionRegistry.getInstance()
    this.rootDir = rootDir
  }

  /**
   * Perform a complete scan of the codebase
   */
  async scanAll(): Promise<ScanResult> {
    const startTime = Date.now()
    console.log('🔍 Starting automated RBAC scan...')

    const [pages, apiEndpoints, functions, dashboardViews] = await Promise.all([
      this.scanPages(),
      this.scanApiEndpoints(),
      this.scanFunctions(),
      this.scanDashboardViews()
    ])

    const result: ScanResult = {
      pages,
      apiEndpoints,
      functions,
      dashboardViews,
      newItems: pages.filter(p => p.autoDetected).length +
                apiEndpoints.filter(e => e.autoDetected).length +
                functions.filter(f => f.autoDetected).length +
                dashboardViews.filter(v => v.autoDetected).length,
      timestamp: new Date()
    }

    const duration = Date.now() - startTime
    console.log(`✅ RBAC scan completed in ${duration}ms`)
    console.log(`📊 Found ${result.newItems} new items requiring configuration`)

    return result
  }

  /**
   * Scan for Next.js pages and routes
   */
  async scanPages(): Promise<DiscoveredPage[]> {
    const pages: DiscoveredPage[] = []
    const appDir = path.join(this.rootDir, 'app')

    await this.scanDirectory(appDir, '', async (filePath, relativePath) => {
      if (filePath.endsWith('page.tsx') || filePath.endsWith('page.ts')) {
        const routePath = relativePath.replace('/page.tsx', '').replace('/page.ts', '') || '/'
        
        const fileContent = await fs.readFile(filePath, 'utf-8')
        const isProtected = this.detectPageProtection(fileContent)
        
        pages.push({
          path: routePath,
          name: this.generatePageName(routePath),
          category: this.categorizePagePath(routePath),
          description: this.extractPageDescription(fileContent) || `Page at ${routePath}`,
          filePath,
          isProtected,
          suggestedPermissions: this.suggestPagePermissions(routePath, fileContent),
          autoDetected: !this.isPageConfigured(routePath)
        })
      }
    })

    return pages
  }

  /**
   * Scan for API endpoints in backend routes
   */
  async scanApiEndpoints(): Promise<DiscoveredEndpoint[]> {
    const endpoints: DiscoveredEndpoint[] = []
    const routesDir = path.join(this.rootDir, 'backend', 'src', 'routes')

    await this.scanDirectory(routesDir, '', async (filePath, relativePath) => {
      if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
        const fileContent = await fs.readFile(filePath, 'utf-8')
        const discoveredEndpoints = this.extractApiEndpoints(fileContent, filePath, relativePath)
        endpoints.push(...discoveredEndpoints)
      }
    })

    return endpoints
  }

  /**
   * Scan for functions that may require permissions
   */
  async scanFunctions(): Promise<DiscoveredFunction[]> {
    const functions: DiscoveredFunction[] = []
    const srcDirs = [
      path.join(this.rootDir, 'backend', 'src'),
      path.join(this.rootDir, 'lib'),
      path.join(this.rootDir, 'components')
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
   * Scan for dashboard views and components
   */
  async scanDashboardViews(): Promise<DiscoveredView[]> {
    const views: DiscoveredView[] = []
    const componentsDir = path.join(this.rootDir, 'components')

    await this.scanDirectory(componentsDir, '', async (filePath, relativePath) => {
      if ((filePath.endsWith('.tsx') || filePath.endsWith('.ts')) 
          && (relativePath.includes('dashboard') || relativePath.includes('admin'))) {
        
        const fileContent = await fs.readFile(filePath, 'utf-8')
        const discoveredViews = this.extractDashboardViews(fileContent, filePath, relativePath)
        views.push(...discoveredViews)
      }
    })

    return views
  }

  /**
   * Recursive directory scanner helper
   */
  private async scanDirectory(
    dir: string,
    relativePath: string,
    processor: (filePath: string, relativePath: string) => Promise<void>
  ): Promise<void> {
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
      // Directory doesn't exist or no permission - skip silently
    }
  }

  /**
   * Check if directory should be skipped during scanning
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build', '__tests__', '.test']
    return skipDirs.some(skip => name.includes(skip))
  }

  /**
   * Extract API endpoints from route files
   */
  private extractApiEndpoints(content: string, filePath: string, relativePath: string): DiscoveredEndpoint[] {
    const endpoints: DiscoveredEndpoint[] = []
    
    // Patterns to match route definitions
    const patterns = [
      /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/gi
    ]

    patterns.forEach(pattern => {
      let match
      pattern.lastIndex = 0 // Reset regex
      
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase()
        const endpoint = match[2]
        const handler = match[3] || 'handler'
        
        // Build full API path
        const fullPath = endpoint.startsWith('/') 
          ? `/api${endpoint}` 
          : `/api/${relativePath.replace('.js', '').replace('.ts', '')}${endpoint}`

        const key = `${method} ${fullPath}`
        
        if (!this.isEndpointConfigured(key)) {
          endpoints.push({
            method,
            path: fullPath,
            controller: relativePath.replace(/\.(js|ts)$/, ''),
            action: handler,
            filePath,
            suggestedPermissions: this.suggestApiPermissions(method, fullPath),
            riskLevel: this.assessEndpointRisk(method, fullPath, content),
            autoDetected: true
          })
        }
      }
    })

    return endpoints
  }

  /**
   * Extract functions that may require permissions
   */
  private extractPermissionFunctions(content: string, filePath: string, relativePath: string): DiscoveredFunction[] {
    const functions: DiscoveredFunction[] = []
    
    // Look for functions with permission-related keywords
    const permissionKeywords = [
      'requirePermission', 'checkPermission', 'hasPermission', 'authorize', 
      'admin', 'delete', 'create', 'update', 'manage', 'approve'
    ]
    
    // Pattern to match function declarations
    const functionPatterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      /(\w+):\s*(?:async\s+)?\([^)]*\)\s*=>/g
    ]

    functionPatterns.forEach(pattern => {
      let match
      pattern.lastIndex = 0
      
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1]
        
        // Check if function name or surrounding context suggests it needs permissions
        if (this.needsPermissionCheck(functionName, content, match.index)) {
          const category = this.categorizeFunctionPath(relativePath)
          
          functions.push({
            name: functionName,
            module: relativePath.replace(/\.(js|ts|tsx)$/, ''),
            filePath,
            category,
            suggestedPermissions: this.suggestFunctionPermissions(functionName, category),
            riskLevel: this.assessFunctionRisk(functionName, content),
            autoDetected: true
          })
        }
      }
    })

    return functions
  }

  /**
   * Extract dashboard views from components
   */
  private extractDashboardViews(content: string, filePath: string, relativePath: string): DiscoveredView[] {
    const views: DiscoveredView[] = []
    
    // Look for dashboard view definitions
    const viewPatterns = [
      /'dashboard-view:(\w+[\w-]*)'|"dashboard-view:(\w+[\w-]*)"/g,
      /view\s*[:=]\s*['"`](\w+[\w-]*)['"`]/g
    ]

    viewPatterns.forEach(pattern => {
      let match
      pattern.lastIndex = 0
      
      while ((match = pattern.exec(content)) !== null) {
        const viewKey = match[1] || match[2]
        
        if (viewKey && !this.isViewConfigured(viewKey)) {
          views.push({
            key: `dashboard-view:${viewKey}`,
            name: this.generateViewName(viewKey),
            category: this.categorizeViewPath(relativePath),
            component: relativePath.replace(/\.(tsx|ts)$/, ''),
            filePath,
            suggestedPermissions: this.suggestViewPermissions(viewKey),
            autoDetected: true
          })
        }
      }
    })

    return views
  }

  // Helper methods for categorization and suggestion

  private categorizePagePath(pagePath: string): string {
    if (pagePath.includes('admin')) return 'Administration'
    if (pagePath.includes('financial') || pagePath.includes('finance')) return 'Financial'
    if (pagePath.includes('organization')) return 'Organization'
    if (pagePath.includes('analytics')) return 'Analytics'
    if (pagePath.includes('game') || pagePath.includes('referee') || pagePath.includes('league')) return 'Sports Management'
    if (pagePath.includes('profile') || pagePath.includes('settings')) return 'Account'
    return 'General'
  }

  private categorizeFunctionPath(filePath: string): string {
    if (filePath.includes('admin')) return 'administration'
    if (filePath.includes('finance') || filePath.includes('budget')) return 'finance'
    if (filePath.includes('game')) return 'games'
    if (filePath.includes('user')) return 'users'
    if (filePath.includes('role')) return 'roles'
    if (filePath.includes('report')) return 'reports'
    return 'general'
  }

  private categorizeViewPath(filePath: string): string {
    if (filePath.includes('admin')) return 'Administration'
    if (filePath.includes('finance')) return 'Financial'
    if (filePath.includes('organization')) return 'Organization'
    return 'Sports Management'
  }

  private suggestPagePermissions(pagePath: string, content: string): string[] {
    const suggestions: string[] = []
    
    // Analyze path
    if (pagePath.includes('admin')) suggestions.push(PERMISSIONS.ROLES.READ)
    if (pagePath.includes('user')) suggestions.push(PERMISSIONS.USERS.READ)
    if (pagePath.includes('game')) suggestions.push(PERMISSIONS.GAMES.READ)
    if (pagePath.includes('financial')) suggestions.push(PERMISSIONS.FINANCE.READ)
    if (pagePath.includes('report')) suggestions.push(PERMISSIONS.REPORTS.READ)
    
    // Analyze content for permission usage
    if (content.includes('delete') || content.includes('remove')) {
      const resource = this.extractResourceFromPath(pagePath)
      suggestions.push(`${resource}:delete`)
    }
    
    if (suggestions.length === 0) {
      const resource = this.extractResourceFromPath(pagePath)
      suggestions.push(`${resource}:read`)
    }
    
    return [...new Set(suggestions)] // Remove duplicates
  }

  private suggestApiPermissions(method: string, path: string): string[] {
    const resource = this.extractResourceFromApiPath(path)
    const actionMap: Record<string, string> = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    }
    
    const action = actionMap[method] || 'manage'
    return [`${resource}:${action}`]
  }

  private suggestFunctionPermissions(functionName: string, category: string): string[] {
    const name = functionName.toLowerCase()
    
    if (name.includes('delete') || name.includes('remove')) return [`${category}:delete`]
    if (name.includes('create') || name.includes('add')) return [`${category}:create`]
    if (name.includes('update') || name.includes('edit')) return [`${category}:update`]
    if (name.includes('approve')) return [`${category}:approve`]
    if (name.includes('manage')) return [`${category}:manage`]
    
    return [`${category}:read`]
  }

  private suggestViewPermissions(viewKey: string): string[] {
    if (viewKey.includes('admin')) return [PERMISSIONS.ROLES.READ]
    if (viewKey.includes('user')) return [PERMISSIONS.USERS.READ]
    if (viewKey.includes('game')) return [PERMISSIONS.GAMES.READ]
    if (viewKey.includes('financial')) return [PERMISSIONS.FINANCE.READ]
    if (viewKey.includes('report')) return [PERMISSIONS.REPORTS.READ]
    
    return ['general:read']
  }

  private extractResourceFromPath(pagePath: string): string {
    const parts = pagePath.split('/').filter(p => p)
    if (parts.length > 0) {
      const resource = parts[parts.length - 1]
      if (resource.includes('admin')) return 'roles'
      if (resource.includes('user')) return 'users'
      if (resource.includes('game')) return 'games'
      if (resource.includes('financial')) return 'finance'
      return resource.replace(/s$/, '') // Remove plural
    }
    return 'general'
  }

  private extractResourceFromApiPath(apiPath: string): string {
    const parts = apiPath.split('/').filter(p => p && !p.startsWith(':'))
    if (parts.length >= 2) {
      return parts[2] || 'general' // /api/[resource]
    }
    return 'general'
  }

  private detectPageProtection(content: string): boolean {
    const protectionIndicators = [
      'RequirePermission',
      'ProtectedRoute',
      'usePermissions',
      'checkPermission',
      'requireAuth'
    ]
    
    return protectionIndicators.some(indicator => content.includes(indicator))
  }

  private needsPermissionCheck(functionName: string, content: string, index: number): boolean {
    const name = functionName.toLowerCase()
    const sensitiveActions = [
      'delete', 'remove', 'create', 'add', 'update', 'edit', 'modify',
      'approve', 'reject', 'publish', 'unpublish', 'manage', 'admin'
    ]
    
    return sensitiveActions.some(action => name.includes(action))
  }

  private assessEndpointRisk(method: string, path: string, content: string): 'low' | 'medium' | 'high' | 'critical' {
    if (method === 'DELETE') return 'high'
    if (path.includes('admin')) return 'critical'
    if (path.includes('approve') || path.includes('manage')) return 'high'
    if (method === 'POST' || method === 'PUT') return 'medium'
    return 'low'
  }

  private assessFunctionRisk(functionName: string, content: string): 'low' | 'medium' | 'high' | 'critical' {
    const name = functionName.toLowerCase()
    
    if (name.includes('delete') || name.includes('remove')) return 'high'
    if (name.includes('admin') || name.includes('manage')) return 'critical'
    if (name.includes('approve') || name.includes('publish')) return 'high'
    if (name.includes('create') || name.includes('update')) return 'medium'
    return 'low'
  }

  private extractPageDescription(content: string): string | null {
    // Look for page title or description in JSX
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) return titleMatch[1]
    
    const metaMatch = content.match(/<meta[^>]*description[^>]*content=["']([^"']+)["']/i)
    if (metaMatch) return metaMatch[1]
    
    return null
  }

  private generatePageName(pagePath: string): string {
    if (pagePath === '/') return 'Home'
    
    const parts = pagePath.split('/').filter(p => p)
    return parts
      .map(part => part.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '))
      .join(' - ')
  }

  private generateViewName(viewKey: string): string {
    return viewKey
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Configuration checks
  private isPageConfigured(pagePath: string): boolean {
    // Check against existing PAGE_PERMISSIONS in rbac-config.ts
    return this.registry.getAllPages().some(p => p.path === pagePath)
  }

  private isEndpointConfigured(endpointKey: string): boolean {
    return this.registry.getAllApis().some(a => `${a.method} ${a.path}` === endpointKey)
  }

  private isViewConfigured(viewKey: string): boolean {
    return this.registry.getAllPages().some(p => p.path === viewKey)
  }

  /**
   * Generate a configuration update for rbac-config.ts
   */
  async generateConfigUpdate(scanResult: ScanResult): Promise<string> {
    const newPagePermissions: string[] = []
    const newApiPermissions: string[] = []
    const newPageCategories: string[] = []

    // Generate new PAGE_PERMISSIONS entries
    scanResult.pages
      .filter(p => p.autoDetected)
      .forEach(page => {
        const permissions = page.suggestedPermissions.map(p => `PERMISSIONS.${p.toUpperCase().replace(':', '.')}`).join(', ')
        newPagePermissions.push(`  '${page.path}': [${permissions}],`)
      })

    // Generate new API_PERMISSIONS entries
    scanResult.apiEndpoints
      .filter(e => e.autoDetected)
      .forEach(endpoint => {
        const permissions = endpoint.suggestedPermissions.map(p => `PERMISSIONS.${p.toUpperCase().replace(':', '.')}`).join(', ')
        newApiPermissions.push(`  '${endpoint.method} ${endpoint.path}': [${permissions}],`)
      })

    // Generate new PAGE_CATEGORIES entries
    const categoryMap = new Map<string, DiscoveredPage[]>()
    scanResult.pages
      .filter(p => p.autoDetected)
      .forEach(page => {
        if (!categoryMap.has(page.category)) {
          categoryMap.set(page.category, [])
        }
        categoryMap.get(page.category)!.push(page)
      })

    categoryMap.forEach((pages, category) => {
      const categoryPages = pages.map(page => 
        `      { path: '${page.path}', name: '${page.name}', description: '${page.description}' }`
      ).join(',\n')
      
      newPageCategories.push(`  '${category}': {\n    icon: Layout,\n    pages: [\n${categoryPages}\n    ]\n  }`)
    })

    return `
// ========================================
// AUTO-GENERATED RBAC CONFIGURATION UPDATE
// Generated: ${scanResult.timestamp.toISOString()}
// New items found: ${scanResult.newItems}
// ========================================

// Add these entries to PAGE_PERMISSIONS:
${newPagePermissions.join('\n')}

// Add these entries to API_PERMISSIONS:
${newApiPermissions.join('\n')}

// Add these entries to PAGE_CATEGORIES in RolePageAccessManager:
${newPageCategories.join(',\n')}

// Summary:
// - ${scanResult.pages.filter(p => p.autoDetected).length} new pages
// - ${scanResult.apiEndpoints.filter(e => e.autoDetected).length} new API endpoints
// - ${scanResult.functions.filter(f => f.autoDetected).length} new functions
// - ${scanResult.dashboardViews.filter(v => v.autoDetected).length} new dashboard views
`
  }
}

export default RBACScanner
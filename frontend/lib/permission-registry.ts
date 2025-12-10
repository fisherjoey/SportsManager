/**
 * @fileoverview Permission Registry
 * 
 * Centralized registry for all permissions in the application.
 * This system automatically detects pages/routes and ensures they have
 * proper permission configurations.
 * 
 * @module lib/permission-registry
 */

import fs from 'fs'
import path from 'path'

import { PERMISSIONS } from './permissions'

export interface PermissionDefinition {
  id: string
  name: string
  description: string
  category: string
  resource: string
  action: string
  requiresApproval?: boolean
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  dependencies?: string[]
  autoGrantToRoles?: string[]
}

export interface PagePermissionConfig {
  path: string
  name: string
  requiredPermissions: string[]
  optionalPermissions?: string[]
  description?: string
  isPublic?: boolean
  autoDetected?: boolean
  configured?: boolean
}

export interface ApiEndpointConfig {
  method: string
  path: string
  requiredPermissions: string[]
  description?: string
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  autoDetected?: boolean
  configured?: boolean
}

/**
 * Registry of all permissions in the system
 */
export class PermissionRegistry {
  private static instance: PermissionRegistry
  private permissions: Map<string, PermissionDefinition> = new Map()
  private pageConfigs: Map<string, PagePermissionConfig> = new Map()
  private apiConfigs: Map<string, ApiEndpointConfig> = new Map()
  private unconfiguredPages: Set<string> = new Set()
  private unconfiguredApis: Set<string> = new Set()

  private constructor() {
    this.initializePermissions()
  }

  static getInstance(): PermissionRegistry {
    if (!PermissionRegistry.instance) {
      PermissionRegistry.instance = new PermissionRegistry()
    }
    return PermissionRegistry.instance
  }

  /**
   * Initialize permissions from existing configuration
   */
  private initializePermissions() {
    // Load existing permissions from PERMISSIONS constant
    Object.entries(PERMISSIONS).forEach(([category, perms]) => {
      Object.entries(perms).forEach(([action, permissionId]) => {
        const [cat, act] = (permissionId as string).split(':')
        this.registerPermission({
          id: permissionId as string,
          name: this.formatPermissionName(cat, act),
          description: this.generatePermissionDescription(cat, act),
          category: cat,
          resource: cat,
          action: act,
          riskLevel: this.determineRiskLevel(act)
        })
      })
    })
  }

  /**
   * Register a new permission
   */
  registerPermission(permission: PermissionDefinition) {
    this.permissions.set(permission.id, permission)
  }

  /**
   * Register a page configuration
   */
  registerPage(config: PagePermissionConfig) {
    this.pageConfigs.set(config.path, config)
    if (config.autoDetected && !config.configured) {
      this.unconfiguredPages.add(config.path)
    }
  }

  /**
   * Register an API endpoint configuration
   */
  registerApiEndpoint(config: ApiEndpointConfig) {
    const key = `${config.method} ${config.path}`
    this.apiConfigs.set(key, config)
    if (config.autoDetected && !config.configured) {
      this.unconfiguredApis.add(key)
    }
  }

  /**
   * Auto-detect pages from the app directory
   */
  async autoDetectPages(): Promise<PagePermissionConfig[]> {
    const detected: PagePermissionConfig[] = []
    const appDir = path.join(process.cwd(), 'app')
    
    const scanDirectory = async (dir: string, basePath: string = '') => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory()) {
            // Recursively scan subdirectories
            await scanDirectory(fullPath, path.join(basePath, entry.name))
          } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
            // Found a page file
            const pagePath = basePath || '/'
            
            // Check if already configured
            if (!this.pageConfigs.has(pagePath)) {
              const config: PagePermissionConfig = {
                path: pagePath,
                name: this.generatePageName(pagePath),
                requiredPermissions: [],
                description: `Auto-detected page at ${pagePath}`,
                autoDetected: true,
                configured: false
              }
              
              detected.push(config)
              this.registerPage(config)
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error)
      }
    }
    
    await scanDirectory(appDir)
    return detected
  }

  /**
   * Auto-detect API endpoints from route files
   */
  async autoDetectApiEndpoints(): Promise<ApiEndpointConfig[]> {
    const detected: ApiEndpointConfig[] = []
    const apiDir = path.join(process.cwd(), 'backend', 'src', 'routes')
    
    const scanRouteFile = async (filePath: string) => {
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8')
        
        // Simple regex patterns to detect route definitions
        const patterns = [
          /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/gi,
          /app\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/gi
        ]
        
        patterns.forEach(pattern => {
          let match
          while ((match = pattern.exec(content)) !== null) {
            const method = match[1].toUpperCase()
            const path = `/api${match[2]}`
            const key = `${method} ${path}`
            
            if (!this.apiConfigs.has(key)) {
              const config: ApiEndpointConfig = {
                method,
                path,
                requiredPermissions: [],
                description: 'Auto-detected endpoint',
                autoDetected: true,
                configured: false
              }
              
              detected.push(config)
              this.registerApiEndpoint(config)
            }
          }
        })
      } catch (error) {
        console.error(`Error scanning route file ${filePath}:`, error)
      }
    }
    
    const scanDirectory = async (dir: string) => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath)
          } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
            await scanRouteFile(fullPath)
          }
        }
      } catch (error) {
        console.error(`Error scanning API directory ${dir}:`, error)
      }
    }
    
    await scanDirectory(apiDir)
    return detected
  }

  /**
   * Validate that all pages and APIs have permissions configured
   */
  validateConfiguration(): {
    valid: boolean
    unconfiguredPages: string[]
    unconfiguredApis: string[]
    errors: string[]
    } {
    const errors: string[] = []
    
    // Check for unconfigured pages
    this.unconfiguredPages.forEach(page => {
      errors.push(`Page '${page}' does not have permissions configured`)
    })
    
    // Check for unconfigured APIs
    this.unconfiguredApis.forEach(api => {
      errors.push(`API endpoint '${api}' does not have permissions configured`)
    })
    
    // Check for orphaned permissions (permissions not used anywhere)
    const usedPermissions = new Set<string>()
    
    this.pageConfigs.forEach(config => {
      config.requiredPermissions.forEach(p => usedPermissions.add(p))
      config.optionalPermissions?.forEach(p => usedPermissions.add(p))
    })
    
    this.apiConfigs.forEach(config => {
      config.requiredPermissions.forEach(p => usedPermissions.add(p))
    })
    
    this.permissions.forEach((perm, id) => {
      if (!usedPermissions.has(id) && !id.includes('admin')) {
        console.warn(`Warning: Permission '${id}' is defined but not used anywhere`)
      }
    })
    
    return {
      valid: errors.length === 0,
      unconfiguredPages: Array.from(this.unconfiguredPages),
      unconfiguredApis: Array.from(this.unconfiguredApis),
      errors
    }
  }

  /**
   * Generate a suggested permission configuration for a page
   */
  suggestPagePermissions(pagePath: string): string[] {
    const suggestions: string[] = []
    
    // Analyze page path to suggest permissions
    if (pagePath.includes('admin')) {
      suggestions.push('roles:read')
    }
    if (pagePath.includes('user')) {
      suggestions.push('users:read')
    }
    if (pagePath.includes('game')) {
      suggestions.push('games:read')
    }
    if (pagePath.includes('report')) {
      suggestions.push('reports:read')
    }
    if (pagePath.includes('setting')) {
      suggestions.push('settings:read')
    }
    
    // Default to read permission for the resource
    if (suggestions.length === 0) {
      const resource = pagePath.split('/')[1] || 'general'
      suggestions.push(`${resource}:read`)
    }
    
    return suggestions
  }

  /**
   * Generate a suggested permission configuration for an API endpoint
   */
  suggestApiPermissions(method: string, path: string): string[] {
    const suggestions: string[] = []
    
    // Extract resource from path
    const pathParts = path.split('/').filter(p => p && !p.startsWith(':'))
    const resource = pathParts[2] || pathParts[1] || 'general'
    
    // Map HTTP methods to actions
    const actionMap: Record<string, string> = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    }
    
    const action = actionMap[method] || 'manage'
    suggestions.push(`${resource}:${action}`)
    
    // Add specific permissions for special endpoints
    if (path.includes('approve')) {
      suggestions.push(`${resource}:approve`)
    }
    if (path.includes('publish')) {
      suggestions.push(`${resource}:publish`)
    }
    if (path.includes('export')) {
      suggestions.push(`${resource}:export`)
    }
    
    return suggestions
  }

  /**
   * Export configuration to JSON
   */
  exportConfiguration() {
    return {
      permissions: Array.from(this.permissions.values()),
      pages: Array.from(this.pageConfigs.values()),
      apis: Array.from(this.apiConfigs.values()),
      validation: this.validateConfiguration()
    }
  }

  /**
   * Import configuration from JSON
   */
  importConfiguration(config: any) {
    // Import permissions
    if (config.permissions) {
      config.permissions.forEach((perm: PermissionDefinition) => {
        this.registerPermission(perm)
      })
    }
    
    // Import page configs
    if (config.pages) {
      config.pages.forEach((page: PagePermissionConfig) => {
        this.registerPage({ ...page, configured: true })
      })
    }
    
    // Import API configs
    if (config.apis) {
      config.apis.forEach((api: ApiEndpointConfig) => {
        this.registerApiEndpoint({ ...api, configured: true })
      })
    }
  }

  // Helper methods
  private formatPermissionName(category: string, action: string): string {
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${category}`
  }

  private generatePermissionDescription(category: string, action: string): string {
    const descriptions: Record<string, string> = {
      'read': `View and access ${category} information`,
      'create': `Create new ${category} entries`,
      'update': `Edit and modify existing ${category}`,
      'delete': `Remove ${category} from the system`,
      'manage': `Full management control over ${category}`,
      'approve': `Approve ${category} requests or changes`,
      'publish': `Publish ${category} content`,
      'export': `Export ${category} data`
    }
    
    return descriptions[action] || `Perform ${action} operations on ${category}`
  }

  private determineRiskLevel(action: string): 'low' | 'medium' | 'high' | 'critical' {
    const riskMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'read': 'low',
      'create': 'medium',
      'update': 'medium',
      'delete': 'high',
      'manage': 'critical',
      'approve': 'high',
      'publish': 'medium',
      'export': 'low',
      'impersonate': 'critical'
    }
    
    return riskMap[action] || 'medium'
  }

  private generatePageName(path: string): string {
    if (path === '/') return 'Home'
    
    const parts = path.split('/').filter(p => p)
    return parts
      .map(part => part.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '))
      .join(' - ')
  }

  // Getters
  getAllPermissions(): PermissionDefinition[] {
    return Array.from(this.permissions.values())
  }

  getAllPages(): PagePermissionConfig[] {
    return Array.from(this.pageConfigs.values())
  }

  getAllApis(): ApiEndpointConfig[] {
    return Array.from(this.apiConfigs.values())
  }

  getUnconfiguredItems() {
    return {
      pages: Array.from(this.unconfiguredPages),
      apis: Array.from(this.unconfiguredApis)
    }
  }
}

export default PermissionRegistry
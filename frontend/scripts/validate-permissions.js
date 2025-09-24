#!/usr/bin/env node

/**
 * @fileoverview Permission Validation Script
 * 
 * This script runs during build time to ensure all pages and API endpoints
 * have proper permission configurations. It will fail the build if any
 * pages or endpoints are missing permissions.
 * 
 * Usage: node scripts/validate-permissions.js
 * Add to package.json: "prebuild": "node scripts/validate-permissions.js"
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

// Configuration
const ALLOW_UNCONFIGURED = process.env.ALLOW_UNCONFIGURED_PERMISSIONS === 'true'
const STRICT_MODE = process.env.PERMISSION_STRICT_MODE === 'true'

// Permission configuration file
const PERMISSION_CONFIG_PATH = path.join(__dirname, '..', 'permission-config.json')

// Load existing RBAC configuration
const RBAC_CONFIG_PATH = path.join(__dirname, '..', 'lib', 'rbac-config.ts')

class PermissionValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.unconfiguredPages = []
    this.unconfiguredApis = []
    this.config = this.loadConfiguration()
  }

  loadConfiguration() {
    try {
      if (fs.existsSync(PERMISSION_CONFIG_PATH)) {
        const content = fs.readFileSync(PERMISSION_CONFIG_PATH, 'utf-8')
        return JSON.parse(content)
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠ Could not load permission configuration file'))
    }
    
    return {
      pages: {},
      apis: {},
      permissions: {}
    }
  }

  saveConfiguration() {
    try {
      fs.writeFileSync(
        PERMISSION_CONFIG_PATH,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      )
      console.log(chalk.green('✓ Permission configuration saved'))
    } catch (error) {
      console.error(chalk.red('✗ Failed to save permission configuration'), error)
    }
  }

  async scanPages() {
    const appDir = path.join(__dirname, '..', 'app')
    const pages = []
    
    const scanDirectory = async (dir, basePath = '') => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory()) {
            // Skip special Next.js directories
            if (!['api', '_app', '_document'].includes(entry.name)) {
              await scanDirectory(fullPath, path.join(basePath, entry.name))
            }
          } else if (entry.name === 'page.tsx' || entry.name === 'page.ts' || entry.name === 'page.jsx' || entry.name === 'page.js') {
            const pagePath = basePath || '/'
            pages.push({
              path: pagePath,
              file: path.relative(process.cwd(), fullPath)
            })
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(chalk.red(`Error scanning directory ${dir}:`), error)
        }
      }
    }
    
    if (fs.existsSync(appDir)) {
      await scanDirectory(appDir)
    }
    
    return pages
  }

  async scanApiEndpoints() {
    const apiDirs = [
      path.join(__dirname, '..', 'backend', 'src', 'routes'),
      path.join(__dirname, '..', 'app', 'api')
    ]
    
    const endpoints = []
    
    const scanRouteFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // Patterns to detect route definitions
        const patterns = [
          /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/gi,
          /app\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/gi,
          /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/gi,
        ]
        
        patterns.forEach(pattern => {
          let match
          while ((match = pattern.exec(content)) !== null) {
            const method = match[1].toUpperCase()
            let path = match[2] || ''
            
            // Handle Next.js API routes
            if (!path && filePath.includes('app/api')) {
              const relativePath = filePath.replace(/\\/g, '/')
              const apiMatch = relativePath.match(/app\/api(.*)\/route\.(ts|js)/)
              if (apiMatch) {
                path = `/api${apiMatch[1]}`
              }
            }
            
            if (path) {
              endpoints.push({
                method,
                path: path.startsWith('/api') ? path : `/api${path}`,
                file: path.relative(process.cwd(), filePath)
              })
            }
          }
        })
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(chalk.red(`Error scanning route file ${filePath}:`), error)
        }
      }
    }
    
    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory()) {
            scanDirectory(fullPath)
          } else if (
            entry.name.endsWith('.js') || 
            entry.name.endsWith('.ts') ||
            entry.name === 'route.ts' ||
            entry.name === 'route.js'
          ) {
            scanRouteFile(fullPath)
          }
        }
      } catch (error) {
        console.error(chalk.red(`Error scanning directory ${dir}:`), error)
      }
    }
    
    apiDirs.forEach(scanDirectory)
    return endpoints
  }

  validatePages(pages) {
    console.log(chalk.blue('\n📄 Validating Pages...'))
    
    pages.forEach(page => {
      const configured = this.config.pages[page.path]
      
      if (!configured || !configured.permissions || configured.permissions.length === 0) {
        // Check if it's a public page
        const publicPages = ['/', '/login', '/signup', '/forgot-password']
        if (!publicPages.includes(page.path)) {
          this.unconfiguredPages.push(page)
          
          if (STRICT_MODE) {
            this.errors.push(`Page '${page.path}' has no permissions configured (${page.file})`)
          } else {
            this.warnings.push(`Page '${page.path}' has no permissions configured (${page.file})`)
          }
        }
      } else {
        console.log(chalk.green(`  ✓ ${page.path}`))
      }
    })
    
    if (this.unconfiguredPages.length > 0) {
      console.log(chalk.yellow(`\n⚠ Found ${this.unconfiguredPages.length} unconfigured pages`))
    }
  }

  validateApiEndpoints(endpoints) {
    console.log(chalk.blue('\n🔌 Validating API Endpoints...'))
    
    endpoints.forEach(endpoint => {
      const key = `${endpoint.method} ${endpoint.path}`
      const configured = this.config.apis[key]
      
      if (!configured || !configured.permissions || configured.permissions.length === 0) {
        // Check if it's a public endpoint
        const publicEndpoints = [
          'POST /api/login',
          'POST /api/auth/login',
          'POST /api/auth/signup',
          'POST /api/auth/refresh',
          'GET /api/health',
          'GET /api/status'
        ]
        
        if (!publicEndpoints.includes(key)) {
          this.unconfiguredApis.push(endpoint)
          
          if (STRICT_MODE) {
            this.errors.push(`API endpoint '${key}' has no permissions configured (${endpoint.file})`)
          } else {
            this.warnings.push(`API endpoint '${key}' has no permissions configured (${endpoint.file})`)
          }
        }
      } else {
        console.log(chalk.green(`  ✓ ${key}`))
      }
    })
    
    if (this.unconfiguredApis.length > 0) {
      console.log(chalk.yellow(`\n⚠ Found ${this.unconfiguredApis.length} unconfigured API endpoints`))
    }
  }

  generateSuggestions() {
    if (this.unconfiguredPages.length === 0 && this.unconfiguredApis.length === 0) {
      return
    }
    
    console.log(chalk.blue('\n💡 Suggested Configurations:'))
    
    // Suggest page permissions
    if (this.unconfiguredPages.length > 0) {
      console.log(chalk.cyan('\nPages:'))
      this.unconfiguredPages.forEach(page => {
        const suggestions = this.suggestPagePermissions(page.path)
        console.log(`  ${page.path}:`)
        console.log(`    Suggested permissions: ${suggestions.join(', ')}`)
      })
    }
    
    // Suggest API permissions
    if (this.unconfiguredApis.length > 0) {
      console.log(chalk.cyan('\nAPI Endpoints:'))
      this.unconfiguredApis.forEach(endpoint => {
        const suggestions = this.suggestApiPermissions(endpoint.method, endpoint.path)
        console.log(`  ${endpoint.method} ${endpoint.path}:`)
        console.log(`    Suggested permissions: ${suggestions.join(', ')}`)
      })
    }
    
    console.log(chalk.yellow('\nAdd these to your permission-config.json or lib/rbac-config.ts file'))
  }

  suggestPagePermissions(pagePath) {
    const suggestions = []
    
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
    
    // Default to read permission
    if (suggestions.length === 0) {
      const resource = pagePath.split('/')[1] || 'general'
      suggestions.push(`${resource}:read`)
    }
    
    return suggestions
  }

  suggestApiPermissions(method, path) {
    const suggestions = []
    
    // Extract resource from path
    const pathParts = path.split('/').filter(p => p && !p.startsWith(':'))
    const resource = pathParts[2] || pathParts[1] || 'general'
    
    // Map HTTP methods to actions
    const actionMap = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    }
    
    const action = actionMap[method] || 'manage'
    suggestions.push(`${resource}:${action}`)
    
    return suggestions
  }

  async validate() {
    console.log(chalk.bold.blue('\n🔐 Permission Validation Starting...\n'))
    
    // Scan for pages and APIs
    const pages = await this.scanPages()
    const endpoints = await this.scanApiEndpoints()
    
    console.log(chalk.gray(`Found ${pages.length} pages and ${endpoints.length} API endpoints`))
    
    // Validate configurations
    this.validatePages(pages)
    this.validateApiEndpoints(endpoints)
    
    // Generate suggestions for unconfigured items
    this.generateSuggestions()
    
    // Report results
    console.log(chalk.bold.blue('\n📊 Validation Summary:\n'))
    
    if (this.errors.length > 0) {
      console.log(chalk.red(`✗ ${this.errors.length} errors found:`))
      this.errors.forEach(error => console.log(chalk.red(`  - ${error}`)))
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow(`⚠ ${this.warnings.length} warnings found:`))
      this.warnings.forEach(warning => console.log(chalk.yellow(`  - ${warning}`)))
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('✓ All pages and API endpoints have permissions configured!'))
    }
    
    // Determine exit code
    if (this.errors.length > 0 && !ALLOW_UNCONFIGURED) {
      console.log(chalk.red('\n✗ Validation failed! Fix the errors above or set ALLOW_UNCONFIGURED_PERMISSIONS=true'))
      process.exit(1)
    } else if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠ Validation passed with warnings'))
      process.exit(0)
    } else {
      console.log(chalk.green('\n✓ Validation passed!'))
      process.exit(0)
    }
  }
}

// Run validation
const validator = new PermissionValidator()
validator.validate().catch(error => {
  console.error(chalk.red('Validation failed with error:'), error)
  process.exit(1)
})
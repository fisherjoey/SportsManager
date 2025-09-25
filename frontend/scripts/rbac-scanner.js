#!/usr/bin/env node
/**
 * @fileoverview RBAC Scanner CLI Tool
 * 
 * Command-line tool for scanning and managing RBAC resources.
 * Can be run manually or integrated into build processes.
 */

const { spawn } = require('child_process')
const fs = require('fs').promises
const path = require('path')

// Simple logger
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`)
}

class RBACScanner {
  constructor() {
    this.rootDir = process.cwd()
    this.found = {
      pages: [],
      endpoints: [],
      functions: []
    }
  }

  async run(command = 'scan', options = {}) {
    try {
      logger.info('Starting RBAC Scanner...')
      
      switch (command) {
        case 'scan':
          await this.performScan(options)
          break
        case 'check':
          await this.checkConfiguration()
          break
        case 'export':
          await this.exportConfiguration()
          break
        case 'watch':
          await this.watchMode()
          break
        default:
          this.showHelp()
      }
    } catch (error) {
      logger.error(`Scanner failed: ${error.message}`)
      process.exit(1)
    }
  }

  async performScan(options = {}) {
    logger.info('🔍 Scanning codebase for RBAC resources...')
    
    const startTime = Date.now()
    
    // Scan different types of resources
    await Promise.all([
      this.scanPages(),
      this.scanApiEndpoints(),
      this.scanFunctions()
    ])
    
    const duration = Date.now() - startTime
    
    // Output results
    this.displayResults(duration)
    
    // Generate configuration if requested
    if (options.generate) {
      await this.generateConfiguration()
    }
    
    // Export to file if requested
    if (options.output) {
      await this.exportToFile(options.output)
    }
  }

  async scanPages() {
    const appDir = path.join(this.rootDir, 'app')
    await this.scanDirectory(appDir, '', this.processPageFile.bind(this))
  }

  async scanApiEndpoints() {
    const routesDir = path.join(this.rootDir, 'backend', 'src', 'routes')
    await this.scanDirectory(routesDir, '', this.processRouteFile.bind(this))
  }

  async scanFunctions() {
    const srcDirs = [
      path.join(this.rootDir, 'backend', 'src'),
      path.join(this.rootDir, 'lib'),
      path.join(this.rootDir, 'components')
    ]

    for (const srcDir of srcDirs) {
      await this.scanDirectory(srcDir, '', this.processFunctionFile.bind(this))
    }
  }

  async scanDirectory(dir, basePath, processor) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relativePath = path.join(basePath, entry.name)
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          await this.scanDirectory(fullPath, relativePath, processor)
        } else if (entry.isFile()) {
          await processor(fullPath, relativePath)
        }
      }
    } catch (error) {
      // Directory doesn't exist - skip silently
    }
  }

  async processPageFile(filePath, relativePath) {
    if (!(relativePath.endsWith('page.tsx') || relativePath.endsWith('page.ts'))) {
      return
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const routePath = relativePath.replace('/page.tsx', '').replace('/page.ts', '') || '/'
      
      this.found.pages.push({
        path: routePath,
        name: this.generatePageName(routePath),
        category: this.categorizePagePath(routePath),
        file: relativePath,
        isProtected: this.detectPageProtection(content),
        suggestedPermissions: this.suggestPagePermissions(routePath)
      })
    } catch (error) {
      logger.warn(`Failed to process page: ${relativePath}`)
    }
  }

  async processRouteFile(filePath, relativePath) {
    if (!(relativePath.endsWith('.js') || relativePath.endsWith('.ts'))) {
      return
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const endpoints = this.extractApiEndpoints(content, relativePath)
      this.found.endpoints.push(...endpoints)
    } catch (error) {
      logger.warn(`Failed to process route: ${relativePath}`)
    }
  }

  async processFunctionFile(filePath, relativePath) {
    if (!(relativePath.endsWith('.js') || relativePath.endsWith('.ts') || relativePath.endsWith('.tsx'))) {
      return
    }
    
    if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
      return
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const functions = this.extractPermissionFunctions(content, relativePath)
      this.found.functions.push(...functions)
    } catch (error) {
      logger.warn(`Failed to process file: ${relativePath}`)
    }
  }

  extractApiEndpoints(content, filePath) {
    const endpoints = []
    const patterns = [
      /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi
    ]

    patterns.forEach(pattern => {
      let match
      pattern.lastIndex = 0
      
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase()
        const endpoint = match[2]
        const fullPath = endpoint.startsWith('/') 
          ? `/api${endpoint}` 
          : `/api/${filePath.replace(/\.(js|ts)$/, '')}${endpoint}`

        endpoints.push({
          method,
          path: fullPath,
          file: filePath,
          suggestedPermissions: this.suggestApiPermissions(method, fullPath),
          riskLevel: this.assessEndpointRisk(method, fullPath)
        })
      }
    })

    return endpoints
  }

  extractPermissionFunctions(content, filePath) {
    const functions = []
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
          const category = this.categorizeFunctionPath(filePath)
          
          functions.push({
            name: functionName,
            file: filePath,
            category,
            suggestedPermissions: this.suggestFunctionPermissions(functionName, category),
            riskLevel: this.assessFunctionRisk(functionName)
          })
        }
      }
    })

    return functions
  }

  displayResults(duration) {
    logger.success(`Scan completed in ${duration}ms`)
    logger.info('')
    
    // Summary
    console.log('📊 SCAN RESULTS:')
    console.log(`   Pages: ${this.found.pages.length}`)
    console.log(`   API Endpoints: ${this.found.endpoints.length}`)
    console.log(`   Functions: ${this.found.functions.length}`)
    console.log('')

    // Detailed results
    if (this.found.pages.length > 0) {
      console.log('📄 PAGES:')
      this.found.pages.forEach(page => {
        console.log(`   ${page.path} -> [${page.suggestedPermissions.join(', ')}]`)
      })
      console.log('')
    }

    if (this.found.endpoints.length > 0) {
      console.log('🌐 API ENDPOINTS:')
      this.found.endpoints.forEach(endpoint => {
        console.log(`   ${endpoint.method} ${endpoint.path} -> [${endpoint.suggestedPermissions.join(', ')}]`)
      })
      console.log('')
    }

    if (this.found.functions.length > 0) {
      console.log('⚡ FUNCTIONS:')
      this.found.functions.forEach(func => {
        console.log(`   ${func.name} (${func.file}) -> [${func.suggestedPermissions.join(', ')}]`)
      })
      console.log('')
    }
  }

  async generateConfiguration() {
    logger.info('📝 Generating configuration...')
    
    const timestamp = new Date().toISOString()
    let config = `// Auto-generated RBAC configuration\n// Generated: ${timestamp}\n\n`
    
    // PAGE_PERMISSIONS
    config += '// Add these to PAGE_PERMISSIONS in rbac-config.ts:\n'
    this.found.pages.forEach(page => {
      const permissions = page.suggestedPermissions.map(p => 
        `PERMISSIONS.${p.toUpperCase().replace(':', '.')}`
      ).join(', ')
      config += `  '${page.path}': [${permissions}],\n`
    })
    config += '\n'
    
    // API_PERMISSIONS
    config += '// Add these to API_PERMISSIONS in rbac-config.ts:\n'
    this.found.endpoints.forEach(endpoint => {
      const permissions = endpoint.suggestedPermissions.map(p => 
        `PERMISSIONS.${p.toUpperCase().replace(':', '.')}`
      ).join(', ')
      config += `  '${endpoint.method} ${endpoint.path}': [${permissions}],\n`
    })
    config += '\n'

    // Write to file
    const configPath = path.join(this.rootDir, 'rbac-config-generated.ts')
    await fs.writeFile(configPath, config)
    
    logger.success(`Configuration written to: ${configPath}`)
  }

  async exportToFile(outputPath) {
    const data = {
      timestamp: new Date().toISOString(),
      summary: {
        pages: this.found.pages.length,
        endpoints: this.found.endpoints.length,
        functions: this.found.functions.length
      },
      found: this.found
    }

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2))
    logger.success(`Results exported to: ${outputPath}`)
  }

  async checkConfiguration() {
    logger.info('🔍 Checking existing configuration...')
    
    // Read existing rbac-config.ts
    const configPath = path.join(this.rootDir, 'lib', 'rbac-config.ts')
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8')
      
      // Perform scan first
      await this.performScan({ silent: true })
      
      // Check for missing configurations
      const missing = {
        pages: [],
        endpoints: []
      }
      
      this.found.pages.forEach(page => {
        if (!configContent.includes(`'${page.path}':`)) {
          missing.pages.push(page)
        }
      })
      
      this.found.endpoints.forEach(endpoint => {
        if (!configContent.includes(`'${endpoint.method} ${endpoint.path}':`)) {
          missing.endpoints.push(endpoint)
        }
      })
      
      // Report results
      if (missing.pages.length === 0 && missing.endpoints.length === 0) {
        logger.success('✨ All resources are properly configured!')
      } else {
        logger.warn(`Found ${missing.pages.length + missing.endpoints.length} unconfigured resources:`)
        missing.pages.forEach(page => {
          console.log(`   Missing page: ${page.path}`)
        })
        missing.endpoints.forEach(endpoint => {
          console.log(`   Missing endpoint: ${endpoint.method} ${endpoint.path}`)
        })
      }
    } catch (error) {
      logger.error(`Failed to read configuration: ${error.message}`)
    }
  }

  async watchMode() {
    logger.info('👁️  Starting watch mode...')
    logger.info('Watching for changes in app/, backend/src/routes/, lib/, and components/')
    
    const watchDirs = ['app', 'backend/src/routes', 'lib', 'components']
    
    // Note: This is a simplified watch mode
    // In a real implementation, you'd use fs.watch or a proper file watcher
    setInterval(async () => {
      await this.performScan({ silent: true })
    }, 10000) // Check every 10 seconds
    
    logger.info('Press Ctrl+C to stop watching')
  }

  showHelp() {
    console.log(`
RBAC Scanner - Automated permission discovery tool

Usage: node scripts/rbac-scanner.js [command] [options]

Commands:
  scan       Scan codebase for RBAC resources (default)
  check      Check existing configuration completeness
  export     Export scan results to file
  watch      Watch for changes and auto-scan

Options:
  --generate    Generate configuration file
  --output      Export results to JSON file
  --silent      Run in silent mode

Examples:
  node scripts/rbac-scanner.js scan --generate
  node scripts/rbac-scanner.js check
  node scripts/rbac-scanner.js export --output scan-results.json
  node scripts/rbac-scanner.js watch
`)
  }

  // Helper methods (same as in RBACScanner class)
  shouldSkipDirectory(name) {
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build', '__tests__', '.test']
    return skipDirs.some(skip => name.includes(skip))
  }

  categorizePagePath(pagePath) {
    if (pagePath.includes('admin')) return 'Administration'
    if (pagePath.includes('financial') || pagePath.includes('finance')) return 'Financial'
    if (pagePath.includes('organization')) return 'Organization'
    return 'Sports Management'
  }

  categorizeFunctionPath(filePath) {
    if (filePath.includes('admin')) return 'administration'
    if (filePath.includes('finance')) return 'finance'
    if (filePath.includes('game')) return 'games'
    if (filePath.includes('user')) return 'users'
    return 'general'
  }

  suggestPagePermissions(pagePath) {
    const suggestions = []
    if (pagePath.includes('admin')) suggestions.push('roles:read')
    if (pagePath.includes('user')) suggestions.push('users:read')
    if (pagePath.includes('game')) suggestions.push('games:read')
    if (suggestions.length === 0) suggestions.push('general:read')
    return suggestions
  }

  suggestApiPermissions(method, path) {
    const resource = path.split('/')[2] || 'general'
    const actionMap = { 'GET': 'read', 'POST': 'create', 'PUT': 'update', 'DELETE': 'delete' }
    const action = actionMap[method] || 'manage'
    return [`${resource}:${action}`]
  }

  suggestFunctionPermissions(functionName, category) {
    const name = functionName.toLowerCase()
    if (name.includes('delete')) return [`${category}:delete`]
    if (name.includes('create')) return [`${category}:create`]
    if (name.includes('update')) return [`${category}:update`]
    return [`${category}:read`]
  }

  detectPageProtection(content) {
    return ['RequirePermission', 'ProtectedRoute', 'usePermissions'].some(indicator => 
      content.includes(indicator)
    )
  }

  needsPermissionCheck(functionName) {
    const name = functionName.toLowerCase()
    return ['delete', 'create', 'update', 'manage', 'admin'].some(action => 
      name.includes(action)
    )
  }

  assessEndpointRisk(method, path) {
    if (method === 'DELETE') return 'high'
    if (path.includes('admin')) return 'critical'
    if (method === 'POST' || method === 'PUT') return 'medium'
    return 'low'
  }

  assessFunctionRisk(functionName) {
    const name = functionName.toLowerCase()
    if (name.includes('delete') || name.includes('admin')) return 'high'
    if (name.includes('create') || name.includes('update')) return 'medium'
    return 'low'
  }

  generatePageName(pagePath) {
    if (pagePath === '/') return 'Home'
    return pagePath.split('/').filter(p => p)
      .map(part => part.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '))
      .join(' - ')
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0] || 'scan'
  
  const options = {}
  if (args.includes('--generate')) options.generate = true
  if (args.includes('--silent')) options.silent = true
  
  const outputIndex = args.indexOf('--output')
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.output = args[outputIndex + 1]
  }

  const scanner = new RBACScanner()
  scanner.run(command, options).catch(error => {
    console.error('Scanner failed:', error)
    process.exit(1)
  })
}

module.exports = RBACScanner
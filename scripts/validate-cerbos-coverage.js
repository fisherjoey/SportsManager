#!/usr/bin/env node

/**
 * @fileoverview Cerbos Policy Coverage Validator
 *
 * Ensures all API endpoints and protected routes have corresponding Cerbos policies.
 * This script scans the codebase for permission checks and validates against Cerbos policies.
 *
 * Exit codes:
 * - 0: All checks passed
 * - 1: Missing policies detected
 * - 2: Script error
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class CerbosCoverageValidator {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.cerbosDir = path.join(this.rootDir, 'cerbos', 'policies');
    this.backendDir = path.join(this.rootDir, 'backend', 'src');
    this.frontendDir = path.join(this.rootDir, 'frontend');

    this.policies = new Map();
    this.endpoints = [];
    this.protectedRoutes = [];
    this.missingPolicies = [];

    this.verbose = options.verbose || false;
    this.strict = options.strict !== false; // Default true
  }

  /**
   * Main validation entry point
   */
  async validate() {
    console.log('🔍 Validating Cerbos policy coverage...\n');

    try {
      // Step 1: Load all Cerbos policies
      await this.loadCerbosPolicies();
      console.log(`✅ Loaded ${this.policies.size} Cerbos policies\n`);

      // Step 2: Scan backend for permission checks
      await this.scanBackendEndpoints();
      console.log(`✅ Found ${this.endpoints.length} protected endpoints\n`);

      // Step 3: Scan frontend for permission usage
      await this.scanFrontendRoutes();
      console.log(`✅ Found ${this.protectedRoutes.length} protected routes\n`);

      // Step 4: Validate coverage
      const result = this.validateCoverage();

      // Step 5: Report results
      this.reportResults(result);

      // Exit with appropriate code
      if (result.missingPolicies.length > 0) {
        if (this.strict) {
          console.error('\n❌ Policy coverage validation FAILED');
          process.exit(1);
        } else {
          console.warn('\n⚠️  Policy coverage validation passed with warnings');
          process.exit(0);
        }
      } else {
        console.log('\n✅ Policy coverage validation PASSED');
        process.exit(0);
      }

    } catch (error) {
      console.error('\n❌ Validation script error:', error.message);
      if (this.verbose) {
        console.error(error.stack);
      }
      process.exit(2);
    }
  }

  /**
   * Load all Cerbos policy files
   */
  async loadCerbosPolicies() {
    const policyFiles = this.findFiles(this.cerbosDir, /\.yaml$/);

    for (const filePath of policyFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const policy = yaml.load(content);

        if (policy.resourcePolicy) {
          const resource = policy.resourcePolicy.resource;
          const actions = policy.resourcePolicy.rules
            .flatMap(rule => rule.actions || [])
            .filter(action => action !== '*');

          this.policies.set(resource, {
            file: path.relative(this.rootDir, filePath),
            resource,
            actions: [...new Set(actions)],
            policy
          });

          if (this.verbose) {
            console.log(`  📄 ${resource}: ${actions.length} actions`);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Failed to parse ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Scan backend routes for permission checks
   */
  async scanBackendEndpoints() {
    const routeFiles = this.findFiles(this.backendDir, /\.(js|ts)$/);

    for (const filePath of routeFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.rootDir, filePath);

      // Pattern 1: requireCerbosPermission middleware
      const middlewarePattern = /requireCerbosPermission\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
      let match;

      while ((match = middlewarePattern.exec(content)) !== null) {
        const resource = match[1];
        const action = match[2];

        this.endpoints.push({
          file: relativePath,
          resource,
          action,
          line: this.getLineNumber(content, match.index),
          type: 'middleware'
        });
      }

      // Pattern 2: Direct Cerbos client calls
      const clientPattern = /cerbos\.checkResource\s*\(\s*\{[^}]*resource:\s*['"`]([^'"`]+)['"`][^}]*action:\s*['"`]([^'"`]+)['"`]/g;

      while ((match = clientPattern.exec(content)) !== null) {
        const resource = match[1];
        const action = match[2];

        this.endpoints.push({
          file: relativePath,
          resource,
          action,
          line: this.getLineNumber(content, match.index),
          type: 'direct'
        });
      }

      // Pattern 3: isAllowed calls
      const isAllowedPattern = /\.isAllowed\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;

      while ((match = isAllowedPattern.exec(content)) !== null) {
        const resource = match[1];
        const action = match[2];

        this.endpoints.push({
          file: relativePath,
          resource,
          action,
          line: this.getLineNumber(content, match.index),
          type: 'helper'
        });
      }
    }
  }

  /**
   * Scan frontend for permission usage
   */
  async scanFrontendRoutes() {
    const componentFiles = this.findFiles(this.frontendDir, /\.(tsx|jsx|ts|js)$/);

    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.rootDir, filePath);

      // Pattern: usePermissions hook
      const hookPattern = /usePermissions\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
      let match;

      while ((match = hookPattern.exec(content)) !== null) {
        const resource = match[1];
        const action = match[2];

        this.protectedRoutes.push({
          file: relativePath,
          resource,
          action,
          line: this.getLineNumber(content, match.index),
          type: 'hook'
        });
      }

      // Pattern: checkPermission calls
      const checkPattern = /checkPermission\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;

      while ((match = checkPattern.exec(content)) !== null) {
        const resource = match[1];
        const action = match[2];

        this.protectedRoutes.push({
          file: relativePath,
          resource,
          action,
          line: this.getLineNumber(content, match.index),
          type: 'check'
        });
      }
    }
  }

  /**
   * Validate that all permission checks have corresponding policies
   */
  validateCoverage() {
    const allChecks = [...this.endpoints, ...this.protectedRoutes];
    const missingPolicies = [];
    const warnings = [];

    for (const check of allChecks) {
      const policy = this.policies.get(check.resource);

      if (!policy) {
        missingPolicies.push({
          ...check,
          issue: 'MISSING_POLICY',
          message: `No Cerbos policy found for resource '${check.resource}'`
        });
      } else if (!policy.actions.includes(check.action) && !policy.actions.includes('*')) {
        warnings.push({
          ...check,
          issue: 'MISSING_ACTION',
          message: `Action '${check.action}' not defined in policy '${check.resource}' (has: ${policy.actions.join(', ')})`
        });
      }
    }

    return {
      totalChecks: allChecks.length,
      totalPolicies: this.policies.size,
      missingPolicies,
      warnings,
      coverage: ((allChecks.length - missingPolicies.length) / Math.max(allChecks.length, 1) * 100).toFixed(2)
    };
  }

  /**
   * Report validation results
   */
  reportResults(result) {
    console.log('📊 Validation Results');
    console.log('='.repeat(80));
    console.log(`Total Permission Checks: ${result.totalChecks}`);
    console.log(`Total Cerbos Policies:   ${result.totalPolicies}`);
    console.log(`Coverage:                ${result.coverage}%`);
    console.log('='.repeat(80));

    if (result.missingPolicies.length > 0) {
      console.log('\n❌ Missing Policies:');
      result.missingPolicies.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.issue}: ${item.resource}.${item.action}`);
        console.log(`   File: ${item.file}:${item.line}`);
        console.log(`   ${item.message}`);
        console.log(`   Fix: Create policy file at cerbos/policies/${item.resource}.yaml`);
      });
    }

    if (result.warnings.length > 0 && this.verbose) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.issue}: ${item.resource}.${item.action}`);
        console.log(`   File: ${item.file}:${item.line}`);
        console.log(`   ${item.message}`);
      });
    }

    if (result.missingPolicies.length === 0 && result.warnings.length === 0) {
      console.log('\n✅ All permission checks have corresponding Cerbos policies!');
    }

    // JSON output for CI systems
    if (process.env.CI) {
      const jsonOutput = {
        success: result.missingPolicies.length === 0,
        coverage: result.coverage,
        totalChecks: result.totalChecks,
        totalPolicies: result.totalPolicies,
        missingPolicies: result.missingPolicies.length,
        warnings: result.warnings.length
      };
      console.log('\n📦 JSON Output:', JSON.stringify(jsonOutput));
    }
  }

  /**
   * Recursively find files matching pattern
   */
  findFiles(dir, pattern, files = []) {
    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .git, dist, build
      if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
        this.findFiles(fullPath, pattern, files);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get line number for a character index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    strict: !args.includes('--no-strict'),
    rootDir: process.cwd()
  };

  const validator = new CerbosCoverageValidator(options);
  validator.validate();
}

module.exports = CerbosCoverageValidator;

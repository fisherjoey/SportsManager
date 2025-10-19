/**
 * Automated UX/UI Analysis Script
 * Uses Puppeteer to analyze pages against UX/UI best practices
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const config = require('./audit-config.json');

class UXAuditor {
  constructor() {
    this.results = [];
  }

  async auditAccessibility(page, route) {
    const issues = [];

    try {
      // Check for ARIA labels on interactive elements
      const interactiveWithoutAria = await page.evaluate(() => {
        const elements = document.querySelectorAll('button, a, input, select, textarea');
        const missing = [];
        elements.forEach((el, idx) => {
          const hasAriaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
          const hasText = el.textContent.trim().length > 0;
          const hasAlt = el.getAttribute('alt');
          const hasPlaceholder = el.getAttribute('placeholder');
          const hasTitle = el.getAttribute('title');

          if (!hasAriaLabel && !hasText && !hasAlt && !hasPlaceholder && !hasTitle) {
            missing.push({
              tag: el.tagName,
              type: el.getAttribute('type'),
              class: el.className
            });
          }
        });
        return missing;
      });

      if (interactiveWithoutAria.length > 0) {
        issues.push({
          severity: 'high',
          category: 'accessibility',
          issue: 'Interactive elements missing ARIA labels',
          count: interactiveWithoutAria.length,
          details: interactiveWithoutAria.slice(0, 5)
        });
      }

      // Check for images without alt text
      const imagesWithoutAlt = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const missing = [];
        images.forEach(img => {
          if (!img.getAttribute('alt')) {
            missing.push({
              src: img.src,
              class: img.className
            });
          }
        });
        return missing;
      });

      if (imagesWithoutAlt.length > 0) {
        issues.push({
          severity: 'medium',
          category: 'accessibility',
          issue: 'Images missing alt text',
          count: imagesWithoutAlt.length,
          details: imagesWithoutAlt.slice(0, 5)
        });
      }

      // Check form inputs have labels
      const inputsWithoutLabels = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, select, textarea');
        const missing = [];
        inputs.forEach(input => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');

          if (!hasLabel && !hasAriaLabel && input.type !== 'hidden' && input.type !== 'submit') {
            missing.push({
              tag: input.tagName,
              type: input.type,
              name: input.name,
              class: input.className
            });
          }
        });
        return missing;
      });

      if (inputsWithoutLabels.length > 0) {
        issues.push({
          severity: 'high',
          category: 'accessibility',
          issue: 'Form inputs missing labels',
          count: inputsWithoutLabels.length,
          details: inputsWithoutLabels.slice(0, 5)
        });
      }

      // Check heading hierarchy
      const headingIssues = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const levels = headings.map(h => parseInt(h.tagName[1]));
        const issues = [];

        // Check for multiple h1s
        const h1Count = levels.filter(l => l === 1).length;
        if (h1Count > 1) {
          issues.push(`Multiple h1 elements found (${h1Count})`);
        } else if (h1Count === 0) {
          issues.push('No h1 element found');
        }

        // Check for skipped levels
        for (let i = 1; i < levels.length; i++) {
          if (levels[i] - levels[i-1] > 1) {
            issues.push(`Heading level skipped: h${levels[i-1]} to h${levels[i]}`);
          }
        }

        return issues;
      });

      if (headingIssues.length > 0) {
        issues.push({
          severity: 'medium',
          category: 'accessibility',
          issue: 'Heading hierarchy problems',
          count: headingIssues.length,
          details: headingIssues
        });
      }

    } catch (error) {
      issues.push({
        severity: 'error',
        category: 'accessibility',
        issue: 'Error during accessibility audit',
        error: error.message
      });
    }

    return issues;
  }

  async auditTypography(page, route) {
    const issues = [];

    try {
      const typographyData = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const fontSizes = new Set();
        const lineHeights = new Set();
        const fontFamilies = new Set();
        const smallText = [];

        allElements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const fontSize = parseFloat(styles.fontSize);
          const lineHeight = styles.lineHeight;
          const fontFamily = styles.fontFamily;

          fontSizes.add(fontSize);
          lineHeights.add(lineHeight);
          fontFamilies.add(fontFamily);

          // Check for text smaller than 14px
          if (fontSize < 14 && el.textContent.trim().length > 0) {
            smallText.push({
              tag: el.tagName,
              fontSize: fontSize,
              text: el.textContent.trim().substring(0, 50)
            });
          }
        });

        return {
          uniqueFontSizes: Array.from(fontSizes).sort((a, b) => a - b),
          uniqueFontFamilies: Array.from(fontFamilies),
          smallText: smallText.slice(0, 10)
        };
      });

      // Check for too many font sizes
      if (typographyData.uniqueFontSizes.length > 10) {
        issues.push({
          severity: 'low',
          category: 'typography',
          issue: 'Too many different font sizes',
          count: typographyData.uniqueFontSizes.length,
          details: `Font sizes: ${typographyData.uniqueFontSizes.join(', ')}px`
        });
      }

      // Check for small text
      if (typographyData.smallText.length > 0) {
        issues.push({
          severity: 'medium',
          category: 'typography',
          issue: 'Text smaller than 14px found',
          count: typographyData.smallText.length,
          details: typographyData.smallText
        });
      }

      // Check for too many font families
      if (typographyData.uniqueFontFamilies.length > 3) {
        issues.push({
          severity: 'low',
          category: 'typography',
          issue: 'Too many different font families',
          count: typographyData.uniqueFontFamilies.length,
          details: typographyData.uniqueFontFamilies
        });
      }

    } catch (error) {
      issues.push({
        severity: 'error',
        category: 'typography',
        issue: 'Error during typography audit',
        error: error.message
      });
    }

    return issues;
  }

  async auditLayout(page, route) {
    const issues = [];

    try {
      const layoutData = await page.evaluate(() => {
        const body = document.body;
        const hasHorizontalScroll = body.scrollWidth > window.innerWidth;
        const overflowingElements = [];

        // Find elements that overflow their containers
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.scrollWidth > el.clientWidth) {
            overflowingElements.push({
              tag: el.tagName,
              class: el.className,
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth
            });
          }
        });

        return {
          hasHorizontalScroll,
          overflowingElements: overflowingElements.slice(0, 5),
          viewportWidth: window.innerWidth,
          bodyWidth: body.scrollWidth
        };
      });

      if (layoutData.hasHorizontalScroll) {
        issues.push({
          severity: 'high',
          category: 'layout',
          issue: 'Horizontal scrolling detected',
          details: `Body width (${layoutData.bodyWidth}px) exceeds viewport (${layoutData.viewportWidth}px)`
        });
      }

      if (layoutData.overflowingElements.length > 0) {
        issues.push({
          severity: 'medium',
          category: 'layout',
          issue: 'Elements overflowing containers',
          count: layoutData.overflowingElements.length,
          details: layoutData.overflowingElements
        });
      }

    } catch (error) {
      issues.push({
        severity: 'error',
        category: 'layout',
        issue: 'Error during layout audit',
        error: error.message
      });
    }

    return issues;
  }

  async auditComponents(page, route) {
    const issues = [];

    try {
      const componentData = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');
        const buttonSizes = new Set();
        const inputSizes = new Set();
        const smallButtons = [];

        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
          buttonSizes.add(size);

          // Check for buttons smaller than 44x44px (touch target size)
          if (rect.width < 44 || rect.height < 44) {
            smallButtons.push({
              text: btn.textContent.trim(),
              size: size,
              class: btn.className
            });
          }
        });

        inputs.forEach(input => {
          const rect = input.getBoundingClientRect();
          const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
          inputSizes.add(size);
        });

        return {
          buttonCount: buttons.length,
          buttonSizes: Array.from(buttonSizes),
          smallButtons: smallButtons.slice(0, 5),
          inputSizes: Array.from(inputSizes)
        };
      });

      // Check for inconsistent button sizes
      if (componentData.buttonSizes.length > 5) {
        issues.push({
          severity: 'low',
          category: 'components',
          issue: 'Too many different button sizes',
          count: componentData.buttonSizes.length,
          details: componentData.buttonSizes
        });
      }

      // Check for small touch targets
      if (componentData.smallButtons.length > 0) {
        issues.push({
          severity: 'high',
          category: 'components',
          issue: 'Buttons smaller than recommended touch target (44x44px)',
          count: componentData.smallButtons.length,
          details: componentData.smallButtons
        });
      }

    } catch (error) {
      issues.push({
        severity: 'error',
        category: 'components',
        issue: 'Error during component audit',
        error: error.message
      });
    }

    return issues;
  }

  async auditPage(page, route, viewport) {
    console.log(`  🔍 Auditing ${route.name} at ${viewport}...`);

    const issues = [];

    // Run all audits
    const accessibilityIssues = await this.auditAccessibility(page, route);
    const typographyIssues = await this.auditTypography(page, route);
    const layoutIssues = await this.auditLayout(page, route);
    const componentIssues = await this.auditComponents(page, route);

    issues.push(...accessibilityIssues, ...typographyIssues, ...layoutIssues, ...componentIssues);

    return {
      route: route.name,
      path: route.path,
      viewport,
      timestamp: new Date().toISOString(),
      issues,
      summary: {
        total: issues.length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
        errors: issues.filter(i => i.severity === 'error').length
      }
    };
  }
}

async function runAudit() {
  console.log('🔍 Starting automated UX/UI audit...\n');

  const auditor = new UXAuditor();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const allResults = [];

  try {
    for (const [viewportName, size] of Object.entries(config.viewportSizes)) {
      console.log(`\n📱 Auditing at ${viewportName} (${size.width}x${size.height})`);

      const page = await browser.newPage();
      await page.setViewport(size);

      // Login
      await page.goto(`${config.app.url}${config.app.loginPath}`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[type="email"], input[name="email"]');
      await page.type('input[type="email"], input[name="email"]', config.app.credentials.email);
      await page.type('input[type="password"], input[name="password"]', config.app.credentials.password);
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
      await page.waitForTimeout(config.app.waitAfterLogin);

      // Audit each route
      for (const route of config.routes) {
        if (!route.viewports.includes(viewportName)) continue;

        await page.goto(`${config.app.url}${route.path}`, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(config.app.screenshotDelay);

        const result = await auditor.auditPage(page, route, viewportName);
        allResults.push(result);

        const emoji = result.summary.high > 0 ? '❌' : result.summary.medium > 0 ? '⚠️' : '✅';
        console.log(`  ${emoji} ${route.name}: ${result.summary.total} issues (${result.summary.high} high, ${result.summary.medium} medium)`);
      }

      await page.close();
    }

    // Save results
    const reportDir = path.resolve(__dirname, '../../', config.output.reportDir);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const reportPath = path.join(reportDir, `audit-results-${timestamp}.json`);

    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: {
        url: config.app.url,
        viewports: Object.keys(config.viewportSizes),
        routes: config.routes.length
      },
      results: allResults,
      summary: {
        totalPages: allResults.length,
        totalIssues: allResults.reduce((sum, r) => sum + r.summary.total, 0),
        highSeverity: allResults.reduce((sum, r) => sum + r.summary.high, 0),
        mediumSeverity: allResults.reduce((sum, r) => sum + r.summary.medium, 0),
        lowSeverity: allResults.reduce((sum, r) => sum + r.summary.low, 0)
      }
    }, null, 2));

    console.log(`\n✅ Audit complete! Report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error during audit:', error);
    throw error;
  } finally {
    await browser.close();
  }

  return allResults;
}

if (require.main === module) {
  runAudit()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAudit, UXAuditor };

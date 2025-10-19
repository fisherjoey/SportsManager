/**
 * Report Generator
 * Creates human-readable HTML and Markdown reports from audit results
 */

const fs = require('fs');
const path = require('path');

function generateHTMLReport(auditData, screenshotManifest) {
  const { timestamp, results, summary, config: auditConfig } = auditData;

  // Group results by route
  const byRoute = {};
  results.forEach(result => {
    if (!byRoute[result.route]) {
      byRoute[result.route] = [];
    }
    byRoute[result.route].push(result);
  });

  // Generate severity badge HTML
  const severityBadge = (severity) => {
    const colors = {
      high: '#dc2626',
      medium: '#f59e0b',
      low: '#3b82f6',
      error: '#7c3aed'
    };
    return `<span style="background: ${colors[severity] || '#6b7280'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${severity.toUpperCase()}</span>`;
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UX/UI Audit Report - ${timestamp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 40px 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #111827; margin-bottom: 8px; font-size: 32px; }
    .subtitle { color: #6b7280; margin-bottom: 32px; font-size: 14px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .summary-card { background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .summary-card h3 { font-size: 14px; color: #6b7280; margin-bottom: 8px; font-weight: 500; }
    .summary-card .value { font-size: 32px; font-weight: 700; color: #111827; }
    .route-section { margin-bottom: 40px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .route-header { background: #f9fafb; padding: 20px; border-bottom: 1px solid #e5e7eb; }
    .route-header h2 { font-size: 20px; color: #111827; margin-bottom: 8px; }
    .route-header .path { color: #6b7280; font-family: monospace; font-size: 14px; }
    .viewport-section { padding: 20px; border-bottom: 1px solid #e5e7eb; }
    .viewport-section:last-child { border-bottom: none; }
    .viewport-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .viewport-header h3 { font-size: 16px; color: #111827; }
    .issue-count { background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; }
    .issue-count.success { background: #dcfce7; color: #166534; }
    .issue-count.warning { background: #fef3c7; color: #92400e; }
    .issues-list { list-style: none; }
    .issue-item { padding: 12px; margin-bottom: 8px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #d1d5db; }
    .issue-item.high { border-left-color: #dc2626; background: #fef2f2; }
    .issue-item.medium { border-left-color: #f59e0b; background: #fffbeb; }
    .issue-item.low { border-left-color: #3b82f6; background: #eff6ff; }
    .issue-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
    .issue-title { font-weight: 600; font-size: 14px; flex: 1; }
    .issue-details { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .issue-details pre { background: white; padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin-top: 8px; }
    .screenshot { margin-top: 12px; }
    .screenshot img { max-width: 300px; border-radius: 4px; border: 1px solid #e5e7eb; }
    .no-issues { text-align: center; padding: 40px; color: #6b7280; }
    .no-issues .icon { font-size: 48px; margin-bottom: 16px; }
    .criteria-section { margin-top: 40px; padding-top: 40px; border-top: 2px solid #e5e7eb; }
    .criteria-category { margin-bottom: 24px; }
    .criteria-category h3 { font-size: 16px; margin-bottom: 12px; color: #111827; }
    .criteria-list { list-style: none; padding-left: 0; }
    .criteria-list li { padding: 8px 0; color: #4b5563; font-size: 14px; }
    .criteria-list li:before { content: "✓ "; color: #10b981; font-weight: bold; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 UX/UI Audit Report</h1>
    <p class="subtitle">Generated on ${new Date(timestamp).toLocaleString()}</p>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Pages Audited</h3>
        <div class="value">${summary.totalPages}</div>
      </div>
      <div class="summary-card">
        <h3>Total Issues Found</h3>
        <div class="value">${summary.totalIssues}</div>
      </div>
      <div class="summary-card">
        <h3>High Severity</h3>
        <div class="value" style="color: #dc2626;">${summary.highSeverity}</div>
      </div>
      <div class="summary-card">
        <h3>Medium Severity</h3>
        <div class="value" style="color: #f59e0b;">${summary.mediumSeverity}</div>
      </div>
      <div class="summary-card">
        <h3>Low Severity</h3>
        <div class="value" style="color: #3b82f6;">${summary.lowSeverity}</div>
      </div>
    </div>

    ${Object.entries(byRoute).map(([routeName, routeResults]) => {
      const totalIssues = routeResults.reduce((sum, r) => sum + r.summary.total, 0);
      const highIssues = routeResults.reduce((sum, r) => sum + r.summary.high, 0);

      return `
      <div class="route-section">
        <div class="route-header">
          <h2>${routeName}</h2>
          <p class="path">${routeResults[0].path}</p>
        </div>
        ${routeResults.map(result => {
          const issueClass = result.summary.high > 0 ? 'error' : result.summary.medium > 0 ? 'warning' : 'success';

          return `
          <div class="viewport-section">
            <div class="viewport-header">
              <h3>📱 ${result.viewport}</h3>
              <span class="issue-count ${issueClass}">
                ${result.summary.total} issue${result.summary.total !== 1 ? 's' : ''}
              </span>
            </div>
            ${result.issues.length > 0 ? `
              <ul class="issues-list">
                ${result.issues.map(issue => `
                  <li class="issue-item ${issue.severity}">
                    <div class="issue-header">
                      <div class="issue-title">${issue.issue}</div>
                      ${severityBadge(issue.severity)}
                    </div>
                    <div class="issue-details">
                      <strong>Category:</strong> ${issue.category}
                      ${issue.count ? `<br><strong>Occurrences:</strong> ${issue.count}` : ''}
                      ${issue.details ? `<pre>${JSON.stringify(issue.details, null, 2)}</pre>` : ''}
                      ${issue.error ? `<br><strong>Error:</strong> ${issue.error}` : ''}
                    </div>
                  </li>
                `).join('')}
              </ul>
            ` : `
              <div class="no-issues">
                <div class="icon">✨</div>
                <p>No issues found!</p>
              </div>
            `}
          </div>
          `;
        }).join('')}
      </div>
      `;
    }).join('')}

    <div class="criteria-section">
      <h2 style="margin-bottom: 24px;">📋 Audit Criteria Reference</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">
        The automated audit checks pages against the following UX/UI best practices:
      </p>
      ${Object.entries(require('./audit-config.json').auditCriteria).map(([category, criteria]) => `
        <div class="criteria-category">
          <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
          <ul class="criteria-list">
            ${criteria.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

function generateMarkdownReport(auditData) {
  const { timestamp, results, summary } = auditData;

  let md = `# 🔍 UX/UI Audit Report\n\n`;
  md += `**Generated:** ${new Date(timestamp).toLocaleString()}\n\n`;
  md += `## 📊 Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Pages Audited | ${summary.totalPages} |\n`;
  md += `| Total Issues | ${summary.totalIssues} |\n`;
  md += `| High Severity | ${summary.highSeverity} |\n`;
  md += `| Medium Severity | ${summary.mediumSeverity} |\n`;
  md += `| Low Severity | ${summary.lowSeverity} |\n\n`;

  // Group by route
  const byRoute = {};
  results.forEach(result => {
    if (!byRoute[result.route]) {
      byRoute[result.route] = [];
    }
    byRoute[result.route].push(result);
  });

  md += `## 📄 Detailed Results\n\n`;

  Object.entries(byRoute).forEach(([routeName, routeResults]) => {
    md += `### ${routeName}\n\n`;
    md += `**Path:** \`${routeResults[0].path}\`\n\n`;

    routeResults.forEach(result => {
      md += `#### ${result.viewport}\n\n`;

      if (result.issues.length === 0) {
        md += `✅ No issues found!\n\n`;
      } else {
        result.issues.forEach(issue => {
          const emoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🔵';
          md += `${emoji} **[${issue.severity.toUpperCase()}]** ${issue.issue}\n`;
          md += `- **Category:** ${issue.category}\n`;
          if (issue.count) md += `- **Occurrences:** ${issue.count}\n`;
          if (issue.details) md += `- **Details:** \`${JSON.stringify(issue.details).substring(0, 100)}...\`\n`;
          md += `\n`;
        });
      }
    });
  });

  return md;
}

async function generateReports(auditResultsPath, screenshotManifestPath = null) {
  console.log('📝 Generating reports...\n');

  // Load audit results
  const auditData = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));

  // Load screenshot manifest if provided
  let screenshotManifest = null;
  if (screenshotManifestPath && fs.existsSync(screenshotManifestPath)) {
    screenshotManifest = JSON.parse(fs.readFileSync(screenshotManifestPath, 'utf8'));
  }

  const reportDir = path.dirname(auditResultsPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

  // Generate HTML report
  const htmlReport = generateHTMLReport(auditData, screenshotManifest);
  const htmlPath = path.join(reportDir, `audit-report-${timestamp}.html`);
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`✅ HTML report: ${htmlPath}`);

  // Generate Markdown report
  const mdReport = generateMarkdownReport(auditData);
  const mdPath = path.join(reportDir, `audit-report-${timestamp}.md`);
  fs.writeFileSync(mdPath, mdReport);
  console.log(`✅ Markdown report: ${mdPath}`);

  return { htmlPath, mdPath };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node generate-report.js <audit-results.json> [screenshot-manifest.json]');
    process.exit(1);
  }

  generateReports(args[0], args[1])
    .then(({ htmlPath, mdPath }) => {
      console.log('\n✅ Reports generated successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error generating reports:', error);
      process.exit(1);
    });
}

module.exports = { generateReports, generateHTMLReport, generateMarkdownReport };

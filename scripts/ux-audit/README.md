# 🔍 Automated UX/UI Audit System

A fully automated system for auditing the UX/UI design of the Sports Management Platform. This tool requires **zero user input** - just run it and wait for comprehensive reports.

## 🚀 Features

- **Fully Automated**: No user interaction required after initial setup
- **Comprehensive Coverage**: Audits all pages across desktop, tablet, and mobile viewports
- **Screenshot Capture**: Takes full-page screenshots of every route
- **Automated Analysis**: Checks against 100+ UX/UI best practices
- **Beautiful Reports**: Generates HTML and Markdown reports with detailed findings
- **Multi-Viewport Testing**: Tests on desktop (1920x1080), tablet (768x1024), and mobile (375x667)

## 📋 What It Audits

The system checks for issues across multiple categories:

### Accessibility
- ARIA labels on interactive elements
- Alt text on images
- Form input labels
- Heading hierarchy
- Keyboard navigation
- Focus indicators

### Typography
- Font size consistency
- Readability (minimum 14px)
- Font family usage
- Line height
- Text hierarchy

### Layout
- Responsive design
- Horizontal scrolling issues
- Content overflow
- Grid/flex alignment
- Z-index stacking

### Components
- Button consistency
- Form input styling
- Touch target sizes (44x44px minimum)
- Modal positioning
- Loading states
- Error states

### Performance
- Image optimization
- Layout shift
- Animation smoothness
- Bundle size

### Consistency
- Design system adherence
- Spacing consistency
- Color usage
- Icon consistency

## 🛠️ Setup

### 1. Install Dependencies

From the `scripts/ux-audit` directory:

```bash
cd scripts/ux-audit
npm install
```

This will install Puppeteer (headless Chrome browser).

### 2. Configure Audit Settings

Edit `audit-config.json` to customize:

- **Login credentials**: Update `app.credentials` with valid credentials
- **App URL**: Change `app.url` if not using localhost:3000
- **Routes to audit**: Add/remove routes in the `routes` array
- **Viewport sizes**: Modify `viewportSizes` to test different screen sizes
- **Wait times**: Adjust delays if your app needs more time to load

Example configuration:

```json
{
  "app": {
    "url": "http://localhost:3000",
    "credentials": {
      "email": "admin@example.com",
      "password": "admin123"
    }
  }
}
```

### 3. Ensure Dev Server is Running

The audit system needs the application to be running:

```bash
# From project root
npm run dev
```

Wait for the server to be fully started before running the audit.

## 🎯 Usage

### Run Full Audit (Recommended)

This runs the complete audit workflow - screenshots, analysis, and report generation:

```bash
cd scripts/ux-audit
npm run audit
```

Or:

```bash
node run-full-audit.js
```

**Expected output:**
```
╔═══════════════════════════════════════════════════════════╗
║        🔍 AUTOMATED UX/UI AUDIT SYSTEM                   ║
║  This will run a comprehensive audit of the application  ║
║  No user input required - sit back and relax!            ║
╚═══════════════════════════════════════════════════════════╝

STEP 1/3: Capturing Screenshots
📱 Capturing screenshots at desktop...
  📸 Capturing Dashboard at desktop...
  ✅ Saved: dashboard_desktop.png
  ...

STEP 2/3: Running UX/UI Analysis
🔍 Auditing at desktop...
  🔍 Auditing Dashboard at desktop...
  ✅ Dashboard: 12 issues (2 high, 5 medium)
  ...

STEP 3/3: Generating Reports
📝 Generating reports...
✅ HTML report: ./reports/audit-report-2025-10-01.html
✅ Markdown report: ./reports/audit-report-2025-10-01.md

🎉 AUDIT COMPLETE!
```

### Run Individual Steps

You can also run each step separately:

**Capture Screenshots Only:**
```bash
npm run audit:screenshots
```

**Analyze UX/UI Only:**
```bash
npm run audit:analyze
```

**Generate Reports Only:**
```bash
npm run audit:report <path-to-audit-results.json>
```

## 📁 Output Files

The audit generates several files:

```
scripts/ux-audit/
├── screenshots/
│   └── 2025-10-01/
│       ├── dashboard_desktop.png
│       ├── dashboard_tablet.png
│       ├── dashboard_mobile.png
│       ├── games_management_desktop.png
│       ├── ...
│       └── manifest.json
└── reports/
    ├── audit-results-2025-10-01.json  (Raw data)
    ├── audit-report-2025-10-01.html   (Interactive report)
    └── audit-report-2025-10-01.md     (Text summary)
```

### HTML Report

Open `audit-report-*.html` in your browser for an interactive report with:
- Executive summary with issue counts
- Issues organized by page and viewport
- Severity badges (High/Medium/Low)
- Detailed descriptions and code snippets
- Complete audit criteria reference

### Markdown Report

The `.md` file provides a text-based summary suitable for:
- Including in pull requests
- Sharing via Slack/Teams
- Version control tracking
- Quick command-line viewing

### JSON Results

The `.json` file contains raw audit data for:
- Custom processing
- CI/CD integration
- Trend analysis over time
- Programmatic access

## 🎛️ Configuration Options

### Viewport Sizes

Customize in `audit-config.json`:

```json
"viewportSizes": {
  "desktop": { "width": 1920, "height": 1080 },
  "tablet": { "width": 768, "height": 1024 },
  "mobile": { "width": 375, "height": 667 },
  "ultra-wide": { "width": 2560, "height": 1440 }
}
```

### Routes to Audit

Add or remove routes:

```json
"routes": [
  {
    "path": "/dashboard",
    "name": "Dashboard",
    "requiresAuth": true,
    "viewports": ["desktop", "tablet", "mobile"]
  },
  {
    "path": "/new-page",
    "name": "New Page",
    "requiresAuth": false,
    "viewports": ["desktop"]
  }
]
```

### Timing Adjustments

If your app is slow to load, increase delays:

```json
"app": {
  "waitAfterLogin": 5000,      // Wait 5s after login
  "waitBetweenPages": 3000,    // Wait 3s between pages
  "screenshotDelay": 2000      // Wait 2s before screenshot
}
```

## 🔧 Troubleshooting

### "Login failed" or "Navigation timeout"

- Verify dev server is running (`npm run dev`)
- Check login credentials in `audit-config.json`
- Increase `waitAfterLogin` value
- Check if login page URL has changed

### "No issues found" or suspiciously few issues

- The page might not be loading correctly
- Check screenshots to verify pages loaded
- Increase `screenshotDelay` to allow loading
- Look for JavaScript errors in browser console

### Puppeteer installation fails

```bash
# Windows
npm install puppeteer --ignore-scripts=false

# Linux
sudo apt-get install -y chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer
```

### Screenshots are blank

- Page might be using authentication that blocks headless browsers
- Try adding `headless: false` in capture-screenshots.js for debugging
- Check if routes require additional permissions

## 📊 Interpreting Results

### Severity Levels

- **High** 🔴: Critical UX/UI issues that impact usability or accessibility
  - Missing ARIA labels
  - Form inputs without labels
  - Touch targets < 44px
  - Horizontal scrolling on mobile

- **Medium** 🟡: Important issues that should be fixed
  - Heading hierarchy problems
  - Images without alt text
  - Small text (< 14px)
  - Layout inconsistencies

- **Low** 🔵: Minor improvements for better UX
  - Too many font sizes
  - Inconsistent spacing
  - Button size variations

## 🔄 CI/CD Integration

Run the audit in your CI pipeline:

```yaml
# .github/workflows/ux-audit.yml
name: UX/UI Audit

on:
  pull_request:
  schedule:
    - cron: '0 2 * * *'  # Run nightly at 2 AM

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          npm install
          cd scripts/ux-audit && npm install

      - name: Start dev server
        run: npm run dev &

      - name: Wait for server
        run: sleep 10

      - name: Run audit
        run: cd scripts/ux-audit && npm run audit

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: ux-audit-reports
          path: scripts/ux-audit/reports/
```

## 📝 Best Practices

1. **Run regularly**: Set up nightly audits to catch regressions early
2. **Review before releases**: Always audit before major releases
3. **Track trends**: Compare results over time to measure improvement
4. **Prioritize fixes**: Start with high severity issues
5. **Update config**: Keep routes and credentials current
6. **Share reports**: Include in PRs and team discussions

## 🤝 Contributing

To add new audit checks:

1. Edit `analyze-ux.js`
2. Add a new audit method (e.g., `auditColors`)
3. Call it in `auditPage` method
4. Update `audit-config.json` with new criteria
5. Test on sample pages

## 📄 License

MIT

---

**Questions or issues?** Open an issue in the repository or contact the development team.

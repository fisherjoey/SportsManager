# Converting seng513-deployment.md to PDF

You have several options to convert the markdown file to PDF:

## Option 1: Using VS Code (Recommended - Easiest)

1. **Install Extension:**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Markdown PDF"
   - Install the extension by yzane

2. **Convert:**
   - Open `seng513-deployment.md` in VS Code
   - Right-click in the editor
   - Select "Markdown PDF: Export (pdf)"
   - The PDF will be created in the same directory

## Option 2: Using Pandoc (Best Quality)

1. **Install Pandoc:**
   - Download from: https://pandoc.org/installing.html
   - Or use: `choco install pandoc` (Windows with Chocolatey)

2. **Install LaTeX (for better PDF output):**
   - Windows: https://miktex.org/download
   - Or: `choco install miktex`

3. **Convert:**
   ```bash
   pandoc seng513-deployment.md -o seng513-deployment.pdf --pdf-engine=pdflatex -V geometry:margin=1in
   ```

## Option 3: Using Online Converter

1. **Markdown to PDF:**
   - https://www.markdowntopdf.com/
   - https://cloudconvert.com/md-to-pdf
   - https://dillinger.io/ (has export to PDF)

2. **Steps:**
   - Upload or paste `seng513-deployment.md`
   - Click "Convert" or "Export to PDF"
   - Download `seng513-deployment.pdf`

## Option 4: Using Chrome/Edge Browser

1. **Install Markdown Viewer Extension:**
   - Chrome: "Markdown Viewer" by simov
   - Edge: Same extension from Chrome Web Store

2. **Convert:**
   - Open `seng513-deployment.md` in browser
   - Press Ctrl+P (Print)
   - Select "Save as PDF"
   - Save as `seng513-deployment.pdf`

## Option 5: Using Python (if you have Python installed)

1. **Install grip:**
   ```bash
   pip install grip
   ```

2. **Generate HTML:**
   ```bash
   grip seng513-deployment.md --export seng513-deployment.html
   ```

3. **Convert HTML to PDF:**
   - Open `seng513-deployment.html` in Chrome
   - Press Ctrl+P
   - Save as PDF

## Recommended Settings for PDF

When converting, use these settings for best results:

- **Page Size:** Letter (8.5 x 11 inches)
- **Margins:** 1 inch on all sides
- **Header/Footer:** Optional (add page numbers if desired)
- **Font:** Default (usually matches system font)
- **Color:** Color (to preserve syntax highlighting if any)

## Quick Command (if Pandoc is installed)

The simplest command if you have Pandoc:

```bash
cd C:\Users\School\OneDrive\Desktop\SportsManager-pre-typescript
pandoc seng513-deployment.md -o seng513-deployment.pdf
```

## Final Step

After converting to PDF, verify the PDF includes:

- [ ] All sections are present
- [ ] Table of contents is formatted correctly
- [ ] Code blocks are readable
- [ ] No text is cut off at margins
- [ ] All diagrams/ASCII art are visible
- [ ] Page numbers are correct (if added)

## Naming Convention

Make sure the final PDF is named exactly: **seng513-deployment.pdf**

This is required for the submission.

---

*After creating the PDF, you can submit:*
1. `seng513-deployment.pdf` - To the Docker Compose Dropbox
2. `seng513-deployment_files.zip` - To the Docker Compose Dropbox

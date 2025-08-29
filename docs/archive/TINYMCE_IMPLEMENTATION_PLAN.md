# TinyMCE Database Implementation Plan

## Executive Summary

Your TinyMCE frontend is ready. The database analysis reveals that your **existing posts system** is already compatible with TinyMCE HTML content storage. Only minimal database changes are needed.

## Current State Assessment

### ✅ What's Already Working
- **PostgreSQL database** with Knex.js ORM
- **Posts table** with unlimited `text` field for HTML content  
- **Media attachments** system (post_media table)
- **User permissions** and authentication
- **REST API** with full CRUD operations
- **Categories and tags** support

### 🚨 Critical Security Issue Found
- **HTML sanitization disabled** in resource-centre.tsx (`sanitize: false`)
- **XSS vulnerability** - must be fixed before production

## Database Strategy: Extend Existing Posts System

### Why Extend Instead of Rebuild?
- **1-2 days** vs 1-2 weeks implementation
- **Zero breaking changes**
- **Proven infrastructure** already tested
- **All features included** (permissions, media, search)

### Required Database Changes

```sql
-- Single migration adds TinyMCE support
ALTER TABLE posts 
ADD COLUMN content_type VARCHAR(20) DEFAULT 'html',
ADD COLUMN editor_data JSON;

CREATE INDEX idx_posts_content_type ON posts(content_type);
```

### What These Fields Do
- **content_type**: Distinguishes HTML (TinyMCE) from markdown content
- **editor_data**: Stores TinyMCE configuration and metadata

## Implementation Steps

### Phase 1: Critical Security Fixes (IMMEDIATE)

1. **Install DOMPurify**
```bash
npm install dompurify @types/dompurify
```

2. **Fix resource-centre.tsx sanitization**
```typescript
// Replace: .use(remarkHtml, { sanitize: false })
// With: .use(remarkHtml, { sanitize: true })

// Or better, use DOMPurify:
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(content);
```

3. **Add Content Security Policy**
```javascript
// next.config.js
headers: [{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self'..."
}]
```

### Phase 2: Database Migration (30 minutes)

1. **Create migration file**
```javascript
// migrations/20250829_add_tinymce_support.js
exports.up = async (knex) => {
  await knex.schema.alterTable('posts', table => {
    table.string('content_type', 20).defaultTo('html');
    table.json('editor_data');
  });
  
  await knex.raw('CREATE INDEX idx_posts_content_type ON posts(content_type)');
};
```

2. **Run migration**
```bash
cd backend && npx knex migrate:latest
```

### Phase 3: API Updates (1-2 hours)

1. **Update validation schema** (backend/src/routes/posts.js)
```javascript
const createPostSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().required(),
  content_type: Joi.string().valid('html', 'markdown'),
  editor_data: Joi.object().optional(),
  // ... existing fields
});
```

2. **Add HTML sanitization middleware**
```javascript
const sanitizeHtml = (req, res, next) => {
  if (req.body.content && req.body.content_type === 'html') {
    req.body.content = DOMPurify.sanitize(req.body.content);
  }
  next();
};
```

### Phase 4: Frontend Integration (1-2 hours)

1. **Update resource creation to use posts API**
```javascript
// When saving from TinyMCE
const saveContent = async (content) => {
  const response = await fetch('/api/posts', {
    method: 'POST',
    body: JSON.stringify({
      title: title,
      content: content, // TinyMCE HTML
      content_type: 'html',
      category: 'resource',
      editor_data: { 
        plugins: tinymce.activeEditor.plugins,
        version: tinymce.majorVersion 
      }
    })
  });
};
```

## File Storage for Images

### Current System
- **post_media** table already handles file attachments
- Supports images, documents, videos

### TinyMCE Image Handling
```javascript
// Configure TinyMCE for image uploads
tinymce.init({
  images_upload_handler: async (blobInfo) => {
    const formData = new FormData();
    formData.append('file', blobInfo.blob());
    
    const response = await fetch('/api/posts/media', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    return data.url; // Return image URL for TinyMCE
  }
});
```

## Security Best Practices

### Required Libraries
```bash
npm install dompurify helmet express-rate-limit
```

### Validation Pipeline
1. **Client-side**: DOMPurify before submission
2. **Server-side**: Validate and sanitize again
3. **Database**: Store sanitized HTML
4. **Output**: Sanitize before rendering

### Content Security Policy
```javascript
// Strict CSP for production
"default-src 'self'; 
 script-src 'self' 'unsafe-inline' tinymce.com; 
 style-src 'self' 'unsafe-inline'; 
 img-src 'self' data: https:;"
```

## Testing Strategy

### Unit Tests
```javascript
describe('TinyMCE Content Security', () => {
  test('should sanitize XSS attempts', () => {
    const malicious = '<script>alert("XSS")</script>';
    const sanitized = sanitizeContent(malicious);
    expect(sanitized).not.toContain('<script>');
  });
});
```

### Integration Tests
- Test HTML content storage and retrieval
- Verify image upload and embedding
- Validate sanitization at all layers

## Performance Considerations

### Database Optimization
```sql
-- Full-text search for HTML content
CREATE INDEX posts_content_fulltext 
ON posts USING gin(to_tsvector('english', content));

-- Optimize content type queries
CREATE INDEX idx_posts_html_content 
ON posts(id) WHERE content_type = 'html';
```

### Caching Strategy
- Cache rendered HTML content
- CDN for uploaded images
- Browser caching for static resources

## Migration from Markdown Files

### Optional: Import existing markdown content
```javascript
// One-time migration script
const importMarkdownToPosts = async () => {
  const markdownFiles = await glob('content/**/*.md');
  
  for (const file of markdownFiles) {
    const content = await fs.readFile(file);
    const html = await markdownToHtml(content);
    
    await db('posts').insert({
      title: extractTitle(file),
      content: html,
      content_type: 'markdown',
      category: 'resource'
    });
  }
};
```

## Timeline

### Day 1 (4-6 hours)
- ✅ Security fixes (2 hours)
- ✅ Database migration (30 min)
- ✅ API updates (2 hours)
- ✅ Basic testing (1 hour)

### Day 2 (4-6 hours) 
- Frontend integration (2 hours)
- Image upload handling (2 hours)
- Full testing suite (2 hours)

## Rollback Plan

If issues arise:
```sql
-- Rollback migration
ALTER TABLE posts 
DROP COLUMN content_type,
DROP COLUMN editor_data;
```

## Next Steps

1. **Immediate**: Fix HTML sanitization vulnerability
2. **Today**: Run database migration
3. **Tomorrow**: Complete API and frontend integration
4. **This Week**: Deploy to staging for testing

## Questions to Resolve

1. **Image Storage**: Local filesystem or cloud (S3)?
2. **Version Control**: Keep all versions or last N?
3. **Search**: Implement full-text search now or later?
4. **Migration**: Import existing markdown content?

## Summary

Your TinyMCE implementation requires:
- **2 new database fields**
- **Security fixes** (critical)
- **Minor API updates**
- **1-2 days total effort**

The existing posts system provides everything needed. No major architectural changes required.

---

*Generated: 2025-08-29*
*Status: Ready for Implementation*
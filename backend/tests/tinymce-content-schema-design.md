# TinyMCE Rich Text Content Database Schema Design

## Overview

This database schema is designed to handle rich text content from TinyMCE in a sports management application, with comprehensive support for versioning, permissions, search, and media management.

## Design Principles

1. **Separation of Concerns**: Content, metadata, versioning, and permissions are separated into distinct tables
2. **Scalability**: Designed to handle thousands of content items with efficient indexing
3. **Flexibility**: Supports multiple content types and extensible metadata
4. **Performance**: Optimized for common read/write patterns with strategic indexing
5. **Data Integrity**: Proper constraints and foreign keys ensure data consistency

## Core Tables

### content_items (Main Content Storage)

**Purpose**: Primary table for storing TinyMCE rich text content

**Key Design Decisions**:
- **content**: Stores HTML directly from TinyMCE (TEXT type for unlimited length)
- **content_plain**: Auto-generated plain text version for search optimization
- **slug**: URL-friendly identifier for SEO and routing
- **status**: Draft/published/archived workflow support
- **visibility**: Public/private/restricted access control
- **search_keywords**: PostgreSQL array for flexible keyword tagging

**Trade-offs**:
- ✅ Simple structure, easy to query
- ✅ Good performance for most operations
- ❌ Content versioning requires separate table
- ❌ Large HTML content can impact memory usage

### content_versions (Version History)

**Purpose**: Complete versioning system for content changes

**Key Features**:
- Snapshot of title, content, and metadata at each version
- Automatic version creation via database triggers
- Change summary for tracking what was modified
- Efficient storage with only essential fields duplicated

**Benefits**:
- Complete audit trail of content changes
- Ability to rollback to any previous version
- Supports collaborative editing workflows
- Minimal performance impact on main content queries

### content_categories (Hierarchical Organization)

**Purpose**: Tree-structured categorization system

**Features**:
- Self-referencing parent_id for unlimited hierarchy depth
- Slug for SEO-friendly URLs
- Color and icon support for UI representation
- Soft-delete with is_active flag

### content_attachments (Media Management)

**Purpose**: Handle embedded images, videos, and file attachments

**Key Features**:
- **file_hash**: SHA-256 hash for duplicate detection and storage optimization
- **is_embedded**: Tracks whether file is embedded in TinyMCE content
- **attachment_type**: Categorizes files for different handling
- **alt_text**: Accessibility support for images

**Storage Strategy**:
- Files stored on filesystem with relative paths in database
- Hash-based deduplication prevents storage waste
- MIME type validation ensures security

## Advanced Features

### Full-Text Search

**Implementation**:
```sql
-- PostgreSQL tsvector for efficient full-text search
CREATE TABLE content_search_index (
    content_item_id INTEGER PRIMARY KEY,
    search_vector tsvector,
    last_indexed_at TIMESTAMP WITH TIME ZONE
);
```

**Weighted Search**:
- Title: Weight 'A' (highest priority)
- Content: Weight 'B' 
- Meta description: Weight 'C'
- Keywords: Weight 'D'

**Benefits**:
- Fast full-text search across all content
- Relevance ranking with weighted results
- Language-aware stemming and tokenization
- Separate index table prevents impact on main queries

### Permission System

**Granular Access Control**:
- User-based and role-based permissions
- Read/write/delete/publish permission levels
- Inheritance from content item visibility settings
- Audit trail of permission grants

**Design Pattern**:
```sql
-- Either user_id OR role_name, not both
CONSTRAINT permission_subject_check CHECK (
    (user_id IS NOT NULL AND role_name IS NULL) OR 
    (user_id IS NULL AND role_name IS NOT NULL)
)
```

### Analytics and Tracking

**Metrics Collected**:
- View counts and download statistics
- Time spent reading content
- Monthly snapshots for historical analysis
- Bounce rate tracking

**Performance Considerations**:
- Separate analytics table prevents write contention
- Monthly aggregation reduces storage requirements
- Indexes optimized for dashboard queries

## Indexing Strategy

### Primary Lookup Indexes
```sql
-- Status-based queries (most common)
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_published_featured ON content_items(status, is_featured, published_at DESC) 
    WHERE status = 'published';

-- Category browsing
CREATE INDEX idx_content_items_category_published ON content_items(category_id, status, published_at DESC)
    WHERE status = 'published';
```

### Performance Optimizations
- Composite indexes for common query patterns
- Partial indexes for frequently filtered subsets
- GIN index for full-text search vectors
- Covering indexes to avoid table lookups

## Automation with Triggers

### Version Creation
```sql
CREATE TRIGGER create_content_version_trigger
    AFTER UPDATE ON content_items
    FOR EACH ROW EXECUTE FUNCTION create_content_version();
```

### Search Index Updates
- Automatically updates search vectors when content changes
- Weighted text processing for relevance ranking
- Handles NULL values gracefully

### Tag Usage Tracking
- Maintains usage counts for popular tag queries
- Updates on tag assignment/removal
- Prevents negative counts

## Scalability Considerations

### Storage Optimization
- **HTML Content**: TEXT type allows unlimited content length
- **File Deduplication**: Hash-based storage prevents duplicate files
- **Archival Strategy**: Soft deletes with status flags

### Query Performance
- **Pagination**: Efficient offset/limit with proper indexes
- **Caching**: Structure supports Redis/Memcached integration
- **CDN Integration**: File paths support CDN URL prefixing

### Growth Patterns
- **Horizontal Scaling**: Content can be partitioned by date or category
- **Read Replicas**: Schema supports read-only replicas for analytics
- **Archive Strategy**: Old versions can be moved to separate tables

## Alternative Approaches Considered

### Single Table vs. Multiple Tables
**Chosen**: Multiple tables
- ✅ Better normalization and data integrity
- ✅ More flexible querying and indexing
- ✅ Easier to extend with new features
- ❌ More complex joins for full content retrieval

### JSON vs. Relational for Metadata
**Chosen**: Relational with some JSON arrays
- ✅ Better query performance and indexing
- ✅ Data validation and constraints
- ✅ Easier to generate reports and analytics
- ❌ Less flexible for arbitrary metadata

### File Storage Options
**Chosen**: Filesystem with database metadata
- ✅ Better performance for large files
- ✅ Easier backup and CDN integration
- ✅ Reduced database size
- ❌ More complex deployment and backup procedures

## Integration with TinyMCE

### Content Processing Pipeline
1. **Input**: Raw HTML from TinyMCE editor
2. **Sanitization**: Clean HTML for security
3. **Media Processing**: Extract and process embedded images
4. **Text Extraction**: Generate plain text for search
5. **Storage**: Save to database with proper relationships

### Image Handling
```javascript
// TinyMCE configuration for image uploads
{
    images_upload_url: '/api/content/upload-image',
    images_upload_handler: async (blobInfo) => {
        const formData = new FormData();
        formData.append('file', blobInfo.blob(), blobInfo.filename());
        
        const response = await fetch('/api/content/upload-image', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        return result.file_url;
    }
}
```

## Security Considerations

### Input Validation
- HTML sanitization to prevent XSS attacks
- File type validation for uploads
- Size limits for content and attachments
- MIME type verification

### Access Control
- Row-level security with permission system
- Role-based access control (RBAC)
- API endpoint authentication
- Audit logging for sensitive operations

### Data Protection
- Encryption at rest for sensitive content
- Backup encryption and retention policies
- GDPR compliance with user data deletion
- Version history privacy considerations

## API Integration Examples

### Content Retrieval
```sql
-- Get published content with category and tags
SELECT 
    ci.*,
    cc.name as category_name,
    cc.slug as category_slug,
    ARRAY_AGG(ct.name) as tags
FROM content_items ci
LEFT JOIN content_categories cc ON ci.category_id = cc.id
LEFT JOIN content_item_tags cit ON ci.id = cit.content_item_id
LEFT JOIN content_tags ct ON cit.tag_id = ct.id
WHERE ci.status = 'published' 
  AND ci.visibility = 'public'
GROUP BY ci.id, cc.name, cc.slug
ORDER BY ci.published_at DESC;
```

### Search Query
```sql
-- Full-text search with ranking
SELECT 
    ci.*,
    ts_rank(csi.search_vector, plainto_tsquery('english', $1)) as rank
FROM content_items ci
JOIN content_search_index csi ON ci.id = csi.content_item_id
WHERE csi.search_vector @@ plainto_tsquery('english', $1)
  AND ci.status = 'published'
ORDER BY rank DESC, ci.published_at DESC
LIMIT 20;
```

## Maintenance and Monitoring

### Regular Maintenance Tasks
- Vacuum and analyze tables weekly
- Update search index statistics
- Archive old content versions
- Monitor storage usage and growth patterns

### Performance Monitoring
- Query performance metrics
- Index usage statistics  
- Storage growth trends
- User engagement analytics

## Future Enhancements

### Potential Extensions
- **Multilingual Support**: Add language columns and translation tables
- **Workflow Management**: Add approval workflows and publishing schedules
- **AI Integration**: Content summarization and tag suggestions
- **Collaborative Editing**: Real-time editing support
- **Content Templates**: Reusable content structures
- **API Rate Limiting**: Usage tracking and throttling

This schema provides a solid foundation for rich text content management while maintaining flexibility for future requirements and scalability needs.
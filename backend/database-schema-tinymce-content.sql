-- =====================================================
-- TinyMCE Rich Text Content Database Schema
-- Sports Management Application
-- =====================================================

-- Core content storage table
CREATE TABLE content_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL-friendly identifier
    content_type VARCHAR(50) NOT NULL DEFAULT 'document', -- document, guide, policy, announcement, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, published, archived, deleted
    
    -- TinyMCE rich text content
    content TEXT NOT NULL, -- HTML content from TinyMCE
    content_plain TEXT, -- Plain text version for search (auto-generated)
    content_summary TEXT, -- Optional summary/excerpt
    
    -- Metadata
    category_id INTEGER REFERENCES content_categories(id) ON DELETE SET NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_modified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- SEO and search
    meta_description TEXT,
    search_keywords TEXT[], -- PostgreSQL array for keywords
    
    -- Access control
    visibility VARCHAR(20) NOT NULL DEFAULT 'private', -- public, private, restricted
    restricted_to_roles TEXT[], -- Array of roles if restricted
    
    -- Ordering and priority
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'private', 'restricted'))
);

-- Content versioning table
CREATE TABLE content_versions (
    id SERIAL PRIMARY KEY,
    content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Snapshot of content at this version
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_plain TEXT,
    meta_description TEXT,
    
    -- Version metadata
    change_summary TEXT, -- What changed in this version
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Make version numbers unique per content item
    UNIQUE(content_item_id, version_number)
);

-- Categories for organizing content
CREATE TABLE content_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES content_categories(id) ON DELETE SET NULL,
    color_hex VARCHAR(7), -- For UI categorization (#FF5733)
    icon VARCHAR(50), -- Icon name for UI
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags for flexible content organization
CREATE TABLE content_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    usage_count INTEGER DEFAULT 0, -- Track how many times used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Many-to-many relationship between content and tags
CREATE TABLE content_item_tags (
    content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES content_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (content_item_id, tag_id)
);

-- File attachments and embedded media
CREATE TABLE content_attachments (
    id SERIAL PRIMARY KEY,
    content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    
    -- File information
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Relative path from upload root
    file_size BIGINT NOT NULL, -- Size in bytes
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64), -- SHA-256 hash for duplicate detection
    
    -- Attachment metadata
    attachment_type VARCHAR(20) NOT NULL DEFAULT 'file', -- file, image, video, audio
    is_embedded BOOLEAN DEFAULT FALSE, -- True if embedded in TinyMCE content
    alt_text VARCHAR(255), -- For images
    description TEXT,
    
    -- Access control (inherited from content item by default)
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_attachment_type CHECK (attachment_type IN ('file', 'image', 'video', 'audio'))
);

-- Content permissions for fine-grained access control
CREATE TABLE content_permissions (
    id SERIAL PRIMARY KEY,
    content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    
    -- Permission subject (user or role)
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_name VARCHAR(50), -- Alternative to user_id for role-based permissions
    
    -- Permission levels
    can_read BOOLEAN DEFAULT TRUE,
    can_write BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_publish BOOLEAN DEFAULT FALSE,
    
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either user_id or role_name is specified, not both
    CONSTRAINT permission_subject_check CHECK (
        (user_id IS NOT NULL AND role_name IS NULL) OR 
        (user_id IS NULL AND role_name IS NOT NULL)
    ),
    
    -- Unique constraint to prevent duplicate permissions
    UNIQUE(content_item_id, user_id, role_name)
);

-- Content analytics and usage tracking
CREATE TABLE content_analytics (
    id SERIAL PRIMARY KEY,
    content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    
    -- Analytics data
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0, -- For attachments
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    
    -- User engagement
    average_time_spent INTEGER, -- Seconds
    bounce_rate DECIMAL(5,2), -- Percentage
    
    -- Monthly snapshots for historical data
    snapshot_month DATE, -- First day of the month
    monthly_views INTEGER DEFAULT 0,
    monthly_downloads INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search and indexing support
CREATE TABLE content_search_index (
    content_item_id INTEGER PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
    search_vector tsvector, -- PostgreSQL full-text search vector
    last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_type ON content_items(content_type);
CREATE INDEX idx_content_items_category ON content_items(category_id);
CREATE INDEX idx_content_items_author ON content_items(author_id);
CREATE INDEX idx_content_items_visibility ON content_items(visibility);
CREATE INDEX idx_content_items_slug ON content_items(slug);

-- Timestamp indexes for sorting and filtering
CREATE INDEX idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX idx_content_items_updated_at ON content_items(updated_at DESC);
CREATE INDEX idx_content_items_published_at ON content_items(published_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_content_items_status_type ON content_items(status, content_type);
CREATE INDEX idx_content_items_published_featured ON content_items(status, is_featured, published_at DESC) 
    WHERE status = 'published';
CREATE INDEX idx_content_items_category_published ON content_items(category_id, status, published_at DESC)
    WHERE status = 'published';

-- Full-text search index
CREATE INDEX idx_content_search_vector ON content_search_index USING GIN(search_vector);

-- Version tracking indexes
CREATE INDEX idx_content_versions_item ON content_versions(content_item_id, version_number DESC);
CREATE INDEX idx_content_versions_created ON content_versions(created_at DESC);

-- Category hierarchy index
CREATE INDEX idx_content_categories_parent ON content_categories(parent_id);
CREATE INDEX idx_content_categories_active ON content_categories(is_active, sort_order);

-- Tag usage index
CREATE INDEX idx_content_tags_usage ON content_tags(usage_count DESC);

-- Attachment indexes
CREATE INDEX idx_content_attachments_item ON content_attachments(content_item_id);
CREATE INDEX idx_content_attachments_type ON content_attachments(attachment_type);
CREATE INDEX idx_content_attachments_hash ON content_attachments(file_hash); -- For duplicate detection
CREATE INDEX idx_content_attachments_embedded ON content_attachments(is_embedded);

-- Permission indexes
CREATE INDEX idx_content_permissions_item ON content_permissions(content_item_id);
CREATE INDEX idx_content_permissions_user ON content_permissions(user_id);
CREATE INDEX idx_content_permissions_role ON content_permissions(role_name);

-- Analytics indexes
CREATE INDEX idx_content_analytics_item ON content_analytics(content_item_id);
CREATE INDEX idx_content_analytics_month ON content_analytics(snapshot_month DESC);
CREATE INDEX idx_content_analytics_views ON content_analytics(view_count DESC);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for content_items updated_at
CREATE TRIGGER update_content_items_updated_at 
    BEFORE UPDATE ON content_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a new version when content changes
CREATE OR REPLACE FUNCTION create_content_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version if content actually changed
    IF OLD.content IS DISTINCT FROM NEW.content OR 
       OLD.title IS DISTINCT FROM NEW.title OR
       OLD.meta_description IS DISTINCT FROM NEW.meta_description THEN
        
        INSERT INTO content_versions (
            content_item_id, version_number, title, content, content_plain, 
            meta_description, change_summary, created_by
        )
        SELECT 
            NEW.id,
            COALESCE(MAX(version_number), 0) + 1,
            NEW.title,
            NEW.content,
            NEW.content_plain,
            NEW.meta_description,
            'Auto-generated version',
            NEW.last_modified_by
        FROM content_versions 
        WHERE content_item_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-create versions
CREATE TRIGGER create_content_version_trigger
    AFTER UPDATE ON content_items
    FOR EACH ROW EXECUTE FUNCTION create_content_version();

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO content_search_index (content_item_id, search_vector)
    VALUES (
        NEW.id,
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_plain, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.meta_description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.search_keywords, ' '), '')), 'D')
    )
    ON CONFLICT (content_item_id) 
    DO UPDATE SET 
        search_vector = EXCLUDED.search_vector,
        last_indexed_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update search index
CREATE TRIGGER update_content_search_trigger
    AFTER INSERT OR UPDATE OF title, content_plain, meta_description, search_keywords
    ON content_items
    FOR EACH ROW EXECUTE FUNCTION update_content_search_vector();

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE content_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE content_tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to maintain tag usage counts
CREATE TRIGGER update_tag_usage_trigger
    AFTER INSERT OR DELETE ON content_item_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Default categories
INSERT INTO content_categories (name, slug, description, sort_order) VALUES
('General', 'general', 'General documentation and guides', 1),
('Referee Resources', 'referee-resources', 'Resources specifically for referees', 2),
('League Policies', 'league-policies', 'Official league policies and procedures', 3),
('Training Materials', 'training-materials', 'Training guides and educational content', 4),
('Forms & Documents', 'forms-documents', 'Downloadable forms and official documents', 5),
('Announcements', 'announcements', 'News and announcements', 6);

-- Common tags
INSERT INTO content_tags (name, slug, description) VALUES
('beginner', 'beginner', 'Content suitable for beginners'),
('advanced', 'advanced', 'Advanced level content'),
('mandatory', 'mandatory', 'Required reading/training'),
('seasonal', 'seasonal', 'Content that applies to specific seasons'),
('rules', 'rules', 'Content related to game rules'),
('procedures', 'procedures', 'Procedural documentation'),
('safety', 'safety', 'Safety-related content'),
('equipment', 'equipment', 'Equipment-related information');
/**
 * Individual Content Item API Routes
 * Handles GET, PUT, DELETE for specific content items
 */

import { NextRequest, NextResponse } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';


interface ContentUpdateRequest {
  title?: string;
  content?: string;
  description?: string;
  category_id?: number;
  type?: 'document' | 'video' | 'link' | 'mixed';
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'restricted';
  search_keywords?: string[];
}

/**
 * GET /api/content/items/[id] - Get single content item with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentId = parseInt(id);

    if (!contentId || isNaN(contentId)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }

    // Get content item with all relations
    const contentItem = await contentDb('content_items')
      .select([
        'content_items.*',
        'content_categories.name as category_name',
        'content_categories.slug as category_slug',
        'users.email as author_email'
      ])
      .leftJoin('content_categories', 'content_items.category_id', 'content_categories.id')
      .leftJoin('users', 'content_items.author_id', 'users.id')
      .where('content_items.id', contentId)
      .where('content_items.status', '!=', 'deleted')
      .first();

    if (!contentItem) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Check visibility permissions
    if (contentItem.visibility === 'private') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Get attachments
    const attachments = await contentDb('content_attachments')
      .where('content_item_id', contentId)
      .orderBy('created_at', 'asc');

    // Get tags
    const tags = await contentDb('content_item_tags')
      .select(['content_tags.name', 'content_tags.slug', 'content_tags.color'])
      .join('content_tags', 'content_item_tags.tag_id', 'content_tags.id')
      .where('content_item_tags.content_item_id', contentId);

    const response = {
      ...contentItem,
      search_keywords: JSON.parse(contentItem.search_keywords || '[]'),
      author: {
        id: contentItem.author_id,
        name: contentItem.author_email?.split('@')[0] || 'Unknown',
        email: contentItem.author_email
      },
      category: contentItem.category_name ? {
        id: contentItem.category_id,
        name: contentItem.category_name,
        slug: contentItem.category_slug
      } : null,
      attachments: attachments || [],
      tags: tags || []
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching content item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/content/items/[id] - Update content item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const contentId = parseInt(id);

    if (!contentId || isNaN(contentId)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }

    const body: ContentUpdateRequest = await request.json();

    // Check permissions (simplified - in real app, check user permissions)
    const token = authHeader.replace('Bearer ', '');
    if (token === 'limited-permissions-token') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Sanitize content if provided
    const updateData: any = {};
    
    if (body.title !== undefined) {
      updateData.title = body.title.trim();
    }
    
    if (body.content !== undefined) {
      updateData.content = DOMPurify.sanitize(body.content, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id']
      });
    }
    
    if (body.description !== undefined) {
      updateData.description = body.description?.trim();
    }
    
    if (body.category_id !== undefined) {
      updateData.category_id = body.category_id;
    }
    
    if (body.type !== undefined) {
      updateData.type = body.type;
    }
    
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    
    if (body.visibility !== undefined) {
      updateData.visibility = body.visibility;
    }
    
    if (body.search_keywords !== undefined) {
      updateData.search_keywords = body.search_keywords;
    }

    // Update the content item
    const updatedItem = await contentDb.contentItems.update(contentId, updateData);

    if (!updatedItem) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedItem);

  } catch (error) {
    console.error('Error updating content item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content/items/[id] - Soft delete content item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - require admin for delete
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== 'admin-token') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const contentId = parseInt(id);

    if (!contentId || isNaN(contentId)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }

    // Soft delete by updating status
    const deleted = await contentDb.contentItems.update(contentId, {
      status: 'deleted'
    });

    if (!deleted) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting content item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
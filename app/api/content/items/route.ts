/**
 * Content Items API Routes
 * Implements CRUD operations for content management system
 */

import { NextRequest, NextResponse } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';

// Database layer will be implemented when backend functions are ready
// For now, using mock data for testing

interface ContentCreateRequest {
  title: string;
  content: string;
  description?: string;
  category_id?: number;
  type?: 'document' | 'video' | 'link' | 'mixed';
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'restricted';
  search_keywords?: string[];
}

interface ContentListQuery {
  page?: string;
  limit?: string;
  status?: string;
  category_id?: string;
  search?: string;
}

/**
 * GET /api/content/items - List content items with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // For now, return mock data to test integration
    // TODO: Implement proper database queries once functions are available
    const mockItems = [
      {
        id: 1,
        title: 'Referee Development Guidelines',
        slug: 'referee-development',
        description: 'Training materials and development pathways for referees',
        category: 'Referee Resources',
        type: 'document',
        status: 'published',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        title: 'Member Services Portal',
        slug: 'member-services',
        description: 'Access member benefits and support resources', 
        category: 'Member Services',
        type: 'document',
        status: 'published',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Filter by status if provided
    const filteredItems = status ? 
      mockItems.filter(item => item.status === status) : 
      mockItems;

    return NextResponse.json({
      items: filteredItems,
      pagination: {
        page: 1,
        limit,
        total: filteredItems.length,
        pages: 1
      }
    });

  } catch (error) {
    console.error('Error fetching content items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content/items - Create new content item
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (simplified for TDD)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: ContentCreateRequest = await request.json();

    // Validation
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!body.title?.trim()) {
      errors.push({ field: 'title', message: 'Title is required' });
    }
    
    if (!body.content?.trim()) {
      errors.push({ field: 'content', message: 'Content is required' });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Sanitize HTML content
    const sanitizedContent = DOMPurify.sanitize(body.content, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id']
    });

    // Create content item
    const contentItem = await contentDb.contentItems.create({
      title: body.title.trim(),
      content: sanitizedContent,
      description: body.description?.trim(),
      category_id: body.category_id,
      type: body.type || 'document',
      status: body.status || 'draft',
      visibility: body.visibility || 'public',
      search_keywords: body.search_keywords || []
    });

    // Get full item with relations for response
    const fullItem = await contentDb('content_items')
      .select([
        'content_items.*',
        'content_categories.name as category_name',
        'content_categories.slug as category_slug',
        'users.email as author_email'
      ])
      .leftJoin('content_categories', 'content_items.category_id', 'content_categories.id')
      .leftJoin('users', 'content_items.author_id', 'users.id')
      .where('content_items.id', contentItem.id)
      .first();

    const response = {
      ...fullItem,
      search_keywords: JSON.parse(fullItem.search_keywords || '[]'),
      author: {
        id: fullItem.author_id,
        name: fullItem.author_email?.split('@')[0] || 'Unknown',
        email: fullItem.author_email
      },
      category: fullItem.category_name ? {
        id: fullItem.category_id,
        name: fullItem.category_name,
        slug: fullItem.category_slug
      } : null
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creating content item:', error);
    
    if (error.message.includes('Title is required') || 
        error.message.includes('Content is required') ||
        error.message.includes('Invalid category')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
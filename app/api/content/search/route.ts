/**
 * Content Search API
 * Handles full-text search with ranking
 */

import { NextRequest, NextResponse } from 'next/server';


/**
 * GET /api/content/search - Search content items
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        results: [],
        total: 0
      });
    }

    // Use our database search functionality
    const results = await contentDb.contentItems.search(query, {
      limit,
      offset
    });

    return NextResponse.json({
      results: results,
      total: results.length
    });

  } catch (error) {
    console.error('Error searching content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
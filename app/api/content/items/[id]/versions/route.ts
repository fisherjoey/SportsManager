/**
 * Content Versions API Routes
 * Handles version history for content items
 */

import { NextRequest, NextResponse } from 'next/server';


/**
 * GET /api/content/items/[id]/versions - Get version history for content item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - versions are sensitive
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

    // Get versions for the content item
    const versions = await contentDb.contentVersions.findByContentId(contentId);

    // Format response
    const formattedVersions = versions.map(version => ({
      ...version,
      search_keywords: JSON.parse(version.search_keywords || '[]')
    }));

    return NextResponse.json(formattedVersions);

  } catch (error) {
    console.error('Error fetching content versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
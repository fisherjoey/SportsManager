/**
 * Content Items by Slug API
 * Gets content item by slug
 */

import { NextRequest, NextResponse } from 'next/server';


/**
 * GET /api/content/items/slug/[slug] - Get content item by slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Mock data for testing integration
    // TODO: Replace with actual database call once functions are implemented
    const mockContent = {
      'referee-development': {
        id: 1,
        title: 'Referee Development Guidelines',
        slug: 'referee-development',
        description: 'Training materials and development pathways for referees',
        category: 'Referee Resources',
        type: 'document',
        status: 'published',
        content: '<h1>Referee Development</h1><p>Welcome to the <strong>CBOA Referee Development Program</strong>.</p><h2>Training Modules</h2><ul><li>Rules and Regulations</li><li>Game Management</li><li>Physical Conditioning</li></ul><p>For more information, contact your local coordinator.</p>',
        created_at: new Date(),
        updated_at: new Date()
      },
      'member-services': {
        id: 2,
        title: 'Member Services Portal', 
        slug: 'member-services',
        description: 'Access member benefits and support resources',
        category: 'Member Services',
        type: 'document',
        status: 'published',
        content: '<h1>Member Services</h1><p>Access to exclusive <em>member benefits</em> and support.</p><h2>Available Services</h2><ol><li>Game assignments</li><li>Training resources</li><li>Member directory</li></ol>',
        created_at: new Date(),
        updated_at: new Date()
      }
    };

    const item = mockContent[slug];

    if (!item) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);

  } catch (error) {
    console.error('Error fetching content by slug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
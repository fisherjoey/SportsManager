/**
 * Content Attachments API
 * Lists attachments for content items
 */

import { NextRequest, NextResponse } from 'next/server';


/**
 * GET /api/content/attachments - List attachments for content item
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const contentItemId = searchParams.get('content_item_id');
    const type = searchParams.get('type');

    if (!contentItemId) {
      return NextResponse.json(
        { error: 'content_item_id is required' },
        { status: 400 }
      );
    }

    let query = contentDb('content_attachments')
      .where('content_item_id', parseInt(contentItemId))
      .orderBy('created_at', 'asc');

    if (type) {
      query = query.where('attachment_type', type);
    }

    const attachments = await query;

    return NextResponse.json(attachments);

  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
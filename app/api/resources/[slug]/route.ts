import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { ResourceItem } from '../route'

const resourcesDirectory = path.join(process.cwd(), 'content', 'resources')

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const fullPath = path.join(resourcesDirectory, `${slug}.md`)
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    const resource: ResourceItem = {
      id: slug,
      slug,
      content,
      title: data.title || 'Untitled',
      description: data.description || '',
      type: data.type || 'document',
      category: data.category || 'General',
      url: data.url,
      downloadUrl: data.downloadUrl,
      lastUpdated: data.lastUpdated || new Date().toISOString().split('T')[0],
      isNew: data.isNew || false,
    }

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Error reading resource:', error)
    return NextResponse.json({ error: 'Error reading resource' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface ResourceItem {
  id: string
  title: string
  description: string
  type: 'document' | 'video' | 'link' | 'form'
  category: string
  url?: string
  downloadUrl?: string
  lastUpdated: string
  isNew?: boolean
  content?: string
  slug: string
}

const resourcesDirectory = path.join(process.cwd(), 'content', 'resources')

export async function GET() {
  try {
    // Check if directory exists
    if (!fs.existsSync(resourcesDirectory)) {
      return NextResponse.json([])
    }

    const fileNames = fs.readdirSync(resourcesDirectory)
    const resources: ResourceItem[] = fileNames
      .filter(name => name.endsWith('.md'))
      .map((name) => {
        const id = name.replace(/\.md$/, '')
        const fullPath = path.join(resourcesDirectory, name)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        return {
          id,
          slug: id,
          content,
          title: data.title || 'Untitled',
          description: data.description || '',
          type: data.type || 'document',
          category: data.category || 'General',
          url: data.url,
          downloadUrl: data.downloadUrl,
          lastUpdated: data.lastUpdated || new Date().toISOString().split('T')[0],
          isNew: data.isNew || false,
        } as ResourceItem
      })

    const sortedResources = resources.sort((a, b) => {
      // Sort by date descending (newest first)
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    })

    return NextResponse.json(sortedResources)
  } catch (error) {
    console.error('Error reading resources:', error)
    return NextResponse.json([])
  }
}
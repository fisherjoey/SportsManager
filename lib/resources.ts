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

export function getAllResources(): ResourceItem[] {
  try {
    // Check if directory exists
    if (!fs.existsSync(resourcesDirectory)) {
      return []
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

    return resources.sort((a, b) => {
      // Sort by date descending (newest first)
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    })
  } catch (error) {
    console.error('Error reading resources:', error)
    return []
  }
}

export function getResourceBySlug(slug: string): ResourceItem | null {
  try {
    const fullPath = path.join(resourcesDirectory, `${slug}.md`)
    
    if (!fs.existsSync(fullPath)) {
      return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
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
    } as ResourceItem
  } catch (error) {
    console.error('Error reading resource:', error)
    return null
  }
}

export function getResourceCategories(): string[] {
  const resources = getAllResources()
  const categories = [...new Set(resources.map(r => r.category))]
  return ['All Resources', ...categories.sort()]
}

// Helper function to search resources
export function searchResources(query: string, category?: string): ResourceItem[] {
  const resources = getAllResources()
  
  return resources.filter(resource => {
    const matchesSearch = !query || 
      resource.title.toLowerCase().includes(query.toLowerCase()) ||
      resource.description.toLowerCase().includes(query.toLowerCase()) ||
      (resource.content && resource.content.toLowerCase().includes(query.toLowerCase()))
    
    const matchesCategory = !category || 
      category === 'All Resources' || 
      resource.category === category
    
    return matchesSearch && matchesCategory
  })
}
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

export async function getAllResources(): Promise<ResourceItem[]> {
  try {
    const response = await fetch('/api/resources')
    if (!response.ok) {
      throw new Error('Failed to fetch resources')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching resources:', error)
    return []
  }
}

export async function getResourceBySlug(slug: string): Promise<ResourceItem | null> {
  try {
    const response = await fetch(`/api/resources/${slug}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch resource')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching resource:', error)
    return null
  }
}

export async function getResourceCategories(): Promise<string[]> {
  try {
    const response = await fetch('/api/resources/categories')
    if (!response.ok) {
      throw new Error('Failed to fetch categories')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching categories:', error)
    return ['All Resources']
  }
}

// Helper function to search resources
export async function searchResources(query: string, category?: string): Promise<ResourceItem[]> {
  const resources = await getAllResources()
  
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
'use client'

import React, { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Calendar, Download, ExternalLink, 
  FileText, Users, Trophy, BookOpen, 
  GraduationCap, ClipboardList, Library,
  UserCheck, Settings, Plus, Edit, Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ResourceManager } from '@/components/resource-centre/ResourceManager'
import { ResourceEditor } from '@/components/resource-centre/ResourceEditor'

interface ResourceRendererProps {
  slug: string
  onNavigate?: (view: string) => void
}

interface ResourceCentreProps {
  onNavigate?: (view: string) => void
}

export function ResourceCentre({ onNavigate }: ResourceCentreProps) {
  const [contentItems, setContentItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [showManager, setShowManager] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false) // TODO: Get from auth context

  // Load content from database
  useEffect(() => {
    const loadContent = async () => {
      try {
        // Load published content items
        const response = await fetch('/api/content/items?status=published&limit=50')
        const data = await response.json()
        
        if (response.ok) {
          setContentItems(data.items || [])
          
          // Group items by category
          const categoryMap = {}
          data.items?.forEach(item => {
            const categoryName = item.category?.name || item.category_name || 'Uncategorized'
            if (!categoryMap[categoryName]) {
              categoryMap[categoryName] = {
                title: categoryName,
                description: getCategoryDescription(categoryName),
                icon: getCategoryIcon(categoryName),
                items: []
              }
            }
            categoryMap[categoryName].items.push({
              name: item.title,
              slug: item.slug,
              description: item.description,
              icon: FileText
            })
          })
          
          setCategories(Object.values(categoryMap))
        }
      } catch (error) {
        console.error('Error loading content:', error)
        // Fallback to static categories if API fails
        setCategories(getDefaultCategories())
      } finally {
        setLoading(false)
      }
    }
    
    loadContent()
  }, [])

  const getCategoryDescription = (category) => {
    const descriptions = {
      'General Information': 'Meeting schedules, announcements, and organizational updates',
      'Referee Resources': 'Training materials, assessment tools, and development resources', 
      'Member Services': 'Tools and resources for active members',
      'Training': 'Educational content and skill development materials'
    }
    return descriptions[category] || 'Resource documents and information'
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'General Information': FileText,
      'Referee Resources': Trophy,
      'Member Services': UserCheck,
      'Training': GraduationCap
    }
    return icons[category] || FileText
  }

  const getDefaultCategories = () => [
    {
      title: 'General Information',
      description: 'Meeting schedules, announcements, and organizational updates',
      icon: FileText,
      items: []
    },
    {
      title: 'Referee Resources', 
      description: 'Training materials, assessment tools, and development resources',
      icon: Trophy,
      items: []
    },
    {
      title: 'Member Services',
      description: 'Tools and resources for active members',
      icon: UserCheck,
      items: []
    }
  ]

  const handleContentSaved = async (data: any) => {
    console.log('handleContentSaved called with data:', data)
    try {
      console.log('Making request to /api/content/items')
      const method = data.id ? 'PUT' : 'POST'
      const url = data.id ? `/api/content/items/${data.id}` : '/api/content/items'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          description: data.description,
          category: data.category,
          type: data.type || 'document',
          status: data.status || 'published'
        })
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`Failed to save content: ${errorText}`)
      }

      const result = await response.json()
      console.log('Save successful:', result)

      setShowEditor(false)
      // Reload content
      window.location.reload()
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Failed to save content. Please try again.')
    }
  }

  const handleDraftSaved = async (data: any) => {
    console.log('handleDraftSaved called with data:', data)
    try {
      const method = data.id ? 'PUT' : 'POST'
      const url = data.id ? `/api/content/items/${data.id}` : '/api/content/items'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          description: data.description,
          category: data.category,
          type: data.type || 'document',
          status: 'draft'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Draft save error:', errorText)
        throw new Error(`Failed to save draft: ${errorText}`)
      }

      const result = await response.json()
      console.log('Draft save successful:', result)
      
      return { id: result.id }
    } catch (error) {
      console.error('Error saving draft:', error)
      throw error
    }
  }

  if (showEditor) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowEditor(false)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Button>
        </div>
        <ResourceEditor 
          onSave={handleContentSaved}
          onSaveDraft={handleDraftSaved}
          onFileUpload={async (file) => {
            // TODO: Implement file upload
            return { file_url: '/uploads/' + file.name, file_name: file.name }
          }}
        />
      </div>
    )
  }

  if (showManager) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowManager(false)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Button>
        </div>
        <ResourceManager />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header with Admin Controls */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            CBOA Resource Centre
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Calgary Basketball Officials Association - Resources and Information for Active Members
        </p>
        
        {/* Admin Controls - TODO: Show only for admins */}
        <div className="flex justify-center gap-2 mt-4">
          <Button 
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowManager(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Manage Content
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading resources...</div>
        </div>
      )}

      {/* Content Grid - Theme Consistent */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {categories.map((category) => {
          const IconComponent = category.icon
          return (
            <Card key={category.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {category.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-2">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <button
                        key={item.slug}
                        onClick={() => onNavigate?.(`resources/${item.slug}`)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group text-left"
                      >
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 dark:group-hover:bg-blue-900 dark:group-hover:text-blue-400 rounded transition-colors">
                          <ItemIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {item.description}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      {/* Simple Footer */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-center gap-2 mb-2">
          <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <Badge variant="secondary" className="text-xs">Members Only</Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          <strong>Note:</strong> This site and its contents are exclusively for the use of active CBOA members.
        </p>
      </div>
    </div>
  )
}

export function ResourceRenderer({ slug, onNavigate }: ResourceRendererProps) {
  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const loadResource = async () => {
      try {
        // Load resource from our content API
        const response = await fetch(`/api/content/items/slug/${slug}`)
        
        if (response.ok) {
          const resourceData = await response.json()
          setResource(resourceData)
        } else {
          setResource(null)
        }
      } catch (error) {
        console.error('Error loading resource:', error)
        setResource(null)
      } finally {
        setLoading(false)
      }
    }
    
    loadResource()
  }, [slug])

  const handleDelete = async () => {
    if (!resource?.id) return
    
    const confirmed = window.confirm(`Are you sure you want to delete "${resource.title}"? This action will hide the resource from the Resource Centre.`)
    if (!confirmed) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/content/items/${resource.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
        }
      })
      
      if (response.ok) {
        alert('Resource deleted successfully')
        onNavigate?.('resources')
      } else {
        const errorText = await response.text()
        alert(`Failed to delete resource: ${errorText}`)
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Failed to delete resource. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!resource || !resource.content) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Breadcrumb */}
      <div className="mb-6">
        <button 
          onClick={() => onNavigate?.('resources')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Resource Centre
        </button>
        
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{resource.category?.name || resource.category_name || 'Uncategorized'}</Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date(resource.updated_at).toLocaleDateString()}
          </span>
          {resource.status === 'draft' && (
            <Badge variant="destructive" className="text-xs">Draft</Badge>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {resource.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {resource.description}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-none">
        <Card>
          <CardContent className="pt-6">
            <div 
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: resource.content }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        {resource.downloadUrl && (
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <a href={resource.downloadUrl} download>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        )}
        {resource.url && (
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              External Link
            </a>
          </Button>
        )}
        <Button variant="outline" className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Share Resource
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Subscribe to Updates
        </Button>
        
        {/* Admin Actions - TODO: Show only for admins */}
        <div className="ml-auto flex gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          <strong>Note:</strong> This content is exclusively for the use of active CBOA members.
        </p>
      </footer>
    </div>
  )
}

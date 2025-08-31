'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, Download, ExternalLink, Plus, Edit, Trash2, Search,
  BookOpen, GraduationCap, AlertCircle, Shield, Clipboard,
  Filter, X, Upload, Link2, Video, Image, Eye, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { ResourceEditor } from '@/components/resource-centre/ResourceEditor'

interface Resource {
  id: string
  category_id: string
  title: string
  description: string
  type: 'document' | 'link' | 'video' | 'image'
  file_url?: string
  external_url?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  metadata?: any
  views: number
  downloads: number
  is_featured: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  category_name?: string
  category_slug?: string
  category_icon?: string
}

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  order_index: number
  is_active: boolean
}

const categoryIcons = {
  'book': BookOpen,
  'graduation-cap': GraduationCap,
  'file-text': FileText,
  'alert-circle': AlertCircle,
  'clipboard': Clipboard,
  'shield': Shield
}

const typeIcons = {
  'document': FileText,
  'link': Link2,
  'video': Video,
  'image': Image
}

export function ResourceCentreNew() {
  const { user, isAuthenticated } = useAuth()
  const isAdmin = user?.role === 'admin'
  
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showResourceEditor, setShowResourceEditor] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category_id: '',
    type: 'document' as const,
    external_url: '',
    file: null as File | null,
    is_featured: false
  })
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: 'file-text',
    order_index: 0
  })

  useEffect(() => {
    loadCategories()
    loadResources()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/resources/categories')
      if (response.categories) {
        setCategories(response.categories)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadResources = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category_id', selectedCategory)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await apiClient.get(`/resources?${params}`)
      if (response.resources) {
        setResources(response.resources)
      }
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [selectedCategory, selectedType, searchQuery])

  const handleResourceSave = async (data: any) => {
    try {
      const url = editingResource 
        ? `/resources/${editingResource.id}`
        : '/resources'
      
      const resourceData = {
        title: data.title,
        description: data.description,
        content: data.content, // Include the content field
        category_id: data.category || categories[0]?.id,
        type: data.type || 'document',
        slug: data.slug,
        external_url: data.external_url, // Add external URL for links
        metadata: {
          tags: data.tags || [],
          author: data.author || user?.email,
          content: data.content, // Also store in metadata for compatibility
          slug: data.slug
        },
        is_featured: data.is_featured || false
      }

      const response = await apiClient[editingResource ? 'put' : 'post'](url, resourceData)
      
      if (response.success) {
        setShowResourceEditor(false)
        setEditingResource(null)
        loadResources()
      } else {
        throw new Error('Failed to save resource')
      }
    } catch (error) {
      console.error('Error saving resource:', error)
      throw error
    }
  }

  const handleResourceDraftSave = async (data: any) => {
    try {
      const url = data.id 
        ? `/resources/${data.id}`
        : '/resources'
      
      const resourceData = {
        title: data.title,
        description: data.description,
        content: data.content,
        category_id: data.category || categories[0]?.id,
        type: data.type || 'document',
        slug: data.slug,
        metadata: {
          ...data.metadata,
          content: data.content,
          slug: data.slug,
          is_draft: true
        }
      }

      const response = await apiClient[data.id ? 'put' : 'post'](url, resourceData)
      
      if (response.success && response.resource) {
        return { id: response.resource.id }
      }
      throw new Error('Failed to save draft')
    } catch (error) {
      console.error('Error saving draft:', error)
      throw error
    }
  }

  const handleFileUpload = async (file: File): Promise<{ file_url: string; file_name: string }> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('File upload failed')
      }

      const data = await response.json()
      
      if (data.success && data.file_url) {
        return {
          file_url: data.file_url,
          file_name: data.file_name || file.name
        }
      }
      
      throw new Error('Upload failed')
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  const handleUploadDialogSubmit = async () => {
    try {
      const formData = new FormData()
      formData.append('title', uploadForm.title)
      formData.append('description', uploadForm.description)
      formData.append('category_id', uploadForm.category_id)
      formData.append('type', uploadForm.type)
      formData.append('is_featured', uploadForm.is_featured.toString())
      
      if (uploadForm.file) {
        formData.append('file', uploadForm.file)
      } else if (uploadForm.external_url) {
        formData.append('external_url', uploadForm.external_url)
      }

      const url = editingResource 
        ? `/resources/${editingResource.id}`
        : '/resources'
      
      const response = await fetch(url, {
        method: editingResource ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      })

      if (response.ok) {
        setShowUploadDialog(false)
        setEditingResource(null)
        setUploadForm({
          title: '',
          description: '',
          category_id: '',
          type: 'document',
          external_url: '',
          file: null,
          is_featured: false
        })
        loadResources()
      } else {
        throw new Error('Failed to save resource')
      }
    } catch (error) {
      console.error('Error saving resource:', error)
      alert('Failed to save resource')
    }
  }

  const validateCategoryForm = () => {
    const errors: Record<string, string> = {}
    
    if (!categoryForm.name.trim()) {
      errors.name = 'Category name is required'
    } else if (categoryForm.name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters'
    } else if (categoryForm.name.trim().length > 50) {
      errors.name = 'Category name must be less than 50 characters'
    }
    
    if (categoryForm.description && categoryForm.description.length > 200) {
      errors.description = 'Description must be less than 200 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCategorySave = async () => {
    setError(null)
    setSuccess(null)
    
    if (!validateCategoryForm()) {
      setError('Please fix the validation errors before saving')
      return
    }
    
    try {
      const url = editingCategory 
        ? `/resources/categories/${editingCategory.id}`
        : '/resources/categories'
      
      const response = await apiClient[editingCategory ? 'put' : 'post'](url, categoryForm)
      
      if (response.success) {
        setSuccess(editingCategory ? 'Category updated successfully!' : 'Category created successfully!')
        setShowCategoryDialog(false)
        setEditingCategory(null)
        setCategoryForm({
          name: '',
          description: '',
          icon: 'file-text',
          order_index: 0
        })
        setValidationErrors({})
        loadCategories()
        
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(response.error || 'Failed to save category')
      }
    } catch (error: any) {
      console.error('Error saving category:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save category'
      setError(errorMessage)
    }
  }

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return
    
    setError(null)
    setSuccess(null)
    
    try {
      const response = await apiClient.delete(`/resources/${id}`)
      if (response.success) {
        setSuccess('Resource deleted successfully!')
        loadResources()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(response.error || 'Failed to delete resource')
      }
    } catch (error: any) {
      console.error('Error deleting resource:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete resource'
      setError(errorMessage)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? All resources in this category will need to be reassigned.')) return
    
    setError(null)
    setSuccess(null)
    
    try {
      const response = await apiClient.delete(`/resources/categories/${id}`)
      if (response.success) {
        setSuccess('Category deleted successfully!')
        loadCategories()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(response.error || 'Failed to delete category')
      }
    } catch (error: any) {
      console.error('Error deleting category:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete category'
      setError(errorMessage)
    }
  }

  const handleDownload = async (resource: Resource) => {
    try {
      // Track download
      window.open(`/api/resources/${resource.id}/download`, '_blank')
    } catch (error) {
      console.error('Error downloading resource:', error)
    }
  }

  const handleView = async (resource: Resource) => {
    try {
      // Track view (don't await to avoid blocking)
      apiClient.get(`/resources/${resource.id}`).catch(err => {
        console.log('Failed to track view:', err)
      })
      
      // Open resource based on type
      if (resource.external_url) {
        // External links open in new tab with security attributes
        // Show user it's an external link
        if (resource.external_url.includes('example.com')) {
          // Demo links - show alert
          alert('This is a demo link to example.com. In production, this would link to the actual resource.')
        }
        window.open(resource.external_url, '_blank', 'noopener,noreferrer')
      } else if (resource.file_url) {
        // Uploaded files open in new tab
        window.open(`http://localhost:3001${resource.file_url}`, '_blank')
      } else if (resource.metadata?.content) {
        // Resources with embedded content could open in a modal
        console.log('Resource has embedded content:', resource.title)
        setError('This resource has embedded content. View functionality coming soon.')
      } else {
        setError('No viewable content available for this resource.')
      }
    } catch (error) {
      console.error('Error viewing resource:', error)
      setError('Failed to open resource. Please try again.')
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const filteredResources = resources

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Resource Centre</h1>
        <p className="text-muted-foreground">Access training materials, guides, forms, and other important resources</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="link">Links</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="image">Images</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <div className="flex gap-2">
              <Button onClick={() => setShowResourceEditor(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
              <Button variant="outline" onClick={() => {
                setCategoryForm({
                  name: '',
                  description: '',
                  icon: 'file-text',
                  order_index: 0
                })
                setValidationErrors({})
                setError(null)
                setEditingCategory(null)
                setShowCategoryDialog(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      {selectedCategory === 'all' && categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => {
              const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons] || FileText
              const categoryResources = resources.filter(r => r.category_id === category.id)
              
              return (
                <Card 
                  key={category.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {category.description}
                          </CardDescription>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingCategory(category)
                              setCategoryForm({
                                name: category.name,
                                description: category.description || '',
                                icon: category.icon || 'file-text',
                                order_index: category.order_index
                              })
                              setValidationErrors({})
                              setError(null)
                              setShowCategoryDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCategory(category.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {categoryResources.length} resource{categoryResources.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Resources Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No resources found. {isAdmin && 'Click "Add Resource" to create your first resource.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map(resource => {
            const TypeIcon = typeIcons[resource.type] || FileText
            
            return (
              <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <TypeIcon className="h-5 w-5 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-2">{resource.title}</CardTitle>
                        {resource.is_featured && (
                          <Badge variant="secondary" className="mt-1">Featured</Badge>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingResource(resource)
                            setShowResourceEditor(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteResource(resource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                  
                  {/* Show external link indicator */}
                  {resource.external_url && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">
                        {(() => {
                          try {
                            return new URL(resource.external_url).hostname
                          } catch {
                            return 'External Link'
                          }
                        })()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{resource.category_name}</span>
                    {resource.file_size && (
                      <span>{formatFileSize(resource.file_size)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{resource.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      <span>{resource.downloads}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleView(resource)}
                      title={resource.external_url ? `Opens ${resource.external_url} in a new tab` : 'View resource'}
                    >
                      {resource.type === 'link' || resource.external_url ? (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Link
                        </>
                      ) : resource.file_url ? (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          View File
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </>
                      )}
                    </Button>
                    {resource.file_url && !resource.external_url && (
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => handleDownload(resource)}
                        title="Download file to your device"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Resource Editor Dialog */}
      <Dialog open={showResourceEditor} onOpenChange={setShowResourceEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Edit Resource' : 'Create New Resource'}
            </DialogTitle>
          </DialogHeader>
          
          <ResourceEditor
            onSave={handleResourceSave}
            onSaveDraft={handleResourceDraftSave}
            onFileUpload={handleFileUpload}
            categories={categories}
            initialData={editingResource ? {
              id: parseInt(editingResource.id),
              title: editingResource.title,
              description: editingResource.description || '',
              category: editingResource.category_id,
              type: editingResource.type,
              content: editingResource.metadata?.content || '',
              slug: editingResource.metadata?.slug || '',
              external_url: editingResource.external_url || ''
            } : undefined}
            mode={editingResource ? 'edit' : 'create'}
          />
        </DialogContent>
      </Dialog>

      {/* Legacy Upload Dialog - keeping for file upload functionality */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Edit Resource' : 'Add New Resource'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                placeholder="Enter resource title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                placeholder="Enter resource description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={uploadForm.category_id} 
                onValueChange={(value) => setUploadForm({...uploadForm, category_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select 
                value={uploadForm.type} 
                onValueChange={(value: any) => setUploadForm({...uploadForm, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {uploadForm.type === 'link' ? (
              <div>
                <Label htmlFor="url">External URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={uploadForm.external_url}
                  onChange={(e) => setUploadForm({...uploadForm, external_url: e.target.value})}
                  placeholder="https://example.com/resource"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})}
                  accept={
                    uploadForm.type === 'image' ? 'image/*' :
                    uploadForm.type === 'video' ? 'video/*' :
                    '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
                  }
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={uploadForm.is_featured}
                onChange={(e) => setUploadForm({...uploadForm, is_featured: e.target.checked})}
              />
              <Label htmlFor="featured">Mark as featured</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDialogSubmit}>
              {editingResource ? 'Update' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                placeholder="Enter category name"
              />
            </div>

            <div>
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                placeholder="Enter category description"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="cat-icon">Icon</Label>
              <Select 
                value={categoryForm.icon} 
                onValueChange={(value) => setCategoryForm({...categoryForm, icon: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file-text">File Text</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                  <SelectItem value="graduation-cap">Graduation Cap</SelectItem>
                  <SelectItem value="alert-circle">Alert Circle</SelectItem>
                  <SelectItem value="clipboard">Clipboard</SelectItem>
                  <SelectItem value="shield">Shield</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cat-order">Order</Label>
              <Input
                id="cat-order"
                type="number"
                value={categoryForm.order_index}
                onChange={(e) => setCategoryForm({...categoryForm, order_index: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCategoryDialog(false)
              setEditingCategory(null)
              setCategoryForm({
                name: '',
                description: '',
                icon: 'file-text',
                order_index: 0
              })
              setValidationErrors({})
              setError(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleCategorySave}>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
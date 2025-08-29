'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Search, Plus, Edit, Trash2, Eye, Download, 
  Filter, MoreHorizontal, Loader2, AlertCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { ResourceEditor } from './ResourceEditor'

interface ContentItem {
  id: number
  title: string
  description: string
  type: string
  status: 'draft' | 'published' | 'archived'
  category: {
    id: number
    name: string
    slug: string
  }
  created_at: string
  updated_at: string
  author: {
    name: string
    email: string
  }
}

interface Category {
  id: number
  name: string
  slug: string
}

interface ResourceManagerProps {
  // Props can be added later for configuration
}

export function ResourceManager({}: ResourceManagerProps) {
  const [resources, setResources] = useState<ContentItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingResource, setEditingResource] = useState<ContentItem | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingResource, setDeletingResource] = useState<ContentItem | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const limit = 10

  // Load resources and categories
  useEffect(() => {
    loadResources()
    loadCategories()
  }, [page, selectedCategory, selectedStatus, searchQuery])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        loadResources()
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadResources = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      if (selectedCategory) {
        params.append('category_id', selectedCategory)
      }

      if (selectedStatus) {
        params.append('status', selectedStatus)
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const response = await fetch(`/api/content/items?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to load resources')
      }

      const data = await response.json()
      setResources(data.items)
      setTotalPages(data.pagination.pages)
      setTotalItems(data.pagination.total)
    } catch (err) {
      setError('Error loading resources. Please try again.')
      console.error('Load resources error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/content/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Load categories error:', err)
    }
  }

  const handleSaveResource = async (resourceData: any) => {
    try {
      const method = editingResource ? 'PUT' : 'POST'
      const url = editingResource 
        ? `/api/content/items/${editingResource.id}`
        : '/api/content/items'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token' // In real app, get from auth context
        },
        body: JSON.stringify(resourceData)
      })

      if (!response.ok) {
        throw new Error('Failed to save resource')
      }

      // Refresh resources list
      await loadResources()
      setShowEditor(false)
      setEditingResource(null)
    } catch (err) {
      throw new Error('Failed to save resource')
    }
  }

  const handleEditResource = async (resource: ContentItem) => {
    try {
      // Load full content for editing
      const response = await fetch(`/api/content/items/${resource.id}`)
      if (!response.ok) {
        throw new Error('Failed to load resource details')
      }
      
      const fullResource = await response.json()
      setEditingResource(fullResource)
      setShowEditor(true)
    } catch (err) {
      setError('Failed to load resource for editing')
    }
  }

  const handleDeleteResource = async (resource: ContentItem) => {
    setDeletingResource(resource)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deletingResource) return

    try {
      const response = await fetch(`/api/content/items/${deletingResource.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete resource')
      }

      await loadResources()
    } catch (err) {
      setError('Failed to delete resource')
    } finally {
      setShowDeleteDialog(false)
      setDeletingResource(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return

    try {
      const response = await fetch('/api/content/items/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ ids: selectedItems })
      })

      if (!response.ok) {
        throw new Error('Failed to delete selected resources')
      }

      await loadResources()
      setSelectedItems([])
    } catch (err) {
      setError('Failed to delete selected resources')
    }
  }

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(resources.map(r => r.id))
    } else {
      setSelectedItems([])
    }
  }

  const exportResources = (format: 'csv' | 'json') => {
    const data = resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      status: resource.status,
      category: resource.category?.name,
      author: resource.author.name,
      created_at: resource.created_at,
      updated_at: resource.updated_at
    }))

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'csv') {
      const headers = Object.keys(data[0]).join(',')
      const rows = data.map(row => Object.values(row).join(',')).join('\n')
      content = headers + '\n' + rows
      filename = 'resources.csv'
      mimeType = 'text/csv'
    } else {
      content = JSON.stringify(data, null, 2)
      filename = 'resources.json'
      mimeType = 'application/json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (showEditor) {
    return (
      <ResourceEditor
        mode={editingResource ? 'edit' : 'create'}
        initialData={editingResource ? {
          id: editingResource.id,
          title: editingResource.title,
          description: editingResource.description,
          category: editingResource.category?.name || '',
          type: editingResource.type,
          content: editingResource.content || '',
          slug: editingResource.slug || ''
        } : undefined}
        onSave={handleSaveResource}
        onFileUpload={async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          
          const response = await fetch('/api/content/upload', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer valid-jwt-token'
            },
            body: formData
          })

          if (!response.ok) {
            throw new Error('Upload failed')
          }

          return await response.json()
        }}
      />
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Resource Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage CBOA resources with rich media support
          </p>
        </div>
        <Button 
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Resource
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="ml-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={loadResources}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            {/* Export */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => exportResources('csv')}
                className="w-full"
              >
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="mb-4 border-primary/20 bg-primary/10">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-primary">
                {selectedItems.length} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete ${selectedItems.length} resources?`)) {
                      handleBulkDelete()
                    }
                  }}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">Total Resources: {totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              Published: {resources.filter(r => r.status === 'published').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              Drafts: {resources.filter(r => r.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" data-testid="loading-spinner" />
            <span>Loading resources...</span>
          </div>
        </div>
      )}

      {/* Resources List */}
      {!loading && resources.length > 0 && (
        <div className="space-y-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                {/* Checkbox */}
                <Checkbox
                  checked={selectedItems.includes(resource.id)}
                  onCheckedChange={(checked) => handleSelectItem(resource.id, checked as boolean)}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {resource.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {resource.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={resource.status === 'published' ? 'default' : 'secondary'}>
                          {resource.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                        {resource.category && (
                          <Badge variant="outline">
                            {resource.category.name}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {resource.type}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditResource(resource)}
                        aria-label="Edit resource"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteResource(resource)}
                        aria-label="Delete resource"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && resources.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No resources found. Create your first resource to get started.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingResource?.title}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Options Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="sr-only">Export Options</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Resources</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <Button onClick={() => exportResources('csv')}>Export to CSV</Button>
            <Button onClick={() => exportResources('json')}>Export to JSON</Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
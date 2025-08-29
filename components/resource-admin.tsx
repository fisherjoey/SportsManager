'use client'

import { useState, useRef, useEffect } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, Video, Link as LinkIcon, Upload, 
  Save, Eye, Trash2, Edit 
} from 'lucide-react'

interface ResourceAdminProps {
  // Admin interface for creating/editing resources
}

export function ResourceAdmin() {
  const [resources, setResources] = useState([])
  const [editingResource, setEditingResource] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [content, setContent] = useState('')
  const [mounted, setMounted] = useState(false)
  const [editorKey, setEditorKey] = useState(0) // Force re-render on theme change
  const editorRef = useRef(null)
  const { theme, resolvedTheme } = useTheme()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Force editor re-render when theme changes
  useEffect(() => {
    if (mounted) {
      setEditorKey(prev => prev + 1)
    }
  }, [resolvedTheme, mounted])

  const resourceTypes = [
    { value: 'document', label: 'Document', icon: FileText, color: 'bg-blue-100 text-blue-800' },
    { value: 'video', label: 'Video', icon: Video, color: 'bg-green-100 text-green-800' },
    { value: 'link', label: 'Link', icon: LinkIcon, color: 'bg-purple-100 text-purple-800' },
    { value: 'mixed', label: 'Mixed Content', icon: Upload, color: 'bg-orange-100 text-orange-800' }
  ]

  const handleSaveResource = async () => {
    const htmlContent = editorRef.current?.getContent() || ''
    console.log('Saving resource with content:', htmlContent)
    
    try {
      // First, try to create without auth to test the basic functionality
      const response = await fetch('/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test TinyMCE Resource - ' + new Date().toISOString(),
          content: htmlContent,
          description: 'Resource created with TinyMCE editor',
          category: 'Training',
          type: 'document',
          status: 'published',
          author_id: '066794c1-c2cc-480d-a150-553398c48634' // Hard-code the admin user ID for testing
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save: ${errorText}`)
      }

      const result = await response.json()
      console.log('Save successful:', result)
      alert('Resource saved successfully!')
      
      // Clear the form
      setContent('')
      setIsCreating(false)
      
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save resource: ' + error.message)
    }
  }

  const handlePreview = () => {
    const htmlContent = editorRef.current?.getContent() || ''
    const previewWindow = window.open('', '_blank')
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Resource Preview</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px; 
              line-height: 1.6; 
            }
            img { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `)
    previewWindow.document.close()
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Resource Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create and manage CBOA resources with rich media support
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          New Resource
        </Button>
      </div>

      {/* Resource Creation/Edit Form */}
      {(isCreating || editingResource) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {isCreating ? 'Create New Resource' : 'Edit Resource'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Resource Title" />
              <select className="px-3 py-2 border rounded-md">
                <option>Select Category</option>
                <option>General Information</option>
                <option>Referee Resources</option>
                <option>Member Services</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="URL Slug" />
              <select className="px-3 py-2 border rounded-md">
                <option>Content Type</option>
                {resourceTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <Textarea 
              placeholder="Brief description..." 
              rows={2}
            />

            {/* TinyMCE Rich Text Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <div className="border rounded-lg overflow-hidden">
                {mounted && (
                  <Editor
                    key={editorKey}
                    ref={editorRef}
                    apiKey="g7uhwpygdstjbgrssf1s8x665vjg9ep442amg14895x8bq0q"
                    value={content}
                    onEditorChange={(content) => setContent(content)}
                    onInit={(evt, editor) => {
                      editorRef.current = editor
                    }}
                    init={{
                      height: 500,
                      menubar: false,
                      plugins: [
                        'lists', 'link', 'image', 'preview', 'code', 'fullscreen',
                        'media', 'table', 'wordcount', 'paste'
                      ],
                      toolbar: 'undo redo | blocks | bold italic | ' +
                      'bullist numlist | link image media | code | preview fullscreen',
                      
                      // Dynamic skin based on theme
                      skin: resolvedTheme === 'dark' ? 'oxide-dark' : 'oxide',
                      content_css: resolvedTheme === 'dark' ? 'dark' : 'default',
                      
                      branding: false,
                      promotion: false,
                      statusbar: false,
                      elementpath: false,
                      resize: false,
                    
                      // File picker for images/media
                      file_picker_callback: (callback, value, meta) => {
                      const input = document.createElement('input')
                      input.setAttribute('type', 'file')
                      
                      if (meta.filetype === 'image') {
                        input.setAttribute('accept', 'image/*')
                      } else if (meta.filetype === 'media') {
                        input.setAttribute('accept', 'video/*,audio/*')
                      } else {
                        input.setAttribute('accept', '*/*')
                      }
                      
                      input.onchange = function () {
                        const file = this.files[0]
                        const reader = new FileReader()
                        reader.onload = function () {
                          const id = 'blobid' + (new Date()).getTime()
                          const blobCache = editorRef.current.editorUpload.blobCache
                          const base64 = reader.result.split(',')[1]
                          const blobInfo = blobCache.create(id, file, base64)
                          blobCache.add(blobInfo)
                          callback(blobInfo.blobUri(), { title: file.name })
                        }
                        reader.readAsDataURL(file)
                      }
                      input.click()
                    }
                  }}
                />
                )}
              </div>
            </div>

            {/* Media Upload Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Attachments</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-gray-500">
                  Supports: PDF, DOC, MP4, MOV, JPG, PNG (Max 10MB each)
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex items-center gap-2"
                onClick={handleSaveResource}
              >
                <Save className="h-4 w-4" />
                Save Resource
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handlePreview}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsCreating(false)
                  setEditingResource(null)
                  setContent('')
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources List */}
      <div className="grid gap-4">
        {/* Example resources */}
        {[
          { title: 'General Meeting Minutes - January 2024', type: 'document', category: 'General Information' },
          { title: 'Referee Training Video Series', type: 'video', category: 'Referee Resources' },
          { title: 'Self Assignment Portal', type: 'link', category: 'Member Services' }
        ].map((resource, index) => {
          const typeConfig = resourceTypes.find(t => t.value === resource.type)
          const Icon = typeConfig?.icon || FileText
          
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`p-2 rounded-lg ${typeConfig?.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {resource.title}
                  </h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {resource.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {typeConfig?.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingResource(resource)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
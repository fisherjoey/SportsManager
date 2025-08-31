'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Save, Eye, X, Upload, AlertCircle, FileEdit, Shield, Info, Users
} from 'lucide-react'
import { ResourceAccessIndicator } from './ResourceAccessIndicator'
import { AccessLevel, Role } from '@/lib/types'

interface ResourceEditorProps {
  onSave: (data: any) => Promise<void>
  onSaveDraft?: (data: any) => Promise<{ id: number }>
  onFileUpload?: (file: File) => Promise<{ file_url: string; file_name: string }>
  categories?: Array<{ id: string; name: string; description?: string }>
  roles?: Role[]
  currentUserRole?: string
  initialData?: {
    id?: number
    title: string
    description: string
    category: string | number
    type: string
    content: string
    slug: string
    external_url?: string
    access_level?: AccessLevel
    permissions?: any
  }
  mode?: 'create' | 'edit'
  showPermissions?: boolean
}

export function ResourceEditor({ 
  onSave, 
  onSaveDraft,
  onFileUpload,
  categories = [],
  roles = [],
  currentUserRole,
  initialData, 
  mode = 'create',
  showPermissions = true
}: ResourceEditorProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [category, setCategory] = useState<string | number>(initialData?.category || '')
  const [type, setType] = useState(initialData?.type || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [externalUrl, setExternalUrl] = useState(initialData?.external_url || '')
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(initialData?.access_level || 'role-based')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [draftId, setDraftId] = useState<number | null>(initialData?.id || null)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const editorRef = useRef<any>(null)
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

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [title, description, category, type, content, accessLevel, selectedRoles])

  // Auto-save as draft every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !onSaveDraft) return

    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && (title.trim() || content.trim())) {
        handleSaveDraft(true) // true indicates auto-save
      }
    }, 30000) // 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [hasUnsavedChanges, title, content, onSaveDraft])

  // Save draft before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && (title.trim() || content.trim())) {
        // Attempt to save draft
        if (onSaveDraft) {
          handleSaveDraft(true)
        }
        
        // Show browser warning
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, title, content, onSaveDraft])

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
  }

  const validateForm = (): string[] => {
    const errors: string[] = []
    
    if (!title.trim()) {
      errors.push('Title is required')
    }
    
    if (!type) {
      errors.push('Content type is required')
    }
    
    if (!category) {
      errors.push('Category is required')
    }
    
    // Validate based on content type
    if (type === 'link' || type === 'video') {
      // For links and videos, external URL is required
      if (!externalUrl.trim()) {
        errors.push(`${type === 'video' ? 'Video URL' : 'External URL'} is required for ${type} resources`)
      } else {
        try {
          new URL(externalUrl)
        } catch {
          errors.push('Please enter a valid URL')
        }
      }
    } else if (type === 'document') {
      // For documents, content is required
      if (!content.trim()) {
        errors.push('Document content is required')
      }
    } else if (type === 'mixed') {
      // For mixed content, either content or external URL is required
      if (!content.trim() && !externalUrl.trim()) {
        errors.push('Either content or external URL is required for mixed resources')
      }
      // If URL is provided, validate it
      if (externalUrl.trim()) {
        try {
          new URL(externalUrl)
        } catch {
          errors.push('Please enter a valid URL')
        }
      }
    }
    
    return errors
  }

  const handleSave = async () => {
    setError(null)
    setValidationErrors([])

    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setIsLoading(true)

    try {
      const htmlContent = editorRef.current?.getContent() || content
      
      await onSave({
        id: draftId,
        title,
        description,
        category,
        type,
        content: htmlContent,
        slug: generateSlug(title),
        status: 'published',
        external_url: (type === 'link' || type === 'video' || type === 'mixed') ? externalUrl : undefined,
        access_level: accessLevel,
        permissions: accessLevel === 'role-based' ? {
          allowed_roles: selectedRoles
        } : undefined
      })
      
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    } catch (err) {
      setError('Error saving resource. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDraft = async (isAutoSave = false) => {
    if (!onSaveDraft) return
    
    // Don't auto-save if there's no content
    if (isAutoSave && !title.trim() && !content.trim()) return

    setError(null)
    if (!isAutoSave) {
      setIsDraftSaving(true)
    }

    try {
      const htmlContent = editorRef.current?.getContent() || content
      
      const result = await onSaveDraft({
        id: draftId,
        title: title || 'Untitled Draft',
        description,
        category: category || categories[0]?.id,
        type: type || 'document',
        content: htmlContent,
        slug: title ? generateSlug(title) : `draft-${Date.now()}`,
        status: 'draft',
        external_url: (type === 'link' || type === 'video' || type === 'mixed') ? externalUrl : undefined,
        access_level: accessLevel,
        permissions: accessLevel === 'role-based' ? {
          allowed_roles: selectedRoles
        } : undefined
      })
      
      if (result?.id && !draftId) {
        setDraftId(result.id)
      }
      
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      
      if (!isAutoSave) {
        // Show success message for manual saves
        setError('Draft saved successfully!')
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      if (!isAutoSave) {
        setError('Error saving draft. Please try again.')
      }
    } finally {
      if (!isAutoSave) {
        setIsDraftSaving(false)
      }
    }
  }

  const handlePreview = () => {
    const htmlContent = editorRef.current?.getContent() || content
    const previewWindow = window.open('', '_blank')
    
    if (previewWindow) {
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
  }

  const handleFileUpload = async (file: File) => {
    if (!onFileUpload) {
      throw new Error('File upload not configured')
    }

    try {
      return await onFileUpload(file)
    } catch (error) {
      throw new Error('File upload failed. Please try again.')
    }
  }

  const filePickerCallback = (callback: any, value: string, meta: any) => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('data-testid', 'file-input')
    
    if (meta.filetype === 'image') {
      input.setAttribute('accept', 'image/*')
    } else if (meta.filetype === 'media') {
      input.setAttribute('accept', 'video/*,audio/*')
    } else {
      input.setAttribute('accept', '*/*')
    }
    
    input.onchange = async function() {
      const file = (this as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const result = await handleFileUpload(file)
        callback(result.file_url, { title: result.file_name })
      } catch (error) {
        console.error('Upload error:', error)
        setError('File upload failed. Please try again.')
      }
    }
    
    input.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    
    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    
    if (file && onFileUpload) {
      try {
        await handleFileUpload(file)
      } catch (error) {
        setError('File upload failed. Please try again.')
      }
    }
  }

  if (!mounted) {
    return <div>Loading editor...</div>
  }

  return (
    <Card className="w-full max-w-4xl mx-auto" data-testid="resource-editor">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {mode === 'edit' ? 'Edit Resource' : 'Create New Resource'}
          </CardTitle>
          
          {/* Auto-save status */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
            {hasUnsavedChanges && !isDraftSaving && (
              <span className="text-orange-500">Unsaved changes</span>
            )}
            {isDraftSaving && (
              <span className="text-blue-500">Saving draft...</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Please fix the following errors:
                </h3>
                <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">Title</label>
            <Input
              id="title"
              placeholder="Resource Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">URL Slug</label>
            <Input
              id="slug"
              placeholder="URL Slug"
              value={generateSlug(title)}
              readOnly
              className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Content Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- Select Content Type --</option>
              <option value="document">📄 Document (Rich text editor)</option>
              <option value="link">🔗 Link (External URL)</option>
              <option value="video">🎥 Video (YouTube, Vimeo, etc.)</option>
              <option value="mixed">📦 Mixed Content (Text + uploads)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Choose how you want to add this resource
            </p>
          </div>
        </div>

        {/* External URL field - shown for link and video types */}
        {(type === 'link' || type === 'video') && (
          <div className="space-y-2">
            <label htmlFor="external-url" className="text-sm font-medium">
              {type === 'video' ? 'Video URL' : 'External URL'} <span className="text-red-500">*</span>
            </label>
            <Input
              id="external-url"
              type="url"
              placeholder={type === 'video' ? "https://youtube.com/watch?v=... or https://vimeo.com/..." : "https://example.com/resource"}
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {type === 'video' 
                ? 'Enter a YouTube, Vimeo, or direct video URL'
                : 'Enter the full URL including https://'}
            </p>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <Textarea
            id="description"
            placeholder="Brief description..."
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Permission Settings */}
        {showPermissions && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-medium">Access Permissions</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="access-level" className="text-sm font-medium">
                    Access Level
                  </label>
                  <Select value={accessLevel} onValueChange={(value: AccessLevel) => setAccessLevel(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select access level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>Public - Everyone can access</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="role-based">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span>Role-based - Specific roles only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="restricted">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span>Restricted - Limited access</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span>Private - Admin only</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose who can access this resource
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Access</label>
                  <div className="p-3 border rounded-md bg-muted/50">
                    <ResourceAccessIndicator
                      accessLevel={accessLevel}
                      size="md"
                      variant="full"
                      showDetails
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection for Role-based Access */}
              {accessLevel === 'role-based' && roles.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Allowed Roles
                  </label>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {roles.map(role => (
                      <div 
                        key={role.id}
                        className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedRoles.includes(role.id) 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-background'
                        }`}
                        onClick={() => {
                          setSelectedRoles(prev => 
                            prev.includes(role.id)
                              ? prev.filter(id => id !== role.id)
                              : [...prev, role.id]
                          )
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{role.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{role.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedRoles.map(roleId => {
                        const role = roles.find(r => r.id === roleId)
                        if (!role) return null
                        
                        return (
                          <Badge 
                            key={roleId} 
                            variant="secondary" 
                            className="text-xs"
                          >
                            {role.name}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Select which roles can access this resource. If no roles are selected, 
                    the resource will inherit permissions from its category.
                  </p>
                </div>
              )}

              {/* Info about permissions */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Permission Hierarchy</p>
                    <p className="text-xs">
                      Resource permissions override category permissions. If not set, 
                      permissions are inherited from the selected category.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Content Input - Show different inputs based on type */}
        {!type ? (
          // Prompt to select a type first
          <div className="p-8 border-2 border-dashed border-input rounded-lg text-center bg-muted">
            <p className="text-muted-foreground">Please select a content type above to continue</p>
          </div>
        ) : type === 'document' || type === 'mixed' ? (
          // TinyMCE Editor for document and mixed content
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {type === 'mixed' ? 'Content (can include links, embeds, and rich text)' : 'Document Content'}
            </label>
            <div className="border border-input rounded-lg overflow-hidden bg-background">
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
                file_picker_callback: filePickerCallback
              }}
            />
            </div>
          </div>
        ) : type === 'link' ? (
          // Link preview for link type
          <div className="space-y-2">
            <label className="text-sm font-medium">Link Preview</label>
            <div className="p-4 border border-input rounded-lg bg-muted">
              {externalUrl ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">This resource will open:</p>
                  <a 
                    href={externalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {externalUrl}
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Enter a URL above to preview</p>
              )}
            </div>
          </div>
        ) : type === 'video' ? (
          // Video preview for video type
          <div className="space-y-2">
            <label className="text-sm font-medium">Video Preview</label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-black">
              {externalUrl ? (
                <div className="aspect-video">
                  {(() => {
                    // Try to embed YouTube videos
                    if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
                      const videoId = externalUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
                      if (videoId) {
                        return (
                          <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        )
                      }
                    }
                    // Try to embed Vimeo videos
                    if (externalUrl.includes('vimeo.com')) {
                      const videoId = externalUrl.match(/vimeo\.com\/(\d+)/)?.[1]
                      if (videoId) {
                        return (
                          <iframe
                            className="w-full h-full"
                            src={`https://player.vimeo.com/video/${videoId}`}
                            title="Vimeo video"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                          />
                        )
                      }
                    }
                    // For other videos, show a preview message
                    return (
                      <div className="flex items-center justify-center h-full p-8 text-white">
                        <div className="text-center">
                          <p className="mb-2">Video URL provided:</p>
                          <p className="text-sm text-gray-300 break-all">{externalUrl}</p>
                          <p className="text-xs text-gray-400 mt-4">Preview available for YouTube and Vimeo</p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center text-gray-400">
                  <p>Enter a video URL above to preview</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* File Upload Drop Zone - Only for document and mixed types */}
        {(type === 'document' || type === 'mixed') && (
          <div className="space-y-2">
          <label className="text-sm font-medium">Attachments</label>
          <div 
            className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-muted-foreground transition-colors bg-muted/50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: PDF, DOC, MP4, MOV, JPG, PNG (Max 10MB each)
            </p>
          </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button 
            className="flex items-center gap-2"
            onClick={handleSave}
            disabled={isLoading}
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Publishing...' : (mode === 'edit' ? 'Update & Publish' : 'Publish Resource')}
          </Button>

          {onSaveDraft && (
            <Button 
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => handleSaveDraft(false)}
              disabled={isDraftSaving}
            >
              <FileEdit className="h-4 w-4" />
              {isDraftSaving ? 'Saving Draft...' : 'Save as Draft'}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handlePreview}
            disabled={!content}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          
          <Button 
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => {
              const confirmed = hasUnsavedChanges 
                ? window.confirm('You have unsaved changes. Are you sure you want to cancel?')
                : true
                
              if (confirmed) {
                setTitle('')
                setDescription('')
                setCategory('')
                setType('')
                setContent('')
                setAccessLevel('role-based')
                setSelectedRoles([])
                setError(null)
                setValidationErrors([])
                setHasUnsavedChanges(false)
                setDraftId(null)
              }
            }}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
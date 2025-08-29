'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Save, Eye, X, Upload, AlertCircle, FileEdit
} from 'lucide-react'

interface ResourceEditorProps {
  onSave: (data: any) => Promise<void>
  onSaveDraft?: (data: any) => Promise<{ id: number }>
  onFileUpload?: (file: File) => Promise<{ file_url: string; file_name: string }>
  initialData?: {
    id?: number
    title: string
    description: string
    category: string
    type: string
    content: string
    slug: string
  }
  mode?: 'create' | 'edit'
}

export function ResourceEditor({ 
  onSave, 
  onSaveDraft,
  onFileUpload, 
  initialData, 
  mode = 'create' 
}: ResourceEditorProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [category, setCategory] = useState(initialData?.category || '')
  const [type, setType] = useState(initialData?.type || '')
  const [content, setContent] = useState(initialData?.content || '')
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
  }, [title, description, category, type, content])

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
    
    if (!category) {
      errors.push('Category is required')
    }
    
    if (!content.trim()) {
      errors.push('Content cannot be empty')
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
        status: 'published'
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
        category: category || 'General',
        type: type || 'document',
        content: htmlContent,
        slug: title ? generateSlug(title) : `draft-${Date.now()}`,
        status: 'draft'
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
            {hasUnsavedChanges && !isDraftSaving && (
              <span className="text-warning">Unsaved changes</span>
            )}
            {isDraftSaving && (
              <span className="text-primary">Saving draft...</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">
                  Please fix the following errors:
                </h3>
                <ul className="mt-2 text-sm text-destructive list-disc list-inside">
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
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="ml-3">
                <p className="text-sm text-destructive">{error}</p>
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
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select Category</option>
              <option value="General Information">General Information</option>
              <option value="Referee Resources">Referee Resources</option>
              <option value="Member Services">Member Services</option>
              <option value="Training">Training</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">URL Slug</label>
            <Input
              id="slug"
              placeholder="URL Slug"
              value={generateSlug(title)}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">Content Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Content Type</option>
              <option value="document">Document</option>
              <option value="video">Video</option>
              <option value="link">Link</option>
              <option value="mixed">Mixed Content</option>
            </select>
          </div>
        </div>

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

        {/* TinyMCE Editor */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Content</label>
          <div className="border rounded-lg overflow-hidden">
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

        {/* File Upload Drop Zone */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Attachments</label>
          <div 
            className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
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
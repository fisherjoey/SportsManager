'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Upload, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  MoreHorizontal,
  FileText,
  File,
  Image,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  Archive,
  Folder,
  FolderOpen,
  Plus,
  Share,
  Lock,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  X,
  Check
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table/DataTable'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient, Document, DocumentAcknowledgment } from '@/lib/api'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'

// Using Document interface from API client - removing local duplicate interface

interface DocumentFilters {
  search: string
  category: string
  status: string
  uploaded_by: string
  requires_acknowledgment: string
}

interface UploadFormData {
  file: File | null
  title: string
  description: string
  category: string
  requires_acknowledgment: boolean
  effective_date: string
  expiry_date: string
}

interface ApprovalDialogData {
  document: Document | null
  status: 'approved' | 'rejected' | null
  notes: string
}

interface AcknowledgmentDialogData {
  document: Document | null
  acknowledged: boolean
  comments: string
}

const DOCUMENT_CATEGORIES = [
  'policies',
  'procedures',
  'contracts',
  'hr_documents',
  'financial',
  'legal',
  'training',
  'technical',
  'marketing',
  'compliance',
  'safety',
  'other'
]

const DOCUMENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' }
]

const FILE_TYPE_ICONS = {
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'image/jpeg': Image,
  'image/png': Image,
  'image/gif': Image,
  'video/mp4': FileVideo,
  'audio/mpeg': FileAudio,
  'application/zip': Archive,
  'default': File
}

export function DocumentRepository() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showAcknowledgmentDialog, setShowAcknowledgmentDialog] = useState(false)
  const [pendingAcknowledgments, setPendingAcknowledgments] = useState<DocumentAcknowledgment[]>([])
  const [filters, setFilters] = useState<DocumentFilters>({
    search: '',
    category: '',
    status: '',
    uploaded_by: '',
    requires_acknowledgment: ''
  })
  const [uploadForm, setUploadForm] = useState<UploadFormData>({
    file: null,
    title: '',
    description: '',
    category: '',
    requires_acknowledgment: false,
    effective_date: '',
    expiry_date: ''
  })
  const [approvalDialog, setApprovalDialog] = useState<ApprovalDialogData>({
    document: null,
    status: null,
    notes: ''
  })
  const [acknowledgmentDialog, setAcknowledgmentDialog] = useState<AcknowledgmentDialogData>({
    document: null,
    acknowledged: false,
    comments: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    loadDocuments()
  }, [currentFolder])

  useEffect(() => {
    applyFilters()
  }, [documents, filters])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      
      // Build query parameters from filters
      const params: any = {}
      if (filters.search) params.search = filters.search
      if (filters.category) params.category = filters.category
      if (filters.status) params.status = filters.status
      if (filters.uploaded_by) params.uploaded_by = filters.uploaded_by
      if (filters.requires_acknowledgment) params.requires_acknowledgment = filters.requires_acknowledgment
      
      const response = await apiClient.getDocuments(params)
      setDocuments(response.documents || [])
      
      // Load pending acknowledgments for current user
      const acknowledgments = await apiClient.getDocumentAcknowledgments?.() || []
      setPendingAcknowledgments(acknowledgments.filter((ack: any) => !ack.acknowledged_at))
    } catch (error: any) {
      console.error('Error loading documents:', error)
      
      // Handle authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
      
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load documents',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = documents

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchLower) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        doc.owner.name.toLowerCase().includes(searchLower)
      )
    }

    if (filters.category) {
      filtered = filtered.filter(doc => doc.category === filters.category)
    }

    if (filters.status) {
      filtered = filtered.filter(doc => doc.status === filters.status)
    }

    if (filters.confidentiality) {
      filtered = filtered.filter(doc => doc.confidentiality === filters.confidentiality)
    }

    if (filters.owner) {
      filtered = filtered.filter(doc => doc.owner.id === filters.owner)
    }

    if (filters.type) {
      filtered = filtered.filter(doc => doc.type === filters.type)
    }

    setFilteredDocuments(filtered)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'outline', icon: Edit3, text: 'Draft', color: 'text-muted-foreground' },
      review: { variant: 'secondary', icon: Clock, text: 'Under Review', color: cn(getStatusColorClass('warning', 'text')) },
      approved: { variant: 'default', icon: CheckCircle, text: 'Approved', color: cn(getStatusColorClass('success', 'text')) },
      archived: { variant: 'secondary', icon: Archive, text: 'Archived', color: 'text-muted-foreground' }
    }

    const config = variants[status as keyof typeof variants] || variants.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getConfidentialityBadge = (confidentiality: string) => {
    const variants = {
      public: { variant: 'outline', text: 'Public', color: cn(getStatusColorClass('info', 'text')) },
      internal: { variant: 'secondary', text: 'Internal', color: cn(getStatusColorClass('success', 'text')) },
      confidential: { variant: 'secondary', text: 'Confidential', color: cn(getStatusColorClass('warning', 'text')) },
      restricted: { variant: 'destructive', text: 'Restricted', color: cn(getStatusColorClass('error', 'text')) }
    }

    const config = variants[confidentiality as keyof typeof variants] || variants.internal
    return (
      <Badge variant={config.variant as any} className={config.color}>
        <Lock className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const getFileIcon = (mimeType: string) => {
    const Icon = FILE_TYPE_ICONS[mimeType as keyof typeof FILE_TYPE_ICONS] || FILE_TYPE_ICONS.default
    return <Icon className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDownload = async (documentId: string) => {
    try {
      // For now, use direct fetch as the API client might not have blob handling
      // This could be updated when the API client supports file downloads
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = documents.find(d => d.id === documentId)?.name || 'document'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: 'Document downloaded successfully'
      })
    } catch (error: any) {
      console.error('Download error:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to download document',
        variant: 'destructive'
      })
    }
  }

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast({
        title: 'Error',
        description: 'Please provide a file and title',
        variant: 'destructive'
      })
      return
    }

    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('file', uploadForm.file)
      formData.append('title', uploadForm.title)
      formData.append('description', uploadForm.description)
      formData.append('category', uploadForm.category)
      formData.append('requires_acknowledgment', uploadForm.requires_acknowledgment.toString())
      if (uploadForm.effective_date) formData.append('effective_date', uploadForm.effective_date)
      if (uploadForm.expiry_date) formData.append('expiry_date', uploadForm.expiry_date)

      await apiClient.uploadDocument(formData)
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully'
      })
      
      setShowUploadDialog(false)
      setUploadForm({
        file: null,
        title: '',
        description: '',
        category: '',
        requires_acknowledgment: false,
        effective_date: '',
        expiry_date: ''
      })
      
      await loadDocuments()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to upload document',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleApproval = async () => {
    if (!approvalDialog.document || !approvalDialog.status) return

    try {
      // This would need to be implemented in the API client
      // For now, we'll use a direct API call
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const response = await fetch(`${API_BASE_URL}/documents/${approvalDialog.document.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: approvalDialog.status,
          notes: approvalDialog.notes
        })
      })

      if (!response.ok) throw new Error('Failed to update document status')

      toast({
        title: 'Success',
        description: `Document ${approvalDialog.status} successfully`
      })
      
      setShowApprovalDialog(false)
      setApprovalDialog({ document: null, status: null, notes: '' })
      await loadDocuments()
    } catch (error: any) {
      console.error('Approval error:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update document status',
        variant: 'destructive'
      })
    }
  }

  const handleAcknowledgment = async () => {
    if (!acknowledgmentDialog.document || !acknowledgmentDialog.acknowledged) return

    try {
      await apiClient.acknowledgeDocument(acknowledgmentDialog.document.id, {
        comments: acknowledgmentDialog.comments
      })
      
      toast({
        title: 'Success',
        description: 'Document acknowledged successfully'
      })
      
      setShowAcknowledgmentDialog(false)
      setAcknowledgmentDialog({ document: null, acknowledged: false, comments: '' })
      await loadDocuments()
    } catch (error: any) {
      console.error('Acknowledgment error:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to acknowledge document',
        variant: 'destructive'
      })
    }
  }

  const columns = [
    {
      id: 'document',
      header: 'Document',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              {getFileIcon(document.mime_type)}
            </div>
            <div>
              <p className="font-medium">{document.title}</p>
              <p className="text-sm text-muted-foreground">
                v{document.version} • {formatFileSize(document.file_size)}
              </p>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return (
          <Badge variant="outline" className="capitalize">
            {document.category.replace('_', ' ')}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return getStatusBadge(document.status)
      }
    },
    {
      accessorKey: 'requires_acknowledgment',
      header: 'Acknowledgment',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return getRequiresAcknowledgmentBadge(document.requires_acknowledgment)
      }
    },
    {
      accessorKey: 'uploaded_by_name',
      header: 'Uploaded By',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return (
          <div>
            <p className="font-medium">{document.uploaded_by_name || 'Unknown'}</p>
          </div>
        )
      }
    },
    {
      accessorKey: 'updated_at',
      header: 'Modified',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return (
          <div className="text-sm">
            <p>{new Date(document.updated_at || document.created_at || '').toLocaleDateString()}</p>
            <p className="text-muted-foreground">
              {new Date(document.updated_at || document.created_at || '').toLocaleTimeString()}
            </p>
          </div>
        )
      }
    },
    {
      id: 'actions',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedDocument(document)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              {document.status === 'pending_approval' && (
                <DropdownMenuItem onClick={() => {
                  setApprovalDialog({ document, status: null, notes: '' })
                  setShowApprovalDialog(true)
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve/Reject
                </DropdownMenuItem>
              )}
              {document.requires_acknowledgment && (
                <DropdownMenuItem onClick={() => {
                  setAcknowledgmentDialog({ document, acknowledged: false, comments: '' })
                  setShowAcknowledgmentDialog(true)
                }}>
                  <Check className="h-4 w-4 mr-2" />
                  Acknowledge
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className={cn(getStatusColorClass('error', 'text'))}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Document Repository</h2>
          <p className="text-muted-foreground">
            Centralized document management with version control and access management
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Pending Acknowledgments Alert */}
      {pendingAcknowledgments.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {pendingAcknowledgments.length} document{pendingAcknowledgments.length > 1 ? 's' : ''} requiring acknowledgment.
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 ml-2 h-auto"
              onClick={() => setFilters(prev => ({ ...prev, requires_acknowledgment: 'true' }))}
            >
              View them
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.status === 'pending_approval').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
              <Clock className={cn("h-8 w-8", getStatusColorClass('warning', 'text'))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.status === 'approved').length}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
              <CheckCircle className={cn("h-8 w-8", getStatusColorClass('success', 'text'))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {pendingAcknowledgments.length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Acknowledgments</p>
              </div>
              <AlertTriangle className={cn("h-8 w-8", getStatusColorClass('warning', 'text'))} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {DOCUMENT_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category} className="capitalize">
                      {category.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {DOCUMENT_STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Requires Acknowledgment</Label>
              <Select value={filters.requires_acknowledgment} onValueChange={(value) => setFilters(prev => ({ ...prev, requires_acknowledgment: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All documents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All documents</SelectItem>
                  <SelectItem value="true">Requires Acknowledgment</SelectItem>
                  <SelectItem value="false">No Acknowledgment Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredDocuments}
            columns={columns}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} documents
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page <= 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Document Details Dialog */}
      {selectedDocument && (
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getFileIcon(selectedDocument.mime_type)}
                </div>
                <div>
                  <div className="text-xl font-bold">{selectedDocument.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Version {selectedDocument.version} • {formatFileSize(selectedDocument.file_size)}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge(selectedDocument.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Requires Acknowledgment</span>
                    {getRequiresAcknowledgmentBadge(selectedDocument.requires_acknowledgment)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="capitalize">{selectedDocument.category.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded By</span>
                    <span>{selectedDocument.uploaded_by_name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(selectedDocument.created_at || '').toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modified</span>
                    <span>{new Date(selectedDocument.updated_at || selectedDocument.created_at || '').toLocaleDateString()}</span>
                  </div>
                  {selectedDocument.effective_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective Date</span>
                      <span>{new Date(selectedDocument.effective_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedDocument.expiry_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires</span>
                      <span className={new Date(selectedDocument.expiry_date) < new Date() ? cn(getStatusColorClass('error', 'text'), 'font-semibold') : ''}>
                        {new Date(selectedDocument.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDocument.description ? (
                    <p className="text-sm">{selectedDocument.description}</p>
                  ) : (
                    <p className="text-muted-foreground">No description provided</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={() => handleDownload(selectedDocument.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {selectedDocument.status === 'pending_approval' && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setApprovalDialog({ document: selectedDocument, status: null, notes: '' })
                    setShowApprovalDialog(true)
                    setSelectedDocument(null)
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve/Reject
                </Button>
              )}
              {selectedDocument.requires_acknowledgment && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setAcknowledgmentDialog({ document: selectedDocument, acknowledged: false, comments: '' })
                    setShowAcknowledgmentDialog(true)
                    setSelectedDocument(null)
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Acknowledge
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document to the repository
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <Input 
                id="file"
                type="file" 
                onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={uploadForm.category} onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category} className="capitalize">
                      {category.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="requires_ack"
                checked={uploadForm.requires_acknowledgment}
                onChange={(e) => setUploadForm(prev => ({ ...prev, requires_acknowledgment: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="requires_ack">Requires Acknowledgment</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective Date</Label>
                <Input 
                  id="effective_date"
                  type="date"
                  value={uploadForm.effective_date}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, effective_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input 
                  id="expiry_date"
                  type="date"
                  value={uploadForm.expiry_date}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Approval</DialogTitle>
            <DialogDescription>
              {approvalDialog.document?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Decision</Label>
              <Select 
                value={approvalDialog.status || ''} 
                onValueChange={(value: 'approved' | 'rejected') => 
                  setApprovalDialog(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={approvalDialog.notes}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about your decision..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproval} disabled={!approvalDialog.status}>
              Submit Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acknowledgment Dialog */}
      <Dialog open={showAcknowledgmentDialog} onOpenChange={setShowAcknowledgmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Acknowledgment</DialogTitle>
            <DialogDescription>
              {acknowledgmentDialog.document?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="acknowledged"
                checked={acknowledgmentDialog.acknowledged}
                onChange={(e) => setAcknowledgmentDialog(prev => ({ ...prev, acknowledged: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="acknowledged">I acknowledge that I have read and understood this document</Label>
            </div>
            <div className="space-y-2">
              <Label>Comments (Optional)</Label>
              <Textarea 
                value={acknowledgmentDialog.comments}
                onChange={(e) => setAcknowledgmentDialog(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Add any comments..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcknowledgmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAcknowledgment} disabled={!acknowledgmentDialog.acknowledged}>
              Submit Acknowledgment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
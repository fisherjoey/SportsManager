"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Calendar
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table/DataTable'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface Document {
  id: string
  name: string
  type: string
  mimeType: string
  size: number
  category: string
  tags: string[]
  version: string
  status: 'draft' | 'review' | 'approved' | 'archived'
  confidentiality: 'public' | 'internal' | 'confidential' | 'restricted'
  folder: {
    id: string
    name: string
    path: string
  }
  owner: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
  lastAccessedAt?: string
  expiryDate?: string
  approvedBy?: {
    id: string
    name: string
    date: string
  }
  permissions: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canShare: boolean
  }
  versions: Array<{
    id: string
    version: string
    createdAt: string
    createdBy: string
    size: number
    changes?: string
  }>
  reviews: Array<{
    id: string
    reviewer: string
    status: 'pending' | 'approved' | 'rejected'
    comments?: string
    date: string
  }>
}

interface DocumentFilters {
  search: string
  category: string
  status: string
  confidentiality: string
  owner: string
  folder: string
  type: string
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
  'other'
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
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [currentFolder, setCurrentFolder] = useState<string>('root')
  const [filters, setFilters] = useState<DocumentFilters>({
    search: '',
    category: '',
    status: '',
    confidentiality: '',
    owner: '',
    folder: '',
    type: ''
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
      const response = await fetch(`/api/documents?folder=${currentFolder}`)
      if (!response.ok) throw new Error('Failed to load documents')
      
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error('Error loading documents:', error)
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
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
      draft: { variant: 'outline', icon: Edit3, text: 'Draft', color: 'text-gray-600' },
      review: { variant: 'secondary', icon: Clock, text: 'Under Review', color: 'text-yellow-600' },
      approved: { variant: 'default', icon: CheckCircle, text: 'Approved', color: 'text-green-600' },
      archived: { variant: 'secondary', icon: Archive, text: 'Archived', color: 'text-gray-600' }
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
      public: { variant: 'outline', text: 'Public', color: 'text-blue-600' },
      internal: { variant: 'secondary', text: 'Internal', color: 'text-green-600' },
      confidential: { variant: 'secondary', text: 'Confidential', color: 'text-orange-600' },
      restricted: { variant: 'destructive', text: 'Restricted', color: 'text-red-600' }
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
      const response = await fetch(`/api/documents/${documentId}/download`)
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
        description: 'Document downloaded successfully',
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive',
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
              {getFileIcon(document.mimeType)}
            </div>
            <div>
              <p className="font-medium">{document.name}</p>
              <p className="text-sm text-muted-foreground">
                v{document.version} • {formatFileSize(document.size)}
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
      accessorKey: 'confidentiality',
      header: 'Access Level',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return getConfidentialityBadge(document.confidentiality)
      }
    },
    {
      accessorKey: 'owner',
      header: 'Owner',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return (
          <div>
            <p className="font-medium">{document.owner.name}</p>
            <p className="text-sm text-muted-foreground">{document.owner.email}</p>
          </div>
        )
      }
    },
    {
      accessorKey: 'updatedAt',
      header: 'Modified',
      cell: ({ row }: any) => {
        const document: Document = row.original
        return (
          <div className="text-sm">
            <p>{new Date(document.updatedAt).toLocaleDateString()}</p>
            <p className="text-muted-foreground">
              {new Date(document.updatedAt).toLocaleTimeString()}
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
              {document.permissions.canEdit && (
                <DropdownMenuItem>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {document.permissions.canShare && (
                <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {document.permissions.canDelete && (
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  if (loading) {
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
          <Button variant="outline">
            <Folder className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

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
                  {documents.filter(d => d.status === 'review').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
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
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.expiryDate && new Date(d.expiryDate) < new Date()).length}
                </p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
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
                  <SelectItem value="">All categories</SelectItem>
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
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select value={filters.confidentiality} onValueChange={(value) => setFilters(prev => ({ ...prev, confidentiality: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All levels</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
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

      {/* Document Details Dialog */}
      {selectedDocument && (
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getFileIcon(selectedDocument.mimeType)}
                </div>
                <div>
                  <div className="text-xl font-bold">{selectedDocument.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Version {selectedDocument.version} • {formatFileSize(selectedDocument.size)}
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
                    <span className="text-muted-foreground">Access Level</span>
                    {getConfidentialityBadge(selectedDocument.confidentiality)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="capitalize">{selectedDocument.category.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner</span>
                    <span>{selectedDocument.owner.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(selectedDocument.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modified</span>
                    <span>{new Date(selectedDocument.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {selectedDocument.expiryDate && (
                    <div CLASS="flex justify-between">
                      <span className="text-muted-foreground">Expires</span>
                      <span className={new Date(selectedDocument.expiryDate) < new Date() ? 'text-red-600 font-semibold' : ''}>
                        {new Date(selectedDocument.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDocument.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tags assigned</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={() => handleDownload(selectedDocument.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {selectedDocument.permissions.canEdit && (
                <Button variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {selectedDocument.permissions.canShare && (
                <Button variant="outline">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document to the repository
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select>
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
            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <Input placeholder="Enter tags separated by commas" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
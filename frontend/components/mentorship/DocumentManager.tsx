'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Upload,
  Download,
  FileText,
  File,
  Image,
  Video,
  Music,
  Archive,
  Plus,
  MoreVertical,
  Eye,
  Trash2,
  Lock,
  Unlock,
  Search,
  Calendar,
  User,
  Tag
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MenteeDocument, type DocumentCategory } from '@/types/mentorship'

interface DocumentManagerProps {
  menteeId: string
  mentorId: string
  documents: MenteeDocument[]
  onDocumentsChange: (documents: MenteeDocument[]) => void
}

export function DocumentManager({ 
  menteeId, 
  mentorId, 
  documents, 
  onDocumentsChange 
}: DocumentManagerProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'other' as DocumentCategory,
    description: '',
    is_private: false
  })

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadForm({
        ...uploadForm,
        title: uploadForm.title || file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
      })
    }
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive'
      })
      return
    }

    if (!uploadForm.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a title for the document',
        variant: 'destructive'
      })
      return
    }

    try {
      setUploadingFile(true)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', uploadForm.title)
      formData.append('category', uploadForm.category)
      formData.append('description', uploadForm.description)
      formData.append('is_private', String(uploadForm.is_private))
      formData.append('mentee_id', menteeId)
      formData.append('mentor_id', mentorId)

      const response = await apiClient.post('/mentee-documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data) {
        onDocumentsChange([...documents, response.data])
        toast({
          title: 'Success',
          description: 'Document uploaded successfully'
        })
        
        // Reset form
        setUploadForm({
          title: '',
          category: 'other',
          description: '',
          is_private: false
        })
        setShowUploadDialog(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDownload = async (document: MenteeDocument) => {
    try {
      const response = await apiClient.get(`/mentee-documents/${document.id}/download`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', document.file_name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (documentId: string) => {
    try {
      await apiClient.delete(`/mentee-documents/${documentId}`)
      onDocumentsChange(documents.filter(d => d.id !== documentId))
      toast({
        title: 'Success',
        description: 'Document deleted successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      })
    } finally {
      setDeletingDocId(null)
    }
  }

  const togglePrivacy = async (document: MenteeDocument) => {
    try {
      const response = await apiClient.patch(`/mentee-documents/${document.id}`, {
        is_private: !document.is_private
      })
      
      if (response.data) {
        const updatedDocuments = documents.map(d => 
          d.id === document.id ? response.data : d
        )
        onDocumentsChange(updatedDocuments)
        
        toast({
          title: 'Success',
          description: `Document is now ${response.data.is_private ? 'private' : 'public'}`
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update document privacy',
        variant: 'destructive'
      })
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5 text-green-500" />
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-5 w-5 text-yellow-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const getCategoryColor = (category: DocumentCategory) => {
    const colors = {
      evaluation: 'bg-red-100 text-red-800',
      training: 'bg-blue-100 text-blue-800',
      certification: 'bg-green-100 text-green-800',
      feedback: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors.other
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents & Files
            </CardTitle>
            <CardDescription>
              Manage documents, evaluations, and training materials
            </CardDescription>
          </div>
          
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document for this mentee
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Select File</Label>
                  <Input
                    id="file"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="*/*"
                  />
                </div>
                
                <div>
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="Enter document title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={uploadForm.category}
                    onValueChange={(value: DocumentCategory) => 
                      setUploadForm({ ...uploadForm, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evaluation">Evaluation</SelectItem>
                      <SelectItem value="training">Training Material</SelectItem>
                      <SelectItem value="certification">Certification</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Brief description of the document"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_private"
                    checked={uploadForm.is_private}
                    onChange={(e) => setUploadForm({ ...uploadForm, is_private: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_private" className="text-sm">
                    Make this document private (only visible to mentor)
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowUploadDialog(false)}
                  disabled={uploadingFile}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploadingFile}
                >
                  {uploadingFile ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select
            value={categoryFilter}
            onValueChange={(value: DocumentCategory | 'all') => setCategoryFilter(value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="evaluation">Evaluations</SelectItem>
              <SelectItem value="training">Training Materials</SelectItem>
              <SelectItem value="certification">Certifications</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm || categoryFilter !== 'all' ? 'No documents found' : 'No documents yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first document to get started'
              }
            </p>
            {!searchTerm && categoryFilter === 'all' && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((document) => (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getFileIcon(document.file_type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate" title={document.title}>
                          {document.title}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {document.file_name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {document.is_private && (
                        <Lock className="h-4 w-4 text-muted-foreground" title="Private document" />
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(document)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePrivacy(document)}>
                            {document.is_private ? (
                              <>
                                <Unlock className="mr-2 h-4 w-4" />
                                Make Public
                              </>
                            ) : (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Make Private
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeletingDocId(document.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getCategoryColor(document.category)} variant="outline">
                        {document.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(document.file_size)}
                      </span>
                    </div>
                    
                    {document.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {document.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(document.uploaded_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Mentor
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDocId} onOpenChange={() => setDeletingDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDocId && handleDelete(deletingDocId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
"use client"

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  Camera, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  X,
  Edit3,
  Brain,
  Eye,
  Download,
  Trash2
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface ReceiptData {
  id: string
  filename: string
  originalFilename: string
  uploadedAt: string
  status: 'uploaded' | 'processing' | 'completed' | 'error' | 'manual_review'
  fileType: string
  fileSize: number
  ocrText?: string
  extractedData?: {
    merchant: string
    date: string
    amount: number
    category: string
    items: Array<{ description: string; amount: number }>
    confidence: number
  }
  processedAt?: string
  errorMessage?: string
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  receiptId?: string
  error?: string
}

export function ReceiptUpload() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Load existing receipts
  React.useEffect(() => {
    loadReceipts()
  }, [])

  const loadReceipts = async () => {
    try {
      const response = await fetch('/api/expenses/receipts')
      if (!response.ok) throw new Error('Failed to load receipts')
      const data = await response.json()
      setReceipts(data)
    } catch (error) {
      console.error('Error loading receipts:', error)
      toast({
        title: 'Error',
        description: 'Failed to load receipts',
        variant: 'destructive',
      })
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported file type`,
          variant: 'destructive',
        })
        return false
      }
      
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 10MB`,
          variant: 'destructive',
        })
        return false
      }
      
      return true
    })

    if (validFiles.length === 0) return

    // Initialize upload progress
    const newUploads = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }))
    
    setUploads(prev => [...prev, ...newUploads])

    // Upload files one by one
    for (let i = 0; i < validFiles.length; i++) {
      await uploadFile(validFiles[i], i)
    }
  }

  const uploadFile = async (file: File, index: number) => {
    const formData = new FormData()
    formData.append('receipt', file)
    formData.append('description', '')
    formData.append('businessPurpose', '')

    try {
      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100
          setUploads(prev => prev.map((upload, i) => 
            i === index ? { ...upload, progress } : upload
          ))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          setUploads(prev => prev.map((upload, i) => 
            i === index ? { 
              ...upload, 
              status: 'processing', 
              progress: 100,
              receiptId: response.receiptId 
            } : upload
          ))
          
          // Start polling for processing status
          pollProcessingStatus(response.receiptId, index)
          
          toast({
            title: 'Upload successful',
            description: `${file.name} uploaded and processing started`,
          })
        } else {
          throw new Error(`Upload failed: ${xhr.statusText}`)
        }
      })

      xhr.addEventListener('error', () => {
        setUploads(prev => prev.map((upload, i) => 
          i === index ? { 
            ...upload, 
            status: 'error',
            error: 'Upload failed' 
          } : upload
        ))
        
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        })
      })

      xhr.open('POST', '/api/expenses/receipts/upload')
      xhr.send(formData)

    } catch (error) {
      console.error('Upload error:', error)
      setUploads(prev => prev.map((upload, i) => 
        i === index ? { 
          ...upload, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : upload
      ))
    }
  }

  const pollProcessingStatus = async (receiptId: string, uploadIndex: number) => {
    const maxAttempts = 30 // 30 seconds max
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/expenses/receipts/${receiptId}`)
        if (!response.ok) throw new Error('Failed to check status')
        
        const receipt = await response.json()
        
        if (receipt.status === 'completed' || receipt.status === 'error' || receipt.status === 'manual_review') {
          setUploads(prev => prev.map((upload, i) => 
            i === uploadIndex ? { ...upload, status: 'completed' } : upload
          ))
          
          // Refresh receipts list
          loadReceipts()
          
          if (receipt.status === 'completed') {
            toast({
              title: 'Processing complete',
              description: `Receipt processed with ${Math.round(receipt.extractedData?.confidence * 100)}% confidence`,
            })
          } else if (receipt.status === 'manual_review') {
            toast({
              title: 'Manual review required',
              description: 'Receipt requires manual review due to low confidence',
              variant: 'destructive',
            })
          }
          
          return
        }
        
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000) // Check again in 1 second
        } else {
          setUploads(prev => prev.map((upload, i) => 
            i === uploadIndex ? { 
              ...upload, 
              status: 'error',
              error: 'Processing timeout' 
            } : upload
          ))
        }
      } catch (error) {
        console.error('Status polling error:', error)
        setUploads(prev => prev.map((upload, i) => 
          i === uploadIndex ? { 
            ...upload, 
            status: 'error',
            error: 'Failed to check processing status' 
          } : upload
        ))
      }
    }

    poll()
  }

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusBadge = (receipt: ReceiptData) => {
    switch (receipt.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>
      case 'processing':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Processing</Badge>
      case 'manual_review':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Review Needed</Badge>
      case 'error':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">Uploaded</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Receipt Management</h2>
        <p className="text-muted-foreground">
          Upload receipts for AI-powered processing and expense categorization
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="processed">Processed ({receipts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Receipts
              </CardTitle>
              <CardDescription>
                Drag and drop files or click to browse. Supports images and PDFs up to 10MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  </div>
                  
                  <div>
                    <p className="text-lg font-medium">Drop receipts here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                    
                    <Button
                      onClick={() => cameraInputRef.current?.click()}
                      variant="outline"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
                
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploads.map((upload, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium truncate">{upload.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(upload.file.size)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {upload.status === 'uploading' && (
                          <>
                            <span className="text-sm">{Math.round(upload.progress)}%</span>
                            <LoadingSpinner className="h-4 w-4" />
                          </>
                        )}
                        {upload.status === 'processing' && (
                          <>
                            <Brain className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Processing...</span>
                          </>
                        )}
                        {upload.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {upload.status === 'error' && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeUpload(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {upload.status === 'uploading' && (
                      <Progress value={upload.progress} />
                    )}
                    
                    {upload.error && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{upload.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-6">
          {receipts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No receipts processed yet</p>
                <p className="text-muted-foreground text-center">
                  Upload your first receipt to get started with AI-powered expense processing
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {receipts.map((receipt) => (
                <Card key={receipt.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{receipt.originalFilename}</h3>
                          {getStatusBadge(receipt)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Uploaded: {new Date(receipt.uploadedAt).toLocaleString()}</p>
                          <p>Size: {formatFileSize(receipt.fileSize)}</p>
                          {receipt.processedAt && (
                            <p>Processed: {new Date(receipt.processedAt).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>

                    {receipt.extractedData && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Extracted Data
                          <Badge variant="outline">
                            {Math.round(receipt.extractedData.confidence * 100)}% confidence
                          </Badge>
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Merchant</p>
                            <p className="font-medium">{receipt.extractedData.merchant}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">{receipt.extractedData.date}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium text-lg">
                              {formatCurrency(receipt.extractedData.amount)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-muted-foreground text-sm">Category</p>
                          <Badge variant="secondary" className="mt-1">
                            {receipt.extractedData.category}
                          </Badge>
                        </div>

                        {receipt.extractedData.items && receipt.extractedData.items.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground mb-2">Items</p>
                            <div className="space-y-1">
                              {receipt.extractedData.items.slice(0, 3).map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span>{item.description}</span>
                                  <span>{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                              {receipt.extractedData.items.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{receipt.extractedData.items.length - 3} more items
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {receipt.errorMessage && (
                      <Alert className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{receipt.errorMessage}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
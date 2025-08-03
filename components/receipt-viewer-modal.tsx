'use client'

import React, { useState, useEffect } from 'react'
import { 
  Download, 
  X, 
  FileText, 
  Calendar, 
  DollarSign, 
  Store, 
  Brain,
  Image as ImageIcon,
  Receipt as ReceiptIcon,
  User,
  Plus,
  Check
} from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api'

interface ReceiptViewerModalProps {
  receiptId: string | null
  receipt?: any // Accept the full receipt object from main page
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ReceiptDetails {
  id: string
  originalFilename: string
  fileType: string
  fileSize: number
  uploadedAt: string
  processedAt: string
  status: string
  ocrText: string
  extractedData: {
    merchant: string
    date: string
    amount: number
    category: string
    confidence: number
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
  }
  processingLogs: Array<{
    id: string
    service_type: string
    status: string
    processing_time_ms: number
    confidence_score: number
    completed_at: string
  }>
}

export function ReceiptViewerModal({ receiptId, receipt: passedReceipt, open, onOpenChange }: ReceiptViewerModalProps) {
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [reimbursementNotes, setReimbursementNotes] = useState<string>('')
  const [assigningReimbursement, setAssigningReimbursement] = useState(false)
  const [reimbursementData, setReimbursementData] = useState<any>(null)

  useEffect(() => {
    if (open) {
      loadUsers() // Load users for reimbursement assignment
      if (passedReceipt) {
        // Use the receipt data that's already loaded on the main page
        setReceipt({
          id: passedReceipt.id,
          originalFilename: passedReceipt.filename || passedReceipt.originalFilename,
          fileType: passedReceipt.fileType || 'unknown',
          fileSize: passedReceipt.fileSize || 0,
          uploadedAt: passedReceipt.uploadedAt,
          processedAt: passedReceipt.processedAt,
          status: passedReceipt.status,
          ocrText: passedReceipt.ocrText || '',
          extractedData: passedReceipt.extractedData || {
            merchant: 'Unknown',
            date: '',
            amount: 0,
            category: 'Uncategorized',
            confidence: 0,
            items: []
          },
          processingLogs: []
        })
      } else if (receiptId) {
        loadReceiptDetails()
      }
    }
  }, [open, receiptId, passedReceipt])

  const loadReceiptDetails = async () => {
    if (!receiptId) return
    
    setLoading(true)
    try {
      const response = await apiClient.getReceiptDetails(receiptId)
      // Handle the nested receipt structure from backend
      const receiptData = response.receipt.receipt || response.receipt
      
      // If the receipt already has extractedData (like from the main page), use it directly
      const extractedData = receiptData.extractedData || {
        merchant: receiptData.vendor_name || 'Unknown',
        date: receiptData.transaction_date || '',
        amount: parseFloat(receiptData.total_amount || '0'),
        category: receiptData.category_name || 'Uncategorized',
        confidence: parseFloat(receiptData.extraction_confidence || '0'),
        items: receiptData.line_items || []
      }
      
      setReceipt({
        id: receiptData.id,
        originalFilename: receiptData.original_filename,
        fileType: receiptData.file_type || 'unknown',
        fileSize: receiptData.file_size,
        uploadedAt: receiptData.uploaded_at,
        processedAt: receiptData.processed_at,
        status: receiptData.processing_status,
        ocrText: receiptData.raw_ocr_text || '',
        extractedData: extractedData,
        processingLogs: response.processingLogs || []
      })
    } catch (error) {
      console.error('Error loading receipt details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load receipt details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!receiptId) return
    
    try {
      await apiClient.downloadReceipt(receiptId)
      toast({
        title: 'Download started',
        description: 'Receipt file download has begun'
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Download failed',
        description: 'Failed to download receipt file',
        variant: 'destructive'
      })
    }
  }

  const loadUsers = async () => {
    try {
      console.log('Loading referees for reimbursement dropdown...')
      const response = await apiClient.getReferees()
      console.log('Referees API response:', response)
      setUsers(response.data?.referees || [])
    } catch (error) {
      console.error('Error loading referees:', error)
      toast({
        title: 'Error',
        description: 'Failed to load referees for reimbursement assignment',
        variant: 'destructive'
      })
    }
  }

  const handleAssignReimbursement = async () => {
    if (!receiptId || !selectedUserId) return
    
    setAssigningReimbursement(true)
    try {
      const response = await apiClient.request(`/expenses/receipts/${receiptId}/assign-reimbursement`, {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUserId,
          notes: reimbursementNotes
        })
      })
      setReimbursementData(response.expenseData)
      toast({
        title: 'Success',
        description: 'Reimbursement assigned successfully'
      })
      setSelectedUserId('')
      setReimbursementNotes('')
    } catch (error) {
      console.error('Error assigning reimbursement:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign reimbursement',
        variant: 'destructive'
      })
    } finally {
      setAssigningReimbursement(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
    case 'processed':
      return <Badge variant="default" className="bg-green-500">Processed</Badge>
    case 'processing':
      return <Badge variant="secondary">Processing</Badge>
    case 'manual_review':
      return <Badge variant="destructive">Needs Review</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image')) {
      return <ImageIcon className="h-5 w-5" />
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5" />
    }
    return <ReceiptIcon className="h-5 w-5" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5" />
            Receipt Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : receipt ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Receipt Image/Preview */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {getFileIcon(receipt.fileType)}
                    Receipt File
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Receipt Image Preview */}
                  {receipt.fileType?.startsWith('image') && (
                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                      {!imageError ? (
                        <img
                          src={`/api/expenses/receipts/${receipt.id}/download`}
                          alt="Receipt"
                          className="w-full h-auto max-h-96 object-contain"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-48 text-gray-500">
                          <ImageIcon className="h-12 w-12 mb-2" />
                          <p>Image preview unavailable</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* File Info */}
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Filename:</span>
                      <span className="font-medium">{receipt.originalFilename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Size:</span>
                      <span>{formatFileSize(receipt.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(receipt.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items - Moved to bottom left */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {(receipt.extractedData.items && receipt.extractedData.items.length > 0) ? (
                    <div className="space-y-1">
                      {receipt.extractedData.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.description}</span>
                          <span>{formatCurrency(item.totalPrice || item.amount || 0)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No line items found for this receipt. Items data: {JSON.stringify(receipt.extractedData.items)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* OCR Text */}
              {receipt.ocrText && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Raw OCR Text
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-gray-50 p-3 rounded border whitespace-pre-wrap font-mono">
                      {receipt.ocrText}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Extracted Data */}
            <div className="space-y-4">
              {/* Basic Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Extracted Data
                    <Badge variant="outline" className="ml-auto">
                      {Math.round(receipt.extractedData.confidence * 100)}% confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Merchant</span>
                      </div>
                      <p className="font-medium">{receipt.extractedData.merchant}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Date</span>
                      </div>
                      <p className="font-medium">
                        {receipt.extractedData.date 
                          ? new Date(receipt.extractedData.date).toLocaleDateString()
                          : 'Unknown'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total Amount</span>
                      </div>
                      <p className="font-bold text-lg text-green-600">
                        {formatCurrency(receipt.extractedData.amount)}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-muted-foreground">Category</span>
                      </div>
                      <Badge variant="secondary">{receipt.extractedData.category}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Reimbursement Assignment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Reimbursement Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reimbursementData?.reimbursement_user_email ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Assigned for Reimbursement
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        User: {reimbursementData.reimbursement_user_email}
                      </p>
                      {reimbursementData.reimbursement_notes && (
                        <p className="text-xs text-green-600 mt-1">
                          Notes: {reimbursementData.reimbursement_notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Assign to User
                        </label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user for reimbursement" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Reimbursement Notes (Optional)
                        </label>
                        <Textarea
                          value={reimbursementNotes}
                          onChange={(e) => setReimbursementNotes(e.target.value)}
                          placeholder="Add any notes about this reimbursement..."
                          rows={3}
                        />
                      </div>
                      
                      <Button
                        onClick={handleAssignReimbursement}
                        disabled={!selectedUserId || assigningReimbursement}
                        className="w-full"
                        size="sm"
                      >
                        {assigningReimbursement ? (
                          <>
                            <LoadingSpinner className="h-4 w-4 mr-2" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Assign Reimbursement
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processing Info */}
              {receipt.processingLogs && receipt.processingLogs.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Processing History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {receipt.processingLogs.map((log, index) => (
                        <div key={index} className="text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium">{log.service_type}</span>
                            <span className="text-muted-foreground">
                              {log.processing_time_ms}ms
                            </span>
                          </div>
                          {log.confidence_score && (
                            <div className="text-muted-foreground">
                              Confidence: {Math.round(log.confidence_score * 100)}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-12 text-muted-foreground">
            No receipt data available
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {receipt && (
              <>
                Uploaded: {new Date(receipt.uploadedAt).toLocaleString()}
                {receipt.processedAt && (
                  <> • Processed: {new Date(receipt.processedAt).toLocaleString()}</>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
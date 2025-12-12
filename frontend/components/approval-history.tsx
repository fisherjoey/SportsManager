'use client'

import React from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare,
  ArrowRight,
  AlertTriangle
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'

interface ApprovalHistoryItem {
  id: string
  stage: string
  approver_name: string
  approver_role: string
  decision: 'approved' | 'rejected' | 'delegated' | 'pending'
  decision_date: string
  notes?: string
  delegation_to?: string
  escalated_from?: string
}

interface ApprovalHistoryProps {
  history: ApprovalHistoryItem[]
}

export function ApprovalHistory({ history }: ApprovalHistoryProps) {
  const getDecisionIcon = (decision: string) => {
    switch (decision) {
    case 'approved':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'delegated':
      return <ArrowRight className="h-4 w-4 text-blue-600" />
    case 'pending':
      return <Clock className="h-4 w-4 text-orange-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getDecisionBadge = (decision: string) => {
    const variants = {
      approved: { variant: 'default' as const, className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      rejected: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800 border-red-300' },
      delegated: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 border-blue-300' },
      pending: { variant: 'outline' as const, className: 'bg-orange-100 text-orange-800 border-orange-300' }
    }

    const config = variants[decision as keyof typeof variants] || variants.pending

    return (
      <Badge variant={config.variant} className={config.className}>
        {decision.charAt(0).toUpperCase() + decision.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No approval history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={item.id} className="relative">
          {/* Timeline connector */}
          {index < history.length - 1 && (
            <div className="absolute left-6 top-12 bottom-0 w-px bg-border" />
          )}
          
          <div className="flex items-start gap-4">
            {/* Decision icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-border bg-background flex items-center justify-center">
              {getDecisionIcon(item.decision)}
            </div>
            
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{item.stage}</h4>
                  {getDecisionBadge(item.decision)}
                </div>
                <time className="text-sm text-muted-foreground">
                  {formatDate(item.decision_date)}
                </time>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{item.approver_name}</span>
                <span>({item.approver_role})</span>
              </div>
              
              {item.escalated_from && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Escalated from {item.escalated_from}</span>
                </div>
              )}
              
              {item.delegation_to && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <ArrowRight className="h-3 w-3" />
                  <span>Delegated to {item.delegation_to}</span>
                </div>
              )}
              
              {item.notes && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <p>{item.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
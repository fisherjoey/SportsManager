'use client'

import { Phone, Mail, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface VenueContactCardProps {
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  className?: string
  compact?: boolean
}

const formatPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function VenueContactCard({
  contactName,
  contactPhone,
  contactEmail,
  className,
  compact = false
}: VenueContactCardProps) {
  const hasAnyContact = contactName || contactPhone || contactEmail

  if (!hasAnyContact) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No contact info
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn('space-y-1 text-sm', className)}>
        {contactName && (
          <div className="font-medium text-foreground truncate">{contactName}</div>
        )}
        <div className="flex flex-col gap-1">
          {contactPhone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
              <a
                href={`tel:${contactPhone}`}
                className="text-blue-600 hover:underline text-xs truncate"
              >
                {formatPhoneNumber(contactPhone)}
              </a>
            </div>
          )}
          {contactEmail && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-blue-600 hover:underline text-xs truncate"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{contactEmail}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {contactName && (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{contactName}</span>
        </div>
      )}
      {contactPhone && (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a
            href={`tel:${contactPhone}`}
            className="text-blue-600 hover:underline"
          >
            {formatPhoneNumber(contactPhone)}
          </a>
        </div>
      )}
      {contactEmail && (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <a
            href={`mailto:${contactEmail}`}
            className="text-blue-600 hover:underline"
          >
            {contactEmail}
          </a>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit2, Check, X, DollarSign } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface EditableWageProps {
  userId: string
  currentWage: number
  onWageUpdate: (userId: string, newWage: number) => void
  disabled?: boolean
}

export function EditableWage({ 
  userId, 
  currentWage, 
  onWageUpdate,
  disabled = false 
}: EditableWageProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [wage, setWage] = useState(currentWage || 0)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (wage < 0 || wage > 500) {
      toast({
        title: 'Invalid wage amount',
        description: 'Wage must be between $0 and $500',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      // Here you would typically make an API call
      // For now, we'll just call the parent callback
      onWageUpdate(userId, wage)
      setIsEditing(false)
      toast({ 
        title: 'Wage updated successfully',
        description: `Wage updated to $${wage.toFixed(2)} per game`
      })
    } catch (error) {
      toast({
        title: 'Error updating wage',
        description: 'Please try again or contact support',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setWage(currentWage || 0)
    setIsEditing(false)
  }

  if (disabled) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <DollarSign className="h-4 w-4" />
        <span className="font-medium">${(currentWage || 0).toFixed(2)}</span>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <Input
          type="number"
          value={wage}
          onChange={(e) => setWage(Number(e.target.value))}
          className="h-8 w-20 text-sm"
          step="0.01"
          min="0"
          max="500"
          disabled={isLoading}
        />
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0"
          onClick={handleSave}
          disabled={isLoading}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div 
      className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-2 py-1 transition-colors group"
      onClick={() => setIsEditing(true)}
    >
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">${(currentWage || 0).toFixed(2)}</span>
      <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </div>
  )
}
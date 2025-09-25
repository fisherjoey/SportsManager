"use client"

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Loader2, AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface RefereeType {
  id: string
  name: string
  description: string
  config: {
    white_whistle?: string
    min_experience_years?: number
    default_wage_rate?: number
    allowed_divisions?: string[]
  }
}

interface RefereeTypeManagerProps {
  userId: string
  currentType: string
  onTypeChange: (userId: string, newType: string) => void
  disabled?: boolean
}

export function RefereeTypeManager({ 
  userId, 
  currentType, 
  onTypeChange,
  disabled = false 
}: RefereeTypeManagerProps) {
  const [availableTypes, setAvailableTypes] = useState<RefereeType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('')

  useEffect(() => {
    fetchRefereeTypes()
  }, [])

  const fetchRefereeTypes = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, this would be an API call
      // For now, we'll use mock data that matches our seeded roles
      const mockTypes: RefereeType[] = [
        {
          id: '1',
          name: 'Senior Referee',
          description: 'Experienced referee with full privileges',
          config: {
            white_whistle: 'never',
            min_experience_years: 3,
            default_wage_rate: 75.00,
            allowed_divisions: ['Premier', 'Competitive', 'Recreational', 'Youth']
          }
        },
        {
          id: '2',
          name: 'Junior Referee',
          description: 'Intermediate referee with conditional privileges',
          config: {
            white_whistle: 'conditional',
            min_experience_years: 1,
            default_wage_rate: 50.00,
            allowed_divisions: ['Competitive', 'Recreational', 'Youth']
          }
        },
        {
          id: '3',
          name: 'Rookie Referee',
          description: 'New referee requiring supervision',
          config: {
            white_whistle: 'always',
            min_experience_years: 0,
            default_wage_rate: 35.00,
            allowed_divisions: ['Recreational', 'Youth']
          }
        }
      ]
      setAvailableTypes(mockTypes)
    } catch (error) {
      toast({
        title: 'Error loading referee types',
        description: 'Unable to load available referee types',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTypeChange = async (newType: string) => {
    if (newType === currentType) return

    setIsChanging(true)
    try {
      onTypeChange(userId, newType)
      toast({ 
        title: 'Referee type updated',
        description: `Successfully changed to ${newType}`
      })
    } catch (error) {
      toast({
        title: 'Error changing referee type',
        description: 'Please try again or contact support',
        variant: 'destructive'
      })
    } finally {
      setIsChanging(false)
      setSelectedType('')
    }
  }

  const getTypeConfig = (typeName: string) => {
    return availableTypes.find(t => t.name === typeName)?.config
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading types...</span>
      </div>
    )
  }

  if (disabled) {
    const config = getTypeConfig(currentType)
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          {currentType}
        </Badge>
        {config && (
          <span className="text-xs text-muted-foreground">
            ${config.default_wage_rate}/game
          </span>
        )}
      </div>
    )
  }

  const currentConfig = getTypeConfig(currentType)
  const selectedConfig = selectedType ? getTypeConfig(selectedType) : null

  return (
    <div className="space-y-2">
      <Select
        value={currentType}
        onValueChange={setSelectedType}
        disabled={isChanging}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableTypes.map(type => (
            <SelectItem key={type.id} value={type.name}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {type.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ${type.config.default_wage_rate}/game
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentConfig && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Experience: {currentConfig.min_experience_years}+ years</div>
          <div>White whistle: {currentConfig.white_whistle}</div>
          <div>Divisions: {currentConfig.allowed_divisions?.join(', ')}</div>
        </div>
      )}

      {selectedType && selectedType !== currentType && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={isChanging}>
              {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change to {selectedType}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Change Referee Type
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to change this referee from <strong>{currentType}</strong> to <strong>{selectedType}</strong>.
                
                {selectedConfig && (
                  <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                    <div className="font-medium">New Type Details:</div>
                    <ul className="text-sm space-y-1">
                      <li>• Default wage: ${selectedConfig.default_wage_rate}/game</li>
                      <li>• Min experience: {selectedConfig.min_experience_years} years</li>
                      <li>• White whistle: {selectedConfig.white_whistle}</li>
                      <li>• Allowed divisions: {selectedConfig.allowed_divisions?.join(', ')}</li>
                    </ul>
                  </div>
                )}
                
                <div className="mt-3 text-sm text-amber-600">
                  This action will update the referee's permissions and may affect their wage rate.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedType('')}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => handleTypeChange(selectedType)}>
                Change Type
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Calendar, AlertCircle, CheckCircle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface CalendarUploadProps {
  onUploadComplete?: (result: any) => void;
  defaultLevel?: string;
  defaultGameType?: string;
  leagueId?: string;
}

interface UploadOptions {
  overwriteExisting: boolean;
  autoCreateTeams: boolean;
  autoCreateLocations: boolean;
  defaultLevel: string;
  defaultGameType: string;
  leagueId?: string;
}

interface UploadResult {
  imported: number;
  failed: number;
  skipped: number;
  games?: Array<{
    gameDate: string;
    gameTime: string;
    homeTeamName?: string;
    awayTeamName?: string;
    status: 'imported' | 'failed' | 'skipped';
    reason?: string;
  }>;
}

const CalendarUpload: React.FC<CalendarUploadProps> = ({
  onUploadComplete,
  defaultLevel = 'Youth',
  defaultGameType = 'League',
  leagueId
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<UploadOptions>({
    overwriteExisting: false,
    autoCreateTeams: false,
    autoCreateLocations: false,
    defaultLevel,
    defaultGameType,
    leagueId
  })

  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      if (file.name.endsWith('.ics') || file.type === 'text/calendar') {
        setFile(file)
        setError(null)
        setUploadResult(null)
      } else {
        setError('Please select a valid .ics calendar file')
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/calendar': ['.ics']
    },
    maxFiles: 1,
    multiple: false
  })

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('calendar', file)

    // Append options to FormData
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value.toString())
      }
    })

    try {
      const token = localStorage.getItem('auth_token')  // Changed from 'token' to 'auth_token'
      console.log('Token exists:', !!token)
      console.log('Token value:', token)

      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }

      const response = await fetch('http://localhost:3001/api/calendar/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok && data.success) {
        setUploadResult(data.data)
        toast({
          title: 'Calendar Imported',
          description: `Imported ${data.data.imported} games, skipped ${data.data.skipped}, failed ${data.data.failed}`
        })

        if (onUploadComplete) {
          onUploadComplete(data.data)
        }
      } else {
        console.error('Upload failed - Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        })
        throw new Error(data.error?.message || data.error || `Failed to upload calendar (${response.status})`)
      }
    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload calendar'
      setError(errorMessage)
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setUploadResult(null)
    setError(null)
  }

  const gameLevels = ['Youth', 'U10', 'U12', 'U14', 'U16', 'U18', 'Adult', 'Varsity', 'JV']
  const gameTypes = ['League', 'Tournament', 'Playoff', 'Exhibition', 'Scrimmage']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Import Calendar
        </CardTitle>
        <CardDescription>
          Upload an ICS calendar file to import games into the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file && !uploadResult && (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop the calendar file here' : 'Drag & drop your calendar file here'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                or click to select a .ics file
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum file size: 10MB
              </p>
            </div>

            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium text-sm">Import Options</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultLevel">Default Level</Label>
                  <Select
                    value={options.defaultLevel}
                    onValueChange={(value) => setOptions({ ...options, defaultLevel: value })}
                  >
                    <SelectTrigger id="defaultLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultGameType">Default Game Type</Label>
                  <Select
                    value={options.defaultGameType}
                    onValueChange={(value) => setOptions({ ...options, defaultGameType: value })}
                  >
                    <SelectTrigger id="defaultGameType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="overwrite"
                    checked={options.overwriteExisting}
                    onCheckedChange={(checked) => setOptions({ ...options, overwriteExisting: checked })}
                  />
                  <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                    Overwrite existing games with same external ID
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoTeams"
                    checked={options.autoCreateTeams}
                    onCheckedChange={(checked) => setOptions({ ...options, autoCreateTeams: checked })}
                  />
                  <Label htmlFor="autoTeams" className="text-sm cursor-pointer">
                    Automatically create teams if they don't exist
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoLocations"
                    checked={options.autoCreateLocations}
                    onCheckedChange={(checked) => setOptions({ ...options, autoCreateLocations: checked })}
                  />
                  <Label htmlFor="autoLocations" className="text-sm cursor-pointer">
                    Automatically create locations if they don't exist
                  </Label>
                </div>
              </div>
            </div>
          </>
        )}

        {file && !uploadResult && (
          <div className="space-y-4">
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>

            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium text-sm">Import Options</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultLevel">Default Level</Label>
                  <Select
                    value={options.defaultLevel}
                    onValueChange={(value) => setOptions({ ...options, defaultLevel: value })}
                    disabled={uploading}
                  >
                    <SelectTrigger id="defaultLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultGameType">Default Game Type</Label>
                  <Select
                    value={options.defaultGameType}
                    onValueChange={(value) => setOptions({ ...options, defaultGameType: value })}
                    disabled={uploading}
                  >
                    <SelectTrigger id="defaultGameType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="overwrite"
                    checked={options.overwriteExisting}
                    onCheckedChange={(checked) => setOptions({ ...options, overwriteExisting: checked })}
                    disabled={uploading}
                  />
                  <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                    Overwrite existing games with same external ID
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoTeams"
                    checked={options.autoCreateTeams}
                    onCheckedChange={(checked) => setOptions({ ...options, autoCreateTeams: checked })}
                    disabled={uploading}
                  />
                  <Label htmlFor="autoTeams" className="text-sm cursor-pointer">
                    Automatically create teams if they don't exist
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoLocations"
                    checked={options.autoCreateLocations}
                    onCheckedChange={(checked) => setOptions({ ...options, autoCreateLocations: checked })}
                    disabled={uploading}
                  />
                  <Label htmlFor="autoLocations" className="text-sm cursor-pointer">
                    Automatically create locations if they don't exist
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Calendar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearFile}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {uploadResult && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Import Complete!</strong>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600 dark:text-green-400">
                  {uploadResult.imported}
                </p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {uploadResult.skipped}
                </p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {uploadResult.failed}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>

            {uploadResult.games && uploadResult.games.length > 0 && (
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="font-medium text-sm mb-2">Import Details</h4>
                <div className="space-y-2">
                  {uploadResult.games.slice(0, 10).map((game, index) => (
                    <div
                      key={index}
                      className={`text-xs p-2 rounded flex items-center gap-2 ${
                        game.status === 'imported'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : game.status === 'skipped'
                            ? 'bg-yellow-50 dark:bg-yellow-900/20'
                            : 'bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      {game.status === 'imported' && <CheckCircle className="h-3 w-3 text-emerald-600" />}
                      {game.status === 'skipped' && <AlertCircle className="h-3 w-3 text-yellow-600" />}
                      {game.status === 'failed' && <X className="h-3 w-3 text-red-600" />}
                      <span className="flex-1">
                        {game.gameDate} {game.gameTime} -
                        {game.homeTeamName && game.awayTeamName
                          ? ` ${game.homeTeamName} vs ${game.awayTeamName}`
                          : ' Unknown teams'}
                      </span>
                      {game.reason && (
                        <span className="text-muted-foreground">({game.reason})</span>
                      )}
                    </div>
                  ))}
                  {uploadResult.games.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center">
                      ... and {uploadResult.games.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={clearFile}
              variant="outline"
              className="w-full"
            >
              Upload Another Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CalendarUpload
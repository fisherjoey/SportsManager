"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  FileText, 
  Users, 
  TrendingUp,
  Download,
  Plus,
  Edit3,
  Eye,
  MoreHorizontal
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
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface ComplianceArea {
  id: string
  name: string
  description: string
  category: 'legal' | 'financial' | 'hr' | 'safety' | 'data_privacy' | 'environmental' | 'industry_specific'
  status: 'compliant' | 'warning' | 'critical' | 'not_assessed'
  score: number
  lastAssessmentDate: string
  nextAssessmentDate: string
  requirements: ComplianceRequirement[]
  trends: Array<{
    date: string
    score: number
    issues: number
  }>
}

interface ComplianceRequirement {
  id: string
  name: string
  description: string
  type: 'policy' | 'training' | 'certification' | 'audit' | 'documentation' | 'system'
  status: 'met' | 'partial' | 'not_met' | 'overdue'
  priority: 'high' | 'medium' | 'low'
  dueDate?: string
  completedDate?: string
  assignedTo: {
    id: string
    name: string
    email: string
  }
  evidence: Array<{
    id: string
    type: 'document' | 'certificate' | 'audit_report' | 'training_record'
    name: string
    uploadedAt: string
    expiryDate?: string
  }>
  comments?: string
}

interface ComplianceMetrics {
  overallScore: number
  totalRequirements: number
  metRequirements: number
  overdueRequirements: number
  upcomingDeadlines: number
  riskAreas: number
  areaBreakdown: Array<{
    area: string
    score: number
    requirements: number
    color: string
  }>
  monthlyTrends: Array<{
    month: string
    score: number
    issues: number
    resolved: number
  }>
  requirementsByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
}

export function ComplianceTracking() {
  const [complianceAreas, setComplianceAreas] = useState<ComplianceArea[]>([])
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedArea, setSelectedArea] = useState<ComplianceArea | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadComplianceData()
  }, [])

  const loadComplianceData = async () => {
    try {
      setLoading(true)
      const [areasResponse, metricsResponse] = await Promise.all([
        fetch('/api/compliance/areas'),
        fetch('/api/compliance/metrics')
      ])

      if (!areasResponse.ok || !metricsResponse.ok) {
        throw new Error('Failed to load compliance data')
      }

      const areasData = await areasResponse.json()
      const metricsData = await metricsResponse.json()

      setComplianceAreas(areasData)
      setMetrics(metricsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data')
      console.error('Error loading compliance data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, score?: number) => {
    const variants = {
      compliant: { variant: 'default', icon: CheckCircle, text: 'Compliant', color: 'bg-green-100 text-green-800' },
      warning: { variant: 'secondary', icon: AlertTriangle, text: 'Warning', color: 'bg-yellow-100 text-yellow-800' },
      critical: { variant: 'destructive', icon: AlertTriangle, text: 'Critical', color: 'bg-red-100 text-red-800' },
      not_assessed: { variant: 'outline', icon: Clock, text: 'Not Assessed', color: 'bg-gray-100 text-gray-800' }
    }

    const config = variants[status as keyof typeof variants] || variants.not_assessed
    const Icon = config.icon

    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant as any} className={`${config.color} flex items-center gap-1`}>
          <Icon className="w-3 h-3" />
          {config.text}
        </Badge>
        {score !== undefined && (
          <span className="text-sm font-semibold">{score}%</span>
        )}
      </div>
    )
  }

  const getRequirementStatusBadge = (status: string) => {
    const variants = {
      met: { variant: 'default', icon: CheckCircle, text: 'Met', color: 'bg-green-100 text-green-800' },
      partial: { variant: 'secondary', icon: Clock, text: 'Partial', color: 'bg-yellow-100 text-yellow-800' },
      not_met: { variant: 'outline', icon: AlertTriangle, text: 'Not Met', color: 'bg-gray-100 text-gray-800' },
      overdue: { variant: 'destructive', icon: AlertTriangle, text: 'Overdue', color: 'bg-red-100 text-red-800' }
    }

    const config = variants[status as keyof typeof variants] || variants.not_met
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { variant: 'destructive', text: 'High Priority' },
      medium: { variant: 'secondary', text: 'Medium Priority' },
      low: { variant: 'outline', text: 'Low Priority' }
    }

    const config = variants[priority as keyof typeof variants] || variants.medium
    return (
      <Badge variant={config.variant as any}>
        {config.text}
      </Badge>
    )
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Compliance Management</h2>
          <p className="text-muted-foreground">
            Monitor compliance status, track requirements, and manage deadlines
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Requirement
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overallScore}%</div>
            <Progress value={metrics.overallScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.metRequirements} of {metrics.totalRequirements} requirements met
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.overdueRequirements}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.upcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">
              Due within 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Areas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.riskAreas}</div>
            <p className="text-xs text-muted-foreground">
              Areas needing attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="areas">Compliance Areas</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance by Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance by Area
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.areaBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Compliance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Compliance Score"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Resolved Issues"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Requirements Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Requirements Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={metrics.requirementsByStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ status, percentage }) => `${status}: ${percentage}%`}
                    >
                      {metrics.requirementsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  {metrics.requirementsByStatus.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="capitalize">{item.status.replace('_', ' ')}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{item.count}</span>
                        <span className="text-sm text-muted-foreground ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="areas" className="space-y-6">
          <div className="grid gap-6">
            {complianceAreas.map((area) => (
              <Card key={area.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{area.name}</h3>
                        {getStatusBadge(area.status, area.score)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {area.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Category</p>
                          <p className="font-medium capitalize">{area.category.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Assessment</p>
                          <p className="font-medium">{new Date(area.lastAssessmentDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Next Assessment</p>
                          <p className="font-medium">{new Date(area.nextAssessmentDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedArea(area)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Area
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Compliance Score</span>
                      <span>{area.score}%</span>
                    </div>
                    <Progress value={area.score} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {area.requirements.filter(r => r.status === 'met').length}
                      </div>
                      <p className="text-muted-foreground">Met</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-600">
                        {area.requirements.filter(r => r.status === 'partial').length}
                      </div>
                      <p className="text-muted-foreground">Partial</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-600">
                        {area.requirements.filter(r => r.status === 'not_met').length}
                      </div>
                      <p className="text-muted-foreground">Not Met</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {area.requirements.filter(r => r.status === 'overdue').length}
                      </div>
                      <p className="text-muted-foreground">Overdue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <div className="grid gap-4">
            {complianceAreas.flatMap(area => 
              area.requirements.map(requirement => (
                <Card key={requirement.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{requirement.name}</h4>
                          {getRequirementStatusBadge(requirement.status)}
                          {getPriorityBadge(requirement.priority)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {requirement.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{requirement.type}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Assigned To</p>
                            <p className="font-medium">{requirement.assignedTo.name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              {requirement.dueDate ? 'Due Date' : 'Completed'}
                            </p>
                            <p className={`font-medium ${
                              requirement.dueDate && new Date(requirement.dueDate) < new Date() 
                                ? 'text-red-600' 
                                : ''
                            }`}>
                              {requirement.dueDate 
                                ? new Date(requirement.dueDate).toLocaleDateString()
                                : requirement.completedDate 
                                  ? new Date(requirement.completedDate).toLocaleDateString()
                                  : 'Not completed'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Requirement
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Upload Evidence
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {requirement.evidence.length > 0 && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Evidence ({requirement.evidence.length})</p>
                        <div className="space-y-1">
                          {requirement.evidence.slice(0, 2).map((evidence) => (
                            <div key={evidence.id} className="flex items-center justify-between text-sm">
                              <span>{evidence.name}</span>
                              <span className="text-muted-foreground">
                                {new Date(evidence.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                          {requirement.evidence.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{requirement.evidence.length - 2} more files
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {requirement.comments && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Comments</p>
                        <p className="text-sm text-muted-foreground">{requirement.comments}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
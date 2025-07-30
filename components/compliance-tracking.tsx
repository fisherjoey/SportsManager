"use client"

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
import { apiClient, ComplianceItem, ComplianceIncident, RiskAssessment } from '@/lib/api'

interface ComplianceDashboard {
  overview: {
    totalItems: number
    overdue: number
    dueSoon: number
    completed: number
  }
  incidents: {
    totalIncidents: number
    openIncidents: number
    criticalIncidents: number
  }
  risks: {
    totalRisks: number
    highRisks: number
    mediumRisks: number
    lowRisks: number
  }
  trends: Array<{
    date: string
    score: number
    issues: number
    resolved: number
  }>
  upcomingDeadlines: Array<{
    id: string
    title: string
    due_date: string
    priority: string
    category: string
  }>
}

interface ComplianceFilters {
  category?: string
  status?: string
  priority?: string
  assigned_to?: string
  page?: number
  limit?: number
}

export function ComplianceTracking() {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([])
  const [complianceIncidents, setComplianceIncidents] = useState<ComplianceIncident[]>([])
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([])
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ComplianceFilters>({})

  useEffect(() => {
    loadComplianceData()
  }, [filters])

  const loadComplianceData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [itemsResponse, incidentsResponse, risksResponse, dashboardResponse] = await Promise.all([
        apiClient.getComplianceTracking(filters),
        apiClient.getComplianceIncidents({ limit: 10 }),
        apiClient.getRiskAssessments({ limit: 10 }),
        apiClient.getComplianceDashboard()
      ])

      setComplianceItems(itemsResponse.items)
      setComplianceIncidents(incidentsResponse.incidents)
      setRiskAssessments(risksResponse.assessments)
      setDashboard(dashboardResponse.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load compliance data'
      setError(errorMessage)
      console.error('Error loading compliance data:', err)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary', icon: Clock, text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { variant: 'default', icon: Clock, text: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      completed: { variant: 'default', icon: CheckCircle, text: 'Completed', color: 'bg-green-100 text-green-800' },
      overdue: { variant: 'destructive', icon: AlertTriangle, text: 'Overdue', color: 'bg-red-100 text-red-800' },
      cancelled: { variant: 'outline', icon: Clock, text: 'Cancelled', color: 'bg-gray-100 text-gray-800' }
    }

    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: { variant: 'outline', icon: CheckCircle, text: 'Low', color: 'bg-green-100 text-green-800' },
      medium: { variant: 'secondary', icon: AlertTriangle, text: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
      high: { variant: 'destructive', icon: AlertTriangle, text: 'High', color: 'bg-red-100 text-red-800' },
      critical: { variant: 'destructive', icon: AlertTriangle, text: 'Critical', color: 'bg-red-100 text-red-800' }
    }

    const config = variants[severity as keyof typeof variants] || variants.low
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

  if (!dashboard) return null

  const handleCreateItem = async () => {
    // TODO: Implement create item modal
    toast({
      title: 'Coming Soon',
      description: 'Create compliance item functionality will be implemented.',
    })
  }

  const handleUpdateItemStatus = async (itemId: string, status: string) => {
    try {
      await apiClient.updateComplianceItem(itemId, { status })
      await loadComplianceData()
      toast({
        title: 'Success',
        description: 'Compliance item status updated successfully.',
      })
    } catch (error) {
      console.error('Error updating compliance item:', error)
      toast({
        title: 'Error',
        description: 'Failed to update compliance item status.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateIncident = async (incidentData: {
    title: string
    description: string
    severity: string
    category: string
    incident_date: string
    location?: string
  }) => {
    try {
      await apiClient.createComplianceIncident(incidentData)
      await loadComplianceData()
      toast({
        title: 'Success',
        description: 'Compliance incident created successfully.',
      })
    } catch (error) {
      console.error('Error creating compliance incident:', error)
      toast({
        title: 'Error',
        description: 'Failed to create compliance incident.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateRiskAssessment = async (riskData: {
    title: string
    description?: string
    category: string
    probability: number
    impact: number
    current_controls?: string
    additional_controls?: string
    responsible_person?: string
  }) => {
    try {
      await apiClient.createRiskAssessment(riskData)
      await loadComplianceData()
      toast({
        title: 'Success',
        description: 'Risk assessment created successfully.',
      })
    } catch (error) {
      console.error('Error creating risk assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to create risk assessment.',
        variant: 'destructive',
      })
    }
  }

  const handleExportReport = async () => {
    // TODO: Implement export functionality
    toast({
      title: 'Coming Soon',
      description: 'Export report functionality will be implemented.',
    })
  }

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
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleCreateItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
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
            <div className="text-2xl font-bold">
              {dashboard.overview.totalItems > 0 
                ? Math.round((dashboard.overview.completed / dashboard.overview.totalItems) * 100)
                : 0}%
            </div>
            <Progress 
              value={dashboard.overview.totalItems > 0 
                ? (dashboard.overview.completed / dashboard.overview.totalItems) * 100
                : 0} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {dashboard.overview.completed} of {dashboard.overview.totalItems} items completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboard.overview.overdue}</div>
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
            <div className="text-2xl font-bold text-yellow-600">{dashboard.overview.dueSoon}</div>
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
            <div className="text-2xl font-bold">{dashboard.risks.highRisks + dashboard.risks.mediumRisks}</div>
            <p className="text-xs text-muted-foreground">
              High & medium risks
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Compliance Items</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Compliance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboard.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
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
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Incidents Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Incidents Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Incidents</span>
                    <span className="font-semibold">{dashboard.incidents.totalIncidents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Open Incidents</span>
                    <span className="font-semibold text-yellow-600">{dashboard.incidents.openIncidents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Critical Incidents</span>
                    <span className="font-semibold text-red-600">{dashboard.incidents.criticalIncidents}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.upcomingDeadlines.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.upcomingDeadlines.slice(0, 5).map((deadline) => (
                    <div key={deadline.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{deadline.title}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{deadline.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getPriorityBadge(deadline.priority)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(deadline.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming deadlines
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <div className="grid gap-4">
            {complianceItems.length > 0 ? (
              complianceItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{item.title}</h4>
                          {getStatusBadge(item.status)}
                          {getPriorityBadge(item.priority)}
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.description}
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Category</p>
                            <p className="font-medium capitalize">{item.category}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Due Date</p>
                            <p className={`font-medium ${
                              new Date(item.due_date) < new Date() ? 'text-red-600' : ''
                            }`}>
                              {new Date(item.due_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Assigned To</p>
                            <p className="font-medium">{item.assigned_to_name || 'Unassigned'}</p>
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
                            Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateItemStatus(item.id, item.status === 'completed' ? 'pending' : 'completed')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {item.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {item.evidence_required && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Evidence Required
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.evidence_provided ? 'Evidence provided' : 'Evidence pending'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No compliance items found
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-6">
          <div className="grid gap-4">
            {complianceIncidents.length > 0 ? (
              complianceIncidents.map((incident) => (
                <Card key={incident.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{incident.title}</h4>
                          {getSeverityBadge(incident.severity)}
                          {getStatusBadge(incident.status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {incident.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Category</p>
                            <p className="font-medium capitalize">{incident.category}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Incident Date</p>
                            <p className="font-medium">
                              {new Date(incident.incident_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reported By</p>
                            <p className="font-medium">{incident.reported_by_name || 'Unknown'}</p>
                          </div>
                        </div>

                        {incident.location && (
                          <div className="mt-2">
                            <p className="text-muted-foreground text-sm">Location</p>
                            <p className="font-medium text-sm">{incident.location}</p>
                          </div>
                        )}
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
                            Update Incident
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {incident.immediate_actions && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Immediate Actions</p>
                        <p className="text-sm text-muted-foreground">{incident.immediate_actions}</p>
                      </div>
                    )}

                    {incident.root_cause && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Root Cause</p>
                        <p className="text-sm text-muted-foreground">{incident.root_cause}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No incidents found
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <div className="grid gap-4">
            {riskAssessments.length > 0 ? (
              riskAssessments.map((risk) => (
                <Card key={risk.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{risk.title}</h4>
                          {getSeverityBadge(risk.risk_level)}
                          {getStatusBadge(risk.status)}
                        </div>
                        
                        {risk.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {risk.description}
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Category</p>
                            <p className="font-medium capitalize">{risk.category}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Probability</p>
                            <p className="font-medium">{risk.probability}/5</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Impact</p>
                            <p className="font-medium">{risk.impact}/5</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Risk Score</p>
                            <p className="font-medium">{risk.probability * risk.impact}/25</p>
                          </div>
                        </div>

                        {risk.responsible_person_name && (
                          <div className="mt-2">
                            <p className="text-muted-foreground text-sm">Responsible Person</p>
                            <p className="font-medium text-sm">{risk.responsible_person_name}</p>
                          </div>
                        )}
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
                            Update Assessment
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Review Controls
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {risk.current_controls && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Current Controls</p>
                        <p className="text-sm text-muted-foreground">{risk.current_controls}</p>
                      </div>
                    )}

                    {risk.additional_controls && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Additional Controls</p>
                        <p className="text-sm text-muted-foreground">{risk.additional_controls}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No risk assessments found
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
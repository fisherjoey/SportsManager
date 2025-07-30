"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Building2, 
  FileText, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  UserPlus,
  Download,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  Award,
  Shield
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { EmployeeManagement } from './employee-management'
import { AssetTracking } from './asset-tracking'
import { DocumentRepository } from './document-repository'
import { ComplianceTracking } from './compliance-tracking'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface OrganizationalMetrics {
  totalEmployees: number
  activeEmployees: number
  newHiresThisMonth: number
  departuresToalMonth: number
  totalAssets: number
  assetsInUse: number
  assetsAvailable: number
  assetsNeedingMaintenance: number
  totalDocuments: number
  documentsAwaitingReview: number
  complianceScore: number
  upcomingDeadlines: number
  departmentBreakdown: { department: string; count: number; color: string }[]
  employeeTrends: { month: string; hired: number; departed: number; total: number }[]
  assetUtilization: { category: string; utilized: number; total: number; percentage: number }[]
  complianceStatus: { area: string; score: number; status: 'compliant' | 'warning' | 'critical' }[]
}

interface OrganizationalDashboardProps {
  className?: string
}

export function OrganizationalDashboard({ className }: OrganizationalDashboardProps) {
  const [metrics, setMetrics] = useState<OrganizationalMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOrganizationalMetrics()
  }, [])

  const loadOrganizationalMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizational/metrics')
      if (!response.ok) throw new Error('Failed to load organizational metrics')
      
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizational data')
      console.error('Error loading organizational metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  const getComplianceStatusBadge = (status: string) => {
    const variants = {
      compliant: { variant: 'default', icon: CheckCircle, text: 'Compliant', color: 'text-green-600' },
      warning: { variant: 'secondary', icon: AlertTriangle, text: 'Warning', color: 'text-yellow-600' },
      critical: { variant: 'destructive', icon: AlertTriangle, text: 'Critical', color: 'text-red-600' }
    }

    const config = variants[status as keyof typeof variants] || variants.warning
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
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
    <div className={className}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organizational Management</h1>
          <p className="text-muted-foreground">
            Manage employees, assets, documents, and compliance across your organization
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEmployees}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {metrics.newHiresThisMonth} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.assetsInUse} in use, {metrics.assetsAvailable} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.documentsAwaitingReview} awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.complianceScore}%</div>
            <Progress value={metrics.complianceScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.upcomingDeadlines} deadlines approaching
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Department Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.departmentBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ department, count }) => `${department}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.departmentBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Employee Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Employee Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.employeeTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Total Employees"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hired" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="New Hires"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="departed" 
                      stroke="#ff7c7c" 
                      strokeWidth={2}
                      name="Departures"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Asset Utilization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Asset Utilization by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.assetUtilization.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{category.category}</span>
                      <span>{category.utilized} / {category.total} ({category.percentage}%)</span>
                    </div>
                    <Progress value={category.percentage} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metrics.complianceStatus.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{item.area}</h4>
                      {getComplianceStatusBadge(item.status)}
                    </div>
                    <div className="text-2xl font-bold mb-2">{item.score}%</div>
                    <Progress value={item.score} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeManagement />
        </TabsContent>

        <TabsContent value="assets">
          <AssetTracking />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentRepository />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceTracking />
        </TabsContent>
      </Tabs>
    </div>
  )
}
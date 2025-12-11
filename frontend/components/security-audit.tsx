'use client'

import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  User,
  Activity,
  Clock,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'

interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  ip: string
  userAgent: string
  status: 'success' | 'failure' | 'warning'
  details: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

interface SecurityMetrics {
  totalLogins: number
  failedLogins: number
  activeUsers: number
  securityAlerts: number
  lastSecurityScan: string
  vulnerabilities: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

export function SecurityAudit() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('logs')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')

  useEffect(() => {
    fetchSecurityData()
  }, [])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      // API calls would go here
      // const [logsResponse, metricsResponse] = await Promise.all([
      //   apiClient.get('/api/audit/logs'),
      //   apiClient.get('/api/security/metrics')
      // ])
      
      // Mock data for demonstration
      const mockLogs: AuditLogEntry[] = [
        {
          id: 'log-1',
          timestamp: '2024-02-04T10:30:00Z',
          user: 'admin@example.com',
          action: 'LOGIN',
          resource: '/admin/dashboard',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          details: 'User logged in successfully',
          riskLevel: 'low'
        },
        {
          id: 'log-2',
          timestamp: '2024-02-04T10:25:00Z',
          user: 'user@example.com',
          action: 'FAILED_LOGIN',
          resource: '/login',
          ip: '192.168.1.50',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          status: 'failure',
          details: 'Invalid password attempt',
          riskLevel: 'medium'
        },
        {
          id: 'log-3',
          timestamp: '2024-02-04T09:15:00Z',
          user: 'admin@example.com',
          action: 'DELETE_GAME',
          resource: '/api/games/123',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          details: 'Game deleted: CMBA U12 vs Rangers',
          riskLevel: 'high'
        },
        {
          id: 'log-4',
          timestamp: '2024-02-04T08:45:00Z',  
          user: 'system@example.com',
          action: 'SECURITY_SCAN',
          resource: '/system/security',
          ip: '127.0.0.1',
          userAgent: 'SecurityBot/1.0',
          status: 'warning',
          details: 'Detected unusual login pattern',
          riskLevel: 'critical'
        }
      ]

      const mockMetrics: SecurityMetrics = {
        totalLogins: 234,
        failedLogins: 12,
        activeUsers: 45,
        securityAlerts: 3,
        lastSecurityScan: '2024-02-04T08:45:00Z',
        vulnerabilities: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 12
        }
      }
      
      setAuditLogs(mockLogs)
      setSecurityMetrics(mockMetrics)
    } catch (error) {
      console.error('Error fetching security data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load security data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'success':
      return <CheckCircle className={cn('w-4 h-4', getStatusColorClass('success', 'text'))} />
    case 'failure':
      return <XCircle className={cn('w-4 h-4', getStatusColorClass('error', 'text'))} />
    case 'warning':
      return <AlertTriangle className={cn('w-4 h-4', getStatusColorClass('warning', 'text'))} />
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getRiskBadgeClass = (riskLevel: string) => {
    return cn(getStatusColorClass(riskLevel, 'bg'), getStatusColorClass(riskLevel, 'text'))
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    const matchesRisk = riskFilter === 'all' || log.riskLevel === riskFilter
    
    return matchesSearch && matchesStatus && matchesRisk
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security & Audit</h2>
          <p className="text-muted-foreground">
            Monitor system security and audit user activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
          <Button onClick={fetchSecurityData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {securityMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{securityMetrics.totalLogins}</p>
                  <p className="text-sm text-muted-foreground">Total Logins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className={cn('w-8 h-8', getStatusColorClass('error', 'text'))} />
                <div>
                  <p className="text-2xl font-bold">{securityMetrics.failedLogins}</p>
                  <p className="text-sm text-muted-foreground">Failed Logins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className={cn('w-8 h-8', getStatusColorClass('success', 'text'))} />
                <div>
                  <p className="text-2xl font-bold">{securityMetrics.activeUsers}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className={cn('w-8 h-8', getStatusColorClass('warning', 'text'))} />
                <div>
                  <p className="text-2xl font-bold">{securityMetrics.securityAlerts}</p>
                  <p className="text-sm text-muted-foreground">Security Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="security">Security Overview</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter Audit Logs</CardTitle>
              <CardDescription>Search and filter system audit logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users, actions, or resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(log.status)}
                        <span className="font-semibold">{log.action}</span>
                        <Badge className={getRiskBadgeClass(log.riskLevel)}>
                          {log.riskLevel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{log.details}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span><User className="w-3 h-3 inline mr-1" />{log.user}</span>
                        <span><Activity className="w-3 h-3 inline mr-1" />{log.resource}</span>
                        <span><Eye className="w-3 h-3 inline mr-1" />{log.ip}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Overview</CardTitle>
              <CardDescription>System security status and recent activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={cn('flex justify-between items-center p-4 rounded-lg', getStatusColorClass('success', 'bg'))}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className={cn('w-6 h-6', getStatusColorClass('success', 'text'))} />
                    <div>
                      <p className="font-semibold">System Security Status</p>
                      <p className="text-sm text-muted-foreground">All systems operational</p>
                    </div>
                  </div>
                  <Badge className={cn(getStatusColorClass('success', 'bg'), getStatusColorClass('success', 'text'))}>
                    Secure
                  </Badge>
                </div>
                
                {securityMetrics && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Last security scan: {new Date(securityMetrics.lastSecurityScan).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vulnerability Assessment</CardTitle>
              <CardDescription>Current security vulnerabilities and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {securityMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className={cn('text-2xl font-bold', getStatusColorClass('error', 'text'))}>{securityMetrics.vulnerabilities.critical}</div>
                    <div className="text-sm text-muted-foreground">Critical</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className={cn('text-2xl font-bold', getStatusColorClass('warning', 'text'))}>{securityMetrics.vulnerabilities.high}</div>
                    <div className="text-sm text-muted-foreground">High</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className={cn('text-2xl font-bold', getStatusColorClass('warning', 'text'))}>{securityMetrics.vulnerabilities.medium}</div>
                    <div className="text-sm text-muted-foreground">Medium</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className={cn('text-2xl font-bold', getStatusColorClass('success', 'text'))}>{securityMetrics.vulnerabilities.low}</div>
                    <div className="text-sm text-muted-foreground">Low</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
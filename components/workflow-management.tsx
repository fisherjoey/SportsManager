'use client'

import React, { useState, useEffect } from 'react'
import { 
  Workflow, 
  Play, 
  Pause, 
  Settings, 
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface WorkflowData {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'draft'
  triggerType: 'manual' | 'scheduled' | 'event'
  steps: number
  createdAt: string
  lastRun?: string
  nextRun?: string
  runCount: number
  successRate: number
}

export function WorkflowManagement() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      // API call would go here
      // const response = await apiClient.get('/api/workflows')
      
      // Mock data for demonstration
      const mockWorkflows: WorkflowData[] = [
        {
          id: 'wf-1',
          name: 'Weekly Game Assignment',
          description: 'Automatically assign referees to games based on availability',
          status: 'active',
          triggerType: 'scheduled',
          steps: 5,
          createdAt: '2024-01-15',
          lastRun: '2024-02-01',
          nextRun: '2024-02-08',
          runCount: 45,
          successRate: 96.7
        },
        {
          id: 'wf-2', 
          name: 'Referee Onboarding',
          description: 'Process new referee registrations and certifications',
          status: 'active',
          triggerType: 'event',
          steps: 8,
          createdAt: '2024-01-10',
          lastRun: '2024-02-03',
          runCount: 23,
          successRate: 100
        },
        {
          id: 'wf-3',
          name: 'Monthly Financial Reports',
          description: 'Generate and distribute monthly financial summaries',
          status: 'paused',
          triggerType: 'scheduled',
          steps: 4,
          createdAt: '2024-01-20',
          lastRun: '2024-01-31',
          nextRun: '2024-03-01',
          runCount: 2,
          successRate: 100
        }
      ]
      
      setWorkflows(mockWorkflows)
    } catch (error) {
      console.error('Error fetching workflows:', error)
      toast({
        title: 'Error',
        description: 'Failed to load workflows',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'active':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'paused':
      return <Pause className="w-4 h-4 text-yellow-500" />
    case 'draft':
      return <Clock className="w-4 h-4 text-gray-500" />
    default:
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'paused':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    default:
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
  }

  const filteredWorkflows = workflows.filter(workflow => {
    if (activeTab === 'all') return true
    return workflow.status === activeTab
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
          <h2 className="text-2xl font-bold tracking-tight">Workflow Management</h2>
          <p className="text-muted-foreground">
            Automate processes and manage business workflows
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Workflow className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{workflows.length}</p>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{workflows.filter(w => w.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{workflows.reduce((sum, w) => sum + w.runCount, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length)}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Success</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Workflows</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredWorkflows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Workflow className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No workflows found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'all' ? 
                    'Create your first workflow to automate business processes' :
                    `No ${activeTab} workflows found`
                  }
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredWorkflows.map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(workflow.status)}
                          <h3 className="text-lg font-semibold">{workflow.name}</h3>
                          <Badge className={getStatusColor(workflow.status)}>
                            {workflow.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">{workflow.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>{workflow.steps} steps</span>
                          <span>{workflow.runCount} runs</span>
                          <span>{workflow.successRate}% success rate</span>
                          {workflow.nextRun && (
                            <span>Next: {new Date(workflow.nextRun).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {workflow.status === 'active' ? (
                          <Button variant="outline" size="sm">
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4 mr-2" />
                            Start
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
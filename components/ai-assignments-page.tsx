'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, Settings, CheckCircle2, XCircle, AlertCircle, BarChart3, Plus, Calculator } from 'lucide-react'

import { apiClient, AIAssignmentRule, AIAssignmentRuleRun } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AutoHidingTabs, AutoHidingTabsContent, AutoHidingTabsList, AutoHidingTabsTrigger } from '@/components/ui/auto-hiding-tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'


export default function AIAssignmentsPage() {
  const [activeTab, setActiveTab] = useState('rules')
  const [rules, setRules] = useState<AIAssignmentRule[]>([])
  const [results, setResults] = useState<AIAssignmentRuleRun[]>([])
  const [selectedRule, setSelectedRule] = useState<AIAssignmentRule | null>(null)
  const [showCreateRule, setShowCreateRule] = useState(false)
  const [showRunRule, setShowRunRule] = useState(false)
  const [selectedResult, setSelectedResult] = useState<AIAssignmentRuleRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Load rules from API
  useEffect(() => {
    loadRules()
    loadAnalytics()
  }, [])

  // Load results when rules are loaded
  useEffect(() => {
    if (rules.length > 0) {
      loadResults()
    }
  }, [rules])

  // Load analytics when switching to analytics tab
  useEffect(() => {
    if (activeTab === 'analytics' && !analytics) {
      loadAnalytics()
    }
  }, [activeTab])

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAIAssignmentRules()
      if (response.success) {
        setRules(response.data)
      }
    } catch (err) {
      setError('Failed to load AI assignment rules')
      // console.error('Error loading rules:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadResults = async () => {
    try {
      // For now, load results from all rules - in production you might want to paginate this
      const allResults: AIAssignmentRuleRun[] = []
      for (const rule of rules) {
        const response = await apiClient.getAIAssignmentRuleRuns(rule.id, { limit: 10 })
        if (response.success) {
          allResults.push(...response.data)
        }
      }
      setResults(allResults.sort((a, b) => new Date(b.run_date).getTime() - new Date(a.run_date).getTime()))
    } catch (err) {
      // console.error('Error loading results:', err)
    }
  }

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const response = await apiClient.getAIAssignmentAnalytics({ days: 30 })
      if (response.success) {
        setAnalytics(response.data)
      }
    } catch (err) {
      // console.error('Error loading analytics:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // Mock data fallback for development  
  useEffect(() => {
    if (rules.length === 0 && !loading) {
      setRules([
        {
          id: '1',
          name: 'Weekly Community Games',
          description: 'Automatically assign referees to community games every Sunday',
          enabled: true,
          schedule_type: 'recurring',
          frequency: 'weekly',
          day_of_week: 'sunday',
          schedule_time: '10:00',
          start_date: '2024-12-01',
          end_date: '2025-03-31',
          next_run: '2024-12-08 10:00',
          game_types: ['Community'],
          age_groups: ['U12', 'U14', 'U16'],
          max_days_ahead: 14,
          min_referee_level: 'Rookie',
          prioritize_experience: true,
          avoid_back_to_back: true,
          max_distance: 25,
          ai_system_type: 'algorithmic',
          distance_weight: 40,
          skill_weight: 30,
          experience_weight: 20,
          partner_preference_weight: 10,
          last_run: '2024-12-01 10:00',
          last_run_status: 'success',
          assignments_created: 24,
          conflicts_found: 2,
          created_at: '2024-12-01',
          updated_at: '2024-12-01'
        },
        {
          id: '2', 
          name: 'Tournament Prep',
          description: 'Assign experienced referees to tournament games',
          enabled: false,
          schedule_type: 'manual',
          game_types: ['Tournament'],
          age_groups: ['Senior'],
          max_days_ahead: 30,
          min_referee_level: 'Senior',
          prioritize_experience: true,
          avoid_back_to_back: false,
          max_distance: 50,
          ai_system_type: 'llm',
          llm_model: 'gpt-4o',
          temperature: 0.3,
          context_prompt: 'You are an expert referee assignment system. Consider experience, proximity, availability, and past performance when making assignments.',
          include_comments: true,
          last_run: '2024-11-28 14:30',
          last_run_status: 'partial',
          assignments_created: 8,
          conflicts_found: 5,
          created_at: '2024-11-28',
          updated_at: '2024-11-28'
        }
      ])

      setResults([
        {
          id: '1',
          rule_id: '1',
          run_date: '2024-12-01 10:00',
          status: 'success',
          games_processed: 26,
          assignments_created: 24,
          conflicts_found: 2,
          duration_seconds: 4.2,
          ai_system_used: 'algorithmic',
          context_comments: ['Partner preference: John & Jane work well together', 'Bob requested local games only'],
          run_details: { 
            assignments: [
              {
                gameId: 'g1',
                gameInfo: 'Team Alpha vs Team Beta - Dec 8, 2:00 PM',
                assignedReferees: [
                  { 
                    refereeId: 'r1', 
                    refereeName: 'John Doe', 
                    position: 'Referee 1', 
                    confidence: 0.92,
                    reasoning: 'High skill match, close proximity (5km), preferred partner available'
                  },
                  { 
                    refereeId: 'r2', 
                    refereeName: 'Jane Smith', 
                    position: 'Referee 2', 
                    confidence: 0.87,
                    reasoning: 'Good experience level, forms preferred pair with John'
                  }
                ],
                notes: 'Assigned preferred referee pair based on past performance'
              },
              {
                gameId: 'g2',
                gameInfo: 'Team Charlie vs Team Delta - Dec 8, 4:00 PM',
                assignedReferees: [
                  { 
                    refereeId: 'r3', 
                    refereeName: 'Bob Wilson', 
                    position: 'Referee 1', 
                    confidence: 0.89,
                    reasoning: 'Senior level referee, local to venue, requested this type of game'
                  }
                ],
                conflicts: ['No available referees for Referee 2 position - all other refs assigned or unavailable'],
                notes: 'Partial assignment - need to find second referee manually'
              }
            ],
            conflicts: ['No available referees for Referee 2 position - all other refs assigned or unavailable']
          }
        }
      ])
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'error': return <XCircle className="h-4 w-4 text-red-500" />
    case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-500" />
    default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      success: 'default',
      error: 'destructive',
      partial: 'secondary'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  return (
    <PageLayout>
      <PageHeader
        title="AI Assignment System"
        description="Automated referee assignments with intelligent scheduling and rule-based logic"
      >
        <Button onClick={() => setShowCreateRule(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </PageHeader>

      <AutoHidingTabs value={activeTab} onValueChange={setActiveTab} className="w-full" autoHide={true} hideDelay={5000}>
        <AutoHidingTabsList className="grid w-full grid-cols-3">
          <AutoHidingTabsTrigger value="rules">Assignment Rules</AutoHidingTabsTrigger>
          <AutoHidingTabsTrigger value="results">Run History</AutoHidingTabsTrigger>
          <AutoHidingTabsTrigger value="analytics">Analytics</AutoHidingTabsTrigger>
        </AutoHidingTabsList>

        <AutoHidingTabsContent value="rules" className="space-y-4">
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id} className="relative">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      {rule.schedule_type === 'recurring' && rule.end_date && new Date(rule.end_date) < new Date() && (
                        <Badge variant="secondary" className="text-xs">Expired</Badge>
                      )}
                      {rule.schedule_type === 'recurring' && rule.start_date && new Date(rule.start_date) > new Date() && (
                        <Badge variant="outline" className="text-xs">Scheduled</Badge>
                      )}
                      <Switch 
                        checked={rule.enabled}
                        onCheckedChange={(checked) => {
                          setRules(prev => prev.map(r => 
                            r.id === rule.id ? { ...r, enabled: checked } : r
                          ))
                        }}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(rule.lastRunStatus)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRule(rule)
                          setShowRunRule(true)
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Run Now
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{rule.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Schedule</Label>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {rule.schedule_type === 'manual' 
                            ? 'Manual' 
                            : rule.schedule_type === 'recurring'
                              ? `${rule.frequency} at ${rule.schedule_time}${rule.end_date ? ` (until ${new Date(rule.end_date).toLocaleDateString()})` : ''}`
                              : rule.next_run}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Run</Label>
                      <div>{rule.last_run ? new Date(rule.last_run).toLocaleString() : 'Never'}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Assignments</Label>
                      <div className="font-medium">{rule.assignments_created}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Conflicts</Label>
                      <div className="font-medium text-yellow-600">{rule.conflicts_found}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={rule.ai_system_type === 'algorithmic' ? 'secondary' : 'default'} className="flex items-center gap-1">
                      <Calculator className="h-3 w-3" />
                      {rule.ai_system_type === 'algorithmic' ? 'Algorithmic' : 'LLM-Powered'}
                    </Badge>
                    {rule.game_types?.map(type => (
                      <Badge key={type} variant="outline">{type}</Badge>
                    ))}
                    {rule.age_groups?.map(age => (
                      <Badge key={age} variant="outline">{age}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </AutoHidingTabsContent>

        <AutoHidingTabsContent value="results" className="space-y-4">
          <div className="grid gap-4">
            {results.map((result) => (
              <Card key={result.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedResult(result)}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{result.ruleName}</CardTitle>
                      {getStatusBadge(result.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">{result.runDate}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Games</Label>
                      <div className="font-medium">{result.gamesProcessed}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Assigned</Label>
                      <div className="font-medium text-green-600">{result.assignmentsCreated}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Conflicts</Label>
                      <div className="font-medium text-yellow-600">{result.conflictsFound}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <div className="font-medium">{result.duration}s</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Success Rate</Label>
                      <div className="font-medium">
                        {Math.round((result.assignmentsCreated / result.gamesProcessed) * 100)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </AutoHidingTabsContent>

        <AutoHidingTabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading analytics...</span>
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.summary.totalAssignments}</div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.summary.assignmentGrowth} from last {analytics.summary.period}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.summary.successRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.summary.successRateGrowth} from last {analytics.summary.period}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.summary.activeRules}</div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.summary.totalRules} total rules
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Average Duration</Label>
                        <div className="text-lg font-bold">{analytics.performance.averageDuration}s</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Runs</Label>
                        <div className="text-lg font-bold">{analytics.performance.totalRuns}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Successful Runs</Label>
                        <div className="text-lg font-bold">{analytics.performance.successfulRuns}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Run Success Rate</Label>
                        <div className="text-lg font-bold">{analytics.performance.runSuccessRate}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Conflict Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Conflicts</Label>
                        <div className="text-lg font-bold text-yellow-600">{analytics.conflicts.totalConflicts}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Conflict Rate</Label>
                        <div className="text-lg font-bold text-yellow-600">{analytics.conflicts.conflictRate}%</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Avg per Run</Label>
                        <div className="text-lg font-bold">{analytics.conflicts.avgConflictsPerRun.toFixed(1)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Runs with Conflicts</Label>
                        <div className="text-lg font-bold">{analytics.conflicts.runsWithConflicts}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {analytics.aiSystems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      AI System Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.aiSystems.map((system: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Calculator className="h-4 w-4" />
                            <span className="font-medium capitalize">{system.type}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-bold">{system.runs}</div>
                              <div className="text-muted-foreground">Runs</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{system.assignments}</div>
                              <div className="text-muted-foreground">Assignments</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{system.avgDuration.toFixed(1)}s</div>
                              <div className="text-muted-foreground">Avg Duration</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{system.successRate.toFixed(1)}%</div>
                              <div className="text-muted-foreground">Success Rate</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No analytics data available yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Run some AI assignment rules to see performance metrics.</p>
            </div>
          )}
        </AutoHidingTabsContent>
      </AutoHidingTabs>

      {/* Create Rule Dialog */}
      <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Assignment Rule</DialogTitle>
            <DialogDescription>
              Configure automated referee assignment rules with custom scheduling and criteria
            </DialogDescription>
          </DialogHeader>
          <CreateRuleForm onClose={() => setShowCreateRule(false)} onRuleCreated={loadRules} />
        </DialogContent>
      </Dialog>

      {/* Run Rule Dialog */}
      <Dialog open={showRunRule} onOpenChange={setShowRunRule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Assignment Rule</DialogTitle>
            <DialogDescription>
              Execute "{selectedRule?.name}" now with current settings
            </DialogDescription>
          </DialogHeader>
          <RunRuleForm rule={selectedRule} onClose={() => setShowRunRule(false)} onRunCompleted={loadResults} />
        </DialogContent>
      </Dialog>

      {/* Result Details Dialog */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignment Results</DialogTitle>
            <DialogDescription>
              Detailed results for {selectedResult?.ruleName}
            </DialogDescription>
          </DialogHeader>
          {selectedResult && <ResultDetails result={selectedResult} />}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

function CreateRuleForm({ onClose, onRuleCreated }: { onClose: () => void, onRuleCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scheduleType: 'manual',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    dayOfWeek: 'sunday',
    dayOfMonth: 1,
    time: '10:00',
    specificDate: '',
    startDate: '',
    endDate: '',
    gameTypes: [] as string[],
    ageGroups: [] as string[],
    maxDaysAhead: 14,
    minRefereeLevel: 'Rookie',
    prioritizeExperience: true,
    avoidBackToBack: true,
    maxDistance: 25,
    aiSystemType: 'algorithmic' as 'algorithmic' | 'llm',
    // Algorithmic settings
    distanceWeight: 40,
    skillWeight: 30,
    experienceWeight: 20,
    partnerPreferenceWeight: 10,
    preferredPairs: [] as Array<{referee1Id: string, referee2Id: string, preference: 'preferred' | 'avoid'}>,
    // LLM settings
    llmModel: 'gpt-4o',
    temperature: 0.3,
    contextPrompt: 'You are an expert referee assignment system. Consider experience, proximity, availability, and past performance when making assignments.',
    includeComments: true
  })

  const getScheduleDescription = () => {
    if (formData.scheduleType === 'manual') {
      return 'This rule will only run when triggered manually'
    } else if (formData.scheduleType === 'recurring') {
      if (formData.frequency === 'daily') {
        return `Runs daily at ${formData.time}`
      } else if (formData.frequency === 'weekly') {
        const dayName = formData.dayOfWeek.charAt(0).toUpperCase() + formData.dayOfWeek.slice(1)
        return `Runs every ${dayName} at ${formData.time}`
      } else if (formData.frequency === 'monthly') {
        const ordinal = formData.dayOfMonth === 1 ? '1st' : formData.dayOfMonth === 2 ? '2nd' : formData.dayOfMonth === 3 ? '3rd' : `${formData.dayOfMonth}th`
        return `Runs on the ${ordinal} of each month at ${formData.time}`
      }
      
      // Add date range info for recurring schedules
      const dateRangeText = formData.startDate || formData.endDate 
        ? ` (${formData.startDate ? `from ${new Date(formData.startDate).toLocaleDateString()}` : ''}${formData.startDate && formData.endDate ? ' ' : ''}${formData.endDate ? `until ${new Date(formData.endDate).toLocaleDateString()}` : ''})`
        : ''
      
      return (formData.frequency === 'daily' ? `Runs daily at ${formData.time}` : 
        formData.frequency === 'weekly' ? `Runs every ${formData.dayOfWeek.charAt(0).toUpperCase() + formData.dayOfWeek.slice(1)} at ${formData.time}` :
          `Runs on the ${formData.dayOfMonth === 1 ? '1st' : formData.dayOfMonth === 2 ? '2nd' : formData.dayOfMonth === 3 ? '3rd' : `${formData.dayOfMonth}th`} of each month at ${formData.time}`) + dateRangeText
    } else if (formData.scheduleType === 'one-time') {
      return formData.specificDate ? `Will run once on ${new Date(formData.specificDate).toLocaleString()}` : 'Will run once at the specified date and time'
    }
    return ''
  }

  const handleCreateRule = async () => {
    try {
      setLoading(true)
      
      const ruleData = {
        name: formData.name,
        description: formData.description,
        enabled: true,
        schedule: {
          type: formData.scheduleType as 'manual' | 'recurring' | 'one-time',
          ...(formData.scheduleType === 'recurring' && {
            frequency: formData.frequency,
            ...(formData.frequency === 'weekly' && { dayOfWeek: formData.dayOfWeek }),
            ...(formData.frequency === 'monthly' && { dayOfMonth: formData.dayOfMonth }),
            time: formData.time,
            ...(formData.startDate && { startDate: formData.startDate }),
            ...(formData.endDate && { endDate: formData.endDate })
          }),
          ...(formData.scheduleType === 'one-time' && { 
            specificDate: formData.specificDate 
          })
        },
        criteria: {
          gameTypes: formData.gameTypes,
          ageGroups: formData.ageGroups,
          maxDaysAhead: formData.maxDaysAhead,
          minRefereeLevel: formData.minRefereeLevel,
          prioritizeExperience: formData.prioritizeExperience,
          avoidBackToBack: formData.avoidBackToBack,
          maxDistance: formData.maxDistance
        },
        aiSystem: {
          type: formData.aiSystemType,
          ...(formData.aiSystemType === 'algorithmic' && {
            algorithmicSettings: {
              distanceWeight: formData.distanceWeight,
              skillWeight: formData.skillWeight,
              experienceWeight: formData.experienceWeight,
              partnerPreferenceWeight: formData.partnerPreferenceWeight,
              preferredPairs: formData.preferredPairs
            }
          }),
          ...(formData.aiSystemType === 'llm' && {
            llmSettings: {
              model: formData.llmModel,
              temperature: formData.temperature,
              contextPrompt: formData.contextPrompt,
              includeComments: formData.includeComments
            }
          })
        }
      }

      const response = await apiClient.createAIAssignmentRule(ruleData)
      if (response.success) {
        onRuleCreated()
        onClose()
      }
    } catch (error) {
      // console.error('Error creating rule:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Rule Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Weekly Community Games"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduleType">Schedule Type</Label>
          <Select value={formData.scheduleType} onValueChange={(value) => setFormData({ ...formData, scheduleType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
              <SelectItem value="one-time">One-time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this rule does..."
        />
      </div>

      {formData.scheduleType === 'recurring' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={formData.frequency} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setFormData({ ...formData, frequency: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={formData.dayOfWeek} onValueChange={(value) => setFormData({ ...formData, dayOfWeek: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="tuesday">Tuesday</SelectItem>
                  <SelectItem value="wednesday">Wednesday</SelectItem>
                  <SelectItem value="thursday">Thursday</SelectItem>
                  <SelectItem value="friday">Friday</SelectItem>
                  <SelectItem value="saturday">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.frequency === 'monthly' && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Select value={formData.dayOfMonth.toString()} onValueChange={(value) => setFormData({ ...formData, dayOfMonth: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Active Period (Optional)</Label>
              <p className="text-xs text-muted-foreground">Set when this recurring rule should be active. Leave blank to run indefinitely.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  placeholder="When to start running this rule"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  placeholder="When to stop running this rule"
                  min={formData.startDate || undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {formData.scheduleType === 'one-time' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date and Time</Label>
            <Input
              type="datetime-local"
              value={formData.specificDate}
              onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
            />
          </div>
        </div>
      )}

      {formData.scheduleType !== 'manual' && (
        <div className="p-3 bg-muted rounded-md">
          <Label className="text-sm font-medium">Schedule Preview</Label>
          <p className="text-sm text-muted-foreground mt-1">{getScheduleDescription()}</p>
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Assignment Criteria</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Max Days Ahead</Label>
            <Input
              type="number"
              value={formData.maxDaysAhead}
              onChange={(e) => setFormData({ ...formData, maxDaysAhead: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Distance (km)</Label>
            <Input
              type="number"
              value={formData.maxDistance}
              onChange={(e) => setFormData({ ...formData, maxDistance: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Minimum Referee Level</Label>
          <Select value={formData.minRefereeLevel} onValueChange={(value) => setFormData({ ...formData, minRefereeLevel: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rookie">Rookie</SelectItem>
              <SelectItem value="Junior">Junior</SelectItem>
              <SelectItem value="Senior">Senior</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="prioritize"
              checked={formData.prioritizeExperience}
              onCheckedChange={(checked) => setFormData({ ...formData, prioritizeExperience: checked })}
            />
            <Label htmlFor="prioritize">Prioritize Experience</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="avoid"
              checked={formData.avoidBackToBack}
              onCheckedChange={(checked) => setFormData({ ...formData, avoidBackToBack: checked })}
            />
            <Label htmlFor="avoid">Avoid Back-to-Back Games</Label>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">AI Assignment System</h4>
        
        <div className="space-y-2">
          <Label>System Type</Label>
          <Select value={formData.aiSystemType} onValueChange={(value: 'algorithmic' | 'llm') => setFormData({ ...formData, aiSystemType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="algorithmic">Algorithmic (Rule-based)</SelectItem>
              <SelectItem value="llm">LLM-Powered (AI Analysis)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formData.aiSystemType === 'algorithmic' 
              ? 'Uses predefined rules and weightings for assignment decisions'
              : 'Uses large language models to analyze data and make intelligent assignment decisions'
            }
          </p>
        </div>

        {formData.aiSystemType === 'algorithmic' && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h5 className="font-medium text-sm">Algorithmic Settings</h5>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distance Weight (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.distanceWeight}
                  onChange={(e) => setFormData({ ...formData, distanceWeight: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Skill Weight (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.skillWeight}
                  onChange={(e) => setFormData({ ...formData, skillWeight: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Experience Weight (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.experienceWeight}
                  onChange={(e) => setFormData({ ...formData, experienceWeight: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Partner Preference Weight (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.partnerPreferenceWeight}
                  onChange={(e) => setFormData({ ...formData, partnerPreferenceWeight: parseInt(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Referee Partner Preferences</Label>
              <div className="text-xs text-muted-foreground mb-2">
                Define preferred or avoided referee pairings
              </div>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Partner Preference
              </Button>
            </div>
          </div>
        )}

        {formData.aiSystemType === 'llm' && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h5 className="font-medium text-sm">LLM Settings</h5>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={formData.llmModel} onValueChange={(value) => setFormData({ ...formData, llmModel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperature</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">0 = deterministic, 1 = creative</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Context Prompt</Label>
              <Textarea
                value={formData.contextPrompt}
                onChange={(e) => setFormData({ ...formData, contextPrompt: e.target.value })}
                placeholder="Provide context and instructions for the AI..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="includeComments"
                checked={formData.includeComments}
                onCheckedChange={(checked) => setFormData({ ...formData, includeComments: checked })}
              />
              <Label htmlFor="includeComments">Include referee comments and preferences in analysis</Label>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreateRule} disabled={loading}>
          {loading ? 'Creating...' : 'Create Rule'}
        </Button>
      </div>
    </div>
  )
}

function RunRuleForm({ rule, onClose, onRunCompleted }: { rule: AIAssignmentRule | null, onClose: () => void, onRunCompleted: () => void }) {
  const [isRunning, setIsRunning] = useState(false)
  const [dryRun, setDryRun] = useState(true)

  const handleRun = async () => {
    if (!rule) return
    
    try {
      setIsRunning(true)
      const response = await apiClient.runAIAssignmentRule(rule.id, {
        dryRun,
        gameIds: [],
        contextComments: []
      })
      
      if (response.success) {
        onRunCompleted()
        onClose()
      }
    } catch (error) {
      // console.error('Error running rule:', error)
      // You might want to show a toast notification here
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Preview</Label>
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm">This will process games matching:</p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            <li>• Game types: {rule?.game_types.join(', ') || 'All'}</li>
            <li>• Age groups: {rule?.age_groups.join(', ') || 'All'}</li>
            <li>• Max distance: {rule?.max_distance}km</li>
            <li>• Min referee level: {rule?.min_referee_level}</li>
            <li>• AI System: {rule?.ai_system_type}</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="dryRun"
          checked={dryRun}
          onCheckedChange={setDryRun}
        />
        <Label htmlFor="dryRun">Dry run (preview only, don't create actual assignments)</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose} disabled={isRunning}>
          Cancel
        </Button>
        <Button onClick={handleRun} disabled={isRunning}>
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Now
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function ResultDetails({ result }: { result: AIAssignmentResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="flex items-center space-x-2">
            {result.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
            {result.status === 'partial' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
            <span className="capitalize">{result.status}</span>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">AI System</Label>
          <div className="flex items-center space-x-1">
            <Calculator className="h-3 w-3" />
            <span className="capitalize">{result.aiSystemUsed}</span>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Duration</Label>
          <div>{result.duration}s</div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Success Rate</Label>
          <div>{Math.round((result.assignmentsCreated / result.gamesProcessed) * 100)}%</div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Run Date</Label>
          <div>{result.runDate}</div>
        </div>
      </div>

      {result.comments && result.comments.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Context & Comments</Label>
            <div className="space-y-1">
              {result.comments.map((comment, index) => (
                <div key={index} className="p-2 bg-blue-50 text-blue-800 rounded text-sm">
                  {comment}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Assignment Details</h4>
        {result.details.map((detail, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{detail.gameInfo}</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.assignedReferees.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Assigned Referees</Label>
                  {detail.assignedReferees.map((ref, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{ref.position}</Badge>
                          <span className="font-medium">{ref.refereeName}</span>
                        </div>
                        <Badge variant="secondary">
                          {Math.round(ref.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      {ref.reasoning && (
                        <div className="pl-4 text-xs text-muted-foreground">
                          <strong>Reasoning:</strong> {ref.reasoning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {detail.notes && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm">Assignment Notes</Label>
                  <div className="p-2 bg-green-50 text-green-700 rounded text-sm">
                    {detail.notes}
                  </div>
                </div>
              )}
              
              {detail.conflicts && detail.conflicts.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm text-red-600">Conflicts</Label>
                  {detail.conflicts.map((conflict, i) => (
                    <div key={i} className="p-2 bg-red-50 text-red-700 rounded text-sm">
                      {conflict}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
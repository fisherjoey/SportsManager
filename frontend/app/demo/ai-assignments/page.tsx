'use client'

import { useState } from 'react'
import { Brain, CheckCircle2, AlertTriangle, Users, Calendar, MapPin, Clock } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Demo data for testing
const demoGames = [
  {
    id: 'game-1',
    date: '2024-01-15',
    time: '18:00',
    homeTeam: 'Lakers',
    awayTeam: 'Warriors',
    location: 'Downtown Arena',
    division: 'Senior A',
    requiredReferees: 2,
    status: 'unassigned' as const
  },
  {
    id: 'game-2',
    date: '2024-01-15',
    time: '19:45',
    homeTeam: 'Bulls',
    awayTeam: 'Celtics',
    location: 'Downtown Arena',
    division: 'Senior A',
    requiredReferees: 2,
    status: 'unassigned' as const
  }
]

const demoReferees = [
  { id: 'ref-1', name: 'John Smith', level: 'Senior', location: 'Downtown' },
  { id: 'ref-2', name: 'Sarah Johnson', level: 'Junior', location: 'Downtown' },
  { id: 'ref-3', name: 'Mike Wilson', level: 'Senior', location: 'Westside' }
]

interface AISuggestion {
  gameId: string
  refereeId: string
  refereeName: string
  confidence: number
  reasoning: string
}

export default function AIAssignmentDemo() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const generateDemoSuggestions = () => {
    setLoading(true)
    
    // Simulate AI processing
    setTimeout(() => {
      const demoSuggestions: AISuggestion[] = [
        {
          gameId: 'game-1',
          refereeId: 'ref-1',
          refereeName: 'John Smith',
          confidence: 0.89,
          reasoning: 'Senior referee, close location, perfect level match, confirmed available'
        },
        {
          gameId: 'game-1',
          refereeId: 'ref-2',
          refereeName: 'Sarah Johnson',
          confidence: 0.76,
          reasoning: 'Junior referee, close location, confirmed available'
        },
        {
          gameId: 'game-2',
          refereeId: 'ref-1',
          refereeName: 'John Smith',
          confidence: 0.85,
          reasoning: 'Senior referee, close location, excellent experience'
        },
        {
          gameId: 'game-2',
          refereeId: 'ref-3',
          refereeName: 'Mike Wilson',
          confidence: 0.82,
          reasoning: 'Senior referee, high experience, good availability'
        }
      ]
      
      setSuggestions(demoSuggestions)
      setShowResults(true)
      setLoading(false)
    }, 2000)
  }

  const applySuggestions = () => {
    alert('✅ AI suggestions would be applied to create assignments!')
    setShowResults(false)
    setSuggestions([])
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 AI Assignment System Demo</h1>
        <p className="text-gray-600">Demonstration of AI-powered referee assignment suggestions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games to Assign</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demoGames.length}</div>
            <p className="text-xs text-muted-foreground">
              {demoGames.reduce((sum, game) => sum + game.requiredReferees, 0)} referees needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Referees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demoReferees.length}</div>
            <p className="text-xs text-muted-foreground">All currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Status</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ready</div>
            <p className="text-xs text-muted-foreground">
              {suggestions.length > 0 ? `${suggestions.length} suggestions` : 'No suggestions yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Games to Assign */}
      <Card>
        <CardHeader>
          <CardTitle>Games Requiring Assignment</CardTitle>
          <CardDescription>Current unassigned games in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demoGames.map(game => (
              <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium">{game.homeTeam} vs {game.awayTeam}</h3>
                    <Badge variant="outline">{game.division}</Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(game.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {game.time}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {game.location}
                    </span>
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {game.requiredReferees} refs needed
                    </span>
                  </div>
                </div>
                <Badge variant="destructive">Unassigned</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Assignment Button */}
      <div className="text-center">
        <Button 
          onClick={generateDemoSuggestions}
          disabled={loading || showResults}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating AI Suggestions...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Generate AI Assignment Suggestions
            </>
          )}
        </Button>
      </div>

      {/* AI Suggestions Results */}
      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              AI Assignment Suggestions
            </CardTitle>
            <CardDescription>
              Smart assignments based on proximity, availability, experience, and skill level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoGames.map(game => {
                const gameSuggestions = suggestions.filter(s => s.gameId === game.id)
                
                return (
                  <div key={game.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{game.homeTeam} vs {game.awayTeam}</h3>
                      <Badge variant="outline">{game.time} • {game.location}</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {gameSuggestions.map((suggestion, index) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-green-900">{suggestion.refereeName}</p>
                              <p className="text-sm text-green-700">{suggestion.reasoning}</p>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-green-600">
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowResults(false)}>
                Cancel
              </Button>
              <Button 
                onClick={applySuggestions}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply All Suggestions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Referees */}
      <Card>
        <CardHeader>
          <CardTitle>Available Referees</CardTitle>
          <CardDescription>Referees currently available for assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {demoReferees.map(referee => (
              <div key={referee.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{referee.name}</h4>
                  <Badge variant="default">{referee.level}</Badge>
                </div>
                <p className="text-sm text-gray-600">📍 {referee.location}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">Available</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Implementation Status</h4>
              <p className="text-sm text-blue-700">
                ✅ Backend AI service implemented with LLM integration (OpenAI/DeepSeek)<br/>
                ✅ Assignment algorithm considers proximity, experience, availability, and level matching<br/>
                ✅ API endpoints for generating, accepting, and rejecting suggestions<br/>
                ✅ Frontend component integration with fallback logic<br/>
                🔄 This demo shows the UI flow - full backend integration requires API setup
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
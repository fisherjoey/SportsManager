'use client'

import React, { useRef, useCallback } from 'react'
import { 
  Download, 
  Trophy, 
  Users, 
  Calendar,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

interface Team {
  id: string
  name: string
  rank?: number
  is_bye?: boolean
  is_placeholder?: boolean
}

interface Game {
  home_team_id: string
  away_team_id: string
  home_team_name: string
  away_team_name: string
  game_date: string
  game_time: string
  location: string
  round: number
  round_name?: string
  stage?: string
  group_name?: string
}

interface TournamentRound {
  round: number
  round_name?: string
  stage?: string
  games: Game[]
}

interface Tournament {
  type: string
  name: string
  teams: Team[]
  rounds: TournamentRound[]
  total_games: number
  total_rounds: number
  summary: any
  groups?: any[]
}

interface TournamentDiagramProps {
  tournament: Tournament
  className?: string
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textLight: '#64748b'
}

export function TournamentDiagram({ tournament, className = '' }: TournamentDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { toast } = useToast()

  const exportAsPDF = useCallback(async () => {
    if (!svgRef.current) return

    try {
      // Create a canvas to render the SVG
      const svgElement = svgRef.current
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      // Create an image from the SVG
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size to match SVG
        const rect = svgElement.getBoundingClientRect()
        canvas.width = rect.width * 2 // Higher resolution
        canvas.height = rect.height * 2
        ctx.scale(2, 2)

        // Draw the image
        ctx.drawImage(img, 0, 0, rect.width, rect.height)

        // Convert to PDF using a simple approach
        const link = document.createElement('a')
        link.download = `${tournament.name.replace(/\s+/g, '_')}_diagram.png`
        link.href = canvas.toDataURL('image/png')
        link.click()

        URL.revokeObjectURL(svgUrl)
        
        toast({
          title: 'Success',
          description: 'Tournament diagram exported successfully!'
        })
      }
      img.src = svgUrl
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: 'Export Failed',
        description: 'Could not export tournament diagram',
        variant: 'destructive'
      })
    }
  }, [tournament.name, toast])

  const renderSingleElimination = () => {
    const rounds = tournament.rounds.filter(r => r.stage !== 'group_stage')
    const maxRounds = rounds.length
    const maxGamesInRound = Math.max(...rounds.map(r => r.games.length))
    
    const width = Math.max(800, maxRounds * 200)
    const height = Math.max(400, maxGamesInRound * 80 + 100)
    const roundWidth = width / (maxRounds + 1)

    return (
      <svg ref={svgRef} width={width} height={height} className="border rounded">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
          </pattern>
        </defs>
        
        {/* Background */}
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Tournament Title */}
        <text x={width / 2} y={30} textAnchor="middle" fontSize="20" fontWeight="bold" fill={COLORS.text}>
          {tournament.name} - Single Elimination
        </text>
        
        {rounds.map((round, roundIndex) => {
          const x = roundWidth * (roundIndex + 1)
          const gamesInRound = round.games.length
          const gameHeight = Math.max(60, (height - 100) / Math.max(gamesInRound, 1))
          
          return (
            <g key={round.round}>
              {/* Round header */}
              <text 
                x={x} 
                y={70} 
                textAnchor="middle" 
                fontSize="14" 
                fontWeight="bold" 
                fill={COLORS.primary}
              >
                {round.round_name || `Round ${round.round}`}
              </text>
              
              {/* Games */}
              {round.games.map((game, gameIndex) => {
                const y = 90 + gameIndex * gameHeight + gameHeight / 2
                
                return (
                  <g key={gameIndex}>
                    {/* Game bracket */}
                    <rect
                      x={x - 80}
                      y={y - 25}
                      width={160}
                      height={50}
                      fill={COLORS.background}
                      stroke={COLORS.border}
                      strokeWidth="1"
                      rx="4"
                    />
                    
                    {/* Home team */}
                    <text
                      x={x - 75}
                      y={y - 8}
                      fontSize="12"
                      fill={COLORS.text}
                      className="font-medium"
                    >
                      {game.home_team_name.length > 15 
                        ? game.home_team_name.substring(0, 12) + '...' 
                        : game.home_team_name}
                    </text>
                    
                    {/* VS */}
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      fontSize="10"
                      fill={COLORS.textLight}
                    >
                      vs
                    </text>
                    
                    {/* Away team */}
                    <text
                      x={x - 75}
                      y={y + 12}
                      fontSize="12"
                      fill={COLORS.text}
                      className="font-medium"
                    >
                      {game.away_team_name.length > 15 
                        ? game.away_team_name.substring(0, 12) + '...' 
                        : game.away_team_name}
                    </text>
                    
                    {/* Connection line to next round */}
                    {roundIndex < rounds.length - 1 && (
                      <line
                        x1={x + 80}
                        y1={y}
                        x2={x + roundWidth - 80}
                        y2={y}
                        stroke={COLORS.border}
                        strokeWidth="2"
                      />
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}
        
        {/* Winner placeholder */}
        {rounds.length > 0 && (
          <g>
            <rect
              x={width - 120}
              y={height / 2 - 30}
              width={100}
              height={60}
              fill={COLORS.success}
              stroke={COLORS.success}
              strokeWidth="2"
              rx="8"
            />
            <text
              x={width - 70}
              y={height / 2 - 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="white"
            >
              WINNER
            </text>
            <Trophy 
              x={width - 80} 
              y={height / 2 + 5} 
              width="20" 
              height="20" 
              fill="white"
            />
          </g>
        )}
      </svg>
    )
  }

  const renderRoundRobin = () => {
    const teams = tournament.teams
    const games = tournament.rounds.flatMap(r => r.games)
    
    const width = Math.max(600, teams.length * 50 + 200)
    const height = Math.max(600, teams.length * 50 + 200)
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 3

    return (
      <svg ref={svgRef} width={width} height={height} className="border rounded">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
          </pattern>
        </defs>
        
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Tournament Title */}
        <text x={centerX} y={30} textAnchor="middle" fontSize="20" fontWeight="bold" fill={COLORS.text}>
          {tournament.name} - Round Robin
        </text>
        
        {/* Center info */}
        <circle cx={centerX} cy={centerY} r="60" fill={COLORS.primary} opacity="0.1" />
        <text x={centerX} y={centerY - 10} textAnchor="middle" fontSize="14" fontWeight="bold" fill={COLORS.primary}>
          {tournament.total_games}
        </text>
        <text x={centerX} y={centerY + 8} textAnchor="middle" fontSize="12" fill={COLORS.textLight}>
          Total Games
        </text>
        
        {/* Teams arranged in circle */}
        {teams.map((team, index) => {
          const angle = (index * 2 * Math.PI) / teams.length
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          
          return (
            <g key={team.id}>
              <circle cx={x} cy={y} r="25" fill={COLORS.background} stroke={COLORS.border} strokeWidth="2" />
              <text
                x={x}
                y={y - 5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill={COLORS.text}
              >
                {team.rank || index + 1}
              </text>
              <text
                x={x}
                y={y + 8}
                textAnchor="middle"
                fontSize="8"
                fill={COLORS.textLight}
              >
                {team.name.length > 8 ? team.name.substring(0, 6) + '..' : team.name}
              </text>
            </g>
          )
        })}
        
        {/* Connection lines between teams */}
        {teams.map((team1, i) => 
          teams.slice(i + 1).map((team2, j) => {
            const angle1 = (i * 2 * Math.PI) / teams.length
            const angle2 = ((i + j + 1) * 2 * Math.PI) / teams.length
            const x1 = centerX + radius * Math.cos(angle1)
            const y1 = centerY + radius * Math.sin(angle1)
            const x2 = centerX + radius * Math.cos(angle2)
            const y2 = centerY + radius * Math.sin(angle2)
            
            return (
              <line
                key={`${i}-${i + j + 1}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={COLORS.border}
                strokeWidth="1"
                opacity="0.3"
              />
            )
          })
        )}
      </svg>
    )
  }

  const renderGroupStage = () => {
    const groups = tournament.groups || []
    const width = Math.max(800, groups.length * 200)
    const height = Math.max(600, 400)
    const groupWidth = width / (groups.length + 1)

    return (
      <svg ref={svgRef} width={width} height={height} className="border rounded">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
          </pattern>
        </defs>
        
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Tournament Title */}
        <text x={width / 2} y={30} textAnchor="middle" fontSize="20" fontWeight="bold" fill={COLORS.text}>
          {tournament.name} - Group Stage + Playoffs
        </text>
        
        {/* Groups */}
        {groups.map((group, groupIndex) => {
          const x = groupWidth * (groupIndex + 1)
          const groupHeight = 300
          const teamHeight = groupHeight / Math.max(group.teams.length, 1)
          
          return (
            <g key={group.id}>
              {/* Group container */}
              <rect
                x={x - 80}
                y={70}
                width={160}
                height={groupHeight}
                fill={COLORS.background}
                stroke={COLORS.border}
                strokeWidth="2"
                rx="8"
              />
              
              {/* Group header */}
              <rect
                x={x - 80}
                y={70}
                width={160}
                height={40}
                fill={COLORS.primary}
                rx="8"
              />
              <rect
                x={x - 80}
                y={102}
                width={160}
                height={8}
                fill={COLORS.primary}
              />
              
              <text
                x={x}
                y={95}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="white"
              >
                {group.name}
              </text>
              
              {/* Teams in group */}
              {group.teams.map((team: Team, teamIndex: number) => {
                const y = 120 + teamIndex * teamHeight
                
                return (
                  <g key={team.id}>
                    <rect
                      x={x - 75}
                      y={y}
                      width={150}
                      height={teamHeight - 5}
                      fill={teamIndex < 2 ? COLORS.success : COLORS.background}
                      opacity={teamIndex < 2 ? 0.1 : 1}
                      stroke={teamIndex < 2 ? COLORS.success : COLORS.border}
                      strokeWidth="1"
                      rx="4"
                    />
                    
                    <text
                      x={x - 70}
                      y={y + teamHeight / 2 - 5}
                      fontSize="12"
                      fontWeight="bold"
                      fill={COLORS.text}
                    >
                      {team.rank || teamIndex + 1}. {team.name}
                    </text>
                    
                    {teamIndex < 2 && (
                      <text
                        x={x + 65}
                        y={y + teamHeight / 2 + 5}
                        fontSize="10"
                        fill={COLORS.success}
                        textAnchor="end"
                      >
                        Advances
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}
        
        {/* Playoffs indicator */}
        <g>
          <rect
            x={width - 150}
            y={height / 2 - 40}
            width={120}
            height={80}
            fill={COLORS.warning}
            opacity="0.1"
            stroke={COLORS.warning}
            strokeWidth="2"
            rx="8"
          />
          
          <text
            x={width - 90}
            y={height / 2 - 15}
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill={COLORS.warning}
          >
            PLAYOFFS
          </text>
          
          <text
            x={width - 90}
            y={height / 2 + 5}
            textAnchor="middle"
            fontSize="12"
            fill={COLORS.textLight}
          >
            Top teams from
          </text>
          
          <text
            x={width - 90}
            y={height / 2 + 20}
            textAnchor="middle"
            fontSize="12"
            fill={COLORS.textLight}
          >
            each group
          </text>
        </g>
      </svg>
    )
  }

  const renderSwissSystem = () => {
    const rounds = tournament.rounds
    const width = Math.max(800, rounds.length * 150)
    const height = 500
    const roundWidth = width / (rounds.length + 1)

    return (
      <svg ref={svgRef} width={width} height={height} className="border rounded">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
          </pattern>
        </defs>
        
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Tournament Title */}
        <text x={width / 2} y={30} textAnchor="middle" fontSize="20" fontWeight="bold" fill={COLORS.text}>
          {tournament.name} - Swiss System
        </text>
        
        {/* Rounds */}
        {rounds.map((round, roundIndex) => {
          const x = roundWidth * (roundIndex + 1)
          const gamesInRound = round.games.length
          const gameHeight = Math.max(40, 300 / Math.max(gamesInRound, 1))
          
          return (
            <g key={round.round}>
              {/* Round header */}
              <rect
                x={x - 60}
                y={60}
                width={120}
                height={30}
                fill={COLORS.primary}
                rx="6"
              />
              <text
                x={x}
                y={80}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="white"
              >
                Round {round.round}
              </text>
              
              {/* Games in round */}
              {round.games.map((game, gameIndex) => {
                const y = 110 + gameIndex * gameHeight
                
                return (
                  <g key={gameIndex}>
                    <rect
                      x={x - 55}
                      y={y}
                      width={110}
                      height={gameHeight - 5}
                      fill={COLORS.background}
                      stroke={COLORS.border}
                      strokeWidth="1"
                      rx="4"
                    />
                    
                    <text
                      x={x}
                      y={y + 12}
                      textAnchor="middle"
                      fontSize="10"
                      fill={COLORS.text}
                    >
                      {game.home_team_name.substring(0, 8)}
                    </text>
                    
                    <text
                      x={x}
                      y={y + 24}
                      textAnchor="middle"
                      fontSize="8"
                      fill={COLORS.textLight}
                    >
                      vs
                    </text>
                    
                    <text
                      x={x}
                      y={y + 36}
                      textAnchor="middle"
                      fontSize="10"
                      fill={COLORS.text}
                    >
                      {game.away_team_name.substring(0, 8)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
        
        {/* Swiss system info */}
        <g>
          <rect
            x={20}
            y={height - 80}
            width={width - 40}
            height={60}
            fill={COLORS.background}
            stroke={COLORS.border}
            strokeWidth="1"
            rx="6"
          />
          
          <text x={30} y={height - 55} fontSize="12" fontWeight="bold" fill={COLORS.text}>
            Swiss System Format:
          </text>
          <text x={30} y={height - 40} fontSize="11" fill={COLORS.textLight}>
            Teams play {rounds.length} rounds, paired by similar records each round
          </text>
          <text x={30} y={height - 25} fontSize="11" fill={COLORS.textLight}>
            Winners determined by final standings after all rounds
          </text>
        </g>
      </svg>
    )
  }

  const renderDiagram = () => {
    switch (tournament.type) {
      case 'single_elimination':
        return renderSingleElimination()
      case 'round_robin':
        return renderRoundRobin()
      case 'group_stage_playoffs':
        return renderGroupStage()
      case 'swiss_system':
        return renderSwissSystem()
      default:
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4" />
              <p>Tournament format not supported for diagram visualization</p>
            </div>
          </div>
        )
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Tournament Bracket
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-blue-600">
                <Users className="h-3 w-3 mr-1" />
                {tournament.teams.length} Teams
              </Badge>
              <Badge variant="outline" className="text-green-600">
                <Calendar className="h-3 w-3 mr-1" />
                {tournament.total_games} Games
              </Badge>
              <Badge variant="outline" className="text-purple-600">
                {tournament.type.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export PNG
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[600px] border rounded">
          {renderDiagram()}
        </div>
      </CardContent>
    </Card>
  )
}
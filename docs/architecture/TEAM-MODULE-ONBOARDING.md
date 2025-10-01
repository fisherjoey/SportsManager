# Team Module - Project Onboarding & Implementation Guide
**Document Date:** September 28, 2025
**Project:** Sports Manager - Team Management Module
**Team:** School Project Team

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Current System Architecture](#current-system-architecture)
3. [Team Module Scope](#team-module-scope)
4. [Implementation Plan](#implementation-plan)
5. [Database Design](#database-design)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Integration Points](#integration-points)
9. [Development Timeline](#development-timeline)
10. [Getting Started](#getting-started)

---

## 🎯 Project Overview

### What is Sports Manager?
Sports Manager is a comprehensive sports league management system currently focused on referee assignment and game management. The system handles:
- Referee scheduling and assignments
- Game management and tracking
- Financial management (budgets, expenses)
- Multi-organization support with role-based access control (RBAC)

### Your Mission: Team Management Module
Your team will develop the **Team Management Module** - a comprehensive solution for sports teams to:
- Manage team rosters and player information
- Track games and schedules
- Organize practices and training sessions
- Communicate with players and parents
- Track player statistics and performance
- Manage team resources and equipment

### Technology Stack You'll Work With
- **Frontend:** React 18.x with TypeScript, Material-UI, Redux Toolkit
- **Backend:** Node.js with Express, TypeScript
- **Database:** PostgreSQL 15.x with Prisma ORM
- **Authorization:** Cerbos for policy-based access control
- **Authentication:** JWT tokens with refresh mechanism

---

## 🏗️ Current System Architecture

### Existing Database Tables You'll Interface With
1. **users** - System users (will extend for players/coaches)
2. **organizations** - Sports organizations (teams belong to these)
3. **games** - Game records (you'll enhance with team perspectives)
4. **teams** - Basic team information (currently minimal)
5. **leagues** - League structure
6. **locations** - Venues and facilities
7. **roles/permissions** - RBAC system

### Current API Structure
- `/api/auth/*` - Authentication endpoints
- `/api/games/*` - Game management
- `/api/admin/*` - Administrative functions
- `/api/referees/*` - Referee management

### Frontend Structure
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   └── utils/          # Utility functions
```

---

## 🎮 Team Module Scope

### Core Features to Implement

#### 1. **Team Dashboard**
- Team overview and statistics
- Upcoming games and practices
- Recent announcements
- Quick actions (add player, schedule practice)

#### 2. **Roster Management**
- Add/edit/remove players
- Player profiles with contact information
- Emergency contacts
- Medical information and allergies
- Player positions and jersey numbers
- Player availability tracking

#### 3. **Practice Management**
- Schedule practices
- Track attendance
- Practice plans and drills
- Resource booking (fields, equipment)

#### 4. **Game Integration**
- View team's game schedule
- Game lineup management
- Track game statistics
- Post-game reports
- Integration with existing game system

#### 5. **Communication Hub**
- Team announcements
- Email/SMS notifications to players/parents
- Event RSVPs
- Team chat/forum

#### 6. **Statistics & Performance**
- Player statistics tracking
- Season statistics
- Performance metrics
- Attendance tracking
- Award and achievement tracking

#### 7. **Resource Management**
- Equipment inventory
- Uniform tracking
- Team documents and files
- Photo gallery

---

## 💾 Database Design

### New Tables to Create

#### **players**
```sql
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    jersey_number INTEGER,
    position VARCHAR(50),
    status ENUM('active', 'injured', 'suspended', 'inactive') DEFAULT 'active',
    email VARCHAR(255),
    phone VARCHAR(20),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    medical_conditions TEXT,
    allergies TEXT,
    parent_name VARCHAR(200),
    parent_email VARCHAR(255),
    parent_phone VARCHAR(20),
    joined_date DATE DEFAULT CURRENT_DATE,
    photo_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, jersey_number)
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_status ON players(status);
```

#### **practices**
```sql
CREATE TABLE practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    title VARCHAR(200) NOT NULL,
    practice_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location_name VARCHAR(255),
    location_address TEXT,
    type ENUM('regular', 'special', 'optional', 'tournament_prep') DEFAULT 'regular',
    description TEXT,
    equipment_needed TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    cancelled BOOLEAN DEFAULT false,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_practices_team ON practices(team_id);
CREATE INDEX idx_practices_date ON practices(practice_date);
```

#### **practice_attendance**
```sql
CREATE TABLE practice_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    arrival_time TIME,
    notes TEXT,
    marked_by UUID REFERENCES users(id),
    marked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(practice_id, player_id)
);

CREATE INDEX idx_attendance_practice ON practice_attendance(practice_id);
CREATE INDEX idx_attendance_player ON practice_attendance(player_id);
```

#### **team_announcements**
```sql
CREATE TABLE team_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    type ENUM('general', 'game', 'practice', 'event', 'deadline') DEFAULT 'general',
    author_id UUID NOT NULL REFERENCES users(id),
    publish_date TIMESTAMP DEFAULT NOW(),
    expiry_date TIMESTAMP,
    requires_acknowledgment BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_announcements_team ON team_announcements(team_id);
CREATE INDEX idx_announcements_date ON team_announcements(publish_date);
```

#### **player_statistics**
```sql
CREATE TABLE player_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    season VARCHAR(50),
    stat_type VARCHAR(50) NOT NULL, -- goals, assists, saves, etc.
    stat_value INTEGER NOT NULL,
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_stats_player ON player_statistics(player_id);
CREATE INDEX idx_stats_game ON player_statistics(game_id);
CREATE INDEX idx_stats_season ON player_statistics(season);
```

#### **team_resources**
```sql
CREATE TABLE team_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    category ENUM('equipment', 'uniform', 'document', 'other') NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity INTEGER,
    location VARCHAR(255),
    condition ENUM('new', 'good', 'fair', 'poor') DEFAULT 'good',
    assigned_to UUID REFERENCES players(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resources_team ON team_resources(team_id);
CREATE INDEX idx_resources_category ON team_resources(category);
```

#### **team_coaches**
```sql
CREATE TABLE team_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role ENUM('head_coach', 'assistant_coach', 'trainer', 'manager') NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    permissions JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_coaches_team ON team_coaches(team_id);
CREATE INDEX idx_coaches_user ON team_coaches(user_id);
```

### Modifications to Existing Tables

#### **teams** (enhance existing table)
```sql
ALTER TABLE teams ADD COLUMN IF NOT EXISTS
    logo_url VARCHAR(500),
    team_color_primary VARCHAR(7),
    team_color_secondary VARCHAR(7),
    home_field_id UUID REFERENCES locations(id),
    founded_year INTEGER,
    description TEXT,
    website VARCHAR(255),
    social_media JSON DEFAULT '{}',
    roster_limit INTEGER DEFAULT 20,
    practice_schedule JSON DEFAULT '{}',
    team_settings JSON DEFAULT '{}';
```

#### **games** (add team-specific fields)
```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS
    home_lineup JSON DEFAULT '[]',
    away_lineup JSON DEFAULT '[]',
    home_score INTEGER,
    away_score INTEGER,
    game_notes TEXT,
    game_summary TEXT;
```

---

## 🔧 Backend Implementation

### API Endpoints to Create

#### **Team Management**
```typescript
// Team Routes - /api/teams
GET    /api/teams/:teamId/dashboard     // Team dashboard data
GET    /api/teams/:teamId/details       // Full team details
PUT    /api/teams/:teamId               // Update team info
DELETE /api/teams/:teamId               // Delete team (admin only)
POST   /api/teams/:teamId/invite        // Invite player/coach
```

#### **Roster Management**
```typescript
// Player Routes - /api/teams/:teamId/players
GET    /api/teams/:teamId/players       // List all players
GET    /api/teams/:teamId/players/:id   // Get player details
POST   /api/teams/:teamId/players       // Add new player
PUT    /api/teams/:teamId/players/:id   // Update player
DELETE /api/teams/:teamId/players/:id   // Remove player
POST   /api/teams/:teamId/players/bulk  // Bulk import players
GET    /api/teams/:teamId/players/:id/stats // Player statistics
```

#### **Practice Management**
```typescript
// Practice Routes - /api/teams/:teamId/practices
GET    /api/teams/:teamId/practices     // List practices
GET    /api/teams/:teamId/practices/:id // Practice details
POST   /api/teams/:teamId/practices     // Schedule practice
PUT    /api/teams/:teamId/practices/:id // Update practice
DELETE /api/teams/:teamId/practices/:id // Cancel practice
POST   /api/teams/:teamId/practices/:id/attendance // Mark attendance
GET    /api/teams/:teamId/practices/:id/attendance // Get attendance
```

#### **Communication**
```typescript
// Announcement Routes - /api/teams/:teamId/announcements
GET    /api/teams/:teamId/announcements    // List announcements
POST   /api/teams/:teamId/announcements    // Create announcement
PUT    /api/teams/:teamId/announcements/:id // Update announcement
DELETE /api/teams/:teamId/announcements/:id // Delete announcement
POST   /api/teams/:teamId/announcements/:id/acknowledge // Mark as read
POST   /api/teams/:teamId/notifications    // Send team notification
```

#### **Statistics**
```typescript
// Statistics Routes - /api/teams/:teamId/statistics
GET    /api/teams/:teamId/statistics       // Team statistics
GET    /api/teams/:teamId/statistics/season/:season // Season stats
POST   /api/teams/:teamId/games/:gameId/statistics // Record game stats
GET    /api/teams/:teamId/reports/attendance // Attendance report
GET    /api/teams/:teamId/reports/performance // Performance report
```

### Service Layer Architecture

#### **TeamService.ts**
```typescript
export class TeamService {
  async getTeamDashboard(teamId: string): Promise<TeamDashboard> {
    // Aggregate data for dashboard
    const team = await this.teamRepository.findById(teamId);
    const upcomingGames = await this.gameRepository.findUpcomingByTeam(teamId, 5);
    const upcomingPractices = await this.practiceRepository.findUpcoming(teamId, 5);
    const recentAnnouncements = await this.announcementRepository.findRecent(teamId, 3);
    const rosterCount = await this.playerRepository.countByTeam(teamId);

    return {
      team,
      upcomingGames,
      upcomingPractices,
      recentAnnouncements,
      statistics: {
        totalPlayers: rosterCount,
        activeGames: upcomingGames.length,
        scheduledPractices: upcomingPractices.length
      }
    };
  }

  async invitePlayer(teamId: string, playerData: PlayerInvite): Promise<void> {
    // Create player record
    const player = await this.playerRepository.create({
      ...playerData,
      teamId,
      status: 'pending'
    });

    // Send invitation email
    await this.notificationService.sendPlayerInvitation(player);

    // Log activity
    await this.auditService.log('player_invited', { teamId, playerId: player.id });
  }

  async scheduleSeasonPractices(teamId: string, schedule: PracticeSchedule): Promise<void> {
    // Bulk create recurring practices
    const practices = this.generateRecurringPractices(schedule);
    await this.practiceRepository.bulkCreate(practices);

    // Notify team
    await this.notificationService.notifyTeam(teamId, 'New practice schedule available');
  }
}
```

#### **PlayerService.ts**
```typescript
export class PlayerService {
  async getPlayerProfile(playerId: string): Promise<PlayerProfile> {
    const player = await this.playerRepository.findById(playerId);
    const stats = await this.statsRepository.getPlayerStats(playerId);
    const attendance = await this.attendanceRepository.getPlayerAttendance(playerId);
    const upcomingGames = await this.gameRepository.findUpcomingForPlayer(playerId);

    return {
      player,
      statistics: stats,
      attendanceRate: this.calculateAttendanceRate(attendance),
      upcomingGames,
      achievements: await this.getPlayerAchievements(playerId)
    };
  }

  async updatePlayerAvailability(
    playerId: string,
    availability: Availability
  ): Promise<void> {
    await this.playerRepository.updateAvailability(playerId, availability);

    // Check for conflicts with scheduled games/practices
    const conflicts = await this.checkScheduleConflicts(playerId, availability);
    if (conflicts.length > 0) {
      await this.notificationService.notifyCoaches(
        player.teamId,
        `Player ${player.name} has availability conflicts`
      );
    }
  }

  async recordPlayerStats(
    playerId: string,
    gameId: string,
    stats: GameStats
  ): Promise<void> {
    // Validate game and player participation
    const game = await this.gameRepository.findById(gameId);
    if (!game.lineup.includes(playerId)) {
      throw new Error('Player was not in game lineup');
    }

    // Record statistics
    await this.statsRepository.recordGameStats(playerId, gameId, stats);

    // Update season aggregates
    await this.statsRepository.updateSeasonStats(playerId, game.season);
  }
}
```

#### **PracticeService.ts**
```typescript
export class PracticeService {
  async schedulePractice(teamId: string, practiceData: Practice): Promise<Practice> {
    // Check for venue availability
    if (practiceData.locationId) {
      const isAvailable = await this.locationService.checkAvailability(
        practiceData.locationId,
        practiceData.date,
        practiceData.startTime,
        practiceData.endTime
      );

      if (!isAvailable) {
        throw new Error('Venue not available at requested time');
      }
    }

    // Create practice
    const practice = await this.practiceRepository.create({
      ...practiceData,
      teamId
    });

    // Send notifications
    await this.notificationService.notifyTeamOfPractice(teamId, practice);

    return practice;
  }

  async markAttendance(
    practiceId: string,
    attendance: AttendanceRecord[]
  ): Promise<void> {
    await this.attendanceRepository.bulkUpsert(practiceId, attendance);

    // Calculate attendance statistics
    const stats = await this.calculateAttendanceStats(practiceId);

    // Alert if low attendance
    if (stats.attendanceRate < 0.6) {
      await this.notificationService.alertLowAttendance(practiceId, stats);
    }
  }

  async generatePracticeReport(practiceId: string): Promise<PracticeReport> {
    const practice = await this.practiceRepository.findById(practiceId);
    const attendance = await this.attendanceRepository.getByPractice(practiceId);

    return {
      practice,
      attendance,
      attendanceRate: this.calculateRate(attendance),
      absentPlayers: attendance.filter(a => a.status === 'absent'),
      notes: practice.notes
    };
  }
}
```

### Middleware & Authorization

#### **Team Authorization Middleware**
```typescript
export const teamAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const { teamId } = req.params;
  const userId = req.user.id;

  // Check if user is associated with team
  const isCoach = await teamService.isUserCoach(userId, teamId);
  const isPlayer = await teamService.isUserPlayer(userId, teamId);
  const isAdmin = req.user.roles.includes('admin');

  if (!isCoach && !isPlayer && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized for this team' });
  }

  // Add team context to request
  req.teamContext = {
    teamId,
    userRole: isCoach ? 'coach' : isPlayer ? 'player' : 'admin',
    permissions: await getTeamPermissions(userId, teamId)
  };

  next();
};
```

#### **Cerbos Policies for Team Module**
```yaml
# cerbos/policies/team.yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "1.0"
  resource: "team"
  rules:
    - actions: ["view", "list"]
      effect: EFFECT_ALLOW
      roles: ["coach", "player", "parent", "admin"]

    - actions: ["create", "update", "delete"]
      effect: EFFECT_ALLOW
      roles: ["admin"]

    - actions: ["update:own", "manage:roster", "schedule:practice"]
      effect: EFFECT_ALLOW
      roles: ["coach"]
      condition:
        match:
          expr: request.resource.attr.teamId == request.principal.attr.teamId

    - actions: ["view:own", "update:profile"]
      effect: EFFECT_ALLOW
      roles: ["player"]
      condition:
        match:
          expr: request.resource.attr.playerId == request.principal.id
```

---

## 🎨 Frontend Implementation

### Component Structure

#### **Team Dashboard Component**
```typescript
// pages/TeamDashboard.tsx
import React, { useEffect, useState } from 'react';
import { Grid, Card, Typography, Button } from '@mui/material';
import { useParams } from 'react-router-dom';
import { teamService } from '@/services/teamService';
import UpcomingGames from '@/components/team/UpcomingGames';
import UpcomingPractices from '@/components/team/UpcomingPractices';
import TeamAnnouncements from '@/components/team/TeamAnnouncements';
import QuickStats from '@/components/team/QuickStats';
import RosterSummary from '@/components/team/RosterSummary';

export const TeamDashboard: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [teamId]);

  const loadDashboard = async () => {
    try {
      const data = await teamService.getTeamDashboard(teamId!);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!dashboard) return <ErrorMessage />;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4">{dashboard.team.name} Dashboard</Typography>
      </Grid>

      <Grid item xs={12} md={8}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <QuickStats stats={dashboard.statistics} />
          </Grid>
          <Grid item xs={12} md={6}>
            <UpcomingGames games={dashboard.upcomingGames} />
          </Grid>
          <Grid item xs={12} md={6}>
            <UpcomingPractices practices={dashboard.upcomingPractices} />
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12} md={4}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TeamAnnouncements announcements={dashboard.recentAnnouncements} />
          </Grid>
          <Grid item xs={12}>
            <RosterSummary teamId={teamId!} playerCount={dashboard.statistics.totalPlayers} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};
```

#### **Roster Management Component**
```typescript
// components/team/RosterManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog
} from '@mui/material';
import { Edit, Delete, Add, Email, Phone } from '@mui/icons-material';
import { Player } from '@/types/team';
import PlayerDialog from './PlayerDialog';

interface RosterManagementProps {
  teamId: string;
}

export const RosterManagement: React.FC<RosterManagementProps> = ({ teamId }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [teamId]);

  const loadPlayers = async () => {
    const data = await teamService.getTeamRoster(teamId);
    setPlayers(data);
  };

  const handleAddPlayer = () => {
    setSelectedPlayer(null);
    setDialogOpen(true);
  };

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setDialogOpen(true);
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (confirm('Are you sure you want to remove this player?')) {
      await teamService.removePlayer(teamId, playerId);
      await loadPlayers();
    }
  };

  const handleSavePlayer = async (playerData: Partial<Player>) => {
    if (selectedPlayer) {
      await teamService.updatePlayer(teamId, selectedPlayer.id, playerData);
    } else {
      await teamService.addPlayer(teamId, playerData);
    }
    setDialogOpen(false);
    await loadPlayers();
  };

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Team Roster</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddPlayer}
          >
            Add Player
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>{player.jerseyNumber || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {player.firstName} {player.lastName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Age: {calculateAge(player.dateOfBirth)}
                    </Typography>
                  </TableCell>
                  <TableCell>{player.position || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={player.status}
                      color={getStatusColor(player.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" href={`mailto:${player.email}`}>
                      <Email />
                    </IconButton>
                    <IconButton size="small" href={`tel:${player.phone}`}>
                      <Phone />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEditPlayer(player)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeletePlayer(player.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <PlayerDialog
        open={dialogOpen}
        player={selectedPlayer}
        onClose={() => setDialogOpen(false)}
        onSave={handleSavePlayer}
      />
    </>
  );
};
```

#### **Practice Schedule Component**
```typescript
// components/team/PracticeSchedule.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Practice } from '@/types/team';
import PracticeDialog from './PracticeDialog';
import AttendanceDialog from './AttendanceDialog';

const localizer = momentLocalizer(moment);

interface PracticeScheduleProps {
  teamId: string;
}

export const PracticeSchedule: React.FC<PracticeScheduleProps> = ({ teamId }) => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);

  useEffect(() => {
    loadPractices();
  }, [teamId]);

  const loadPractices = async () => {
    const data = await teamService.getPractices(teamId);
    setPractices(data);
  };

  const events: Event[] = practices.map(practice => ({
    id: practice.id,
    title: practice.title,
    start: new Date(`${practice.practiceDate} ${practice.startTime}`),
    end: new Date(`${practice.practiceDate} ${practice.endTime}`),
    resource: practice
  }));

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedPractice({
      practiceDate: moment(start).format('YYYY-MM-DD'),
      startTime: moment(start).format('HH:mm'),
      endTime: moment(end).format('HH:mm')
    } as Practice);
    setPracticeDialogOpen(true);
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedPractice(event.resource as Practice);
    setPracticeDialogOpen(true);
  };

  const handleSavePractice = async (practiceData: Partial<Practice>) => {
    if (selectedPractice?.id) {
      await teamService.updatePractice(teamId, selectedPractice.id, practiceData);
    } else {
      await teamService.schedulePractice(teamId, practiceData);
    }
    setPracticeDialogOpen(false);
    await loadPractices();
  };

  const handleMarkAttendance = (practice: Practice) => {
    setSelectedPractice(practice);
    setAttendanceDialogOpen(true);
  };

  return (
    <Paper sx={{ p: 2, height: 600 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Practice Schedule</Typography>
        <Button
          variant="contained"
          onClick={() => {
            setSelectedPractice(null);
            setPracticeDialogOpen(true);
          }}
        >
          Schedule Practice
        </Button>
      </Box>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        selectable
        style={{ height: 500 }}
        views={['month', 'week', 'day']}
        defaultView="week"
      />

      <PracticeDialog
        open={practiceDialogOpen}
        practice={selectedPractice}
        onClose={() => setPracticeDialogOpen(false)}
        onSave={handleSavePractice}
        onMarkAttendance={handleMarkAttendance}
      />

      <AttendanceDialog
        open={attendanceDialogOpen}
        practice={selectedPractice}
        teamId={teamId}
        onClose={() => setAttendanceDialogOpen(false)}
      />
    </Paper>
  );
};
```

### State Management

#### **Team Context**
```typescript
// contexts/TeamContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Team, Player } from '@/types/team';

interface TeamContextValue {
  currentTeam: Team | null;
  players: Player[];
  isCoach: boolean;
  isPlayer: boolean;
  permissions: string[];
  setCurrentTeam: (team: Team) => void;
  refreshRoster: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    if (currentTeam) {
      loadTeamData();
    }
  }, [currentTeam]);

  const loadTeamData = async () => {
    const roster = await teamService.getTeamRoster(currentTeam!.id);
    setPlayers(roster);

    const userPermissions = await teamService.getUserTeamPermissions(
      user!.id,
      currentTeam!.id
    );
    setPermissions(userPermissions);
  };

  const isCoach = permissions.includes('coach');
  const isPlayer = permissions.includes('player');

  return (
    <TeamContext.Provider
      value={{
        currentTeam,
        players,
        isCoach,
        isPlayer,
        permissions,
        setCurrentTeam,
        refreshRoster: loadTeamData
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
};
```

### Service Layer

#### **Team Service (Frontend)**
```typescript
// services/teamService.ts
import { apiClient } from '@/utils/apiClient';
import { Team, Player, Practice, Announcement, TeamDashboard } from '@/types/team';

class TeamService {
  async getTeamDashboard(teamId: string): Promise<TeamDashboard> {
    const response = await apiClient.get(`/teams/${teamId}/dashboard`);
    return response.data;
  }

  async getTeamRoster(teamId: string): Promise<Player[]> {
    const response = await apiClient.get(`/teams/${teamId}/players`);
    return response.data;
  }

  async addPlayer(teamId: string, playerData: Partial<Player>): Promise<Player> {
    const response = await apiClient.post(`/teams/${teamId}/players`, playerData);
    return response.data;
  }

  async updatePlayer(
    teamId: string,
    playerId: string,
    playerData: Partial<Player>
  ): Promise<Player> {
    const response = await apiClient.put(
      `/teams/${teamId}/players/${playerId}`,
      playerData
    );
    return response.data;
  }

  async removePlayer(teamId: string, playerId: string): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/players/${playerId}`);
  }

  async getPractices(teamId: string): Promise<Practice[]> {
    const response = await apiClient.get(`/teams/${teamId}/practices`);
    return response.data;
  }

  async schedulePractice(teamId: string, practiceData: Partial<Practice>): Promise<Practice> {
    const response = await apiClient.post(`/teams/${teamId}/practices`, practiceData);
    return response.data;
  }

  async markAttendance(
    teamId: string,
    practiceId: string,
    attendance: AttendanceRecord[]
  ): Promise<void> {
    await apiClient.post(
      `/teams/${teamId}/practices/${practiceId}/attendance`,
      { attendance }
    );
  }

  async getAnnouncements(teamId: string): Promise<Announcement[]> {
    const response = await apiClient.get(`/teams/${teamId}/announcements`);
    return response.data;
  }

  async createAnnouncement(
    teamId: string,
    announcement: Partial<Announcement>
  ): Promise<Announcement> {
    const response = await apiClient.post(
      `/teams/${teamId}/announcements`,
      announcement
    );
    return response.data;
  }

  async getUserTeamPermissions(userId: string, teamId: string): Promise<string[]> {
    const response = await apiClient.get(`/teams/${teamId}/permissions/${userId}`);
    return response.data.permissions;
  }
}

export const teamService = new TeamService();
```

---

## 🔗 Integration Points

### With Existing Systems

#### **1. Game Management Integration**
- Enhance game viewing from team perspective
- Add lineup management before games
- Enable post-game statistics entry
- Link game results to player statistics

#### **2. User Management Integration**
- Extend user profiles for players and coaches
- Add parent/guardian accounts
- Enable player self-registration with coach approval
- Integrate with existing authentication

#### **3. Organization Integration**
- Teams belong to organizations
- Inherit organization settings and policies
- Share resources across organization teams

#### **4. Financial Integration**
- Team budget tracking
- Player fees management
- Equipment and uniform costs
- Travel expense tracking

### API Integration Points
```typescript
// Existing endpoints to modify
PUT /api/games/:id/lineup     // Add team lineup management
POST /api/games/:id/stats     // Record game statistics
GET /api/users/:id/teams      // Get user's teams (player or coach)
POST /api/organizations/:id/teams // Create team under organization
```

---

## 📅 Development Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Set up development environment
- [ ] Create database migrations
- [ ] Implement basic CRUD for teams and players
- [ ] Create team dashboard UI
- [ ] Set up routing and navigation

### Phase 2: Core Features (Week 3-4)
- [ ] Implement roster management
- [ ] Create practice scheduling system
- [ ] Add attendance tracking
- [ ] Build player profiles
- [ ] Implement basic statistics

### Phase 3: Communication (Week 5)
- [ ] Create announcement system
- [ ] Add notification service
- [ ] Implement team communication features
- [ ] Add email/SMS integration

### Phase 4: Advanced Features (Week 6)
- [ ] Implement game integration
- [ ] Add advanced statistics and reporting
- [ ] Create resource management
- [ ] Build coach tools

### Phase 5: Testing & Polish (Week 7)
- [ ] Complete unit tests
- [ ] Integration testing
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Documentation

### Phase 6: Deployment (Week 8)
- [ ] Final testing
- [ ] Deployment preparation
- [ ] User training materials
- [ ] Launch preparation

---

## 🚀 Getting Started

### Prerequisites
1. Node.js 18.x or higher
2. PostgreSQL 15.x
3. Git
4. VS Code or preferred IDE

### Setup Instructions

#### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/sports-manager.git
cd sports-manager
```

#### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### 3. Database Setup
```bash
# Create database
createdb sports_management

# Run existing migrations
cd backend
npm run migrate

# Run new team module migrations
npm run migrate:team
```

#### 4. Environment Variables
Create `.env` files in both backend and frontend directories:

**backend/.env**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sports_management"
JWT_SECRET="your-secret-key"
PORT=3001
CERBOS_URL="http://localhost:3592"
```

**frontend/.env**
```env
REACT_APP_API_URL="http://localhost:3001/api"
REACT_APP_WEBSOCKET_URL="ws://localhost:3001"
```

#### 5. Start Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Cerbos (if not running)
docker run -p 3592:3592 ghcr.io/cerbos/cerbos:latest
```

### Development Workflow

1. **Create a feature branch**
```bash
git checkout -b feature/team-module-[your-feature]
```

2. **Make changes and commit**
```bash
git add .
git commit -m "feat(team): Add [feature description]"
```

3. **Push and create PR**
```bash
git push origin feature/team-module-[your-feature]
```

4. **Code Review Process**
- All PRs require at least one review
- Run tests before pushing
- Update documentation as needed

### Testing

#### Unit Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

#### Integration Tests
```bash
cd backend
npm run test:integration
```

#### E2E Tests
```bash
cd frontend
npm run test:e2e
```

---

## 📚 Resources

### Documentation
- [React Documentation](https://react.dev/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Cerbos Documentation](https://docs.cerbos.dev/)
- [Material-UI Components](https://mui.com/components/)

### Internal Documentation
- Database Schema: `/database-diagram.md`
- API Documentation: `/docs/api.md`
- Architecture Overview: `/uml-architecture-diagram.md`

### Team Communication
- Slack Channel: #sports-manager-team
- Project Board: [GitHub Projects](https://github.com/your-repo/projects)
- Weekly Standup: Mondays & Thursdays 10 AM

### Key Contacts
- Project Lead: [Name] - [email]
- Backend Lead: [Name] - [email]
- Frontend Lead: [Name] - [email]
- Database Admin: [Name] - [email]

---

## 🎯 Success Criteria

### Functional Requirements
✅ Teams can manage their complete roster
✅ Practice scheduling and attendance tracking works
✅ Players/parents receive notifications
✅ Statistics are accurately tracked
✅ Integration with existing game system

### Non-Functional Requirements
✅ Page load time < 2 seconds
✅ Support 100+ concurrent users
✅ Mobile responsive design
✅ 99.9% uptime
✅ WCAG 2.1 AA compliance

### Definition of Done
- [ ] Feature is fully implemented
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Deployed to staging environment
- [ ] Product owner approval

---

## 🤝 Contributing Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add JSDoc comments for public APIs

### Git Commit Convention
```
type(scope): description

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, test, chore

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

---

## 🔐 Security Considerations

### Data Protection
- PII encryption at rest
- Secure communication (HTTPS)
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Access Control
- Role-based permissions
- Team-level data isolation
- Audit logging
- Session management
- Password policies

### Compliance
- COPPA compliance for minors
- GDPR considerations
- Data retention policies
- Privacy policy updates

---

## 📈 Future Enhancements

### Phase 2 Features (Post-MVP)
- Mobile app development
- Advanced analytics and ML predictions
- Video analysis integration
- Tournament bracket management
- Fundraising and sponsorship tracking
- Social media integration
- Live game updates
- Parent portal
- Referee assignment from team side
- Multi-sport support

---

**Document Version:** 1.0
**Last Updated:** September 28, 2025
**Next Review:** October 15, 2025

---

*This document serves as the complete guide for implementing the Team Management Module. Please keep it updated as the project evolves.*
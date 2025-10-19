import * as cron from 'node-cron';
import db from '../config/database';
import smsService from './smsService';

export class ReminderScheduler {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start the reminder scheduler
   * Runs every hour to check for upcoming games
   */
  start() {
    // Run every hour at :00 minutes
    const task = cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running game reminder check...');
      await this.sendReminders();
    });

    this.scheduledJobs.set('hourly-reminders', task);
    console.log('✅ Reminder scheduler started - will check for reminders every hour');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.scheduledJobs.forEach((task, name) => {
      task.stop();
      console.log(`Stopped scheduler: ${name}`);
    });
    this.scheduledJobs.clear();
  }

  /**
   * Send reminders for upcoming games
   */
  private async sendReminders() {
    try {
      // Get accepted assignments for games in the next 2-3 hours
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

      const upcomingAssignments = await db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .join('users', 'game_assignments.user_id', 'users.id')
        .leftJoin('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .leftJoin('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .select(
          'game_assignments.id as assignment_id',
          'game_assignments.reminder_sent_at',
          'users.email',
          'users.name',
          'users.phone',
          'games.game_date',
          'games.game_time',
          'games.location',
          'home_teams.name as home_team_name',
          'away_teams.name as away_team_name'
        )
        .where('game_assignments.status', 'accepted')
        .whereRaw(`games.game_date::timestamp + games.game_time::time BETWEEN ? AND ?`, [twoHoursFromNow, threeHoursFromNow])
        .whereNull('game_assignments.reminder_sent_at'); // Only send once

      console.log(`Found ${upcomingAssignments.length} games needing reminders`);

      for (const assignment of upcomingAssignments) {
        await this.sendGameReminder(assignment);
      }

    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }

  /**
   * Send reminder for a single game
   */
  private async sendGameReminder(assignment: any) {
    try {
      const gameTime = new Date(`${assignment.game_date}T${assignment.game_time}`);
      const now = new Date();
      const hoursUntil = Math.round((gameTime.getTime() - now.getTime()) / (1000 * 60 * 60));

      // Send SMS reminder
      if (assignment.phone) {
        await smsService.sendReminderSMS({
          phoneNumber: assignment.phone,
          firstName: assignment.name?.split(' ')[0] || 'Referee',
          game: {
            homeTeam: assignment.home_team_name,
            awayTeam: assignment.away_team_name,
            time: gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            location: assignment.location || 'TBD'
          },
          hoursUntilGame: hoursUntil
        });
      }

      // Mark reminder as sent
      await (db as any)('game_assignments')
        .where('id', assignment.assignment_id)
        .update({ reminder_sent_at: new Date() });

      console.log(`✅ Reminder sent for assignment ${assignment.assignment_id}`);

    } catch (error) {
      console.error(`Failed to send reminder for assignment ${assignment.assignment_id}:`, error);
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerReminderCheck(): Promise<void> {
    console.log('🔧 Manual reminder check triggered');
    await this.sendReminders();
  }
}

export default new ReminderScheduler();

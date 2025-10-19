require('dotenv').config();
import { createServer } from 'http';
import app from './app';
import db from './config/database';
// REMOVED: import { initializeRBACScanner  } from './startup/rbac-scanner-init'; // RBAC Registry deleted 2025-10-18
import reminderScheduler from './services/reminderScheduler';

const PORT = process.env.PORT || 3001;

// Create server with increased header size limit to prevent 431 errors
// Default is 16KB, we're increasing to 64KB for large JWT tokens
const server = createServer({
  maxHeaderSize: 64 * 1024 // 64KB
}, app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server listening on http://localhost:${PORT}`);

  // REMOVED: RBAC Scanner initialization (system deleted 2025-10-18)
  // The RBAC Registry system has been permanently removed as part of migration to Cerbos
  // All authorization is now handled via Cerbos YAML policies

  // Start reminder scheduler (game reminders via SMS)
  if (process.env.DISABLE_REMINDER_SCHEDULER !== 'true') {
    try {
      reminderScheduler.start();
    } catch (error) {
      console.error('⚠️  Reminder scheduler failed to start:', error);
      // Server continues normally - reminders are optional
    }
  } else {
    console.log('ℹ️  Reminder scheduler disabled by environment variable');
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('✓ HTTP server closed');

    try {
      // Stop reminder scheduler
      reminderScheduler.stop();
      console.log('✓ Reminder scheduler stopped');

      await db.destroy();
      console.log('✓ Database connections closed');
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
require('dotenv').config();
import app from './app';
import db from './config/database';
import { initializeRBACScanner  } from './startup/rbac-scanner-init';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server listening on http://localhost:${PORT}`);

  // Initialize RBAC scanner in background (non-blocking)
  // This prevents the 1.8 second event loop lag during startup
  // Set DISABLE_RBAC_SCANNER=true to completely disable
  if (process.env.DISABLE_RBAC_SCANNER !== 'true') {
    setImmediate(async () => {
      try {
        console.log('🔍 Starting RBAC scanner in background...');
        await initializeRBACScanner(db);
        console.log('✅ RBAC scanner initialization complete');
      } catch (error) {
        console.error('⚠️  RBAC Scanner failed (non-critical):', error.message);
        // Server continues normally - RBAC scanner is optional
      }
    });
  } else {
    console.log('ℹ️  RBAC scanner disabled by environment variable');
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
});
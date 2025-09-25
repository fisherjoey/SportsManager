require('dotenv').config();
const app = require('./app');
const db = require('./config/database');
const { initializeRBACScanner } = require('./startup/rbac-scanner-init');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server listening on http://localhost:${PORT}`);
  
  // Initialize RBAC scanner after server starts
  try {
    await initializeRBACScanner(db);
  } catch (error) {
    console.error('⚠️  RBAC Scanner initialization failed, but server will continue:', error.message);
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
});
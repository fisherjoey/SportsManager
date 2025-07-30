require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server listening on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});
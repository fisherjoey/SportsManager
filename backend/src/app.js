const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const refereeRoutes = require('./routes/referees');
const assignmentRoutes = require('./routes/assignments');
const invitationRoutes = require('./routes/invitations');
// const refereeLevelRoutes = require('./routes/referee-levels'); // DISABLED: uses referees table
const selfAssignmentRoutes = require('./routes/self-assignment');
const roleRoutes = require('./routes/roles');
const availabilityRoutes = require('./routes/availability');
const leagueRoutes = require('./routes/leagues');
const teamRoutes = require('./routes/teams');
const tournamentRoutes = require('./routes/tournaments');

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003'
  ],
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/referees', refereeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/invitations', invitationRoutes);
// app.use('/api/referee-levels', refereeLevelRoutes); // DISABLED: uses referees table
app.use('/api/self-assignment', selfAssignmentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

module.exports = app;
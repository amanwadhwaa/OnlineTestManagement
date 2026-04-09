const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const questionBankRoutes = require('./routes/questionBankRoutes');
const questionRoutes = require('./routes/questionRoutes');
const testRoutes = require('./routes/testRoutes');
const testAttemptRoutes = require('./routes/testAttemptRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { authenticateToken, authorizeRoles } = require('./middleware/authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);

  const warningTimer = setTimeout(() => {
    console.warn(`Request running > 5s: ${req.method} ${req.url}`);
  }, 5000);

  const hardTimeoutTimer = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`Request timeout: ${req.method} ${req.url}`);
      res.status(504).json({
        success: false,
        message: 'Request timed out',
      });
    }
  }, 15000);

  const clearTimers = () => {
    clearTimeout(warningTimer);
    clearTimeout(hardTimeoutTimer);
  };

  res.on('finish', clearTimers);
  res.on('close', clearTimers);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api', courseRoutes);
app.use('/api', questionBankRoutes);
app.use('/api', questionRoutes);
app.use('/api', testRoutes);
app.use('/api', testAttemptRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', reportRoutes);

app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API working',
  });
});

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Protected route working',
    user: req.user,
  });
});

app.get('/api/instructor-only', authenticateToken, authorizeRoles('instructor'), (req, res) => {
  res.json({ success: true, message: 'Instructor access granted' });
});

async function startServer() {
  try {
    if (typeof pool.initializeDatabase === 'function') {
      await pool.initializeDatabase();
    }

    const port = Number(process.env.PORT) || 5000;
    app.listen(port, () => {
      console.log('Protected route loaded');
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

module.exports = app;
module.exports.startServer = startServer;

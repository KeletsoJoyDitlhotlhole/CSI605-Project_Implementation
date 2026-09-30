const express = require('express');
const cors = require('cors');
const pool = require('./config/database');

const publicationRoutes = require('./routes/publication.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/publications', publicationRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      success: true,
      message: 'Backend and PostgreSQL are connected',
      databaseTime: result.rows[0].now
    });

  } catch (error) {
    console.error('--------------------------------');
    console.error('POSTGRESQL CONNECTION ERROR');
    console.error(error);
    console.error('--------------------------------');

    res.status(500).json({
      success: false,
      message: 'Database connection failed'
    });
  }
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend server running on http://127.0.0.1:${PORT}`);
});

server.on('error', (error) => {
  console.error('SERVER ERROR:');
  console.error(error);
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(error);
});

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED REJECTION:');
  console.error(error);
});
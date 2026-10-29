const app = require('../server/app');
const { connectDB } = require('../server/config/db');

// Initiate database connection during serverless container initialization
connectDB().catch(err => {
  console.warn('[Vercel Serverless] Cold start DB connection warning:', err.message);
});

module.exports = app;


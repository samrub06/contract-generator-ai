import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { generalAPILimiter } from './middleware/rateLimiter.js';


dotenv.config('./.env');

const app = express();
app.use(cors());
app.use(express.json());

// Apply general rate limiting to all API routes
app.use('/api', generalAPILimiter);

// Import routes
import contractRoutes from './routes/contract.js';

// Use routes
app.use('/api/contract', contractRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Contract Generator AI Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve static files from the frontend build only in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  // For any other route, serve index.html (for SPA)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Contract Generator AI Backend running on port ${PORT}`);
  console.log(`📝 Contract generation endpoint: http://localhost:${PORT}/api/contract`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});

export default app;
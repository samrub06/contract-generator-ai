import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generalAPILimiter } from './middleware/rateLimiter.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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
  const frontendPath = path.resolve(__dirname, '../frontend/dist');
  console.log('Serving static files from:', frontendPath);
  app.use(express.static(frontendPath));
  
  // For any non-API route, serve index.html (for SPA)
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Contract Generator AI Backend running on port ${PORT}`);
  console.log(`Contract generation endpoint: http://localhost:${PORT}/api/contract/tos/long-contract`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
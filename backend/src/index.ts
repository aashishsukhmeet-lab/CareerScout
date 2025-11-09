import express from 'express';
import cors from 'cors';
import profileRoutes from './routes/profile';
import rolesRoutes from './routes/roles';
import feedRoutes from './routes/feed';
import insightsRoutes from './routes/insights';
import searchRoutes from './routes/search';
import { validateConfig } from './utils/config';

const app = express();
const PORT = process.env.PORT || 3001;

// Validate RapidAPI configuration on startup
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/profile', profileRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/jobs/search', searchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;

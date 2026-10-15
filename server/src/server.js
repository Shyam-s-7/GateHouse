// Load local .env only during local development
// Render and other production hosts inject environment variables natively into process.env
if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { seedDatabaseIfEmpty } = require('./scripts/seed');
const errorHandler = require('./middleware/errorHandler');

// Route Handlers
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const gatewayRoutes = require('./routes/gatewayRoutes');
const mockUpstreamRoutes = require('./routes/mockUpstreamRoutes');

const app = express();
const PORT = process.env.PORT || 5050;
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Forwarded-For'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After', 'X-Gatehouse-Latency', 'X-Gatehouse-Upstream'],
}));

// Body parsing with support for JSON and urlencoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Gatehouse API Gateway Platform',
    version: '1.0.0',
    environment: isProduction ? 'production' : 'development',
    database: 'Connected',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Mount Platform API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/mock-upstream', mockUpstreamRoutes);

// Mount Gateway Core Proxy (The proxy routes /gateway/:serviceSlug/*)
app.use('/gateway', gatewayRoutes);

// Central Error Handler
app.use(errorHandler);

/**
 * Synchronous Server Startup
 * Strictly awaits MongoDB connection and seed verification before listening for traffic.
 */
let server;

const startServer = async () => {
  try {
    // 1. Strictly await database connection (exits process on fatal failure)
    await connectDB();

    // 2. Check and seed initial presentation data if database is empty
    await seedDatabaseIfEmpty();

    // 3. Spin up Express HTTP listener once persistence layer is confirmed
    server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Gatehouse API Gateway Engine running on port ${PORT}`);
      console.log(`   - Environment:        ${isProduction ? 'Production (Render)' : 'Local Development'}`);
      console.log(`   - Gateway Endpoint:   http://localhost:${PORT}/gateway/:serviceSlug`);
      console.log(`   - Management API:     http://localhost:${PORT}/api/`);
      console.log(`   - Mock Upstreams:     http://localhost:${PORT}/api/mock-upstream/`);
      console.log(`   - Health Check:       http://localhost:${PORT}/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('FATAL: Server startup aborted due to unexpected initialization error:', err.message);
    process.exit(1);
  }
};

// Start the synchronized engine
startServer();

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server gracefully...');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  }
});

module.exports = app;

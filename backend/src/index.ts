import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import deliveriesRouter from './routes/deliveries-routes.js';
import authRouter from './routes/auth-routes.js';
import configAuthRouter from './routes/config-auth-routes.js';
import walletRouter from './routes/wallet-routes.js';
import configurationRouter from './routes/configuration-routes.js';
import serverStatusRouter from './routes/server-status-routes.js';
import analyticsRouter from './routes/analytics-routes.js';
import { env } from './lib/env.js';
import { apiLimiter, authLimiter, configurationLimiter } from './middleware/rate-limit-middleware.js';
import { errorHandler } from './middleware/error-handler-middleware.js';
import { logger } from './lib/logger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*'
  })
);
// Increase JSON body size limit to accommodate larger payloads
// Note: File uploads are handled by multer, not express.json()
app.use(express.json({ limit: '50mb' }));
// Increase URL-encoded body size limit as well
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Apply rate limiters to routes
// Auth routes use authLimiter (more lenient, doesn't count successful logins)
app.use('/api', authLimiter, authRouter);
// Configuration auth routes (separate from driver auth)
app.use('/api', authLimiter, configAuthRouter);
// Configuration and server status routes use configurationLimiter (higher limit for polling)
app.use('/api', configurationLimiter, configurationRouter);
app.use('/api', configurationLimiter, serverStatusRouter);
// All other API routes use general apiLimiter (which skips the above routes)
app.use('/api', apiLimiter, deliveriesRouter);
app.use('/api', apiLimiter, walletRouter);
app.use('/api', apiLimiter, analyticsRouter);

// Swagger/OpenAPI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ChainCheck API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Serve OpenAPI JSON spec
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use(errorHandler);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime()
  });
});

const server = app.listen(env.port, () => {
  logger.info(`ChainCheck backend listening on port ${env.port}`, { mode: env.nodeEnv });
});

process.on('SIGTERM', () => {
  server.close(() => {
    logger.info('Gracefully shutting down');
  });
});

export { app };


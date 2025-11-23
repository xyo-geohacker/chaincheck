import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import deliveriesRouter from './routes/deliveries-routes.js';
import authRouter from './routes/auth-routes.js';
import configAuthRouter from './routes/config-auth-routes.js';
import walletRouter from './routes/wallet-routes.js';
import configurationRouter from './routes/configuration-routes.js';
import serverStatusRouter from './routes/server-status-routes.js';
import { env } from './lib/env.js';
import { apiLimiter, authLimiter, configurationLimiter } from './middleware/rate-limit-middleware.js';
import { errorHandler } from './middleware/error-handler-middleware.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*'
  })
);
app.use(express.json());
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
app.use(errorHandler);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime()
  });
});

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`ChainCheck backend listening on port ${env.port} in ${env.nodeEnv} mode`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('Gracefully shutting down');
  });
});

export { app };


import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 500 to accommodate configuration UI polling
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.',
  skip: (req) => {
    // Skip rate limiting for health checks and routes with their own limiters
    return (
      req.path === '/health' ||
      req.path.startsWith('/api/auth') ||
      req.path.startsWith('/api/configuration') ||
      req.path.startsWith('/api/server-status')
    );
  }
});

// More lenient rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 login attempts per 15 minutes per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true // Don't count successful logins against the limit
});

// More lenient rate limiter for configuration routes (read-only, frequent polling)
export const configurationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Higher limit for configuration viewing
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many configuration requests. Please try again later.'
});

export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many verification attempts. Please try again later.'
});

export const photoUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many photo uploads. Please try again later.'
});


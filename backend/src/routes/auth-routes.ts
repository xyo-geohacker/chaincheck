import { Router } from 'express';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { generateToken } from '../lib/jwt.js';
import { validateRequest } from '../middleware/validation-middleware.js';
import { loginSchema } from '../lib/validation-schemas.js';
import { logger } from '../lib/logger.js';

const router = Router();

// Helper function to hash password with SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Driver login
 *     description: Authenticate a driver and receive a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *               - password
 *             properties:
 *               driverId:
 *                 type: string
 *                 description: Driver identifier
 *                 example: "driver123"
 *               password:
 *                 type: string
 *                 description: Driver password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 driverId:
 *                   type: string
 *                   example: "driver123"
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 expiresIn:
 *                   type: string
 *                   example: "7d"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Login endpoint with validation
router.post('/auth/login', validateRequest(loginSchema), async (req, res) => {
  const { driverId, password } = req.body;

  logger.debug('Login attempt', { driverId });

  try {
    // Find driver by driverId
    const driver = await prisma.driver.findUnique({
      where: { driverId }
    });

    if (!driver) {
      logger.warn('Login failed: driver not found', { driverId });
      return res.status(401).json({ error: 'Invalid driver ID or password' });
    }

    // Hash the provided password and compare with stored hash
    const passwordHash = hashPassword(password);
    const passwordMatch = driver.passwordHash === passwordHash;

    if (!passwordMatch) {
      logger.warn('Login failed: password mismatch', { driverId });
      return res.status(401).json({ error: 'Invalid driver ID or password' });
    }

    logger.info('Login successful', { driverId });

    // Generate JWT token
    let token: string;
    try {
      token = generateToken(driver.driverId);
    } catch (error) {
      logger.error('Failed to generate JWT token', error, { driverId });
      return res.status(500).json({ error: 'Failed to generate authentication token' });
    }

    // Success - return driver info and JWT token
    return res.json({
      success: true,
      driverId: driver.driverId,
      token,
      expiresIn: '7d' // Token expires in 7 days
    });
  } catch (error) {
    logger.error('Login error', error, { driverId });
    return res.status(500).json({ error: 'Failed to authenticate' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Driver logout
 *     description: Logout endpoint (primarily for logging). JWT tokens are stateless, so logout is primarily a client-side operation.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully. Please clear your token on the client side."
 */
// Logout endpoint (client-side token clearing, but useful for logging)
router.post('/auth/logout', async (req, res) => {
  // JWT tokens are stateless, so logout is primarily a client-side operation
  // This endpoint can be used for logging or future token blacklisting if needed
  logger.debug('Logout requested');
  
  return res.json({
    success: true,
    message: 'Logged out successfully. Please clear your token on the client side.'
  });
});

export default router;


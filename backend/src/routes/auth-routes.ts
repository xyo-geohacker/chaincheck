import { Router } from 'express';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { generateToken } from '../lib/jwt.js';
import { validateRequest } from '../middleware/validation-middleware.js';
import { loginSchema } from '../lib/validation-schemas.js';

const router = Router();

// Helper function to hash password with SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Login endpoint with validation
router.post('/auth/login', validateRequest(loginSchema), async (req, res) => {
  const { driverId, password } = req.body;

  // eslint-disable-next-line no-console
  console.log('Login attempt:', { driverId, hasPassword: Boolean(password) });

  try {
    // Find driver by driverId
    const driver = await prisma.driver.findUnique({
      where: { driverId }
    });

    // eslint-disable-next-line no-console
    console.log('Driver lookup result:', { found: Boolean(driver), driverId });

    if (!driver) {
      // eslint-disable-next-line no-console
      console.log('Driver not found:', driverId);
      return res.status(401).json({ error: 'Invalid driver ID or password' });
    }

    // Hash the provided password and compare with stored hash
    const passwordHash = hashPassword(password);
    const passwordMatch = driver.passwordHash === passwordHash;
    
    // eslint-disable-next-line no-console
    console.log('Password check:', { 
      match: passwordMatch,
      providedHashLength: passwordHash.length,
      storedHashLength: driver.passwordHash.length
    });

    if (!passwordMatch) {
      // eslint-disable-next-line no-console
      console.log('Password mismatch for driver:', driverId);
      return res.status(401).json({ error: 'Invalid driver ID or password' });
    }

    // eslint-disable-next-line no-console
    console.log('Login successful for driver:', driverId);

    // Generate JWT token
    let token: string;
    try {
      token = generateToken(driver.driverId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate JWT token:', error);
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
    // eslint-disable-next-line no-console
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// Logout endpoint (client-side token clearing, but useful for logging)
router.post('/auth/logout', async (req, res) => {
  // JWT tokens are stateless, so logout is primarily a client-side operation
  // This endpoint can be used for logging or future token blacklisting if needed
  // eslint-disable-next-line no-console
  console.log('Logout requested');
  
  return res.json({
    success: true,
    message: 'Logged out successfully. Please clear your token on the client side.'
  });
});

export default router;


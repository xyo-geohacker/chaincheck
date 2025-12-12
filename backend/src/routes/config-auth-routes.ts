/**
 * Configuration Authentication Routes
 * Separate authentication for configuration UI access
 */

import { Router } from 'express';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { generateConfigToken } from '../lib/jwt.js';
import { validateRequest } from '../middleware/validation-middleware.js';
import { z } from 'zod';

const router = Router();

// Configuration login schema
const configLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// Helper function to hash password with SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Configuration login endpoint
router.post('/auth/config/login', validateRequest(configLoginSchema), async (req, res) => {
  const { username, password } = req.body;

   
  console.log('Configuration login attempt:', { username, hasPassword: Boolean(password) });

  try {
    // Find configuration user by username
    const configUser = await prisma.configurationUser.findUnique({
      where: { username }
    });

     
    console.log('Configuration user lookup result:', { found: Boolean(configUser), username });

    if (!configUser) {
       
      console.log('Configuration user not found:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Hash the provided password and compare with stored hash
    const passwordHash = hashPassword(password);
    const passwordMatch = configUser.passwordHash === passwordHash;
    
     
    console.log('Password check:', { 
      match: passwordMatch,
      providedHashLength: passwordHash.length,
      storedHashLength: configUser.passwordHash.length
    });

    if (!passwordMatch) {
       
      console.log('Password mismatch for configuration user:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

     
    console.log('Configuration login successful for user:', username);

    // Generate JWT token for configuration access
    let token: string;
    try {
      token = generateConfigToken(configUser.username);
    } catch (error) {
       
      console.error('Failed to generate JWT token:', error);
      return res.status(500).json({ error: 'Failed to generate authentication token' });
    }

    // Success - return user info and JWT token
    return res.json({
      success: true,
      username: configUser.username,
      token,
      expiresIn: '7d' // Token expires in 7 days
    });
  } catch (error) {
     
    console.error('Configuration login error:', error);
    return res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// Configuration logout endpoint
router.post('/auth/config/logout', async (req, res) => {
  // JWT tokens are stateless, so logout is primarily a client-side operation
   
  console.log('Configuration logout requested');
  
  return res.json({
    success: true,
    message: 'Logged out successfully. Please clear your token on the client side.'
  });
});

export default router;


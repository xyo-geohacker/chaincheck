import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import { app } from '../index.js';
import { prisma } from '../lib/prisma.js';
import { generateToken } from '../lib/jwt.js';

describe('Authentication API', () => {
  let testDriverId: string;
  let testPassword: string;
  let testPasswordHash: string;

  beforeAll(async () => {
    // Clean up any existing test drivers
    await prisma.driver.deleteMany({
      where: {
        driverId: {
          startsWith: 'test-driver-'
        }
      }
    });

    // Create a test driver
    testDriverId = 'test-driver-auth';
    testPassword = 'TestPassword123';
    testPasswordHash = crypto.createHash('sha256').update(testPassword).digest('hex');

    await prisma.driver.create({
      data: {
        driverId: testDriverId,
        passwordHash: testPasswordHash,
        name: 'Test Driver'
      }
    });
  });

  afterAll(async () => {
    await prisma.driver.deleteMany({
      where: {
        driverId: testDriverId
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          driverId: testDriverId,
          password: testPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.driverId).toBe(testDriverId);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
      expect(response.body.expiresIn).toBe('7d');
    });

    it('should reject login with invalid driver ID', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          driverId: 'non-existent-driver',
          password: testPassword
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid driver ID or password');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          driverId: testDriverId,
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid driver ID or password');
    });

    it('should reject login with missing driver ID', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: testPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          driverId: testDriverId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject login with empty driver ID', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          driverId: '',
          password: testPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject login with empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          driverId: testDriverId,
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should trim whitespace from driver ID', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          driverId: `  ${testDriverId}  `,
          password: testPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('JWT Token Validation', () => {
    it('should generate a valid JWT token', async () => {
      const token = generateToken(testDriverId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate different tokens for different drivers', () => {
      const token1 = generateToken('driver-1');
      const token2 = generateToken('driver-2');
      expect(token1).not.toBe(token2);
    });
  });
});


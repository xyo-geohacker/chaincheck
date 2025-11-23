import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import { app } from '../index.js';
import { prisma } from '../lib/prisma.js';
import { generateToken } from '../lib/jwt.js';

// Mock XL1 service to use mock mode
vi.mock('../services/xyo-service', () => {
  class MockXyoService {
    async createLocationProofXL1() {
      return {
        proofHash: 'mock-xl1-hash-1234567890abcdef',
        xl1TransactionHash: 'mock-xl1-hash-1234567890abcdef',
        xl1BlockNumber: 12345,
        blockNumber: 12345,
        boundWitness: [
          {
            schema: 'network.xyo.boundwitness',
            _hash: 'mock-xl1-hash-1234567890abcdef'
          },
          []
        ],
        isXL1: true,
        archivistResponse: {
          success: true,
          data: {
            schema: 'network.xyo.boundwitness',
            _hash: 'mock-xl1-hash-1234567890abcdef'
          }
        }
      };
    }

    async verifyLocationProof() {
      return { isValid: true, data: { proofHash: 'mock-proof-hash' } };
    }

    async validateBoundWitness() {
      return {
        isValid: true,
        errors: []
      };
    }
  }

  return { XyoService: MockXyoService };
});

describe('Deliveries API', () => {
  let deliveryId: string;
  let driverId: string;
  let authToken: string;
  let testPasswordHash: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.delivery.deleteMany({
      where: {
        orderId: {
          startsWith: 'TEST-ORDER-'
        }
      }
    });

    await prisma.driver.deleteMany({
      where: {
        driverId: {
          startsWith: 'test-driver-'
        }
      }
    });

    // Create test driver
    driverId = 'test-driver-deliveries';
    const testPassword = 'TestPassword123';
    testPasswordHash = crypto.createHash('sha256').update(testPassword).digest('hex');

    await prisma.driver.create({
      data: {
        driverId,
        passwordHash: testPasswordHash,
        name: 'Test Driver'
      }
    });

    // Generate auth token
    authToken = generateToken(driverId);

    // Create test delivery
    const delivery = await prisma.delivery.create({
      data: {
        orderId: 'TEST-ORDER-123',
        driverId,
        recipientName: 'Test Recipient',
        recipientPhone: '555-0100',
        deliveryAddress: '123 Test Street',
        destinationLat: 37.7749,
        destinationLon: -122.4194,
        status: 'IN_TRANSIT'
      }
    });

    deliveryId = delivery.id;
  });

  afterAll(async () => {
    await prisma.delivery.deleteMany();
    await prisma.driver.deleteMany({
      where: {
        driverId
      }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/deliveries', () => {
    it('should list deliveries without authentication', async () => {
      const response = await request(app)
        .get('/api/deliveries');

      expect(response.status).toBe(200);
      expect(response.body.deliveries).toBeDefined();
      expect(Array.isArray(response.body.deliveries)).toBe(true);
    });

    it('should filter deliveries by driverId when authenticated', async () => {
      const response = await request(app)
        .get('/api/deliveries')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.deliveries).toBeDefined();
      expect(Array.isArray(response.body.deliveries)).toBe(true);
      // All deliveries should belong to the authenticated driver
      response.body.deliveries.forEach((delivery: { driverId: string }) => {
        expect(delivery.driverId).toBe(driverId);
      });
    });

    it('should filter deliveries by query parameter', async () => {
      const response = await request(app)
        .get(`/api/deliveries?driverId=${driverId}`);

      expect(response.status).toBe(200);
      expect(response.body.deliveries).toBeDefined();
      expect(Array.isArray(response.body.deliveries)).toBe(true);
    });
  });

  describe('POST /api/deliveries/:id/verify', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/verify`)
        .send({
          latitude: 37.77495,
          longitude: -122.41945,
          timestamp: Date.now()
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should verify delivery with valid data', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 37.77495,
          longitude: -122.41945,
          timestamp,
          notes: 'Test delivery notes'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.proof).toBeDefined();
      expect(response.body.proof.hash).toBeDefined();
      expect(response.body.delivery).toBeDefined();
      expect(response.body.delivery.status).toBe('DELIVERED');
      expect(response.body.delivery.proofHash).toBeDefined();
      expect(response.body.delivery.notes).toBe('Test delivery notes');
    });

    it('should reject invalid latitude', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 100, // Invalid: > 90
          longitude: -122.41945,
          timestamp: Date.now()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid longitude', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 37.77495,
          longitude: 200, // Invalid: > 180
          timestamp: Date.now()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 37.77495
          // Missing longitude and timestamp
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid delivery ID format', async () => {
      const response = await request(app)
        .post('/api/deliveries/invalid-id/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 37.77495,
          longitude: -122.41945,
          timestamp: Date.now()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject non-existent delivery', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/deliveries/${fakeId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 37.77495,
          longitude: -122.41945,
          timestamp: Date.now()
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Delivery not found');
    });
  });

  describe('POST /api/deliveries/:id/photo', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .attach('photo', Buffer.from('fake-image-bytes'), {
          filename: 'delivery.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(401);
    });

    it('should upload photo with authentication', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-image-bytes'), {
          filename: 'delivery.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ipfsHash).toBeDefined();
      expect(typeof response.body.ipfsHash).toBe('string');
    });

    it('should reject request without photo file', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('photo file is required');
    });
  });

  describe('POST /api/deliveries/:id/signature', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .send({
          signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        });

      expect(response.status).toBe(401);
    });

    it('should upload signature with base64 data', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ipfsHash).toBeDefined();
    });

    it('should reject invalid base64 signature', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureBase64: 'not-valid-base64'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/deliveries/by-proof/:proofHash', () => {
    it('should retrieve delivery by proof hash', async () => {
      // First verify a delivery to get a proof hash
      const verifyResponse = await request(app)
        .post(`/api/deliveries/${deliveryId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 37.77495,
          longitude: -122.41945,
          timestamp: Date.now()
        });

      const proofHash = verifyResponse.body.proof.hash;

      const response = await request(app)
        .get(`/api/deliveries/by-proof/${proofHash}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(deliveryId);
      expect(response.body.proofHash).toBe(proofHash);
    });

    it('should reject invalid proof hash format', async () => {
      const response = await request(app)
        .get('/api/deliveries/by-proof/invalid-hash-format');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 404 for non-existent proof hash', async () => {
      const fakeHash = 'a'.repeat(64); // Valid hex format but non-existent
      const response = await request(app)
        .get(`/api/deliveries/by-proof/${fakeHash}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Delivery not found');
    });
  });

  describe('GET /api/proofs/:proofHash/validate', () => {
    it('should validate proof hash', async () => {
      // First verify a delivery to get a proof hash
      const verifyResponse = await request(app)
        .post(`/api/deliveries/${deliveryId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 37.77495,
          longitude: -122.41945,
          timestamp: Date.now()
        });

      const proofHash = verifyResponse.body.proof.hash;

      const response = await request(app)
        .get(`/api/proofs/${proofHash}/validate`);

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBeDefined();
    });
  });
});

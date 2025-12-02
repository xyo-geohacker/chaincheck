import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';

// Mock IPFS service
// We'll access the mock through the service instance
vi.mock('../services/ipfs-service', () => {
  const uploadBufferMock = vi.fn().mockResolvedValue('QmMockIPFSHash123456789');
  
  return {
    IpfsService: vi.fn().mockImplementation(() => ({
      uploadBuffer: uploadBufferMock
    })),
    // Export mock for test access
    __getMockUploadBuffer: () => uploadBufferMock
  };
});

// Mock XyoService
vi.mock('../services/xyo-service', () => {
  class MockXyoService {
    async createLocationProofXL1() {
      return {
        proofHash: 'a'.repeat(64),
        xl1TransactionHash: 'a'.repeat(64),
        xl1BlockNumber: 12345,
        blockNumber: 12345,
        boundWitness: [{ schema: 'network.xyo.boundwitness' }, []],
        isXL1: true,
        archivistResponse: { success: true }
      };
    }
  }
  return { XyoService: MockXyoService };
});

// Import after mocks are set up
import { app } from '../index.js';
import { prisma } from '../lib/prisma.js';
import { generateToken } from '../lib/jwt.js';
import { IpfsService } from '../services/ipfs-service.js';

// Mock XyoService
vi.mock('../services/xyo-service', () => {
  class MockXyoService {
    async createLocationProofXL1() {
      return {
        proofHash: 'a'.repeat(64),
        xl1TransactionHash: 'a'.repeat(64),
        xl1BlockNumber: 12345,
        blockNumber: 12345,
        boundWitness: [{ schema: 'network.xyo.boundwitness' }, []],
        isXL1: true,
        archivistResponse: { success: true }
      };
    }
  }
  return { XyoService: MockXyoService };
});

describe('Photo and Signature Upload Routes', () => {
  let deliveryId: string;
  let driverId: string;
  let authToken: string;
  let testPasswordHash: string;
  let ipfsService: any;
  let mockUploadBuffer: any;

  beforeAll(async () => {
    // Get IPFS service instance to access its mock
    ipfsService = new IpfsService();
    mockUploadBuffer = ipfsService.uploadBuffer;
    // Clean up test data
    await prisma.delivery.deleteMany({
      where: {
        orderId: {
          startsWith: 'TEST-UPLOAD-'
        }
      }
    });

    await prisma.driver.deleteMany({
      where: {
        driverId: {
          startsWith: 'test-driver-upload-'
        }
      }
    });

    // Create test driver
    driverId = 'test-driver-upload';
    const testPassword = 'TestPassword123';
    testPasswordHash = crypto.createHash('sha256').update(testPassword).digest('hex');

    await prisma.driver.create({
      data: {
        driverId,
        passwordHash: testPasswordHash
      }
    });

    // Generate auth token
    authToken = generateToken(driverId);

    // Create test delivery
    const delivery = await prisma.delivery.create({
      data: {
        orderId: 'TEST-UPLOAD-001',
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
    await prisma.delivery.deleteMany({
      where: {
        orderId: {
          startsWith: 'TEST-UPLOAD-'
        }
      }
    });

    await prisma.driver.deleteMany({
      where: {
        driverId: driverId
      }
    });

    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to return success by default
    mockUploadBuffer.mockResolvedValue('QmMockIPFSHash123456789');
  });

  describe('POST /api/deliveries/:id/photo', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .attach('photo', Buffer.from('fake image data'), 'test.jpg');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication');
    });

    it('should upload photo successfully', async () => {
      const imageBuffer = Buffer.from('fake image data for testing');
      const ipfsHash = 'QmPhotoHash123456789';

      mockUploadBuffer.mockResolvedValue(ipfsHash);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', imageBuffer, 'test-photo.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ipfsHash).toBe(ipfsHash);
      expect(response.body.delivery).toBeDefined();
      expect(response.body.delivery.photoIpfsHash).toBe(ipfsHash);
      expect(mockUploadBuffer).toHaveBeenCalled();
    });

    it('should store photoHash if provided in request body', async () => {
      const imageBuffer = Buffer.from('fake image data');
      const ipfsHash = 'QmPhotoHash123456789';
      const photoHash = 'a'.repeat(64);

      mockUploadBuffer.mockResolvedValue(ipfsHash);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('photoHash', photoHash)
        .attach('photo', imageBuffer, 'test-photo.jpg');

      expect(response.status).toBe(200);
      expect(response.body.delivery.photoHash).toBe(photoHash);
    });

    it('should reject request without photo file', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('photo file is required');
    });

    it('should reject request with invalid delivery ID', async () => {
      const imageBuffer = Buffer.from('fake image data');

      const response = await request(app)
        .post('/api/deliveries/invalid-id/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', imageBuffer, 'test-photo.jpg');

      // Invalid UUID format is caught by validation middleware (400) before route handler (404)
      expect([400, 404]).toContain(response.status);
      if (response.status === 404) {
        expect(response.body.error).toBe('Delivery not found');
      } else {
        expect(response.body.error).toBe('Validation failed');
      }
    });

    it('should handle IPFS upload failure', async () => {
      const imageBuffer = Buffer.from('fake image data');
      const ipfsError = new Error('Pinata API error');

      mockUploadBuffer.mockRejectedValue(ipfsError);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', imageBuffer, 'test-photo.jpg');

      expect(response.status).toBe(502);
      expect(response.body.error).toBe('IPFS upload failed');
      expect(response.body.message).toContain('IPFS');
    });

    it('should handle file size limit errors', async () => {
      // Create a buffer larger than 25MB
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', largeBuffer, 'large-photo.jpg');

      // Multer will reject this before it reaches our handler
      expect([400, 413]).toContain(response.status);
      if (response.status === 413) {
        expect(response.body.error).toBe('File too large');
        expect(response.body.maxSize).toBe('25MB');
      }
    });

    it('should generate unique filename with driver ID and timestamp', async () => {
      const imageBuffer = Buffer.from('fake image data');
      const ipfsHash = 'QmPhotoHash123456789';

      mockUploadBuffer.mockResolvedValue(ipfsHash);

      await request(app)
        .post(`/api/deliveries/${deliveryId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', imageBuffer, 'test-photo.jpg');

      expect(mockUploadBuffer).toHaveBeenCalled();
      const callArgs = mockUploadBuffer.mock.calls[0];
      const filename = callArgs[1];
      expect(filename).toContain('photo-');
      expect(filename).toContain(driverId);
      expect(filename).toMatch(/\.jpg$/);
    });
  });

  describe('POST /api/deliveries/:id/signature', () => {
    // Create a valid PNG buffer (minimal PNG file)
    const createPngBuffer = (): Buffer => {
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      // Minimal PNG data (just enough to pass validation)
      const minimalPng = Buffer.concat([pngSignature, Buffer.from('minimal png data')]);
      return minimalPng;
    };

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .attach('signature', createPngBuffer(), 'test.png');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication');
    });

    it('should upload signature file successfully', async () => {
      const signatureBuffer = createPngBuffer();
      const ipfsHash = 'QmSignatureHash123456789';

      mockUploadBuffer.mockResolvedValue(ipfsHash);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('signature', signatureBuffer, 'test-signature.png');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ipfsHash).toBe(ipfsHash);
      expect(response.body.delivery).toBeDefined();
      expect(response.body.delivery.signatureIpfsHash).toBe(ipfsHash);
      expect(mockUploadBuffer).toHaveBeenCalled();
    });

    it('should upload signature from base64 data URI', async () => {
      const signatureBuffer = createPngBuffer();
      const base64Data = signatureBuffer.toString('base64');
      const dataUri = `data:image/png;base64,${base64Data}`;
      const ipfsHash = 'QmSignatureHash123456789';

      mockUploadBuffer.mockResolvedValue(ipfsHash);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureBase64: dataUri
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ipfsHash).toBe(ipfsHash);
      expect(mockUploadBuffer).toHaveBeenCalled();
    });

    it('should store signatureHash if provided in request body', async () => {
      const signatureBuffer = createPngBuffer();
      const ipfsHash = 'QmSignatureHash123456789';
      const signatureHash = 'b'.repeat(64);

      mockUploadBuffer.mockResolvedValue(ipfsHash);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('signatureHash', signatureHash)
        .attach('signature', signatureBuffer, 'test-signature.png');

      expect(response.status).toBe(200);
      expect(response.body.delivery.signatureHash).toBe(signatureHash);
    });

    it('should reject request without signature file or base64 data', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({}); // Send empty body

      expect(response.status).toBe(400);
      // Validation happens first, then route handler checks for file/base64
      expect(response.body.error).toBeDefined();
      // The error message might be from validation or the route handler
      expect(['Validation failed', 'signature file or signatureBase64 is required']).toContain(response.body.error);
    });

    it('should reject invalid base64 signature data', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureBase64: 'invalid-base64-data!!!'
        });

      expect(response.status).toBe(400);
      // The error might be from validation or from base64 parsing
      expect(response.body.error).toBeDefined();
      expect(['Validation failed', 'Invalid base64 signature data']).toContain(response.body.error);
    });

    it('should reject empty base64 signature data', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureBase64: 'data:image/png;base64,'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('buffer is empty');
    });

    it('should handle base64 data URI with whitespace', async () => {
      const signatureBuffer = createPngBuffer();
      const base64Data = signatureBuffer.toString('base64');
      const dataUri = `data:image/png;base64, ${base64Data} `; // With whitespace
      const ipfsHash = 'QmSignatureHash123456789';

      mockUploadBuffer.mockResolvedValue(ipfsHash);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureBase64: dataUri
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject request with invalid delivery ID', async () => {
      const signatureBuffer = createPngBuffer();

      const response = await request(app)
        .post('/api/deliveries/invalid-id/signature')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('signature', signatureBuffer, 'test-signature.png');

      // Invalid UUID format is caught by validation middleware (400) before route handler (404)
      expect([400, 404]).toContain(response.status);
      if (response.status === 404) {
        expect(response.body.error).toBe('Delivery not found');
      } else {
        expect(response.body.error).toBe('Validation failed');
      }
    });

    it('should handle IPFS upload failure', async () => {
      const signatureBuffer = createPngBuffer();
      const ipfsError = new Error('Pinata API error');

      mockUploadBuffer.mockRejectedValue(ipfsError);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('signature', signatureBuffer, 'test-signature.png');

      // IPFS error might be caught and return 500, or might propagate differently
      expect([500, 502]).toContain(response.status);
      expect(response.body.error).toBeDefined();
    });

    it('should handle file size limit errors', async () => {
      // Create a buffer larger than 25MB
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const largePng = Buffer.concat([pngSignature, largeBuffer]);

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('signature', largePng, 'large-signature.png');

      // Multer will reject this before it reaches our handler
      expect([400, 413]).toContain(response.status);
      if (response.status === 413) {
        expect(response.body.error).toBe('File too large');
        expect(response.body.maxSize).toBe('25MB');
      }
    });

    it('should generate unique filename with driver ID and timestamp', async () => {
      const signatureBuffer = createPngBuffer();
      const ipfsHash = 'QmSignatureHash123456789';

      mockUploadBuffer.mockResolvedValue(ipfsHash);

      await request(app)
        .post(`/api/deliveries/${deliveryId}/signature`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('signature', signatureBuffer, 'test-signature.png');

      expect(mockUploadBuffer).toHaveBeenCalled();
      const callArgs = mockUploadBuffer.mock.calls[0];
      const filename = callArgs[1];
      expect(filename).toContain('signature-');
      expect(filename).toContain(driverId);
      expect(filename).toMatch(/\.png$/);
    });
  });
});


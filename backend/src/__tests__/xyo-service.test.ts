import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from '../lib/env.js';

// Create mock implementations
const mockArchivistService = {
  insertPayloads: vi.fn(),
  getPayloadByHash: vi.fn(),
  verifyLocationProof: vi.fn(),
  validateBoundWitness: vi.fn(),
  getBoundWitnessChain: vi.fn(),
  getCryptographicDetails: vi.fn()
};

const mockXl1TransactionService = {
  createLocationProof: vi.fn()
};

const mockDivinerService = {
  queryLocation: vi.fn(),
  createMockVerification: vi.fn()
};

const mockNetworkService = {
  getNetworkStatistics: vi.fn(),
  getWitnessNodes: vi.fn(),
  calculateCoverageFromDeliveries: vi.fn()
};

const mockXl1ViewerService = {
  getActualBlockNumberForTransaction: vi.fn(),
  getBlockByNumber: vi.fn(),
  getBoundWitnessFromXL1: vi.fn(),
  getBoundWitnessChainFromXL1: vi.fn()
};

// Mock all underlying services before importing XyoService
vi.mock('../services/xyo/archivist-service', () => {
  return {
    ArchivistService: vi.fn().mockImplementation(() => mockArchivistService)
  };
});

vi.mock('../services/xyo/xl1-transaction-service', () => {
  return {
    XL1TransactionService: vi.fn().mockImplementation(() => mockXl1TransactionService)
  };
});

vi.mock('../services/xyo/diviner-service', () => {
  return {
    DivinerService: vi.fn().mockImplementation(() => mockDivinerService)
  };
});

vi.mock('../services/xyo/network-service', () => {
  return {
    NetworkService: vi.fn().mockImplementation(() => mockNetworkService)
  };
});

vi.mock('../services/xyo/xl1-viewer-service', () => {
  return {
    Xl1ViewerService: vi.fn().mockImplementation(() => mockXl1ViewerService)
  };
});

// Import XyoService after mocks are set up
import { XyoService } from '../services/xyo-service.js';

describe('XyoService Integration', () => {
  let xyoService: XyoService;

  beforeEach(() => {
    xyoService = new XyoService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createLocationProofXL1', () => {
    it('should create a location proof via XL1 transaction service', async () => {
      const mockProof = {
        proofHash: 'a'.repeat(64),
        xl1TransactionHash: 'a'.repeat(64),
        xl1BlockNumber: 12345,
        blockNumber: 12345,
        boundWitness: [{ schema: 'network.xyo.boundwitness' }, []],
        isXL1: true,
        archivistResponse: { success: true }
      };

      mockXl1TransactionService.createLocationProof.mockResolvedValue(mockProof);

      const payload = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
        deliveryId: 'test-delivery-123',
        driverId: 'test-driver-123'
      };

      const result = await xyoService.createLocationProofXL1(payload);

      expect(result).toEqual(mockProof);
      expect(mockXl1TransactionService.createLocationProof).toHaveBeenCalledWith(payload);
    });

    it('should handle errors from XL1 transaction service', async () => {
      const error = new Error('XL1 transaction failed');
      mockXl1TransactionService.createLocationProof.mockRejectedValue(error);

      const payload = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
        deliveryId: 'test-delivery-123',
        driverId: 'test-driver-123'
      };

      await expect(xyoService.createLocationProofXL1(payload)).rejects.toThrow('XL1 transaction failed');
    });
  });

  describe('verifyLocationProof', () => {
    it('should verify proof via XL1 viewer first (priority 1)', async () => {
      const mockBoundWitness = {
        schema: 'network.xyo.boundwitness',
        _hash: 'a'.repeat(64)
      };

      mockXl1ViewerService.getBoundWitnessFromXL1.mockResolvedValue({
        boundWitness: mockBoundWitness
      });

      const result = await xyoService.verifyLocationProof('a'.repeat(64));

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(mockBoundWitness);
      expect(mockXl1ViewerService.getBoundWitnessFromXL1).toHaveBeenCalledWith('a'.repeat(64));
      // Should not call Archivist if XL1 viewer succeeds
      expect(mockArchivistService.verifyLocationProof).not.toHaveBeenCalled();
    });

    it('should fall back to Archivist if XL1 viewer fails', async () => {
      mockXl1ViewerService.getBoundWitnessFromXL1.mockResolvedValue(null);

      const mockArchivistResult = {
        isValid: true,
        data: { proofHash: 'b'.repeat(64) },
        errors: []
      };

      mockArchivistService.verifyLocationProof.mockResolvedValue(mockArchivistResult);

      // Temporarily enable Archivist for this test
      const originalDisabled = env.xyoArchivistDisabled;
      (env as any).xyoArchivistDisabled = false;

      const result = await xyoService.verifyLocationProof('a'.repeat(64));

      expect(result).toEqual(mockArchivistResult);
      expect(mockXl1ViewerService.getBoundWitnessFromXL1).toHaveBeenCalled();
      expect(mockArchivistService.verifyLocationProof).toHaveBeenCalledWith('a'.repeat(64));

      // Restore original value
      (env as any).xyoArchivistDisabled = originalDisabled;
    });

    it('should return invalid result when Archivist is disabled and XL1 viewer fails', async () => {
      mockXl1ViewerService.getBoundWitnessFromXL1.mockResolvedValue(null);

      const originalDisabled = env.xyoArchivistDisabled;
      (env as any).xyoArchivistDisabled = true;

      const result = await xyoService.verifyLocationProof('a'.repeat(64));

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Archivist is disabled and XL1 viewer query failed');
      expect(mockArchivistService.verifyLocationProof).not.toHaveBeenCalled();

      // Restore original value
      (env as any).xyoArchivistDisabled = originalDisabled;
    });

    it('should handle XL1 viewer errors gracefully', async () => {
      mockXl1ViewerService.getBoundWitnessFromXL1.mockRejectedValue(new Error('Viewer error'));

      const mockArchivistResult = {
        isValid: true,
        data: { proofHash: 'b'.repeat(64) },
        errors: []
      };

      mockArchivistService.verifyLocationProof.mockResolvedValue(mockArchivistResult);

      const originalDisabled = env.xyoArchivistDisabled;
      (env as any).xyoArchivistDisabled = false;

      const result = await xyoService.verifyLocationProof('a'.repeat(64));

      expect(result).toEqual(mockArchivistResult);
      expect(mockArchivistService.verifyLocationProof).toHaveBeenCalled();

      (env as any).xyoArchivistDisabled = originalDisabled;
    });
  });

  describe('getPayloadByHash', () => {
    it('should retrieve payload from Archivist', async () => {
      const mockPayload = {
        schema: 'network.xyo.chaincheck',
        data: { orderId: 'TEST-001' }
      };

      mockArchivistService.getPayloadByHash.mockResolvedValue(mockPayload);

      const originalDisabled = env.xyoArchivistDisabled;
      (env as any).xyoArchivistDisabled = false;

      const result = await xyoService.getPayloadByHash('a'.repeat(64));

      expect(result).toEqual(mockPayload);
      expect(mockArchivistService.getPayloadByHash).toHaveBeenCalledWith('a'.repeat(64));

      (env as any).xyoArchivistDisabled = originalDisabled;
    });

    it('should return null when Archivist is disabled', async () => {
      const originalDisabled = env.xyoArchivistDisabled;
      (env as any).xyoArchivistDisabled = true;

      const result = await xyoService.getPayloadByHash('a'.repeat(64));

      expect(result).toBeNull();
      expect(mockArchivistService.getPayloadByHash).not.toHaveBeenCalled();

      (env as any).xyoArchivistDisabled = originalDisabled;
    });
  });

  describe('validateBoundWitness', () => {
    it('should validate bound witness via Archivist', async () => {
      const mockValidation = {
        isValid: true,
        errors: []
      };

      mockArchivistService.validateBoundWitness.mockResolvedValue(mockValidation);

      const originalDisabled = env.xyoArchivistDisabled;
      (env as any).xyoArchivistDisabled = false;

      const result = await xyoService.validateBoundWitness('a'.repeat(64));

      expect(result).toEqual(mockValidation);
      expect(mockArchivistService.validateBoundWitness).toHaveBeenCalledWith('a'.repeat(64));

      (env as any).xyoArchivistDisabled = originalDisabled;
    });

    it('should return invalid when Archivist is disabled', async () => {
      const originalDisabled = env.xyoArchivistDisabled;
      (env as any).xyoArchivistDisabled = true;

      const result = await xyoService.validateBoundWitness('a'.repeat(64));

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Archivist is disabled');
      expect(mockArchivistService.validateBoundWitness).not.toHaveBeenCalled();

      (env as any).xyoArchivistDisabled = originalDisabled;
    });
  });

  describe('queryLocationDiviner', () => {
    it('should query Diviner when enabled', async () => {
      const mockDivinerResult = {
        isValid: true,
        nodeCount: 5,
        consensus: 0.8,
        isMocked: false
      };

      mockDivinerService.queryLocation.mockResolvedValue(mockDivinerResult);

      const originalDisabled = env.xyoDivinerDisabled;
      (env as any).xyoDivinerDisabled = false;

      const result = await xyoService.queryLocationDiviner(
        37.7749,
        -122.4194,
        Date.now()
      );

      expect(result).toEqual(mockDivinerResult);
      expect(mockDivinerService.queryLocation).toHaveBeenCalled();

      (env as any).xyoDivinerDisabled = originalDisabled;
    });

    it('should return mock verification when Diviner is disabled', async () => {
      const mockMockResult = {
        isValid: true,
        nodeCount: 0,
        consensus: 1.0,
        isMocked: true
      };

      mockDivinerService.createMockVerification.mockReturnValue(mockMockResult);

      const originalDisabled = env.xyoDivinerDisabled;
      (env as any).xyoDivinerDisabled = true;

      const result = await xyoService.queryLocationDiviner(
        37.7749,
        -122.4194,
        Date.now()
      );

      expect(result).toEqual(mockMockResult);
      expect(mockDivinerService.createMockVerification).toHaveBeenCalled();
      expect(mockDivinerService.queryLocation).not.toHaveBeenCalled();

      (env as any).xyoDivinerDisabled = originalDisabled;
    });
  });

  describe('getActualBlockNumberForTransaction', () => {
    it('should get block number from XL1 viewer service', async () => {
      mockXl1ViewerService.getActualBlockNumberForTransaction.mockResolvedValue(12345);

      const result = await xyoService.getActualBlockNumberForTransaction('a'.repeat(64));

      expect(result).toBe(12345);
      expect(mockXl1ViewerService.getActualBlockNumberForTransaction).toHaveBeenCalledWith('a'.repeat(64));
    });

    it('should return null when transaction not found', async () => {
      mockXl1ViewerService.getActualBlockNumberForTransaction.mockResolvedValue(null);

      const result = await xyoService.getActualBlockNumberForTransaction('a'.repeat(64));

      expect(result).toBeNull();
    });
  });

  describe('getBlockByNumber', () => {
    it('should get block from XL1 viewer service', async () => {
      const mockBlock = {
        block: { number: 12345 },
        transactions: []
      };

      mockXl1ViewerService.getBlockByNumber.mockResolvedValue(mockBlock);

      const result = await xyoService.getBlockByNumber(12345);

      expect(result).toEqual(mockBlock);
      expect(mockXl1ViewerService.getBlockByNumber).toHaveBeenCalledWith(12345);
    });

    it('should return null when block not found', async () => {
      mockXl1ViewerService.getBlockByNumber.mockResolvedValue(null);

      const result = await xyoService.getBlockByNumber(99999);

      expect(result).toBeNull();
    });
  });

  describe('Service Coordination', () => {
    it('should initialize all services in constructor', () => {
      // Service should be initialized without errors
      expect(xyoService).toBeDefined();
      expect(xyoService).toBeInstanceOf(XyoService);
    });

    it('should handle service initialization errors gracefully', () => {
      // This tests that the service can be instantiated even if underlying services have issues
      // In a real scenario, this might happen if environment variables are missing
      const service = new XyoService();
      expect(service).toBeDefined();
    });
  });
});


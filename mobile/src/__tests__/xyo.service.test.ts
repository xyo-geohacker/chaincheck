import { XYOMobileService } from '../services/xyo.service';
import { apiClient } from '../services/api.service';

// Mock api.service
jest.mock('../services/api.service', () => ({
  apiClient: {
    post: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:4000'
    }
  }
}));

describe('XYOMobileService', () => {
  let service: XYOMobileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new XYOMobileService();
    // Ensure baseURL is set
    (apiClient.defaults as any).baseURL = 'http://localhost:4000';
  });

  describe('createDeliveryProof', () => {
    const mockDeliveryId = 'delivery-001';
    const baseLocation = {
      latitude: 37.7749,
      longitude: -122.4194,
      timestamp: 1234567890
    };

    it('should create proof with minimal location data', async () => {
      const mockResponse = { success: true, proofHash: 'abc123' };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await service.createDeliveryProof(mockDeliveryId, baseLocation);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/verify`,
        {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: 1234567890
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include optional fields when provided', async () => {
      const location = {
        ...baseLocation,
        altitude: 100.5,
        barometricPressure: 1013.25,
        accelerometer: { x: 0.1, y: 0.2, z: 0.3 },
        notes: 'Test delivery'
      };
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await service.createDeliveryProof(mockDeliveryId, location);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/verify`,
        expect.objectContaining({
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: 1234567890,
          altitude: 100.5,
          barometricPressure: 1013.25,
          accelerometer: { x: 0.1, y: 0.2, z: 0.3 },
          notes: 'Test delivery'
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include photoHash when provided', async () => {
      const location = {
        ...baseLocation,
        photoHash: 'photo-hash-123'
      };
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.createDeliveryProof(mockDeliveryId, location);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/verify`,
        expect.objectContaining({
          photoHash: 'photo-hash-123'
        })
      );
    });

    it('should include signatureHash when provided', async () => {
      const location = {
        ...baseLocation,
        signatureHash: 'signature-hash-456'
      };
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.createDeliveryProof(mockDeliveryId, location);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/verify`,
        expect.objectContaining({
          signatureHash: 'signature-hash-456'
        })
      );
    });

    it('should include NFC data when provided', async () => {
      const location = {
        ...baseLocation,
        nfcData: {
          record1: 'nfc-record-1',
          serialNumber: 'SN123456'
        }
      };
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.createDeliveryProof(mockDeliveryId, location);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/verify`,
        expect.objectContaining({
          nfcRecord1: 'nfc-record-1',
          nfcSerialNumber: 'SN123456'
        })
      );
    });

    it('should not include null altitude in request', async () => {
      const location = {
        ...baseLocation,
        altitude: null
      };
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.createDeliveryProof(mockDeliveryId, location);

      // Null values are not included in the request body (only non-null, non-undefined values)
      const callArgs = (apiClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('altitude');
      expect(callArgs).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: 1234567890
      });
    });

    it('should not include undefined optional fields', async () => {
      const location = {
        ...baseLocation,
        altitude: undefined,
        barometricPressure: undefined
      };
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.createDeliveryProof(mockDeliveryId, location);

      const callArgs = (apiClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('altitude');
      expect(callArgs).not.toHaveProperty('barometricPressure');
    });

    it('should throw error when baseURL is not configured', async () => {
      (apiClient.defaults as any).baseURL = undefined;

      await expect(service.createDeliveryProof(mockDeliveryId, baseLocation)).rejects.toThrow(
        'Missing EXPO_PUBLIC_API_URL configuration'
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(service.createDeliveryProof(mockDeliveryId, baseLocation)).rejects.toThrow(
        'API Error'
      );
    });
  });

  describe('uploadDeliveryPhoto', () => {
    const mockDeliveryId = 'delivery-001';
    const mockPhotoUri = 'file:///path/to/photo.jpg';

    it('should upload photo without hash', async () => {
      const mockResponse = { success: true, photoUrl: 'http://example.com/photo.jpg' };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await service.uploadDeliveryPhoto(mockDeliveryId, mockPhotoUri);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/photo`,
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should upload photo with hash', async () => {
      const mockHash = 'photo-hash-123';
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.uploadDeliveryPhoto(mockDeliveryId, mockPhotoUri, mockHash);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/photo`,
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    });

    it('should throw error when baseURL is not configured', async () => {
      (apiClient.defaults as any).baseURL = undefined;

      await expect(service.uploadDeliveryPhoto(mockDeliveryId, mockPhotoUri)).rejects.toThrow(
        'Missing EXPO_PUBLIC_API_URL configuration'
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('Upload failed');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(service.uploadDeliveryPhoto(mockDeliveryId, mockPhotoUri)).rejects.toThrow(
        'Upload failed'
      );
    });
  });

  describe('uploadDeliverySignature', () => {
    const mockDeliveryId = 'delivery-001';
    const mockSignatureBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('should upload signature without hash', async () => {
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await service.uploadDeliverySignature(mockDeliveryId, mockSignatureBase64);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/signature`,
        {
          signatureBase64: `data:image/png;base64,${mockSignatureBase64}`
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should upload signature with hash', async () => {
      const mockHash = 'signature-hash-456';
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.uploadDeliverySignature(mockDeliveryId, mockSignatureBase64, mockHash);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/signature`,
        {
          signatureBase64: `data:image/png;base64,${mockSignatureBase64}`,
          signatureHash: mockHash
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should handle signature that already has data URI prefix', async () => {
      const signatureWithPrefix = `data:image/png;base64,${mockSignatureBase64}`;
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.uploadDeliverySignature(mockDeliveryId, signatureWithPrefix);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/signature`,
        {
          signatureBase64: signatureWithPrefix
        },
        expect.any(Object)
      );
    });

    it('should remove duplicate data URI prefixes', async () => {
      const duplicatePrefix = `data:image/png;base64,data:image/png;base64,${mockSignatureBase64}`;
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.uploadDeliverySignature(mockDeliveryId, duplicatePrefix);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/signature`,
        {
          signatureBase64: `data:image/png;base64,${mockSignatureBase64}`
        },
        expect.any(Object)
      );
    });

    it('should trim whitespace from signature', async () => {
      const signatureWithWhitespace = `  ${mockSignatureBase64}  `;
      const mockResponse = { success: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      await service.uploadDeliverySignature(mockDeliveryId, signatureWithWhitespace);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/deliveries/${mockDeliveryId}/signature`,
        {
          signatureBase64: `data:image/png;base64,${mockSignatureBase64}`
        },
        expect.any(Object)
      );
    });

    it('should throw error when baseURL is not configured', async () => {
      (apiClient.defaults as any).baseURL = undefined;

      await expect(service.uploadDeliverySignature(mockDeliveryId, mockSignatureBase64)).rejects.toThrow(
        'Missing EXPO_PUBLIC_API_URL configuration'
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('Upload failed');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(service.uploadDeliverySignature(mockDeliveryId, mockSignatureBase64)).rejects.toThrow(
        'Upload failed'
      );
    });
  });
});


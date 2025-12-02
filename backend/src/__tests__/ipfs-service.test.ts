import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IpfsService } from '../services/ipfs-service.js';
import axios from 'axios';
import { env } from '../lib/env.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn()
  }
}));

const mockedAxiosPost = vi.mocked(axios.post);

// Mock env
vi.mock('../lib/env.js', () => ({
  env: {
    pinataApiKey: 'test-api-key',
    pinataSecretKey: 'test-secret-key'
  }
}));

describe('IPFS Service', () => {
  let ipfsService: IpfsService;

  beforeEach(() => {
    vi.clearAllMocks();
    ipfsService = new IpfsService();
  });

  describe('uploadBuffer', () => {
    it('should upload buffer successfully and return IPFS hash', async () => {
      const mockHash = 'QmTestHash123456789';
      const buffer = Buffer.from('test image data');
      const filename = 'test-image.jpg';

      mockedAxiosPost.mockResolvedValue({
        data: {
          IpfsHash: mockHash,
          PinSize: buffer.length
        }
      });

      const hash = await ipfsService.uploadBuffer(buffer, filename);

      expect(hash).toBe(mockHash);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        expect.any(Object), // FormData
        expect.objectContaining({
          headers: expect.objectContaining({
            pinata_api_key: 'test-api-key',
            pinata_secret_api_key: 'test-secret-key'
          }),
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        })
      );
    });

    it('should throw error if Pinata credentials are not configured', async () => {
      const originalApiKey = env.pinataApiKey;
      const originalSecretKey = env.pinataSecretKey;
      
      (env as { pinataApiKey?: string }).pinataApiKey = undefined;
      (env as { pinataSecretKey?: string }).pinataSecretKey = undefined;

      const buffer = Buffer.from('test data');
      const filename = 'test.jpg';

      await expect(ipfsService.uploadBuffer(buffer, filename)).rejects.toThrow(
        'Pinata API credentials are not configured'
      );

      // Restore
      if (originalApiKey !== undefined) {
        (env as { pinataApiKey: string }).pinataApiKey = originalApiKey;
      }
      if (originalSecretKey !== undefined) {
        (env as { pinataSecretKey: string }).pinataSecretKey = originalSecretKey;
      }
    });

    it('should throw error if response does not contain IPFS hash', async () => {
      const buffer = Buffer.from('test image data');
      const filename = 'test-image.jpg';

      mockedAxiosPost.mockResolvedValue({
        data: {
          // Missing IpfsHash
          PinSize: buffer.length
        }
      });

      await expect(ipfsService.uploadBuffer(buffer, filename)).rejects.toThrow(
        'Pinata response did not contain an IPFS hash'
      );
    });

    it('should handle different image formats', async () => {
      const mockHash = 'QmTestHash';
      const buffer = Buffer.from('test data');

      mockedAxiosPost.mockResolvedValue({
        data: {
          IpfsHash: mockHash,
          PinSize: buffer.length
        }
      });

      // Test PNG
      const pngHash = await ipfsService.uploadBuffer(buffer, 'test.png');
      expect(pngHash).toBe(mockHash);

      // Test JPEG
      const jpegHash = await ipfsService.uploadBuffer(buffer, 'test.jpg');
      expect(jpegHash).toBe(mockHash);

      // Test other format
      const otherHash = await ipfsService.uploadBuffer(buffer, 'test.unknown');
      expect(otherHash).toBe(mockHash);
    });

    it('should include metadata in upload', async () => {
      const mockHash = 'QmTestHash';
      const buffer = Buffer.from('test data');
      const filename = 'test-image.jpg';

      mockedAxiosPost.mockResolvedValue({
        data: {
          IpfsHash: mockHash,
          PinSize: buffer.length
        }
      });

      await ipfsService.uploadBuffer(buffer, filename);

      // Verify FormData was created with metadata
      const formDataCall = mockedAxiosPost.mock.calls[0]?.[1];
      expect(formDataCall).toBeDefined();
    });

    it('should handle upload errors', async () => {
      const buffer = Buffer.from('test data');
      const filename = 'test.jpg';

      mockedAxiosPost.mockRejectedValue(new Error('Network error'));

      await expect(ipfsService.uploadBuffer(buffer, filename)).rejects.toThrow('Network error');
    });
  });
});


import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app } from '../index.js';

// Mock XYO SDK modules
vi.mock('@xyo-network/wallet', () => ({
  HDWallet: {
    generateMnemonic: vi.fn(() => 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12')
  }
}));

vi.mock('@xyo-network/xl1-protocol-sdk', () => ({
  generateXyoBaseWalletFromPhrase: vi.fn(async () => ({
    derivePath: vi.fn(async () => ({
      address: '0x1234567890123456789012345678901234567890'
    }))
  })),
  ADDRESS_INDEX: {
    XYO: "m/44'/60'/0'/0/0"
  }
}));

describe('Wallet Routes', () => {
  describe('GET /api/wallet/generate-mnemonic', () => {
    it('should generate a mnemonic and return address', async () => {
      const response = await request(app)
        .get('/api/wallet/generate-mnemonic');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.mnemonic).toBeDefined();
      expect(typeof response.body.mnemonic).toBe('string');
      expect(response.body.mnemonic.split(' ').length).toBe(12);
      expect(response.body.address).toBeDefined();
      expect(response.body.warning).toBeDefined();
      expect(response.body.warning).toContain('secure');
    });

    it('should return 12-word mnemonic', async () => {
      const response = await request(app)
        .get('/api/wallet/generate-mnemonic');

      const words = response.body.mnemonic.split(' ');
      expect(words.length).toBe(12);
    });
  });

  describe('POST /api/wallet/validate-mnemonic', () => {
    it('should validate a valid mnemonic', async () => {
      const validMnemonic = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';
      
      const response = await request(app)
        .post('/api/wallet/validate-mnemonic')
        .send({ mnemonic: validMnemonic });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.address).toBeDefined();
    });

    it('should reject invalid mnemonic', async () => {
      // Use a mnemonic with 12 words (passes schema validation) but invalid format
      const invalidMnemonic = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 invalidword';
      
      // Get the mocked function and set it to reject for this test
      const xl1Sdk = await import('@xyo-network/xl1-protocol-sdk');
      const mockFn = vi.mocked(xl1Sdk.generateXyoBaseWalletFromPhrase);
      mockFn.mockRejectedValueOnce(new Error('Invalid mnemonic'));

      const response = await request(app)
        .post('/api/wallet/validate-mnemonic')
        .send({ mnemonic: invalidMnemonic });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBeDefined();
      
      // Restore the mock for other tests
      mockFn.mockRestore();
    });

    it('should reject missing mnemonic', async () => {
      const response = await request(app)
        .post('/api/wallet/validate-mnemonic')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle mnemonic with extra whitespace', async () => {
      const mnemonicWithSpaces = '  word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12  ';
      
      const response = await request(app)
        .post('/api/wallet/validate-mnemonic')
        .send({ mnemonic: mnemonicWithSpaces });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });
  });
});


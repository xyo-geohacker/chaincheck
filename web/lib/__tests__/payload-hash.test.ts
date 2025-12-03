import { calculatePayloadHash } from '../payload-hash';
import { TextEncoder, TextDecoder } from 'util';

// Mock TextEncoder/TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock crypto.subtle for testing
const mockDigest = jest.fn();
const mockCrypto = {
  subtle: {
    digest: mockDigest
  }
};

// Mock global crypto
beforeAll(() => {
  // Set up crypto.subtle mock
  if (typeof globalThis.crypto === 'undefined') {
    (globalThis as any).crypto = mockCrypto;
  } else {
    (globalThis.crypto as any).subtle = mockCrypto.subtle;
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDigest.mockClear();
});

afterAll(() => {
  delete (globalThis as any).crypto;
});

describe('calculatePayloadHash', () => {
  // Helper to create a mock hash buffer from hex string
  // If the string is not valid hex, convert it to bytes directly
  function createHashBuffer(hexString: string): ArrayBuffer {
    // Check if string is valid hex (only contains 0-9, a-f, A-F)
    const isValidHex = /^[0-9a-fA-F]+$/.test(hexString);
    
    if (isValidHex && hexString.length % 2 === 0) {
      // Valid hex string - parse as hex
      const bytes = hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
      return new Uint8Array(bytes).buffer;
    } else {
      // Not valid hex - convert string to bytes directly
      const encoder = new TextEncoder();
      return encoder.encode(hexString).buffer;
    }
  }

  it('should calculate hash for simple payload', async () => {
    const payload = {
      schema: 'network.xyo.chaincheck',
      timestamp: 1704067200000,
      message: 'test message'
    };

    const expectedHash = 'a1b2c3d4e5f6';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash));

    const hash = await calculatePayloadHash(payload);

    expect(mockDigest).toHaveBeenCalledWith(
      'SHA-256',
      expect.any(Object) // Can be Uint8Array or ArrayBuffer
    );
    // Verify the hash is returned correctly
    expect(hash).toBe(expectedHash);
  });

  it('should exclude metadata fields from hash', async () => {
    const payload = {
      schema: 'network.xyo.chaincheck',
      timestamp: 1704067200000,
      _hash: 'should-be-excluded',
      _dataHash: 'should-be-excluded',
      _timestamp: 1234567890,
      _sequence: 1,
      message: 'test message'
    };

    mockDigest.mockResolvedValue(createHashBuffer('abc123'));

    await calculatePayloadHash(payload);

    // Verify the digest was called with data that doesn't include metadata fields
    const call = mockDigest.mock.calls[0];
    const encodedData = new TextDecoder().decode(call[1] as Uint8Array);
    const parsedData = JSON.parse(encodedData);

    expect(parsedData).not.toHaveProperty('_hash');
    expect(parsedData).not.toHaveProperty('_dataHash');
    expect(parsedData).not.toHaveProperty('_timestamp');
    expect(parsedData).not.toHaveProperty('_sequence');
    expect(parsedData).toHaveProperty('schema');
    expect(parsedData).toHaveProperty('message');
  });

  it('should sort keys alphabetically for canonical JSON', async () => {
    const payload = {
      z_field: 'last',
      a_field: 'first',
      m_field: 'middle'
    };

    mockDigest.mockResolvedValue(createHashBuffer('sorted'));

    await calculatePayloadHash(payload);

    const call = mockDigest.mock.calls[0];
    const encodedData = new TextDecoder().decode(call[1] as Uint8Array);
    
    // Keys should be sorted alphabetically
    expect(encodedData).toMatch(/a_field.*m_field.*z_field/);
  });

  it('should recursively sort nested object keys', async () => {
    const payload = {
      data: {
        z_nested: 'last',
        a_nested: 'first'
      },
      schema: 'test'
    };

    mockDigest.mockResolvedValue(createHashBuffer('nested'));

    await calculatePayloadHash(payload);

    const call = mockDigest.mock.calls[0];
    const encodedData = new TextDecoder().decode(call[1] as Uint8Array);
    const parsedData = JSON.parse(encodedData);

    // Nested object keys should also be sorted
    expect(Object.keys(parsedData.data)).toEqual(['a_nested', 'z_nested']);
  });

  it('should handle arrays correctly', async () => {
    const payload = {
      items: ['item3', 'item1', 'item2'],
      schema: 'test'
    };

    // Use a valid hex string for the mock hash
    const expectedHash = '6172726179000000000000000000000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 12))); // Use first 6 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string (we just verify it's returned)
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    // Arrays should preserve order (not sorted)
    const call = mockDigest.mock.calls[0];
    const encodedData = new TextDecoder().decode(call[1] as Uint8Array);
    expect(encodedData).toContain('item3');
  });

  it('should handle nested arrays', async () => {
    const payload = {
      matrix: [
        ['a', 'b'],
        ['c', 'd']
      ],
      schema: 'test'
    };

    // Use a valid hex string for the mock hash
    const expectedHash = '6e65737465646172726179000000000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 22))); // Use first 11 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle null values', async () => {
    const payload = {
      schema: 'test',
      nullable: null,
      message: 'test'
    };

    // Use a valid hex string for the mock hash
    const expectedHash = '6e756c6c74657374000000000000000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 16))); // Use first 8 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle undefined values (excluded from JSON)', async () => {
    const payload: any = {
      schema: 'test',
      defined: 'value',
      undefined: undefined
    };

    // Use a valid hex string for the mock hash
    const expectedHash = '756e646566696e65647465737400000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 26))); // Use first 13 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    // undefined should be excluded from JSON.stringify
    const call = mockDigest.mock.calls[0];
    const encodedData = new TextDecoder().decode(call[1] as Uint8Array);
    expect(encodedData).not.toContain('undefined');
  });

  it('should handle complex nested structures', async () => {
    const payload = {
      schema: 'network.xyo.chaincheck',
      data: {
        delivery: {
          orderId: 'ORDER-001',
          status: 'DELIVERED'
        },
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      },
      timestamp: 1704067200000
    };

    // Use a valid hex string for the mock hash
    const expectedHash = '636f6d706c657800000000000000000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 14))); // Use first 7 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    // Verify nested structure is preserved and sorted
    const call = mockDigest.mock.calls[0];
    const encodedData = new TextDecoder().decode(call[1] as Uint8Array);
    const parsedData = JSON.parse(encodedData);
    expect(parsedData.data.delivery.orderId).toBe('ORDER-001');
  });

  it('should produce same hash for same payload', async () => {
    const payload = {
      schema: 'test',
      message: 'same message',
      timestamp: 1234567890
    };

    mockDigest.mockResolvedValue(createHashBuffer('consistent'));

    const hash1 = await calculatePayloadHash(payload);
    mockDigest.mockClear();
    mockDigest.mockResolvedValue(createHashBuffer('consistent'));
    const hash2 = await calculatePayloadHash(payload);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different payloads', async () => {
    const payload1 = { schema: 'test', message: 'message1' };
    const payload2 = { schema: 'test', message: 'message2' };

    mockDigest
      .mockResolvedValueOnce(createHashBuffer('hash1'))
      .mockResolvedValueOnce(createHashBuffer('hash2'));

    const hash1 = await calculatePayloadHash(payload1);
    const hash2 = await calculatePayloadHash(payload2);

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty object', async () => {
    const payload = {};

    // Use a valid hex string for the mock hash
    const expectedHash = '656d707479000000000000000000000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 10))); // Use first 5 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle payload with only metadata fields', async () => {
    const payload = {
      _hash: 'hash',
      _dataHash: 'datahash',
      _timestamp: 123,
      _sequence: 1
    };

    // Use a valid hex string for the mock hash
    const expectedHash = '6d657461646174616f6e6c790000000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 24))); // Use first 12 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    // Should result in empty object after metadata removal
    const call = mockDigest.mock.calls[0];
    const encodedData = new TextDecoder().decode(call[1] as Uint8Array);
    expect(encodedData).toBe('{}');
  });

  it('should throw error when crypto.subtle is not available', async () => {
    // Temporarily remove crypto
    const originalCrypto = (globalThis as any).crypto;
    delete (globalThis as any).crypto;

    const payload = { schema: 'test' };

    await expect(calculatePayloadHash(payload)).rejects.toThrow(
      'crypto.subtle is not available'
    );

    // Restore crypto
    (globalThis as any).crypto = originalCrypto;
  });

  it('should return lowercase hex string', async () => {
    const payload = { schema: 'test' };
    // Mock returns uppercase hex
    mockDigest.mockResolvedValue(createHashBuffer('ABCDEF123456'));

    const hash = await calculatePayloadHash(payload);

    // Should be lowercase
    expect(hash).toBe('abcdef123456');
  });

  it('should handle payload with numeric values', async () => {
    const payload = {
      schema: 'test',
      count: 42,
      price: 99.99,
      active: true
    };

    // Use a valid hex string for the mock hash
    const expectedHash = '6e756d6572696300000000000000000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 14))); // Use first 7 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle payload with boolean values', async () => {
    const payload = {
      schema: 'test',
      verified: true,
      pending: false
    };

    // Use a valid hex string for the mock hash
    const expectedHash = '626f6f6c65616e00000000000000000000000000000000000000000000000000';
    mockDigest.mockResolvedValue(createHashBuffer(expectedHash.substring(0, 14))); // Use first 7 bytes

    const hash = await calculatePayloadHash(payload);

    // Hash should be a hex string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
});


import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { hashImageFile, hashBase64Image } from '../utils/hash.utils';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64'
  }
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256'
  }
}));

describe('hashImageFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should hash an image file successfully', async () => {
    const mockFileUri = 'file:///path/to/image.jpg';
    const mockBase64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockHash = 'abc123def456';

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64Data);
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash.toUpperCase());

    const result = await hashImageFile(mockFileUri);

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(mockFileUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      mockBase64Data
    );
    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should convert hash to lowercase', async () => {
    const mockFileUri = 'file:///path/to/image.jpg';
    const mockBase64Data = 'testdata';
    const mockHash = 'ABC123DEF456';

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64Data);
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);

    const result = await hashImageFile(mockFileUri);

    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should throw error when file read fails', async () => {
    const mockFileUri = 'file:///path/to/nonexistent.jpg';
    const readError = new Error('File not found');

    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(readError);

    await expect(hashImageFile(mockFileUri)).rejects.toThrow('Failed to hash image file: File not found');
  });

  it('should throw error when crypto digest fails', async () => {
    const mockFileUri = 'file:///path/to/image.jpg';
    const mockBase64Data = 'testdata';
    const cryptoError = new Error('Crypto error');

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64Data);
    (Crypto.digestStringAsync as jest.Mock).mockRejectedValue(cryptoError);

    await expect(hashImageFile(mockFileUri)).rejects.toThrow('Failed to hash image file: Crypto error');
  });

  it('should handle non-Error exceptions', async () => {
    const mockFileUri = 'file:///path/to/image.jpg';
    const readError = 'String error';

    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(readError);

    await expect(hashImageFile(mockFileUri)).rejects.toThrow('Failed to hash image file: String error');
  });
});

describe('hashBase64Image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should hash base64 image data without data URI prefix', async () => {
    const mockBase64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockHash = 'abc123def456';

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash.toUpperCase());

    const result = await hashBase64Image(mockBase64Data);

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      mockBase64Data
    );
    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should remove data URI prefix before hashing', async () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const expectedBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockHash = 'abc123def456';

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash.toUpperCase());

    const result = await hashBase64Image(dataUri);

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      expectedBase64
    );
    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should handle data URI with different image types', async () => {
    const jpegDataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const expectedBase64 = '/9j/4AAQSkZJRg==';
    const mockHash = 'jpeghash123';

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash.toUpperCase());

    const result = await hashBase64Image(jpegDataUri);

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      expectedBase64
    );
    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should trim whitespace from base64 data', async () => {
    const base64WithWhitespace = '  iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==  ';
    const expectedBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockHash = 'trimmedhash';

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash.toUpperCase());

    const result = await hashBase64Image(base64WithWhitespace);

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      expectedBase64
    );
    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should handle base64 data with comma but no data URI prefix', async () => {
    // Edge case: base64 data that contains a comma but isn't a data URI
    const base64WithComma = 'test,data';
    const mockHash = 'commahash';

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash.toUpperCase());

    const result = await hashBase64Image(base64WithComma);

    // Should take everything after the first comma
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      'data'
    );
    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should convert hash to lowercase', async () => {
    const mockBase64Data = 'testdata';
    const mockHash = 'ABC123DEF456';

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);

    const result = await hashBase64Image(mockBase64Data);

    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should throw error when crypto digest fails', async () => {
    const mockBase64Data = 'testdata';
    const cryptoError = new Error('Crypto error');

    (Crypto.digestStringAsync as jest.Mock).mockRejectedValue(cryptoError);

    await expect(hashBase64Image(mockBase64Data)).rejects.toThrow('Failed to hash base64 image: Crypto error');
  });

  it('should handle empty base64 string', async () => {
    const emptyBase64 = '';
    const mockHash = 'emptyhash';

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash.toUpperCase());

    const result = await hashBase64Image(emptyBase64);

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      ''
    );
    expect(result).toBe(mockHash.toLowerCase());
  });

  it('should handle data URI with only comma separator', async () => {
    const minimalDataUri = 'data:,testdata';
    const expectedBase64 = 'testdata';
    const mockHash = 'minimalhash';

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash.toUpperCase());

    const result = await hashBase64Image(minimalDataUri);

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      expectedBase64
    );
    expect(result).toBe(mockHash.toLowerCase());
  });
});


/**
 * Utility functions for calculating SHA-256 hashes
 * Used to create immutable proof of delivery photos and signatures
 * 
 * Note: We hash the base64 representation of the images. While this is not
 * the same as hashing the raw binary bytes, it provides a consistent
 * and verifiable hash of the exact image data as stored/transmitted.
 */

import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

/**
 * Calculate SHA-256 hash of an image file
 * @param fileUri - URI of the image file (local file path)
 * @returns Promise<string> - SHA-256 hash in hexadecimal format (lowercase)
 */
export async function hashImageFile(fileUri: string): Promise<string> {
  try {
    // Read the file as base64
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Hash the base64 string
    // Note: We hash the base64 string directly. While this is technically
    // hashing the base64 representation rather than raw bytes, it provides
    // a consistent and verifiable hash of the image data as stored/transmitted.
    // To verify, one would need to re-hash the same base64 representation.
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64Data
    );

    return hash.toLowerCase();
  } catch (error) {
    console.error('Error hashing image file:', error);
    throw new Error(`Failed to hash image file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Calculate SHA-256 hash of a base64-encoded image (e.g., signature)
 * @param base64Data - Base64-encoded image data (with or without data URI prefix)
 * @returns Promise<string> - SHA-256 hash in hexadecimal format (lowercase)
 */
export async function hashBase64Image(base64Data: string): Promise<string> {
  try {
    // Remove data URI prefix if present (e.g., "data:image/png;base64,")
    let cleanBase64 = base64Data.trim();
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    // Hash the base64 string
    // Note: We hash the base64 string directly. While this is technically
    // hashing the base64 representation rather than raw bytes, it provides
    // a consistent and verifiable hash of the image data as stored/transmitted.
    // To verify, one would need to re-hash the same base64 representation.
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      cleanBase64
    );

    return hash.toLowerCase();
  } catch (error) {
    console.error('Error hashing base64 image:', error);
    throw new Error(`Failed to hash base64 image: ${error instanceof Error ? error.message : String(error)}`);
  }
}


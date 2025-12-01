/**
 * Calculate payload hash using the same method as XYO SDK
 * XYO payloads use SHA-256 hash of the canonical JSON representation
 * 
 * Note: The hash should match the hash stored in the XL1 bound witness.
 * The payload's _hash, _dataHash, _timestamp, _sequence fields should be excluded
 * as they are metadata, not part of the data being hashed.
 * 
 * The XYO SDK's PayloadBuilder.hash() uses a specific canonicalization:
 * - Keys are sorted alphabetically
 * - JSON is stringified with sorted keys
 * - SHA-256 is applied to the resulting string
 */
/**
 * Recursively sort object keys for canonical JSON representation
 */
function sortKeysRecursively(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sortKeysRecursively(item));
  }
  
  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sortedObj[key] = sortKeysRecursively((obj as Record<string, unknown>)[key]);
  }
  
  return sortedObj;
}

export async function calculatePayloadHash(payload: unknown): Promise<string> {
  // Create a copy of the payload without metadata fields
  // These fields are added by the SDK/Archivist and are not part of the original hash
  const payloadObj = payload as Record<string, unknown>;
  const { 
    _hash, 
    _dataHash, 
    _timestamp, 
    _sequence,
    ...payloadWithoutMeta 
  } = payloadObj;
  
  // Recursively sort all keys for canonical JSON representation
  // This ensures nested objects (like data: {...}) are also sorted
  const sortedPayload = sortKeysRecursively(payloadWithoutMeta);
  
  // Convert to canonical JSON (no spaces, sorted keys)
  // The XYO SDK likely uses JSON.stringify with sorted keys and no formatting
  const canonicalJson = JSON.stringify(sortedPayload);
  
  // Calculate SHA-256 hash
  // Use Web Crypto API (available in browsers and Node.js 15+)
  // In browser: window.crypto.subtle
  // In Node.js: globalThis.crypto.subtle (Node.js 19+) or require('crypto').webcrypto.subtle
  let cryptoSubtle: SubtleCrypto | null = null;
  
  // Try browser environment first
  if (typeof window !== 'undefined') {
    try {
      if (window.crypto && window.crypto.subtle) {
        cryptoSubtle = window.crypto.subtle;
      }
    } catch (e) {
      // window.crypto might not be accessible in some contexts
    }
  }
  
  // Fall back to globalThis (Node.js 19+)
  if (!cryptoSubtle && typeof globalThis !== 'undefined') {
    try {
      if (globalThis.crypto && globalThis.crypto.subtle) {
        cryptoSubtle = globalThis.crypto.subtle;
      }
    } catch (e) {
      // globalThis.crypto might not be accessible
    }
  }
  
  if (!cryptoSubtle) {
    // Provide more helpful error message
    const env = typeof window !== 'undefined' ? 'browser' : 'server';
    throw new Error(
      `crypto.subtle is not available in ${env} environment. ` +
      `This function requires Web Crypto API support. ` +
      `In browsers, ensure you're using HTTPS or localhost. ` +
      `In Node.js, ensure you're using Node.js 19+ or have webcrypto polyfill.`
    );
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJson);
  const hashBuffer = await cryptoSubtle.digest('SHA-256', data);
  
  // Convert to hex string (lowercase, matching XYO SDK format)
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}


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
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJson);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string (lowercase, matching XYO SDK format)
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}


/**
 * Hash Delivery ID Script
 * 
 * Converts a delivery UUID to bytes32 format for escrow contract.
 * 
 * Usage:
 *   npm run hash-delivery-id <delivery-uuid>
 * 
 * Example:
 *   npm run hash-delivery-id 123e4567-e89b-12d3-a456-426614174000
 */

import { ethers } from 'ethers';

const deliveryId = process.argv[2];

if (!deliveryId) {
  console.error('Usage: npm run hash-delivery-id <delivery-uuid>');
  console.error('Example: npm run hash-delivery-id 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

try {
  const bytes32 = ethers.id(deliveryId);
  console.log('');
  console.log('Delivery ID (string):', deliveryId);
  console.log('Delivery ID (bytes32):', bytes32);
  console.log('');
  console.log('Use this bytes32 value when calling contract.deposit()');
  console.log('');
} catch (error) {
  console.error('Error hashing delivery ID:', error);
  process.exit(1);
}


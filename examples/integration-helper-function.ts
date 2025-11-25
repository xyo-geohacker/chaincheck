/**
 * XYO Integration Helper Function
 * 
 * A reusable helper function that can be dropped into any codebase.
 * Handles XYO proof creation with proper error handling and logging.
 * 
 * Usage:
 *   import { createXYOProof } from './xyo-helpers';
 *   const proof = await createXYOProof({ ... });
 */

import { XyoService } from '../src/services/xyo/xyo-service.js';
import type { LocationProofDetails } from '../src/types/xyo.types.js';

// Singleton XYO service instance
let xyoServiceInstance: XyoService | null = null;

function getXyoService(): XyoService {
  if (!xyoServiceInstance) {
    xyoServiceInstance = new XyoService();
  }
  return xyoServiceInstance;
}

/**
 * Interface for proof creation input
 */
export interface CreateProofInput {
  deliveryId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp?: number;
  altitude?: number;
  barometricPressure?: number;
  accelerometer?: { x: number; y: number; z: number };
  metadata?: Record<string, unknown>;
}

/**
 * Create XYO proof for a delivery verification
 * 
 * @param input - Proof creation parameters
 * @returns Location proof details including blockchain transaction hash
 * @throws Error if proof creation fails
 */
export async function createXYOProof(
  input: CreateProofInput
): Promise<LocationProofDetails> {
  const xyoService = getXyoService();

  try {
    const proof = await xyoService.createLocationProofXL1({
      latitude: input.latitude,
      longitude: input.longitude,
      timestamp: input.timestamp || Date.now(),
      altitude: input.altitude,
      barometricPressure: input.barometricPressure,
      accelerometer: input.accelerometer,
      deliveryId: input.deliveryId,
      driverId: input.driverId,
      metadata: input.metadata || {}
    });

    return proof;
  } catch (error) {
    // Log error for debugging
    console.error('XYO proof creation failed:', {
      deliveryId: input.deliveryId,
      error: error instanceof Error ? error.message : String(error)
    });

    // Re-throw with context
    throw new Error(
      `XYO proof creation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Verify an existing XYO proof
 * 
 * @param proofHash - Proof hash (XL1 transaction hash) to verify
 * @returns Verification result
 */
export async function verifyXYOProof(proofHash: string): Promise<{
  isValid: boolean;
  data?: unknown;
  errors?: string[];
}> {
  const xyoService = getXyoService();

  try {
    const result = await xyoService.verifyLocationProof(proofHash);
    return result;
  } catch (error) {
    console.error('XYO proof verification failed:', {
      proofHash,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Get proof chain for a driver
 * 
 * @param proofHash - Starting proof hash
 * @param address - Optional address to track (defaults to wallet address)
 * @returns Array of proof hashes in chain order
 */
export async function getProofChain(
  proofHash: string,
  address?: string
): Promise<string[]> {
  const xyoService = getXyoService();

  try {
    const chain = await xyoService.getBoundWitnessChain(proofHash, address);
    return chain.map((link: { proofHash?: string }) => link.proofHash || '').filter(Boolean);
  } catch (error) {
    console.error('Failed to get proof chain:', error);
    return [];
  }
}

/**
 * Get network statistics
 * 
 * @returns XYO Network statistics
 */
export async function getXYONetworkStats() {
  const xyoService = getXyoService();

  try {
    return await xyoService.getNetworkStatistics();
  } catch (error) {
    console.error('Failed to get network statistics:', error);
    return null;
  }
}


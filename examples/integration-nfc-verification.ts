/**
 * XYO Integration with NFC Driver Verification Example
 * 
 * Demonstrates how to integrate XYO Network with NFC-based
 * driver verification for enhanced security.
 * 
 * NFC verification provides:
 * - Physical driver presence confirmation
 * - Hardware-based authentication
 * - Cryptographic proof of identity
 */

import { XyoService } from '../src/services/xyo/xyo-service.js';
import type { LocationProofDetails } from '../src/types/xyo.types.js';

const xyoService = new XyoService();

/**
 * Verify delivery with NFC driver authentication
 * 
 * @param deliveryId - Delivery identifier
 * @param driverId - Driver identifier
 * @param location - GPS location
 * @param nfcData - NFC card data from physical scan
 */
export async function verifyDeliveryWithNFC(
  deliveryId: string,
  driverId: string,
  location: { latitude: number; longitude: number },
  nfcData: {
    userRecord: string; // NFC user record (e.g., employee ID)
    serialNumber: string; // NFC card serial number
  }
): Promise<LocationProofDetails> {
  const proof = await xyoService.createLocationProofXL1({
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: Date.now(),
    deliveryId,
    driverId,
    metadata: {
      orderId: deliveryId,
      // NFC verification data
      xyoNfcUserRecord: nfcData.userRecord,
      xyoNfcSerialNumber: nfcData.serialNumber,
      verificationMethod: 'nfc'
    }
  });

  return proof;
}

/**
 * Example: Mobile app NFC scan integration
 */
export async function handleNFCVerification(
  deliveryId: string,
  driverId: string,
  location: { latitude: number; longitude: number },
  nfcScanResult: {
    record1: string;
    serialNumber: string;
  }
) {
  try {
    // Verify NFC data matches driver
    // TODO: Validate NFC data against driver records
    // const driver = await getDriver(driverId);
    // if (driver.nfcSerialNumber !== nfcScanResult.serialNumber) {
    //   throw new Error('NFC card does not match driver');
    // }

    // Create proof with NFC verification
    const proof = await verifyDeliveryWithNFC(
      deliveryId,
      driverId,
      location,
      {
        userRecord: nfcScanResult.record1,
        serialNumber: nfcScanResult.serialNumber
      }
    );

    // Store proof with NFC verification flag
    // await db.deliveries.update({
    //   where: { id: deliveryId },
    //   data: {
    //     proofHash: proof.proofHash,
    //     xl1TransactionHash: proof.xl1TransactionHash,
    //     nfcVerified: true,
    //     verifiedAt: new Date()
    //   }
    // });

    return {
      success: true,
      proofHash: proof.proofHash,
      nfcVerified: true
    };
  } catch (error) {
    console.error('NFC verification failed:', error);
    throw error;
  }
}

/**
 * Check if delivery was verified with NFC
 * 
 * Extracts NFC verification status from stored proof data
 */
export function checkNFCVerification(boundWitnessData: unknown): boolean {
  if (!boundWitnessData || typeof boundWitnessData !== 'object') {
    return false;
  }

  const data = boundWitnessData as Record<string, unknown>;

  // Check Archivist response payload
  if (data.archivistResponse && typeof data.archivistResponse === 'object') {
    const archivist = data.archivistResponse as Record<string, unknown>;
    if (archivist.offChainPayload && typeof archivist.offChainPayload === 'object') {
      const payload = archivist.offChainPayload as Record<string, unknown>;
      if (payload.data && typeof payload.data === 'object') {
        const payloadData = payload.data as Record<string, unknown>;
        if (payloadData.xyoNfcUserRecord || payloadData.xyoNfcSerialNumber) {
          return true;
        }
      }
    }
  }

  // Check bound witness payloads
  if (Array.isArray(data.boundWitness)) {
    const [boundWitness, payloads] = data.boundWitness as [unknown, unknown[]];
    if (Array.isArray(payloads)) {
      for (const payload of payloads) {
        if (payload && typeof payload === 'object') {
          const p = payload as Record<string, unknown>;
          if (p.data && typeof p.data === 'object') {
            const payloadData = p.data as Record<string, unknown>;
            if (payloadData.xyoNfcUserRecord || payloadData.xyoNfcSerialNumber) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}


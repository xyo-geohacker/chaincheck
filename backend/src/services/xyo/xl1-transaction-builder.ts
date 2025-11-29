/**
 * Builds transaction payloads for XL1 transactions
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Shared types outside rootDir
import type { DeliveryVerificationPayload } from '../../../../shared/types/delivery.types.js';
import { XyoSdkLoader } from './sdk-loader.js';

export class Xl1TransactionBuilder {
  /**
   * Build on-chain and off-chain payloads for delivery verification
   */
  async buildPayloads(payload: DeliveryVerificationPayload): Promise<{
    onChainPayloads: unknown[];
    offChainPayloads: unknown[];
  }> {
    const { PayloadBuilder } = await XyoSdkLoader.payloadBuilder();
    const PayloadBuilderClass = PayloadBuilder as any;

    // Create delivery payload (off-chain)
    const deliveryPayload = {
      schema: 'network.xyo.chaincheck',
      timestamp: payload.timestamp ?? Date.now(),
      message: `successfully delivered order ID ${payload.metadata?.orderId || 'UNKNOWN'}`,
      data: {
        name: 'ChainCheck',
        schema: 'network.xyo.chaincheck',
        status: payload.metadata?.status || 'VERIFIED',
        orderId: payload.metadata?.orderId || 'UNKNOWN',
        driverId: payload.driverId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        timestamp: new Date(payload.timestamp ?? Date.now()).toISOString(),
        deliveryId: payload.deliveryId,
        recipientName: payload.metadata?.recipientName || '',
        destinationLat: payload.metadata?.destinationLat ?? payload.latitude,
        destinationLon: payload.metadata?.destinationLon ?? payload.longitude,
        recipientPhone: payload.metadata?.recipientPhone || '',
        deliveryAddress: payload.metadata?.deliveryAddress || '',
        // Include sensor data if available
        altitude: payload.altitude ?? null,
        barometricPressure: payload.barometricPressure ?? null,
        accelerometer: payload.accelerometer ?? null,
        // Include NFC data if available
        xyoNfcUserRecord: payload.metadata?.xyoNfcUserRecord as string | undefined,
        xyoNfcSerialNumber: payload.metadata?.xyoNfcSerialNumber as string | undefined,
        // Include SHA-256 hashes for immutable proof of photos and signatures
        photoHash: payload.photoHash || null,
        signatureHash: payload.signatureHash || null
      }
    };

    // Create hash payload for on-chain reference
    const hash = await PayloadBuilderClass.hash(deliveryPayload);
    const hashPayload = {
      schema: 'network.xyo.hash',
      hash
    };

    return {
      onChainPayloads: [hashPayload],
      offChainPayloads: [deliveryPayload]
    };
  }
}


/**
 * XYO Integration with Sensor Data Example
 * 
 * Demonstrates how to integrate XYO Network with sensor data
 * (altitude, barometric pressure, accelerometer) for enhanced verification.
 * 
 * This is useful for:
 * - Multi-story building deliveries
 * - Underground facility deliveries
 * - Enhanced proof of physical presence
 */

import { XyoService } from '../src/services/xyo/xyo-service.js';
import type { LocationProofDetails } from '../src/types/xyo.types.js';

const xyoService = new XyoService();

/**
 * Create proof with full sensor data
 */
export async function verifyDeliveryWithSensors(
  deliveryId: string,
  driverId: string,
  location: {
    latitude: number;
    longitude: number;
    altitude?: number; // GPS altitude
  },
  sensors: {
    barometricPressure?: number; // hPa (more accurate than GPS altitude)
    accelerometer?: { x: number; y: number; z: number }; // m/s²
  },
  metadata?: Record<string, unknown>
): Promise<LocationProofDetails> {
  const proof = await xyoService.createLocationProofXL1({
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: Date.now(),
    altitude: location.altitude,
    barometricPressure: sensors.barometricPressure,
    accelerometer: sensors.accelerometer,
    deliveryId,
    driverId,
    metadata: metadata || {}
  });

  return proof;
}

/**
 * Example: Mobile app capturing sensor data
 */
export async function handleMobileDeliveryVerification(
  deliveryId: string,
  driverId: string,
  gpsLocation: { latitude: number; longitude: number; altitude?: number },
  deviceSensors: {
    barometricPressure?: number;
    accelerometer?: { x: number; y: number; z: number };
  }
) {
  try {
    const proof = await verifyDeliveryWithSensors(
      deliveryId,
      driverId,
      gpsLocation,
      deviceSensors,
      {
        orderId: deliveryId,
        source: 'mobile-app',
        deviceType: 'smartphone'
      }
    );

    // Store proof in your database
    // await db.deliveries.update({
    //   where: { id: deliveryId },
    //   data: {
    //     proofHash: proof.proofHash,
    //     xl1TransactionHash: proof.xl1TransactionHash,
    //     verifiedAt: new Date()
    //   }
    // });

    return {
      success: true,
      proofHash: proof.proofHash,
      xl1TransactionHash: proof.xl1TransactionHash
    };
  } catch (error) {
    console.error('Sensor-enhanced verification failed:', error);
    throw error;
  }
}

/**
 * Example: Verify accelerometer indicates stationary device
 */
export function isDeviceStationary(accelerometer: { x: number; y: number; z: number }): boolean {
  // Calculate magnitude of acceleration vector
  const magnitude = Math.sqrt(
    accelerometer.x ** 2 + accelerometer.y ** 2 + accelerometer.z ** 2
  );

  // Gravity is ~9.8 m/s², so stationary device should be close to this
  // Account for device orientation (magnitude should be ~9.8 if stationary)
  const gravity = 9.8;
  const tolerance = 2.0; // Allow 2 m/s² tolerance

  return Math.abs(magnitude - gravity) < tolerance;
}

/**
 * Enhanced verification with sensor validation
 */
export async function verifyWithSensorValidation(
  deliveryId: string,
  driverId: string,
  location: { latitude: number; longitude: number; altitude?: number },
  sensors: {
    barometricPressure?: number;
    accelerometer?: { x: number; y: number; z: number };
  }
) {
  // Validate accelerometer indicates device was stationary
  if (sensors.accelerometer && !isDeviceStationary(sensors.accelerometer)) {
    console.warn('Device appears to be moving - verification may be less reliable');
  }

  // Create proof with all sensor data
  const proof = await verifyDeliveryWithSensors(
    deliveryId,
    driverId,
    location,
    sensors,
    {
      sensorValidation: {
        stationary: sensors.accelerometer ? isDeviceStationary(sensors.accelerometer) : null,
        hasBarometricPressure: sensors.barometricPressure !== undefined,
        hasAccelerometer: sensors.accelerometer !== undefined
      }
    }
  );

  return proof;
}


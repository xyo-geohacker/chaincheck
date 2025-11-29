export enum DeliveryStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  DISPUTED = 'DISPUTED'
}

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number | null; // Elevation in meters (from GPS)
  barometricPressure?: number | null; // Barometric pressure in hPa (hectopascals)
  accelerometer?: { x: number; y: number; z: number } | null; // Device acceleration in m/s² (meters per second squared)
}

export interface DeliveryVerificationPayload extends DeliveryLocation {
  deliveryId: string;
  driverId: string;
  metadata?: Record<string, unknown>;
  photoHash?: string; // SHA-256 hash of the delivery photo for immutable proof
  signatureHash?: string; // SHA-256 hash of the signature (if provided) for immutable proof
}

export interface DeliveryRecord {
  id: string;
  orderId: string;
  driverId: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  destinationLat: number;
  destinationLon: number;
  proofHash?: string | null;
  blockNumber?: number | null;
  boundWitnessData?: unknown;
  verifiedAt?: string | null;
  actualLat?: number | null;
  actualLon?: number | null;
  distanceFromDest?: number | null;
  photoIpfsHash?: string | null;
  signatureIpfsHash?: string | null;
  notes?: string | null;
  status: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
  driverNfcVerified?: boolean; // Whether driver has been verified via NFC card scan
}


import type { DeliveryLocation } from '@shared/types/delivery.types';
import { apiClient } from './api.service';

export class XYOMobileService {
  async createDeliveryProof(
    deliveryId: string,
    location: DeliveryLocation & { 
      notes?: string;
      nfcData?: { record1: string; serialNumber: string };
    }
  ) {
    if (!apiClient.defaults.baseURL) {
      throw new Error('Missing EXPO_PUBLIC_API_URL configuration');
    }

    const requestBody: {
      latitude: number;
      longitude: number;
      timestamp: number;
      altitude?: number | null;
      barometricPressure?: number | null;
      accelerometer?: { x: number; y: number; z: number } | null;
      notes?: string;
      nfcRecord1?: string;
      nfcSerialNumber?: string;
    } = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp
    };

    if (location.altitude !== undefined && location.altitude !== null) {
      requestBody.altitude = location.altitude;
    }

    if (location.barometricPressure !== undefined && location.barometricPressure !== null) {
      requestBody.barometricPressure = location.barometricPressure;
    }

    if (location.accelerometer !== undefined && location.accelerometer !== null) {
      requestBody.accelerometer = location.accelerometer;
    }

    if (location.notes) {
      requestBody.notes = location.notes;
    }

    if (location.nfcData) {
      requestBody.nfcRecord1 = location.nfcData.record1;
      requestBody.nfcSerialNumber = location.nfcData.serialNumber;
    }

    const response = await apiClient.post(`/api/deliveries/${deliveryId}/verify`, requestBody);

    return response.data;
  }

  async uploadDeliveryPhoto(deliveryId: string, photoUri: string) {
    if (!apiClient.defaults.baseURL) {
      throw new Error('Missing EXPO_PUBLIC_API_URL configuration');
    }

    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'delivery.jpg'
    } as any);

    const response = await apiClient.post(`/api/deliveries/${deliveryId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }

  async uploadDeliverySignature(deliveryId: string, signatureBase64: string) {
    if (!apiClient.defaults.baseURL) {
      throw new Error('Missing EXPO_PUBLIC_API_URL configuration');
    }

    // Handle signature data - it might already be a data URI or just base64
    let signatureDataUri = signatureBase64.trim();
    
    // Check if it's already a data URI (might have duplicate prefix)
    if (signatureDataUri.startsWith('data:')) {
      // Remove any duplicate data URI prefixes
      // Pattern: data:image/png;base64,data:image/png;base64,...
      while (signatureDataUri.match(/^data:image\/[^;]+;base64,data:/)) {
        signatureDataUri = signatureDataUri.replace(/^data:image\/[^;]+;base64,/, '');
      }
    } else {
      // Not a data URI, add the prefix
      signatureDataUri = `data:image/png;base64,${signatureDataUri}`;
    }

    // Send base64 directly in JSON body (backend handles conversion)
    // This is more reliable than file-based upload on Android devices
    const response = await apiClient.post(
      `/api/deliveries/${deliveryId}/signature`,
      { signatureBase64: signatureDataUri },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }
}


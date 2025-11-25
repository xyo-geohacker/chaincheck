/**
 * Next.js API Route Integration Example
 * 
 * This example shows how to integrate XYO Network into a Next.js API route.
 * 
 * File: app/api/deliveries/[id]/verify/route.ts
 * 
 * Prerequisites:
 * - XYO services in src/services/xyo/
 * - XYO SDK dependencies installed
 * - Environment variables configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { XyoService } from '@/services/xyo/xyo-service';

// Initialize XYO service (singleton pattern)
const xyoService = new XyoService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { latitude, longitude, timestamp, driverId, metadata } = await request.json();
    const deliveryId = params.id;

    // Validate required fields
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // TODO: Your existing delivery lookup
    // const delivery = await getDelivery(deliveryId);
    // if (!delivery) {
    //   return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    // }

    // Create XYO proof
    const proof = await xyoService.createLocationProofXL1({
      latitude,
      longitude,
      timestamp: timestamp || Date.now(),
      deliveryId,
      driverId: driverId || 'default-driver',
      metadata: metadata || {
        orderId: deliveryId,
      }
    });

    // TODO: Update your delivery record
    // await updateDelivery(deliveryId, {
    //   proofHash: proof.proofHash,
    //   xl1TransactionHash: proof.xl1TransactionHash,
    //   status: 'VERIFIED'
    // });

    return NextResponse.json({
      success: true,
      proofHash: proof.proofHash,
      xl1TransactionHash: proof.xl1TransactionHash,
      blockNumber: proof.blockNumber
    });
  } catch (error) {
    console.error('XYO verification failed:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Proof verification route
 * File: app/api/proofs/[proofHash]/route.ts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { proofHash: string } }
) {
  const { proofHash } = params.proofHash;

  try {
    const result = await xyoService.verifyLocationProof(proofHash);

    return NextResponse.json({
      valid: result.isValid,
      proofHash,
      data: result.data,
      errors: result.errors
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}


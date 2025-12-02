import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { Prisma, DeliveryStatus } from '@prisma/client';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Shared types outside rootDir
import type { LocationProofDetails } from '../../../shared/types/xyo.types.js';

import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { IpfsService } from '../services/ipfs-service.js';
import { XyoService } from '../services/xyo-service.js';
import { photoUploadLimiter, verificationLimiter } from '../middleware/rate-limit-middleware.js';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth-middleware.js';
import { validateRequest } from '../middleware/validation-middleware.js';
import {
  deliveryVerificationSchema,
  deliveryIdParamSchema,
  proofHashParamSchema,
  orderIdParamSchema,
  signatureUploadSchema,
  deliveryListQuerySchema,
  networkNodesQuerySchema,
  nodeAddressParamSchema
} from '../lib/validation-schemas.js';

const router = Router();
// Multer configuration for file uploads
// Increased to 25MB to accommodate high-resolution phone camera photos
// Note: Pinata IPFS supports files up to 1GB, but we limit to 25MB for practical reasons
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB (increased from 10MB)
  }
});

const xyoService = new XyoService();
const ipfsService = new IpfsService();

/**
 * Check if NFC verification was performed for a specific delivery
 * NFC data is stored in boundWitnessData metadata (payload data) when verification occurs
 * This checks the delivery's boundWitnessData, not the driver's stored NFC records
 * 
 * NFC data is stored in the off-chain payload's data field:
 * - boundWitnessData.archivistResponse.offChainPayload.data.xyoNfcUserRecord
 * - boundWitnessData.archivistResponse.offChainPayload.data.xyoNfcSerialNumber
 * 
 * Or in the boundWitness tuple payloads:
 * - boundWitnessData.boundWitness[1] (payloads array) contains the off-chain payload
 */
function checkDeliveryNfcVerification(boundWitnessData: unknown): boolean {
  if (!boundWitnessData || typeof boundWitnessData !== 'object') {
    return false;
  }

  const bwData = boundWitnessData as Record<string, unknown>;
  
  // First, check archivistResponse.offChainPayload (most reliable source)
  // This is where the off-chain payload with NFC data is stored
  if (bwData.archivistResponse && typeof bwData.archivistResponse === 'object') {
    const archivistResponse = bwData.archivistResponse as Record<string, unknown>;
    if (archivistResponse.offChainPayload && typeof archivistResponse.offChainPayload === 'object') {
      const offChainPayload = archivistResponse.offChainPayload as Record<string, unknown>;
      // NFC data is stored in the payload's data field
      if (offChainPayload.data && typeof offChainPayload.data === 'object') {
        const data = offChainPayload.data as Record<string, unknown>;
        if (data.xyoNfcUserRecord && data.xyoNfcSerialNumber) {
          return true;
        }
      }
    }
  }
  
  // Fallback: Check boundWitness tuple payloads
  // The boundWitness is stored as [boundWitness, payloads] tuple
  // The off-chain payload with NFC data should be in the payloads array
  if (bwData.boundWitness && Array.isArray(bwData.boundWitness) && bwData.boundWitness.length > 1) {
    const payloads = bwData.boundWitness[1] as unknown[] | undefined;
    if (Array.isArray(payloads)) {
      // Check each payload for NFC data
      for (const payload of payloads) {
        if (payload && typeof payload === 'object') {
          const payloadData = payload as Record<string, unknown>;
          // NFC data is stored in the payload's data field
          if (payloadData.data && typeof payloadData.data === 'object') {
            const data = payloadData.data as Record<string, unknown>;
            if (data.xyoNfcUserRecord && data.xyoNfcSerialNumber) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

// GET /api/payloads/:hash - Get payload from Archivist by payload hash
// IMPORTANT: This route must be placed EARLY to ensure it's matched before other dynamic routes
// Route path is '/payloads/:hash' (without /api prefix - that's added in index.ts)
router.get(
  '/payloads/:hash',
  async (req, res, next) => {
    // eslint-disable-next-line no-console
    console.log(`[PAYLOADS ROUTE MIDDLEWARE] Route matched! Hash: ${req.params.hash}`);
    // eslint-disable-next-line no-console
    console.log(`[PAYLOADS ROUTE MIDDLEWARE] Request URL: ${req.url}`);
    // eslint-disable-next-line no-console
    console.log(`[PAYLOADS ROUTE MIDDLEWARE] Request path: ${req.path}`);
    // eslint-disable-next-line no-console
    console.log(`[PAYLOADS ROUTE MIDDLEWARE] Request params:`, req.params);
    next();
  },
  async (req, res) => {
    const { hash } = req.params;

    // eslint-disable-next-line no-console
    console.log(`[PAYLOADS ROUTE HANDLER] Route handler called! Hash: ${hash}`);

    // Validate hash format (should be 64 character hex string)
    if (!hash || hash.length < 1) {
      // eslint-disable-next-line no-console
      console.warn(`[PAYLOADS ROUTE] Invalid hash parameter: ${hash}`);
      return res.status(400).json({ success: false, error: 'Invalid hash parameter' });
    }

  try {
    // Use the archivist service's getPayloadByHash method (uses verifyLocationProof internally)
    const payload = await xyoService.getPayloadByHash(hash);
    if (payload) {
      // eslint-disable-next-line no-console
      console.log(`[PAYLOADS ROUTE] ✓ Successfully retrieved payload from Archivist for hash: ${hash}`);
      return res.json({ success: true, data: payload });
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[PAYLOADS ROUTE] ⚠ Payload not found in Archivist for hash: ${hash}`);
      return res.status(404).json({ success: false, error: 'Payload not found in Archivist' });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[PAYLOADS ROUTE] Fetch payload error:', error);
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error('[PAYLOADS ROUTE] Error stack:', error.stack);
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch payload from Archivist' });
  }
  }
);

/**
 * @swagger
 * /api/deliveries:
 *   get:
 *     summary: List deliveries
 *     description: Get a list of deliveries. If authenticated, returns only deliveries for the authenticated driver. Otherwise, returns all deliveries.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *         description: Filter deliveries by driver ID (only if not authenticated)
 *         example: "driver123"
 *     responses:
 *       200:
 *         description: List of deliveries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Delivery'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /deliveries - List deliveries (optional auth: if authenticated, filter by driverId)
router.get(
  '/deliveries',
  optionalAuthenticateToken,
  validateRequest(deliveryListQuerySchema, 'query'),
  async (req, res) => {
    const { driverId: queryDriverId } = req.query as { driverId?: string };
  // Use authenticated driverId from JWT if available, otherwise use query parameter
  const authenticatedDriverId = (req as { driverId?: string }).driverId;
  const filterDriverId = authenticatedDriverId || queryDriverId;

  try {
    const deliveries = await prisma.delivery.findMany({
      where: filterDriverId
        ? {
            driverId: filterDriverId
          }
        : undefined,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({ deliveries });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('List deliveries error:', error);
    return res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
  }
);

/**
 * @swagger
 * /api/deliveries/{id}/verify:
 *   post:
 *     summary: Verify a delivery
 *     description: Verify a delivery by creating an XL1 blockchain transaction with location proof. Requires authentication.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - timestamp
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: double
 *                 description: Delivery location latitude
 *                 example: 37.7749
 *               longitude:
 *                 type: number
 *                 format: double
 *                 description: Delivery location longitude
 *                 example: -122.4194
 *               timestamp:
 *                 type: number
 *                 description: Unix timestamp in milliseconds
 *                 example: 1703123456789
 *               altitude:
 *                 type: number
 *                 format: double
 *                 nullable: true
 *                 description: Elevation in meters (from GPS). Optional sensor data for enhanced validation.
 *                 example: 45.5
 *               accelerometer:
 *                 type: object
 *                 description: Device acceleration in m/s² (meters per second squared). Optional sensor data captured at verification time. Low/zero values indicate device is stationary, providing evidence driver was present at location.
 *                 properties:
 *                   x:
 *                     type: number
 *                     description: Acceleration along X-axis in m/s²
 *                   y:
 *                     type: number
 *                     description: Acceleration along Y-axis in m/s²
 *                   z:
 *                     type: number
 *                     description: Acceleration along Z-axis in m/s²
 *               barometricPressure:
 *                 type: number
 *                 format: double
 *                 nullable: true
 *                 description: Barometric pressure in hPa (hectopascals). Optional sensor data for enhanced validation. More accurate than GPS altitude.
 *                 example: 1013.25
 *               notes:
 *                 type: string
 *                 description: Optional delivery notes
 *                 example: "Left at front door"
 *               nfcRecord1:
 *                 type: string
 *                 description: Optional NFC user record for driver verification
 *               nfcSerialNumber:
 *                 type: string
 *                 description: Optional NFC serial number for driver verification
 *     responses:
 *       200:
 *         description: Delivery verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 delivery:
 *                   $ref: '#/components/schemas/Delivery'
 *                 proof:
 *                   type: object
 *                   properties:
 *                     hash:
 *                       type: string
 *                       description: Proof hash (XL1 transaction hash)
 *                     blockNumber:
 *                       type: integer
 *                       nullable: true
 *                     verificationUrl:
 *                       type: string
 *                       format: uri
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Delivery not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /deliveries/:id/verify - Verify delivery (requires authentication)
router.post(
  '/deliveries/:id/verify',
  verificationLimiter,
  authenticateToken,
  validateRequest(deliveryIdParamSchema, 'params'),
  validateRequest(deliveryVerificationSchema),
  async (req, res) => {
    const { id } = req.params;
    const { 
      latitude: lat, 
      longitude: lon, 
      timestamp: ts, 
      altitude,
      barometricPressure,
      accelerometer,
      notes, 
      photoHash,
      signatureHash,
      nfcRecord1, 
      nfcSerialNumber 
    } = req.body;
    const driverId = (req as { driverId?: string }).driverId;

  // Declare delivery outside try block so it's accessible in catch block
  let delivery = null;
  try {
    delivery = await prisma.delivery.findUnique({
      where: { id }
    });

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const distance = haversineDistance(
      lat,
      lon,
      delivery.destinationLat ?? 0,
      delivery.destinationLon ?? 0
    );

    // Get hashes from request or fall back to database
    // The mobile app should send hashes during verification, but if not provided,
    // we'll use the hashes stored when photos/signatures were uploaded
    const finalPhotoHash = photoHash ?? delivery.photoHash ?? undefined;
    const finalSignatureHash = signatureHash ?? delivery.signatureHash ?? undefined;
    
    // Log hash availability for debugging
    // eslint-disable-next-line no-console
    console.log('[VERIFICATION] Hash availability:', {
      photoHashFromRequest: photoHash ? `${photoHash.substring(0, 16)}...` : 'not provided',
      photoHashFromDB: delivery.photoHash ? `${delivery.photoHash.substring(0, 16)}...` : 'not in DB',
      finalPhotoHash: finalPhotoHash ? `${finalPhotoHash.substring(0, 16)}...` : 'will be null',
      signatureHashFromRequest: signatureHash ? `${signatureHash.substring(0, 16)}...` : 'not provided',
      signatureHashFromDB: delivery.signatureHash ? `${delivery.signatureHash.substring(0, 16)}...` : 'not in DB',
      finalSignatureHash: finalSignatureHash ? `${finalSignatureHash.substring(0, 16)}...` : 'will be null'
    });

    // Step 1: Create XL1 transaction first to get blockchain proof
    // CRITICAL: Only mark delivery as verified if XL1 transaction succeeds
    // eslint-disable-next-line no-console
    console.log('Creating XL1 transaction for delivery verification...');
    let proof: LocationProofDetails;
    try {
      // Get driver NFC data if available
      const driver = await prisma.driver.findUnique({
        where: { driverId: delivery.driverId },
        select: { xyoNfcUserRecord: true, xyoNfcSerialNumber: true }
      });

      proof = await xyoService.createLocationProofXL1({
        latitude: lat,
        longitude: lon,
        timestamp: ts,
        altitude: altitude ?? undefined,
        barometricPressure: barometricPressure ?? undefined,
        accelerometer: accelerometer ?? undefined,
        deliveryId: delivery.id,
        driverId: delivery.driverId,
        photoHash: finalPhotoHash,
        signatureHash: finalSignatureHash,
        metadata: {
          orderId: delivery.orderId,
          recipientName: delivery.recipientName,
          recipientPhone: delivery.recipientPhone,
          deliveryAddress: delivery.deliveryAddress,
          destinationLat: delivery.destinationLat,
          destinationLon: delivery.destinationLon,
          status: 'VERIFIED',
          // Include NFC data in metadata if available (from request or driver record)
          xyoNfcUserRecord: nfcRecord1 || driver?.xyoNfcUserRecord || undefined,
          xyoNfcSerialNumber: nfcSerialNumber || driver?.xyoNfcSerialNumber || undefined
        }
      });
    } catch (xl1Error) {
      // XL1 transaction failed - do NOT mark delivery as verified
      // eslint-disable-next-line no-console
      console.error('XL1 transaction failed - delivery will NOT be marked as verified:', xl1Error);
      // Re-throw to be handled by outer catch block
      throw xl1Error;
    }

    // Step 2: Query Diviner with Archivist bound witness hash for cross-reference verification
    // IMPORTANT: Use Archivist bound witness hash (not XL1 transaction hash) for Diviner queries
    // - XL1 transaction hash = on-chain bound witness (for blockchain proof)
    // - Archivist bound witness hash = off-chain bound witness (for Diviner queries)
    // The Diviner queries the Archivist, so it needs the Archivist bound witness hash
    // Note: Diviner query failure should not prevent verification, but we'll log it
    //
    // KNOWN LIMITATION: The Diviner uses XyoArchivistArchiveApi which expects archive-based
    // endpoints like /archive/{archiveName}/block/, but our local Archivist only exposes
    // module-based routes (/node/:address, /dataLake/insert, etc.). This is a protocol
    // mismatch between the Diviner's expected API format and our Archivist's exposed routes.
    // The Diviner is an official XYO Network component, so its format is correct per the protocol.
    // This may require:
    // 1. A different Archivist implementation that supports archive-based routes
    // 2. Additional Archivist configuration to enable archive-based routes
    // 3. An updated Archivist version that supports both route formats
    // Until resolved, we extract location data directly from Archivist payloads as fallback
    let divinerVerification = null;
    if (proof.archivistBoundWitnessHash) {
      try {
        // eslint-disable-next-line no-console
        console.log('Querying Diviner for cross-reference verification...', {
          archivistBoundWitnessHash: proof.archivistBoundWitnessHash,
          xl1TransactionHash: proof.xl1TransactionHash,
          xl1BlockNumber: proof.xl1BlockNumber
        });
        // eslint-disable-next-line no-console
        console.log('  ✓ Using Archivist bound witness hash for Diviner query (correct)');
        divinerVerification = await xyoService.queryLocationDiviner(
          lat,
          lon,
          ts,
          proof.archivistBoundWitnessHash, // Use Archivist bound witness hash for Diviner queries
          proof.xl1BlockNumber,
          proof.boundWitness
        );
        
        // If Diviner query returned null, empty results (nodeCount=0), or mock verification, it likely failed to query the Archivist
        // This happens when the Diviner uses incorrect endpoint format (e.g., /archive/chaincheck/block/)
        // Extract location data directly from Archivist payloads as fallback
        if (!divinerVerification || (divinerVerification && (divinerVerification.nodeCount === 0 || divinerVerification.isMocked))) {
          // eslint-disable-next-line no-console
          console.warn('⚠ Diviner query returned null or empty results - likely failed to query Archivist');
          // eslint-disable-next-line no-console
          console.warn('  - Diviner may be using incorrect Archivist endpoint format (/archive/chaincheck/block/)');
          // eslint-disable-next-line no-console
          console.warn('  - Using location data from Archivist payloads as fallback');
          
          // Extract location from Archivist response payloads
          const archivistResponse = proof.archivistResponse;
          if (archivistResponse?.offChainPayload) {
            const payload = archivistResponse.offChainPayload as Record<string, unknown>;
            const payloadData = payload.data as Record<string, unknown> | undefined;
            // eslint-disable-next-line no-console
            console.log('  - Archivist payload structure:', {
              hasPayload: !!payload,
              hasData: !!payloadData,
              schema: payload.schema,
              dataKeys: payloadData ? Object.keys(payloadData) : []
            });
            if (payloadData?.latitude && payloadData?.longitude) {
              // Create a verification result from the Archivist payload data
              divinerVerification = {
                verified: true,
                confidence: 85, // High confidence since data comes from Archivist
                nodeCount: 1, // Single source (Archivist)
                consensus: 'medium' as const,
                locationMatch: true,
                timestamp: Date.now(),
                isMocked: false,
                details: {
                  divinerResponse: {
                    source: 'archivist',
                    note: 'Diviner query failed, using Archivist payload data'
                  },
                  locationData: {
                    latitude: payloadData.latitude as number,
                    longitude: payloadData.longitude as number,
                    accuracy: 10,
                    timestamp: ts,
                    source: 'archivist'
                  },
                  xl1TransactionHash: proof.xl1TransactionHash,
                  xl1BlockNumber: proof.xl1BlockNumber
                }
              };
              // eslint-disable-next-line no-console
              console.log('  ✓ Created verification result from Archivist payload data:', {
                latitude: payloadData.latitude,
                longitude: payloadData.longitude,
                timestamp: ts
              });
            } else {
              // eslint-disable-next-line no-console
              console.warn('  ⚠ Archivist payload data does not contain location information');
              // eslint-disable-next-line no-console
              console.warn('    - Payload data keys:', payloadData ? Object.keys(payloadData) : 'no data object');
            }
          } else {
            // eslint-disable-next-line no-console
            console.warn('  ⚠ No Archivist response payload available for fallback');
            // eslint-disable-next-line no-console
            console.warn('    - archivistResponse:', archivistResponse ? 'exists' : 'null');
            // eslint-disable-next-line no-console
            console.warn('    - offChainPayload:', archivistResponse?.offChainPayload ? 'exists' : 'missing');
          }
        }
      } catch (divinerError) {
        // Diviner query failure is non-critical - log but continue
        // eslint-disable-next-line no-console
        console.warn('Diviner query failed (non-critical):', divinerError);
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('⚠ Skipping Diviner query - no Archivist bound witness hash available');
      // eslint-disable-next-line no-console
      console.warn('  - XL1 transaction hash cannot be used for Diviner queries (different bound witness)');
      // eslint-disable-next-line no-console
      console.warn('  - Diviner queries the Archivist, which has a different bound witness hash');
    }

    // Update driver NFC data if provided (optional feature)
    if (driverId && (nfcRecord1 || nfcSerialNumber)) {
      try {
        await prisma.driver.update({
          where: { driverId },
          data: {
            ...(nfcRecord1 && { xyoNfcUserRecord: nfcRecord1 }),
            ...(nfcSerialNumber && { xyoNfcSerialNumber: nfcSerialNumber })
          }
        });
        // eslint-disable-next-line no-console
        console.log(`Updated NFC data for driver ${driverId}`);
      } catch (driverUpdateError) {
        // Log but don't fail verification if driver update fails
        // eslint-disable-next-line no-console
        console.warn('Failed to update driver NFC data (non-critical):', driverUpdateError);
      }
    }

    // Only update delivery as DELIVERED if XL1 transaction succeeded
    // This ensures failed transactions don't mark deliveries as verified
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        proofHash: proof.proofHash,
        boundWitnessData: {
          // Store boundWitness as a proper structure: [boundWitness, payloads] tuple
          boundWitness: proof.boundWitness ?? null,
          // Store metadata separately for easy access
          archivistResponse: proof.archivistResponse ?? null,
          isXL1: proof.isXL1 ?? false,
          isMocked: proof.isMocked ?? false,
          xl1TransactionHash: proof.xl1TransactionHash ?? null,
          archivistBoundWitnessHash: proof.archivistBoundWitnessHash ?? null, // Archivist bound witness hash (for Diviner queries)
          xl1BlockNumber: proof.xl1BlockNumber ?? null,
          xl1Nbf: proof.xl1Nbf ?? null,
          xl1Exp: proof.xl1Exp ?? null,
          xl1ActualBlockNumber: proof.xl1ActualBlockNumber ?? null,
          divinerVerification: divinerVerification
        } as Prisma.InputJsonValue,
        blockNumber: proof.blockNumber ?? proof.xl1BlockNumber ?? null,
        actualLat: lat,
        actualLon: lon,
        distanceFromDest: distance,
        verifiedAt: new Date(ts),
        status: 'DELIVERED',
        notes: notes?.trim() || null
      }
    });

    const verificationUrl = `${process.env.WEB_URL ?? ''}/verify/${proof.proofHash}`;

    return res.json({
      success: true,
      delivery: updatedDelivery,
      proof: {
        hash: proof.proofHash,
        blockNumber: proof.blockNumber,
        verificationUrl,
        archivistResponse: proof.archivistResponse ?? null,
        divinerVerification: divinerVerification
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Verification error:', error);

    // Check if this is an RPC service error (XL1 blockchain unavailable)
    const isRpcError = error instanceof Error && (error as any).isRpcError === true;
    const statusCode = isRpcError ? 503 : 500;
    const errorMessage = isRpcError 
      ? 'The blockchain service is temporarily unavailable. Please try again later.'
      : 'Verification failed';

    // Determine failure reason for notes
    let failureReason = 'Verification failed';
    if (isRpcError) {
      failureReason = 'Blockchain service temporarily unavailable - verification cannot be completed at this time. Please retry when service is restored.';
    } else if (error instanceof Error) {
      failureReason = `Verification failed: ${error.message}`;
    }

    // Update delivery status and notes based on error type
    // Only update if delivery was successfully fetched (delivery exists in scope)
    try {
      // Fetch delivery if not already available (in case error occurred before fetch)
      const deliveryToUpdate = delivery || await prisma.delivery.findUnique({ where: { id } });
      
      if (deliveryToUpdate) {
        // For retryable errors (RPC/blockchain issues): Keep as IN_TRANSIT to allow retry
        // For non-retryable errors: Mark as FAILED
        const newStatus = isRpcError ? DeliveryStatus.IN_TRANSIT : DeliveryStatus.FAILED;
        
        // Append failure reason to existing notes (or create new notes)
        const existingNotes = deliveryToUpdate.notes || '';
        const failureNote = `[${new Date().toISOString()}] ${failureReason}`;
        const updatedNotes = existingNotes 
          ? `${existingNotes}\n\n${failureNote}`
          : failureNote;

        await prisma.delivery.update({
          where: { id },
          data: {
            status: newStatus,
            notes: updatedNotes,
            updatedAt: new Date().toISOString()
          }
        });

        // eslint-disable-next-line no-console
        console.log(`Delivery ${id} status updated to ${newStatus} due to verification failure`);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`Cannot update delivery ${id} status - delivery not found`);
      }
    } catch (updateError) {
      // Log but don't fail the error response if status update fails
      // eslint-disable-next-line no-console
      console.error('Failed to update delivery status after verification error:', updateError);
    }

    const errorResponse =
      error instanceof Error
        ? {
            message: isRpcError ? errorMessage : error.message,
            ...(isRpcError && (error as any).originalError ? { 
              originalError: (error as any).originalError 
            } : {}),
            stack: env.nodeEnv === 'development' ? error.stack : undefined
          }
        : { message: 'Unknown error' };

    return res.status(statusCode).json({
      error: errorMessage,
      details: errorResponse,
      ...(isRpcError ? { 
        retryable: true,
        suggestion: 'The XL1 blockchain service is experiencing issues. Your delivery verification will be retried automatically when the service is restored.'
      } : {})
    });
  }
});

// POST /deliveries/:id/photo - Upload delivery photo (requires authentication)
router.post(
  '/deliveries/:id/photo',
  photoUploadLimiter,
  authenticateToken,
  validateRequest(deliveryIdParamSchema, 'params'),
  upload.single('photo'),
  // Multer error handler middleware
  (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            error: 'File too large', 
            message: 'Photo size exceeds the maximum allowed size of 25MB. Please compress or resize the image before uploading.',
            maxSize: '25MB'
          });
        }
        return res.status(400).json({ 
          error: 'File upload error', 
          message: err.message 
        });
      }
      return res.status(500).json({ 
        error: 'File upload error', 
        message: err instanceof Error ? err.message : 'Unknown error'
      });
    }
    next();
  },
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'photo file is required' });
      return;
    }

    try {
      const delivery = await prisma.delivery.findUnique({ where: { id } });

      if (!delivery) {
        res.status(404).json({ error: 'Delivery not found' });
        return;
      }

      // Generate unique filename: photo-{driverId}-{timestamp}.{ext}
      const fileExt = file.originalname.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const driverId = delivery.driverId || 'unknown';
      const uniqueFilename = `photo-${driverId}-${timestamp}.${fileExt}`;

      const ipfsHash = await ipfsService.uploadBuffer(file.buffer, uniqueFilename);

      // Get photoHash from request body if provided (mobile app sends it)
      const { photoHash } = req.body as { photoHash?: string };

      const updatedDelivery = await prisma.delivery.update({
        where: { id },
        data: {
          photoIpfsHash: ipfsHash,
          ...(photoHash ? { photoHash } : {}) // Store hash if provided
        }
      });

      res.json({
        success: true,
        ipfsHash,
        delivery: updatedDelivery
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Photo upload error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('File too large') || error.message.includes('LIMIT_FILE_SIZE')) {
          res.status(413).json({ 
            error: 'File too large', 
            message: 'Photo size exceeds the maximum allowed size of 25MB. Please compress or resize the image before uploading.',
            maxSize: '25MB'
          });
          return;
        }
        if (error.message.includes('Pinata')) {
          res.status(502).json({ 
            error: 'IPFS upload failed', 
            message: 'Failed to upload photo to IPFS. Please try again later.' 
          });
          return;
        }
      }
      
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  }
);

// POST /deliveries/:id/signature - Upload delivery signature (requires authentication)
router.post(
  '/deliveries/:id/signature',
  photoUploadLimiter,
  authenticateToken,
  validateRequest(deliveryIdParamSchema, 'params'),
  upload.single('signature'),
  // Multer error handler middleware
  (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            error: 'File too large', 
            message: 'Signature size exceeds the maximum allowed size of 25MB. Please compress or resize the image before uploading.',
            maxSize: '25MB'
          });
        }
        return res.status(400).json({ 
          error: 'File upload error', 
          message: err.message 
        });
      }
      return res.status(500).json({ 
        error: 'File upload error', 
        message: err instanceof Error ? err.message : 'Unknown error'
      });
    }
    next();
  },
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const file = req.file;
    
    // Only validate signatureBase64 if no file is uploaded
    if (!file) {
      // Validate body if using base64 signature
      const bodyValidation = signatureUploadSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: bodyValidation.error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
    }
    
    const { signatureBase64 } = req.body as { signatureBase64?: string };

    // Support both file upload and base64 data URI
    let buffer: Buffer;
    let filename = 'signature.png';

    if (file) {
      buffer = file.buffer;
      filename = file.originalname;
      
      // eslint-disable-next-line no-console
      console.log('Signature upload - File received:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferLength: file.buffer.length,
        firstBytes: file.buffer.subarray(0, 8).toString('hex')
      });
      
      // Validate PNG file signature
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSignature);
      
      if (!isPng) {
        // eslint-disable-next-line no-console
        console.warn('Signature upload - File does not appear to be a valid PNG');
        // eslint-disable-next-line no-console
        console.warn('First 16 bytes (hex):', buffer.subarray(0, 16).toString('hex'));
      } else {
        // eslint-disable-next-line no-console
        console.log('Signature upload - Valid PNG file detected');
      }
    } else if (signatureBase64) {
      // Handle base64 data URI
      // Support multiple data URI formats: data:image/png;base64, or data:image/png;base64, (with space)
      let base64Data = signatureBase64.trim();
      
      // Remove data URI prefix if present
      if (base64Data.startsWith('data:')) {
        // Match: data:image/[format];base64,[data]
        const base64Match = base64Data.match(/^data:image\/[^;]+;base64,(.+)$/);
        if (base64Match && base64Match[1]) {
          base64Data = base64Match[1];
        } else {
          // Fallback: try simple replace
          base64Data = base64Data.replace(/^data:image\/[^;]+;base64,/, '');
        }
      }
      
      // Remove any whitespace from base64 string
      base64Data = base64Data.replace(/\s/g, '');
      
      // eslint-disable-next-line no-console
      console.log('Signature upload - Base64 data length:', base64Data.length);
      // eslint-disable-next-line no-console
      console.log('Signature upload - Base64 preview (first 50 chars):', base64Data.substring(0, 50));
      
      try {
        buffer = Buffer.from(base64Data, 'base64');
        // eslint-disable-next-line no-console
        console.log('Signature upload - Buffer created, size:', buffer.length, 'bytes');
        
        // Validate buffer is not empty
        if (buffer.length === 0) {
          // eslint-disable-next-line no-console
          console.error('Signature upload - Buffer is empty');
          res.status(400).json({ error: 'Invalid signature data: buffer is empty' });
          return;
        }
        
        // Basic PNG validation: PNG files start with specific bytes
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSignature);
        
        if (!isPng) {
          // eslint-disable-next-line no-console
          console.warn('Signature upload - Buffer does not appear to be a valid PNG file');
          // Don't fail here, as some image formats might be valid
          // But log for debugging
        } else {
          // eslint-disable-next-line no-console
          console.log('Signature upload - Valid PNG file detected');
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Signature upload - Failed to create buffer from base64:', error);
        res.status(400).json({ error: 'Invalid base64 signature data' });
        return;
      }
    } else {
      res.status(400).json({ error: 'signature file or signatureBase64 is required' });
      return;
    }

    try {
      const delivery = await prisma.delivery.findUnique({ where: { id } });

      if (!delivery) {
        res.status(404).json({ error: 'Delivery not found' });
        return;
      }

      // Generate unique filename: signature-{driverId}-{timestamp}.{ext}
      const fileExt = filename.split('.').pop() || 'png';
      const timestamp = Date.now();
      const driverId = delivery.driverId || 'unknown';
      const uniqueFilename = `signature-${driverId}-${timestamp}.${fileExt}`;

      const ipfsHash = await ipfsService.uploadBuffer(buffer, uniqueFilename);

      // Get signatureHash from request body if provided (mobile app sends it)
      const { signatureHash } = req.body as { signatureHash?: string };

      const updatedDelivery = await prisma.delivery.update({
        where: { id },
        data: {
          signatureIpfsHash: ipfsHash,
          ...(signatureHash ? { signatureHash } : {}) // Store hash if provided
        }
      });

      res.json({
        success: true,
        ipfsHash,
        delivery: updatedDelivery
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Signature upload error:', error);
      res.status(500).json({ error: 'Failed to upload signature' });
    }
  }
);

/**
 * @swagger
 * /api/deliveries/by-proof/{proofHash}:
 *   get:
 *     summary: Get delivery by proof hash
 *     description: Retrieve a delivery by its proof hash (XL1 transaction hash)
 *     tags: [Deliveries]
 *     parameters:
 *       - in: path
 *         name: proofHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Proof hash (XL1 transaction hash)
 *         example: "0x1234567890abcdef..."
 *     responses:
 *       200:
 *         description: Delivery details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Delivery'
 *       404:
 *         description: Delivery not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/deliveries/by-proof/:proofHash',
  validateRequest(proofHashParamSchema, 'params'),
  async (req, res) => {
    // Normalize proof hash (remove 0x prefix if present for database lookup)
    const { proofHash: originalHash } = req.params;
    const normalizedHash = originalHash.toLowerCase().startsWith('0x') ? originalHash.toLowerCase().slice(2) : originalHash.toLowerCase();

    try {
      // Try both with and without 0x prefix in case database has different format
      let delivery = await prisma.delivery.findUnique({
        where: { proofHash: normalizedHash }
        // Note: Driver relation not available, fetch driver separately if needed
      });
      
      // If not found with normalized hash, try with original format (in case it's stored with 0x or different case)
      if (!delivery) {
        delivery = await prisma.delivery.findUnique({
          where: { proofHash: originalHash.toLowerCase() }
        });
      }
      
      // Also try with 0x prefix if original didn't have it
      if (!delivery && !originalHash.toLowerCase().startsWith('0x')) {
        delivery = await prisma.delivery.findUnique({
          where: { proofHash: `0x${normalizedHash}` }
        });
      }

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Check if NFC verification was performed for THIS specific delivery
    // This checks the delivery's boundWitnessData, not the driver's stored NFC records
    const driverNfcVerified = checkDeliveryNfcVerification(delivery.boundWitnessData);

    // Add driver NFC verification status to delivery response
    // This indicates whether NFC was verified for THIS specific delivery, not the driver in general
    const deliveryWithDriver = {
      ...delivery,
      driverNfcVerified
    };

    return res.json(deliveryWithDriver);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Fetch delivery error:', error);
    return res.status(500).json({ error: 'Failed to fetch delivery' });
  }
  }
);

/**
 * @swagger
 * /api/deliveries/{id}:
 *   get:
 *     summary: Get delivery by ID
 *     description: Retrieve a single delivery by its UUID
 *     tags: [Deliveries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Delivery details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 delivery:
 *                   $ref: '#/components/schemas/Delivery'
 *       404:
 *         description: Delivery not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /deliveries/:id - Get delivery by ID
// NOTE: This route must be placed AFTER more specific routes like /deliveries/:id/verify, /deliveries/:id/photo, etc.
router.get(
  '/deliveries/:id',
  validateRequest(deliveryIdParamSchema, 'params'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id }
      });

      if (!delivery) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      // Check if NFC verification was performed for THIS specific delivery
      const driverNfcVerified = checkDeliveryNfcVerification(delivery.boundWitnessData);

      return res.json({
        ...delivery,
        driverNfcVerified
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Fetch delivery error:', error);
      return res.status(500).json({ error: 'Failed to fetch delivery' });
    }
  }
);


router.get(
  '/proofs/:proofHash',
  validateRequest(proofHashParamSchema, 'params'),
  async (req, res) => {
    const { proofHash } = req.params;

  try {
    const proof = await xyoService.verifyLocationProof(proofHash);
    return res.json(proof);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Fetch proof error:', error);
    return res.status(500).json({ error: 'Failed to fetch proof details' });
  }
  }
);

router.get(
  '/proofs/:proofHash/validate',
  validateRequest(proofHashParamSchema, 'params'),
  async (req, res) => {
    // Normalize proof hash (remove 0x prefix if present)
    let { proofHash } = req.params;
    proofHash = proofHash.toLowerCase().startsWith('0x') ? proofHash.toLowerCase().slice(2) : proofHash.toLowerCase();

  try {
    const validation = await xyoService.validateBoundWitness(proofHash);
    return res.json(validation);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Validate proof error:', error);
    return res.status(500).json({ error: 'Failed to validate bound witness' });
  }
  }
);

// GET /proofs/:proofHash/chain - Get bound witness chain
router.get(
  '/proofs/:proofHash/chain',
  validateRequest(proofHashParamSchema, 'params'),
  async (req, res) => {
    const { proofHash } = req.params;
    const maxDepth = req.query.depth ? parseInt(req.query.depth as string, 10) : 5;

  try {
    // Try to get stored bound witness data from database first (for real transactions)
    let storedBoundWitnessData: unknown = undefined;
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { proofHash },
        select: { boundWitnessData: true }
      });
      if (delivery?.boundWitnessData) {
        storedBoundWitnessData = delivery.boundWitnessData;
      }
    } catch {
      // If database lookup fails, continue without stored data
    }

    const chain = await xyoService.getBoundWitnessChain(proofHash, maxDepth, storedBoundWitnessData);
    return res.json({ chain, depth: chain.length });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Get bound witness chain error:', error);
    return res.status(500).json({ error: 'Failed to retrieve bound witness chain' });
  }
  }
);

// GET /proofs/:proofHash/crypto - Get cryptographic details
router.get(
  '/proofs/:proofHash/crypto',
  validateRequest(proofHashParamSchema, 'params'),
  async (req, res) => {
    const { proofHash } = req.params;

  try {
    // Try to get stored bound witness data from database first (for mock transactions)
    let storedBoundWitnessData: unknown = undefined;
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { proofHash },
        select: { boundWitnessData: true }
      });
      if (delivery?.boundWitnessData) {
        storedBoundWitnessData = delivery.boundWitnessData;
      }
    } catch {
      // If database lookup fails, continue without stored data
    }

    const cryptoDetails = await xyoService.getCryptographicDetails(proofHash, storedBoundWitnessData);
    return res.json(cryptoDetails);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Get cryptographic details error:', error);
    return res.status(500).json({ error: 'Failed to retrieve cryptographic details' });
  }
  }
);

// Diagnostic endpoint to check what's stored for a delivery
router.get(
  '/deliveries/by-order/:orderId/diagnostic',
  validateRequest(orderIdParamSchema, 'params'),
  async (req, res) => {
    const { orderId } = req.params;

  try {
    const delivery = await prisma.delivery.findUnique({
      where: { orderId }
    });

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Extract hash from boundWitnessData if available
    let hashFromBoundWitness: string | null = null;
    let allHashes: string[] = [];
    
    if (delivery.boundWitnessData && typeof delivery.boundWitnessData === 'object') {
      const bwData = delivery.boundWitnessData as Record<string, unknown>;
      
      // Check all possible hash fields
      if ('$hash' in bwData && typeof bwData.$hash === 'string') {
        hashFromBoundWitness = bwData.$hash;
        allHashes.push(`$hash: ${bwData.$hash}`);
      }
      if ('_hash' in bwData && typeof bwData._hash === 'string') {
        if (!hashFromBoundWitness) hashFromBoundWitness = bwData._hash;
        allHashes.push(`_hash: ${bwData._hash}`);
      }
      if ('hash' in bwData && typeof bwData.hash === 'string') {
        if (!hashFromBoundWitness) hashFromBoundWitness = bwData.hash;
        allHashes.push(`hash: ${bwData.hash}`);
      }
      if ('$sourceQuery' in bwData && typeof bwData.$sourceQuery === 'string') {
        allHashes.push(`$sourceQuery (query hash, not bound witness): ${bwData.$sourceQuery}`);
      }
    }

    return res.json({
      orderId: delivery.orderId,
      proofHash: delivery.proofHash,
      hashFromBoundWitness,
      allHashes,
      hasBoundWitnessData: Boolean(delivery.boundWitnessData),
      archivistResponseSuccess: delivery.boundWitnessData && typeof delivery.boundWitnessData === 'object'
        ? (delivery.boundWitnessData as Record<string, unknown>).archivistResponse
        : null,
      status: delivery.status,
      verifiedAt: delivery.verifiedAt
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Diagnostic error:', error);
    return res.status(500).json({ error: 'Failed to get diagnostic info' });
  }
  }
);

// GET /proofs/:proofHash/diviner - Get Diviner verification for a proof
router.get(
  '/proofs/:proofHash/diviner',
  validateRequest(proofHashParamSchema, 'params'),
  async (req, res) => {
    const { proofHash } = req.params;

    try {
      // Get delivery to extract location data
      const delivery = await prisma.delivery.findUnique({
        where: { proofHash }
      });

      if (!delivery || !delivery.actualLat || !delivery.actualLon || !delivery.verifiedAt) {
        return res.status(404).json({ 
          error: 'Delivery not found or missing location data',
          message: 'Diviner verification requires verified delivery with location data'
        });
      }

      // Query Diviner for location verification
      const divinerVerification = await xyoService.verifyLocationWithDiviner(
        proofHash,
        delivery.actualLat,
        delivery.actualLon,
        delivery.verifiedAt.getTime()
      );

      return res.json(divinerVerification);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Diviner verification error:', error);
      return res.status(500).json({ 
        error: 'Failed to verify location with Diviner',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * @swagger
 * /api/proofs/{proofHash}/accuracy:
 *   get:
 *     summary: Get location accuracy metrics
 *     description: Calculate and return location accuracy metrics for a delivery proof, including GPS accuracy, XYO Network accuracy, witness node counts, and precision metrics
 *     tags: [Deliveries]
 *     parameters:
 *       - in: path
 *         name: proofHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Proof hash (XL1 transaction hash)
 *         example: "0x1234567890abcdef..."
 *     responses:
 *       200:
 *         description: Location accuracy metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accuracyScore:
 *                   type: number
 *                   description: Accuracy score in meters
 *                 confidenceLevel:
 *                   type: string
 *                   enum: [high, medium, low]
 *                 precisionRadius:
 *                   type: number
 *                 witnessNodeCount:
 *                   type: number
 *                 gpsAccuracy:
 *                   type: number
 *                 xyoNetworkAccuracy:
 *                   type: number
 *                 accuracyImprovement:
 *                   type: number
 *                 consensusAgreement:
 *                   type: number
 *                 nodeProximityScore:
 *                   type: number
 *                 isMocked:
 *                   type: boolean
 *       404:
 *         description: Delivery not found or missing location data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /proofs/:proofHash/accuracy - Get location accuracy metrics for a proof
router.get(
  '/proofs/:proofHash/accuracy',
  validateRequest(proofHashParamSchema, 'params'),
  async (req, res) => {
    const { proofHash } = req.params;

    try {
      // Get delivery to extract location data and bound witness metadata
      const delivery = await prisma.delivery.findUnique({
        where: { proofHash }
      });

      if (!delivery || !delivery.actualLat || !delivery.actualLon) {
        return res.status(404).json({ 
          error: 'Delivery not found or missing location data',
          message: 'Location accuracy calculation requires verified delivery with location data'
        });
      }

      // Check if this is a real XL1 transaction (not mocked) from stored boundWitnessData
      // This is more reliable than querying XL1 every time
      let isRealXL1Transaction = false;
      if (delivery.boundWitnessData && typeof delivery.boundWitnessData === 'object') {
        const bwData = delivery.boundWitnessData as Record<string, unknown>;
        // Check if it's marked as XL1 and not mocked
        if (bwData.isXL1 === true && bwData.isMocked !== true) {
          isRealXL1Transaction = true;
        }
      }

      // Get witness nodes from Diviner verification if available
      let witnessNodes: unknown[] = [];
      try {
        const divinerVerification = await xyoService.verifyLocationWithDiviner(
          proofHash,
          delivery.actualLat,
          delivery.actualLon,
          delivery.verifiedAt ? delivery.verifiedAt.getTime() : Date.now()
        );
        
        // Extract witness nodes from Diviner response if available
        if (divinerVerification.details?.witnessNodes) {
          witnessNodes = divinerVerification.details.witnessNodes as unknown[];
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Could not fetch Diviner data for accuracy calculation, using nearby nodes:', error);
      }

                  // Calculate location accuracy
                  // Pass proofHash to allow extraction of witness nodes from XL1 transaction
                  // Include destination and distance for actual delivery accuracy calculation
                  // Pass isRealXL1Transaction flag to ensure correct isMocked status
                  const accuracy = await xyoService.calculateLocationAccuracy(
                    delivery.actualLat,
                    delivery.actualLon,
                    witnessNodes as any[],
                    proofHash, // Allow extraction from XL1 if witness nodes not available
                    delivery.destinationLat,
                    delivery.destinationLon,
                    delivery.distanceFromDest,
                    isRealXL1Transaction // Pass flag indicating if this is a real XL1 transaction
                  );

      return res.json(accuracy);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Location accuracy calculation error:', error);
      return res.status(500).json({ 
        error: 'Failed to calculate location accuracy',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * @swagger
 * /api/network/statistics:
 *   get:
 *     summary: Get network-wide statistics
 *     description: Retrieve XYO Network statistics including node counts, coverage area, network health, and delivery statistics
 *     tags: [Network]
 *     responses:
 *       200:
 *         description: Network statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalNodes:
 *                   type: integer
 *                   description: Total number of witness nodes
 *                 activeNodes:
 *                   type: integer
 *                   description: Number of active nodes
 *                 nodeTypes:
 *                   type: object
 *                   properties:
 *                     sentinel:
 *                       type: integer
 *                     bridge:
 *                       type: integer
 *                     diviner:
 *                       type: integer
 *                 coverageArea:
 *                   type: object
 *                   properties:
 *                     totalKm2:
 *                       type: number
 *                     countries:
 *                       type: integer
 *                 networkHealth:
 *                   type: string
 *                   enum: [excellent, good, fair, poor]
 *                 deliveries:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     verified:
 *                       type: integer
 *                 lastUpdated:
 *                   type: integer
 *                   format: int64
 *                 isMocked:
 *                   type: boolean
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /network/statistics - Get network-wide statistics
router.get(
  '/network/statistics',
  async (req, res) => {
    try {
      const stats = await xyoService.getNetworkStatistics();
      return res.json(stats);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Get network statistics error:', error);
      return res.status(500).json({ error: 'Failed to retrieve network statistics' });
    }
  }
);

// GET /network/nodes - Get all witness nodes with optional filtering
router.get(
  '/network/nodes',
  validateRequest(networkNodesQuerySchema, 'query'),
  async (req, res) => {
    try {
      const filters = {
        type: req.query.type as 'sentinel' | 'bridge' | 'diviner' | undefined,
        status: req.query.status as 'active' | 'inactive' | undefined,
        minLat: req.query.minLat ? Number(req.query.minLat) : undefined,
        maxLat: req.query.maxLat ? Number(req.query.maxLat) : undefined,
        minLon: req.query.minLon ? Number(req.query.minLon) : undefined,
        maxLon: req.query.maxLon ? Number(req.query.maxLon) : undefined
      };
      
      const nodes = await xyoService.getAllWitnessNodes(filters);
      return res.json(nodes);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Get witness nodes error:', error);
      return res.status(500).json({ error: 'Failed to retrieve witness nodes' });
    }
  }
);

// GET /network/nodes/:nodeAddress - Get specific witness node information
router.get(
  '/network/nodes/:nodeAddress',
  validateRequest(nodeAddressParamSchema, 'params'),
  async (req, res) => {
    const { nodeAddress } = req.params;

    try {
      const nodeInfo = await xyoService.getWitnessNodeInfo(nodeAddress);
      return res.json(nodeInfo);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Get witness node info error:', error);
      return res.status(500).json({ error: 'Failed to retrieve witness node information' });
    }
  }
);

// GET /proofs/:proofHash/actual-block - Get the actual block number for an XL1 transaction
// This endpoint can be called periodically to check if a transaction has been committed to a block
router.get(
  '/proofs/:proofHash/actual-block',
  validateRequest(proofHashParamSchema, 'params'),
  async (req, res) => {
    const { proofHash } = req.params;

    try {
      const actualBlockNumber = await xyoService.getActualBlockNumberForTransaction(proofHash);
      
      return res.json({
        transactionHash: proofHash,
        actualBlockNumber,
        isCommitted: actualBlockNumber !== null
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Get actual block number error:', error);
      return res.status(500).json({ error: 'Failed to retrieve actual block number' });
    }
  }
);

// GET /blocks/:blockNumber - Get block information by block number
// Note: This may not be available in all XL1 RPC implementations
router.get(
  '/blocks/:blockNumber',
  validateRequest(z.object({ blockNumber: z.coerce.number().int().positive() }), 'params'),
  async (req, res) => {
    const { blockNumber } = req.params;

    try {
      const blockData = await xyoService.getBlockByNumber(Number(blockNumber));
      
      if (!blockData) {
        return res.status(404).json({ 
          error: 'Block not found',
          message: 'Block number query may not be supported by this XL1 RPC endpoint, or block does not exist'
        });
      }

      return res.json({
        blockNumber: Number(blockNumber),
        block: blockData.block,
        transactions: blockData.transactions,
        transactionCount: blockData.transactions.length
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Get block by number error:', error);
      return res.status(500).json({ error: 'Failed to retrieve block information' });
    }
  }
);

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default router;


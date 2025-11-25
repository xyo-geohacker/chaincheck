/**
 * Minimal Express.js Integration Example
 * 
 * This example shows the absolute minimum code needed to integrate
 * XYO Network proof-of-location into an existing Express.js application.
 * 
 * Prerequisites:
 * - XYO services copied to src/services/xyo/
 * - XYO SDK dependencies installed
 * - Environment variables configured
 */

import express from 'express';
import { XyoService } from '../src/services/xyo/xyo-service.js';

const app = express();
app.use(express.json());

// Initialize XYO service (singleton pattern recommended)
const xyoService = new XyoService();

/**
 * Minimal delivery verification endpoint with XYO integration
 * 
 * This endpoint:
 * 1. Accepts delivery verification request
 * 2. Creates XYO proof on XL1 blockchain
 * 3. Returns proof hash for storage
 */
app.post('/api/deliveries/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, timestamp, driverId } = req.body;

  try {
    // TODO: Your existing delivery lookup
    // const delivery = await getDeliveryById(id);

    // Create XYO proof (adds blockchain verification)
    const proof = await xyoService.createLocationProofXL1({
      latitude,
      longitude,
      timestamp: timestamp || Date.now(),
      deliveryId: id,
      driverId: driverId || 'default-driver',
      metadata: {
        // Add your custom metadata here
        orderId: id,
      }
    });

    // TODO: Update your delivery record with proof hash
    // await updateDelivery(id, {
    //   proofHash: proof.proofHash,
    //   xl1TransactionHash: proof.xl1TransactionHash,
    //   status: 'VERIFIED'
    // });

    res.json({
      success: true,
      proofHash: proof.proofHash,
      xl1TransactionHash: proof.xl1TransactionHash,
      blockNumber: proof.blockNumber
    });
  } catch (error) {
    console.error('XYO verification failed:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Proof verification endpoint
 * 
 * Allows verification of any proof hash from XL1 blockchain
 */
app.get('/api/proofs/:proofHash', async (req, res) => {
  const { proofHash } = req.params;

  try {
    const result = await xyoService.verifyLocationProof(proofHash);

    if (result.isValid) {
      res.json({
        valid: true,
        proofHash,
        data: result.data
      });
    } else {
      res.status(404).json({
        valid: false,
        proofHash,
        errors: result.errors
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Verification failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


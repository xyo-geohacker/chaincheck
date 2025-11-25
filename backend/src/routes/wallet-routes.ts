import { Router } from 'express';
import { validateRequest } from '../middleware/validation-middleware.js';
import { mnemonicSchema } from '../lib/validation-schemas.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * @swagger
 * /api/wallet/generate-mnemonic:
 *   get:
 *     summary: Generate mnemonic seed phrase
 *     description: Generates a new 12-word mnemonic seed phrase for XL1 wallet and returns the derived address
 *     tags: [Wallet]
 *     responses:
 *       200:
 *         description: Mnemonic generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mnemonic:
 *                   type: string
 *                   description: 12-word mnemonic seed phrase
 *                   example: "word1 word2 word3 ... word12"
 *                 address:
 *                   type: string
 *                   description: Derived XL1 address from mnemonic
 *                 warning:
 *                   type: string
 *                   description: Security warning message
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/wallet/generate-mnemonic
 * Generates a new 12-word mnemonic seed phrase for XL1 wallet
 * 
 * Response:
 * {
 *   mnemonic: string (12 words),
 *   address: string (derived XL1 address),
 *   warning: string (security warning)
 * }
 */
router.get('/wallet/generate-mnemonic', async (req, res) => {
  try {
    // Dynamically import packages
    // Note: disableGloballyUnique() no longer needed in SDK 5.x
    const { HDWallet } = await import('@xyo-network/wallet');
    const { generateXyoBaseWalletFromPhrase, ADDRESS_INDEX } = await import('@xyo-network/xl1-protocol-sdk');
    
    // Generate a new 12-word mnemonic
    const mnemonic = HDWallet.generateMnemonic();
    
    // Verify it works by generating a wallet and deriving address
    const wallet = await generateXyoBaseWalletFromPhrase(mnemonic);
    const account = await wallet.derivePath(ADDRESS_INDEX.XYO);
    
    return res.json({
      success: true,
      mnemonic,
      address: account.address,
      warning: 'Keep this mnemonic secure and never share it publicly! Store it in a safe place.'
    });
  } catch (error) {
    logger.error('Error generating mnemonic', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate mnemonic',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @swagger
 * /api/wallet/validate-mnemonic:
 *   post:
 *     summary: Validate mnemonic seed phrase
 *     description: Validates a mnemonic phrase and returns the derived XL1 address if valid
 *     tags: [Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mnemonic
 *             properties:
 *               mnemonic:
 *                 type: string
 *                 description: 12-word mnemonic seed phrase
 *                 example: "word1 word2 word3 ... word12"
 *     responses:
 *       200:
 *         description: Mnemonic is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 address:
 *                   type: string
 *                   description: Derived XL1 address
 *       400:
 *         description: Invalid mnemonic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
/**
 * POST /api/wallet/validate-mnemonic
 * Validates a mnemonic phrase and returns the derived address
 * 
 * Body: { mnemonic: string }
 * Response: { valid: boolean, address?: string, error?: string }
 */
router.post('/wallet/validate-mnemonic', validateRequest(mnemonicSchema), async (req, res) => {
  const { mnemonic } = req.body;
  
  try {
    // Dynamically import packages
    // Note: disableGloballyUnique() no longer needed in SDK 5.x
    const { generateXyoBaseWalletFromPhrase, ADDRESS_INDEX } = await import('@xyo-network/xl1-protocol-sdk');
    
    // Validate by attempting to generate wallet
    const wallet = await generateXyoBaseWalletFromPhrase(mnemonic.trim());
    const account = await wallet.derivePath(ADDRESS_INDEX.XYO);
    
    return res.json({
      valid: true,
      address: account.address
    });
  } catch (error) {
    return res.status(400).json({
      valid: false,
      error: 'Invalid mnemonic phrase',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;


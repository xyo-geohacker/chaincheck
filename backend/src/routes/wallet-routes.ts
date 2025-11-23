import { Router } from 'express';
import { disableGloballyUnique } from '@xylabs/object';
import { validateRequest } from '../middleware/validation-middleware.js';
import { mnemonicSchema } from '../lib/validation-schemas.js';

const router = Router();

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
    // MUST call this before importing XYO SDK to prevent "Global unique item" errors
    disableGloballyUnique();
    
    // Dynamically import packages
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
    // eslint-disable-next-line no-console
    console.error('Error generating mnemonic:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate mnemonic',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

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
    // MUST call this before importing XYO SDK to prevent "Global unique item" errors
    disableGloballyUnique();
    
    // Dynamically import packages
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


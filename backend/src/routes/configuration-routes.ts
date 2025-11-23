/**
 * Configuration API Routes
 * Allows reading and updating application configuration
 */

import { Router } from 'express';
import { ConfigurationService, type ConfigurationCategory, type ConfigurationUpdate } from '../services/configuration-service.js';
import { authenticateConfigToken } from '../middleware/config-auth-middleware.js';

const router = Router();
const configurationService = new ConfigurationService();

// GET /api/configuration/:category - Get configuration for a category
router.get('/configuration/:category', authenticateConfigToken, async (req, res) => {
  try {
    const { category } = req.params;

    if (!['backend', 'web', 'mobile'].includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: 'Category must be one of: backend, web, mobile'
      });
    }

    const config = await configurationService.getConfiguration(category as ConfigurationCategory);

    return res.json({
      success: true,
      category,
      configuration: config
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get configuration:', error);
    return res.status(500).json({
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/configuration - Get all configuration
router.get('/configuration', authenticateConfigToken, async (req, res) => {
  try {
    const [backend, web, mobile] = await Promise.all([
      configurationService.getConfiguration('backend'),
      configurationService.getConfiguration('web'),
      configurationService.getConfiguration('mobile')
    ]);

    return res.json({
      success: true,
      configuration: {
        backend,
        web,
        mobile
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get all configuration:', error);
    return res.status(500).json({
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// PUT /api/configuration/:category - Update configuration for a category
router.put('/configuration/:category', authenticateConfigToken, async (req, res) => {
  try {
    const { category } = req.params;
    const { updates } = req.body as { updates: ConfigurationUpdate[] };

    if (!['backend', 'web', 'mobile'].includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: 'Category must be one of: backend, web, mobile'
      });
    }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Updates must be an array'
      });
    }

    const result = await configurationService.updateConfiguration(
      category as ConfigurationCategory,
      updates
    );

    if (result.success) {
      return res.json({
        success: true,
        message: `Updated ${result.updated} configuration item(s)`,
        updated: result.updated
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Some updates failed',
        updated: result.updated,
        errors: result.errors
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update configuration:', error);
    return res.status(500).json({
      error: 'Failed to update configuration',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/configuration/:category/:key - Delete a configuration item
router.delete('/configuration/:category/:key', authenticateConfigToken, async (req, res) => {
  try {
    const { category, key } = req.params;

    if (!['backend', 'web', 'mobile'].includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: 'Category must be one of: backend, web, mobile'
      });
    }

    const deleted = await configurationService.deleteConfiguration(
      category as ConfigurationCategory,
      key
    );

    if (deleted) {
      return res.json({
        success: true,
        message: 'Configuration deleted'
      });
    } else {
      return res.status(404).json({
        error: 'Configuration not found'
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete configuration:', error);
    return res.status(500).json({
      error: 'Failed to delete configuration',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/configuration/initialize - Initialize default configuration
router.post('/configuration/initialize', authenticateConfigToken, async (req, res) => {
  try {
    await configurationService.initializeDefaults();

    return res.json({
      success: true,
      message: 'Default configuration initialized'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize configuration:', error);
    return res.status(500).json({
      error: 'Failed to initialize configuration',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;


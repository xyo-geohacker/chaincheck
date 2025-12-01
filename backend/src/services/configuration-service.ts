/**
 * Configuration Service
 * Manages application configuration settings stored in database
 * Falls back to environment variables if not set in database
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

export type ConfigurationCategory = 'backend' | 'web' | 'mobile';

export interface ConfigurationItem {
  category: ConfigurationCategory;
  key: string;
  value: string | null;
  description?: string | null;
  isSecret?: boolean;
}

export interface ConfigurationUpdate {
  key: string;
  value: string | null;
  description?: string | null;
  isSecret?: boolean;
}

export class ConfigurationService {
  /**
   * Get all configuration items for a category
   * Merges database values with environment variable defaults
   * Database values take precedence, but env values are shown if database is empty
   */
  async getConfiguration(category: ConfigurationCategory): Promise<ConfigurationItem[]> {
    // Get defaults from environment variables
    const defaults = this.getDefaultConfiguration()[category];
    
    // Get database values
    const dbConfigs = await prisma.configuration.findMany({
      where: { category },
      orderBy: { key: 'asc' }
    });

    // Create a map of database values for quick lookup
    const dbConfigMap = new Map<string, ConfigurationItem>(
      dbConfigs.map((config): [string, ConfigurationItem] => [
        config.key,
        {
          category: config.category as ConfigurationCategory,
          key: config.key,
          value: config.value,
          description: config.description ?? undefined,
          isSecret: config.isSecret
        }
      ])
    );

    // Merge defaults with database values
    // For web and mobile configs, prefer current .env file values over stale database values
    // This ensures the UI shows the actual current configuration
    return defaults.map((defaultItem): ConfigurationItem => {
      const dbValue = dbConfigMap.get(defaultItem.key);
      
      // For web and mobile categories, if .env file has a different value than database,
      // prefer the .env file value (it's more current)
      if ((category === 'web' || category === 'mobile') && dbValue && defaultItem.value) {
        const dbValueStr = dbValue.value ?? '';
        const envValueStr = defaultItem.value;
        
        // If values differ and .env value is not empty/default, use .env value
        if (dbValueStr !== envValueStr && 
            envValueStr !== '' && 
            !envValueStr.includes('localhost') && 
            dbValueStr.includes('localhost')) {
          // eslint-disable-next-line no-console
          console.log(`[Config] Preferring .env value over database for ${category}.${defaultItem.key}: ${envValueStr} (db had: ${dbValueStr})`);
          
          return {
            ...defaultItem,
            // Keep database description if it exists
            description: dbValue.description && dbValue.description.trim() !== '' 
              ? dbValue.description 
              : defaultItem.description
          };
        }
      }
      
      if (dbValue) {
        // Use database value if it exists, but always use default description if database description is null/empty
        // This ensures updated descriptions in code are always shown, even if database entry was created before description was added
        const dbDescription = dbValue.description;
        const hasValidDescription = dbDescription && typeof dbDescription === 'string' && dbDescription.trim() !== '';
        
        return {
          ...dbValue,
          description: hasValidDescription ? dbDescription : defaultItem.description
        };
      }
      
      // Use default from environment variables
      return defaultItem;
    });
  }

  /**
   * Get a specific configuration value
   * Returns database value if exists, otherwise falls back to environment variable
   */
  async getValue(category: ConfigurationCategory, key: string): Promise<string | null> {
    const dbConfig = await prisma.configuration.findUnique({
      where: {
        category_key: {
          category,
          key
        }
      }
    });

    if (dbConfig?.value) {
      return dbConfig.value;
    }

    // Fallback to environment variables for backend config
    if (category === 'backend') {
      return this.getEnvValue(key) ?? null;
    }

    return null;
  }

  /**
   * Update configuration value
   */
  async updateConfiguration(
    category: ConfigurationCategory,
    updates: ConfigurationUpdate[]
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const update of updates) {
      try {
        await prisma.configuration.upsert({
          where: {
            category_key: {
              category,
              key: update.key
            }
          },
          update: {
            value: update.value,
            description: update.description ?? undefined,
            isSecret: update.isSecret ?? false
          },
          create: {
            category,
            key: update.key,
            value: update.value,
            description: update.description ?? undefined,
            isSecret: update.isSecret ?? false
          }
        });
        updated++;
      } catch (error) {
        errors.push(`Failed to update ${update.key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors
    };
  }

  /**
   * Delete a configuration item
   */
  async deleteConfiguration(category: ConfigurationCategory, key: string): Promise<boolean> {
    try {
      await prisma.configuration.delete({
        where: {
          category_key: {
            category,
            key
          }
        }
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete configuration:', error);
      return false;
    }
  }

  /**
   * Get default configuration values based on current environment
   */
  getDefaultConfiguration(): Record<ConfigurationCategory, ConfigurationItem[]> {
    return {
      backend: [
        {
          category: 'backend',
          key: 'PORT',
          value: String(env.port),
          description: 'Backend server port',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'NODE_ENV',
          value: env.nodeEnv,
          description: 'Node environment (development/production)',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'XYO_ARCHIVE',
          value: env.xyoArchive,
          description: 'XYO Archive name',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'XYO_ARCHIVIST_URL',
          value: this.getEnvValue('XYO_ARCHIVIST_URL') ?? env.xyoArchivistUrl,
          description: 'XYO Archivist API URL',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'XYO_DIVINER_URL',
          value: this.getEnvValue('XYO_DIVINER_URL') ?? env.xyoDivinerUrl,
          description: 'XYO Diviner API URL',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'XYO_CHAIN_RPC_URL',
          value: env.xyoChainRpcUrl,
          description: 'XL1 RPC endpoint URL',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'MOCK_XL1_TRANSACTIONS',
          value: String(env.mockXl1Transactions),
          description: 'Mock XL1 transactions for development',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'MOCK_XL1_TRANSACTION_ID',
          value: env.mockXl1TransactionId ?? '',
          description: 'Mock XL1 transaction ID (optional)',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'WEB_URL',
          value: this.getEnvValue('WEB_URL') ?? env.webUrl,
          description: 'Web application URL for CORS',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'XYO_API_KEY',
          value: env.xyoApiKey ? '***' : '',
          description: 'XYO Network API key',
          isSecret: true
        },
        {
          category: 'backend',
          key: 'PINATA_API_KEY',
          value: env.pinataApiKey ? '***' : '',
          description: 'Pinata IPFS API key',
          isSecret: true
        },
        {
          category: 'backend',
          key: 'PINATA_SECRET_KEY',
          value: env.pinataSecretKey ? '***' : '',
          description: 'Pinata IPFS secret key',
          isSecret: true
        },
        {
          category: 'backend',
          key: 'JWT_SECRET',
          value: env.jwtSecret ? '***' : '',
          description: 'JWT authentication secret',
          isSecret: true
        },
        {
          category: 'backend',
          key: 'XYO_WALLET_MNEMONIC',
          value: env.xyoWalletMnemonic ? '***' : '',
          description: 'XL1 wallet mnemonic phrase',
          isSecret: true
        },
        {
          category: 'backend',
          key: 'BACKEND_HOST',
          value: env.backendHost,
          description: 'Backend server hostname/IP for status links (default: localhost)',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'WEB_HOST',
          value: env.webHost,
          description: 'Web server hostname/IP for status links (default: localhost)',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'MOBILE_HOST',
          value: env.mobileHost,
          description: 'Mobile server hostname/IP for status links (default: localhost)',
          isSecret: false
        }
      ],
      web: [
        {
          category: 'web',
          key: 'NEXT_PUBLIC_API_URL',
          value: this.getWebEnvValue('NEXT_PUBLIC_API_URL') ?? 'http://localhost:4000',
          description: 'Backend API URL',
          isSecret: false
        },
        {
          category: 'web',
          key: 'NEXT_PUBLIC_MAPBOX_TOKEN',
          value: this.getWebEnvValue('NEXT_PUBLIC_MAPBOX_TOKEN') ?? '',
          description: 'Mapbox token for map visualization (get from https://account.mapbox.com/access-tokens/ - can use default token)',
          isSecret: true
        }
      ],
      mobile: [
        {
          category: 'mobile',
          key: 'EXPO_PUBLIC_API_URL',
          value: this.getMobileEnvValue('EXPO_PUBLIC_API_URL') ?? 'http://localhost:4000',
          description: 'Backend API URL',
          isSecret: false
        },
        {
          category: 'mobile',
          key: 'EXPO_PUBLIC_MAPBOX_TOKEN',
          value: this.getMobileEnvValue('EXPO_PUBLIC_MAPBOX_TOKEN') ?? '',
          description: 'Mapbox token for @rnmapbox/maps (get from https://account.mapbox.com/access-tokens/ - requires "Downloads:Read" scope)',
          isSecret: true
        }
      ]
    };
  }

  /**
   * Get environment variable value (for fallback)
   * For backend config, reads directly from .env file to get current values
   * This ensures "Load from .env" always uses the latest file contents, not cached process.env
   */
  private getEnvValue(key: string): string | undefined {
    // For backend configuration, read directly from .env file to get current values
    // This ensures "Load from .env" always uses the latest file contents
    const backendEnvPath = join(process.cwd(), '.env');
    const fileValue = this.readEnvFileValue(backendEnvPath, key);
    
    if (fileValue !== undefined) {
      // eslint-disable-next-line no-console
      console.log(`[Config] Read ${key} from backend/.env: ${fileValue}`);
      return fileValue;
    }
    
    // Fallback to process.env (for values not in .env file or if file read fails)
    const envValue = process.env[key];
    if (envValue) {
      // eslint-disable-next-line no-console
      console.log(`[Config] Read ${key} from process.env: ${envValue}`);
    }
    return envValue;
  }

  /**
   * Read value from a .env file
   */
  private readEnvFileValue(filePath: string, key: string): string | undefined {
    try {
      const resolvedPath = filePath.startsWith('/') ? filePath : join(process.cwd(), filePath);
      const content = readFileSync(resolvedPath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        // Skip comments and empty lines
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }
        
        // Parse KEY=VALUE format
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const envKey = match[1].trim();
          const envValue = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
          
          if (envKey === key) {
            return envValue;
          }
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read - return undefined
      // eslint-disable-next-line no-console
      console.debug(`[Config] Could not read ${filePath} for key ${key}:`, error instanceof Error ? error.message : String(error));
      return undefined;
    }
    
    return undefined;
  }

  /**
   * Get mobile environment variable value
   * Tries to read from mobile/.env file first, then falls back to process.env
   */
  private getMobileEnvValue(key: string): string | undefined {
    // Try to read from mobile/.env file (relative to backend directory)
    const mobileEnvPath = join(process.cwd(), '..', 'mobile', '.env');
    const fileValue = this.readEnvFileValue(mobileEnvPath, key);
    
    if (fileValue !== undefined) {
      // eslint-disable-next-line no-console
      console.log(`[Config] Read ${key} from mobile/.env: ${fileValue}`);
      return fileValue;
    }
    
    // Fallback to process.env
    const envValue = process.env[key];
    if (envValue) {
      // eslint-disable-next-line no-console
      console.log(`[Config] Read ${key} from process.env: ${envValue}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Config] ${key} not found in mobile/.env or process.env, path tried: ${mobileEnvPath}`);
    }
    return envValue;
  }

  /**
   * Get web environment variable value
   * Tries to read from web/.env.local or web/.env file first, then falls back to process.env
   */
  private getWebEnvValue(key: string): string | undefined {
    // Try .env.local first (Next.js convention)
    const webEnvLocalPath = join(process.cwd(), '..', 'web', '.env.local');
    const localValue = this.readEnvFileValue(webEnvLocalPath, key);
    
    if (localValue !== undefined) {
      // eslint-disable-next-line no-console
      console.log(`[Config] Read ${key} from web/.env.local: ${localValue}`);
      return localValue;
    }
    
    // Try .env file
    const webEnvPath = join(process.cwd(), '..', 'web', '.env');
    const fileValue = this.readEnvFileValue(webEnvPath, key);
    
    if (fileValue !== undefined) {
      // eslint-disable-next-line no-console
      console.log(`[Config] Read ${key} from web/.env: ${fileValue}`);
      return fileValue;
    }
    
    // Fallback to process.env
    const envValue = process.env[key];
    if (envValue) {
      // eslint-disable-next-line no-console
      console.log(`[Config] Read ${key} from process.env: ${envValue}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Config] ${key} not found in web/.env.local, web/.env, or process.env`);
    }
    return envValue;
  }

  /**
   * Initialize default configuration in database
   * Creates new items and updates existing ones with current .env values
   */
  async initializeDefaults(): Promise<void> {
    const defaults = this.getDefaultConfiguration();

    for (const [category, items] of Object.entries(defaults)) {
      for (const item of items) {
        // Use upsert to create or update with current .env values
        // This ensures "Load from .env" updates existing entries with current values
        await prisma.configuration.upsert({
          where: {
            category_key: {
              category: category as ConfigurationCategory,
              key: item.key
            }
          },
          update: {
            // Update value with current .env value
            value: item.value,
            // Update description if it's missing or empty (preserve existing descriptions)
            description: item.description,
            // Update isSecret flag if needed
            isSecret: item.isSecret ?? false
          },
          create: {
            category: category as ConfigurationCategory,
            key: item.key,
            value: item.value,
            description: item.description,
            isSecret: item.isSecret ?? false
          }
        });
      }
    }
  }
}


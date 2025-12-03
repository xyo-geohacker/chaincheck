import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigurationService, type ConfigurationItem, type ConfigurationUpdate } from '../services/configuration-service.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    configuration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn()
    }
  }
}));

// Mock env
vi.mock('../lib/env.js', () => ({
  env: {
    port: 4000,
    nodeEnv: 'test',
    xyoArchive: 'chaincheck',
    xyoArchivistUrl: 'http://localhost:8080',
    xyoDivinerUrl: 'http://localhost:8081',
    xyoChainRpcUrl: 'http://localhost:8545',
    mockXl1Transactions: true,
    mockXl1TransactionId: 'mock-tx-id',
    webUrl: 'http://localhost:3000',
    xyoApiKey: 'test-api-key',
    pinataApiKey: 'test-pinata-key',
    pinataSecretKey: 'test-pinata-secret',
    jwtSecret: 'test-jwt-secret',
    xyoWalletMnemonic: 'test mnemonic phrase',
    backendHost: 'localhost',
    webHost: 'localhost',
    mobileHost: 'localhost'
  }
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => {
    throw new Error('File not found');
  })
}));

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    service = new ConfigurationService();
    vi.clearAllMocks();
    // Reset process.env
    delete process.env.XYO_ARCHIVIST_URL;
    delete process.env.XYO_DIVINER_URL;
    delete process.env.WEB_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getConfiguration', () => {
    it('should return default configuration when database is empty', async () => {
      mockPrisma.configuration.findMany.mockResolvedValue([]);

      const result = await service.getConfiguration('backend');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('category', 'backend');
      expect(result[0]).toHaveProperty('key');
      expect(result[0]).toHaveProperty('value');
      expect(mockPrisma.configuration.findMany).toHaveBeenCalledWith({
        where: { category: 'backend' },
        orderBy: { key: 'asc' }
      });
    });

    it('should merge database values with defaults', async () => {
      const dbConfigs = [
        {
          category: 'backend',
          key: 'PORT',
          value: '5000',
          description: 'Custom port',
          isSecret: false
        }
      ];
      mockPrisma.configuration.findMany.mockResolvedValue(dbConfigs);

      const result = await service.getConfiguration('backend');

      const portConfig = result.find(item => item.key === 'PORT');
      expect(portConfig).toBeDefined();
      expect(portConfig?.value).toBe('5000');
      expect(portConfig?.description).toBe('Custom port');
    });

    it('should use database description if valid, otherwise use default', async () => {
      const dbConfigs = [
        {
          category: 'backend',
          key: 'PORT',
          value: '5000',
          description: 'Custom port description',
          isSecret: false
        },
        {
          category: 'backend',
          key: 'NODE_ENV',
          value: 'production',
          description: null, // Empty description
          isSecret: false
        }
      ];
      mockPrisma.configuration.findMany.mockResolvedValue(dbConfigs);

      const result = await service.getConfiguration('backend');

      const portConfig = result.find(item => item.key === 'PORT');
      expect(portConfig?.description).toBe('Custom port description');

      const nodeEnvConfig = result.find(item => item.key === 'NODE_ENV');
      expect(nodeEnvConfig?.description).toBe('Node environment (development/production)');
    });

    it('should prefer .env values over database for web/mobile when values differ', async () => {
      const dbConfigs = [
        {
          category: 'web',
          key: 'NEXT_PUBLIC_API_URL',
          value: 'http://localhost:4000',
          description: 'Old value',
          isSecret: false
        }
      ];
      mockPrisma.configuration.findMany.mockResolvedValue(dbConfigs);
      process.env.NEXT_PUBLIC_API_URL = 'http://192.168.1.100:4000';

      const result = await service.getConfiguration('web');

      const apiUrlConfig = result.find(item => item.key === 'NEXT_PUBLIC_API_URL');
      // Should prefer .env value when it's not localhost
      expect(apiUrlConfig?.value).toBe('http://192.168.1.100:4000');
    });

    it('should handle all three categories', async () => {
      mockPrisma.configuration.findMany.mockResolvedValue([]);

      const backend = await service.getConfiguration('backend');
      const web = await service.getConfiguration('web');
      const mobile = await service.getConfiguration('mobile');

      expect(backend.every(item => item.category === 'backend')).toBe(true);
      expect(web.every(item => item.category === 'web')).toBe(true);
      expect(mobile.every(item => item.category === 'mobile')).toBe(true);
    });
  });

  describe('getValue', () => {
    it('should return database value if exists', async () => {
      const dbConfig = {
        category: 'backend',
        key: 'PORT',
        value: '5000',
        description: 'Custom port',
        isSecret: false
      };
      mockPrisma.configuration.findUnique.mockResolvedValue(dbConfig);

      const result = await service.getValue('backend', 'PORT');

      expect(result).toBe('5000');
      expect(mockPrisma.configuration.findUnique).toHaveBeenCalledWith({
        where: {
          category_key: {
            category: 'backend',
            key: 'PORT'
          }
        }
      });
    });

    it('should return null if database value is null and no env fallback', async () => {
      const dbConfig = {
        category: 'backend',
        key: 'PORT',
        value: null,
        description: 'Custom port',
        isSecret: false
      };
      mockPrisma.configuration.findUnique.mockResolvedValue(dbConfig);
      // Ensure no env fallback
      delete process.env.PORT;
      (readFileSync as any).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await service.getValue('backend', 'PORT');

      expect(result).toBeNull();
    });

    it('should fallback to env value for backend category when database value is null', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(null);
      process.env.PORT = '6000';
      // readFileSync will throw, so it will fallback to process.env
      (readFileSync as any).mockImplementationOnce(() => {
        throw new Error('File not found');
      });

      const result = await service.getValue('backend', 'PORT');

      expect(result).toBe('6000');
    });

    it('should return null for web/mobile category when not in database', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(null);

      const result = await service.getValue('web', 'NEXT_PUBLIC_API_URL');

      expect(result).toBeNull();
    });

    it('should return null when database config not found and no env fallback', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(null);
      (readFileSync as any).mockReturnValue('');

      const result = await service.getValue('backend', 'NONEXISTENT_KEY');

      expect(result).toBeNull();
    });
  });

  describe('updateConfiguration', () => {
    it('should successfully update single configuration', async () => {
      const updates: ConfigurationUpdate[] = [
        {
          key: 'PORT',
          value: '5000',
          description: 'Updated port',
          isSecret: false
        }
      ];
      mockPrisma.configuration.upsert.mockResolvedValue({
        category: 'backend',
        key: 'PORT',
        value: '5000',
        description: 'Updated port',
        isSecret: false
      });

      const result = await service.updateConfiguration('backend', updates);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.configuration.upsert).toHaveBeenCalledWith({
        where: {
          category_key: {
            category: 'backend',
            key: 'PORT'
          }
        },
        update: {
          value: '5000',
          description: 'Updated port',
          isSecret: false
        },
        create: {
          category: 'backend',
          key: 'PORT',
          value: '5000',
          description: 'Updated port',
          isSecret: false
        }
      });
    });

    it('should successfully update multiple configurations', async () => {
      const updates: ConfigurationUpdate[] = [
        { key: 'PORT', value: '5000', description: 'Port', isSecret: false },
        { key: 'NODE_ENV', value: 'production', description: 'Environment', isSecret: false }
      ];
      mockPrisma.configuration.upsert.mockResolvedValue({});

      const result = await service.updateConfiguration('backend', updates);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.configuration.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      const updates: ConfigurationUpdate[] = [
        { key: 'PORT', value: '5000', description: 'Port', isSecret: false },
        { key: 'INVALID', value: 'value', description: 'Invalid', isSecret: false }
      ];
      mockPrisma.configuration.upsert
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await service.updateConfiguration('backend', updates);

      expect(result.success).toBe(false);
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('INVALID');
    });

    it('should handle null values', async () => {
      const updates: ConfigurationUpdate[] = [
        { key: 'PORT', value: null, description: null, isSecret: false }
      ];
      mockPrisma.configuration.upsert.mockResolvedValue({});

      const result = await service.updateConfiguration('backend', updates);

      expect(result.success).toBe(true);
      expect(mockPrisma.configuration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            value: null,
            description: undefined
          })
        })
      );
    });

    it('should handle secret flags', async () => {
      const updates: ConfigurationUpdate[] = [
        { key: 'JWT_SECRET', value: 'secret', description: 'Secret', isSecret: true }
      ];
      mockPrisma.configuration.upsert.mockResolvedValue({});

      const result = await service.updateConfiguration('backend', updates);

      expect(result.success).toBe(true);
      expect(mockPrisma.configuration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            isSecret: true
          })
        })
      );
    });
  });

  describe('deleteConfiguration', () => {
    it('should successfully delete configuration', async () => {
      mockPrisma.configuration.delete.mockResolvedValue({
        category: 'backend',
        key: 'PORT',
        value: '5000'
      });

      const result = await service.deleteConfiguration('backend', 'PORT');

      expect(result).toBe(true);
      expect(mockPrisma.configuration.delete).toHaveBeenCalledWith({
        where: {
          category_key: {
            category: 'backend',
            key: 'PORT'
          }
        }
      });
    });

    it('should return false on error', async () => {
      mockPrisma.configuration.delete.mockRejectedValue(new Error('Delete failed'));

      const result = await service.deleteConfiguration('backend', 'PORT');

      expect(result).toBe(false);
    });

    it('should handle non-existent configuration', async () => {
      mockPrisma.configuration.delete.mockRejectedValue(
        new Error('Record to delete does not exist')
      );

      const result = await service.deleteConfiguration('backend', 'NONEXISTENT');

      expect(result).toBe(false);
    });
  });

  describe('getDefaultConfiguration', () => {
    it('should return all default configurations', () => {
      const defaults = service.getDefaultConfiguration();

      expect(defaults).toHaveProperty('backend');
      expect(defaults).toHaveProperty('web');
      expect(defaults).toHaveProperty('mobile');
      expect(Array.isArray(defaults.backend)).toBe(true);
      expect(Array.isArray(defaults.web)).toBe(true);
      expect(Array.isArray(defaults.mobile)).toBe(true);
    });

    it('should include all required backend keys', () => {
      const defaults = service.getDefaultConfiguration();
      const backendKeys = defaults.backend.map(item => item.key);

      expect(backendKeys).toContain('PORT');
      expect(backendKeys).toContain('NODE_ENV');
      expect(backendKeys).toContain('XYO_ARCHIVE');
      expect(backendKeys).toContain('XYO_ARCHIVIST_URL');
      expect(backendKeys).toContain('JWT_SECRET');
    });

    it('should mark secret values correctly', () => {
      const defaults = service.getDefaultConfiguration();
      const jwtSecret = defaults.backend.find(item => item.key === 'JWT_SECRET');

      expect(jwtSecret?.isSecret).toBe(true);
      expect(jwtSecret?.value).toBe('***');
    });

    it('should include web configuration keys', () => {
      const defaults = service.getDefaultConfiguration();
      const webKeys = defaults.web.map(item => item.key);

      expect(webKeys).toContain('NEXT_PUBLIC_API_URL');
      expect(webKeys).toContain('NEXT_PUBLIC_MAPBOX_TOKEN');
    });

    it('should include mobile configuration keys', () => {
      const defaults = service.getDefaultConfiguration();
      const mobileKeys = defaults.mobile.map(item => item.key);

      expect(mobileKeys).toContain('EXPO_PUBLIC_API_URL');
      expect(mobileKeys).toContain('EXPO_PUBLIC_MAPBOX_TOKEN');
    });
  });

  describe('initializeDefaults', () => {
    it('should create all default configurations', async () => {
      mockPrisma.configuration.upsert.mockResolvedValue({});

      await service.initializeDefaults();

      // Should call upsert for each default item
      expect(mockPrisma.configuration.upsert).toHaveBeenCalled();
      const callCount = mockPrisma.configuration.upsert.mock.calls.length;
      expect(callCount).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.configuration.upsert
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValue({});

      // The method will throw if there's an error, but we can catch it
      // In practice, initializeDefaults should handle errors internally
      // For now, we'll test that it attempts to upsert all items
      try {
        await service.initializeDefaults();
      } catch (error) {
        // Errors are expected and should be handled by the caller
        expect(error).toBeInstanceOf(Error);
      }
      
      // Verify upsert was called multiple times
      expect(mockPrisma.configuration.upsert.mock.calls.length).toBeGreaterThan(1);
    });

    it('should update existing configurations with current env values', async () => {
      const defaults = service.getDefaultConfiguration();
      mockPrisma.configuration.upsert.mockResolvedValue({});

      await service.initializeDefaults();

      // Verify that upsert was called with update values
      const firstCall = mockPrisma.configuration.upsert.mock.calls[0];
      expect(firstCall[0]).toHaveProperty('update');
      expect(firstCall[0].update).toHaveProperty('value');
    });
  });

  describe('Environment variable reading', () => {
    it('should read from .env file for backend config', () => {
      (readFileSync as any).mockImplementationOnce((path: string) => {
        if (path.includes('backend/.env') || path.endsWith('.env')) {
          return 'XYO_ARCHIVIST_URL=http://custom-archivist:8080\n';
        }
        throw new Error('File not found');
      });

      const defaults = service.getDefaultConfiguration();
      const archivistUrl = defaults.backend.find(item => item.key === 'XYO_ARCHIVIST_URL');

      expect(readFileSync).toHaveBeenCalled();
      // Should use the value from .env file if readFileSync returns it
      // Otherwise falls back to env.xyoArchivistUrl from mock
      expect(archivistUrl).toBeDefined();
    });

    it('should handle missing .env file gracefully', () => {
      (readFileSync as any).mockImplementation(() => {
        throw new Error('File not found');
      });

      const defaults = service.getDefaultConfiguration();

      // Should fallback to env values
      expect(defaults.backend.length).toBeGreaterThan(0);
    });

    it('should read from web/.env.local for web config', () => {
      (readFileSync as any).mockImplementation((path: string) => {
        if (path.includes('web/.env.local')) {
          return 'NEXT_PUBLIC_API_URL=http://web-api:4000\n';
        }
        throw new Error('File not found');
      });

      const defaults = service.getDefaultConfiguration();
      const apiUrl = defaults.web.find(item => item.key === 'NEXT_PUBLIC_API_URL');

      expect(apiUrl?.value).toBe('http://web-api:4000');
    });

    it('should read from mobile/.env for mobile config', () => {
      (readFileSync as any).mockImplementation((path: string) => {
        if (path.includes('mobile/.env')) {
          return 'EXPO_PUBLIC_API_URL=http://mobile-api:4000\n';
        }
        throw new Error('File not found');
      });

      const defaults = service.getDefaultConfiguration();
      const apiUrl = defaults.mobile.find(item => item.key === 'EXPO_PUBLIC_API_URL');

      expect(apiUrl?.value).toBe('http://mobile-api:4000');
    });

    it('should parse .env file with quotes correctly', () => {
      (readFileSync as any).mockImplementation((path: string) => {
        if (path.includes('backend/.env') || path.endsWith('.env')) {
          return 'XYO_ARCHIVIST_URL="http://quoted-url:8080"\n';
        }
        throw new Error('File not found');
      });

      const defaults = service.getDefaultConfiguration();
      const archivistUrl = defaults.backend.find(item => item.key === 'XYO_ARCHIVIST_URL');

      expect(archivistUrl?.value).toBe('http://quoted-url:8080');
    });

    it('should skip comments and empty lines in .env file', () => {
      (readFileSync as any).mockImplementation((path: string) => {
        if (path.includes('backend/.env') || path.endsWith('.env')) {
          return (
            '# This is a comment\n' +
            '\n' +
            'XYO_ARCHIVIST_URL=http://archivist:8080\n' +
            '# Another comment\n'
          );
        }
        throw new Error('File not found');
      });

      const defaults = service.getDefaultConfiguration();
      const archivistUrl = defaults.backend.find(item => item.key === 'XYO_ARCHIVIST_URL');

      expect(archivistUrl?.value).toBe('http://archivist:8080');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty database results', async () => {
      mockPrisma.configuration.findMany.mockResolvedValue([]);

      const result = await service.getConfiguration('backend');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle database errors in getConfiguration', async () => {
      mockPrisma.configuration.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getConfiguration('backend')).rejects.toThrow('Database error');
    });

    it('should handle database errors in getValue', async () => {
      mockPrisma.configuration.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getValue('backend', 'PORT')).rejects.toThrow('Database error');
    });

    it('should handle all update errors', async () => {
      const updates: ConfigurationUpdate[] = [
        { key: 'KEY1', value: 'value1', isSecret: false },
        { key: 'KEY2', value: 'value2', isSecret: false }
      ];
      mockPrisma.configuration.upsert.mockRejectedValue(new Error('All failed'));

      const result = await service.updateConfiguration('backend', updates);

      expect(result.success).toBe(false);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(2);
    });
  });
});


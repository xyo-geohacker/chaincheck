import { afterAll, vi } from 'vitest';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.MOCK_XL1_TRANSACTIONS = 'true';

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  // eslint-disable-next-line no-console
  const originalConsoleLog = console.log;
  // eslint-disable-next-line no-console
  const originalConsoleError = console.error;
  // eslint-disable-next-line no-console
  const originalConsoleWarn = console.warn;

  // eslint-disable-next-line no-console
  console.log = vi.fn();
  // eslint-disable-next-line no-console
  console.error = vi.fn();
  // eslint-disable-next-line no-console
  console.warn = vi.fn();

  // Restore in cleanup
  afterAll(() => {
    // eslint-disable-next-line no-console
    console.log = originalConsoleLog;
    // eslint-disable-next-line no-console
    console.error = originalConsoleError;
    // eslint-disable-next-line no-console
    console.warn = originalConsoleWarn;
  });
}

#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 * 
 * Validates that all required environment variables are set before deployment.
 * Run this script before deploying to production to ensure configuration is complete.
 * 
 * Usage:
 *   tsx scripts/validate-env.ts
 *   or
 *   npm run validate-env (if added to package.json)
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  No .env file found. Using environment variables from system.');
}

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => { valid: boolean; error?: string };
}

const envVars: EnvVar[] = [
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node environment (development/production)',
    validate: (value) => {
      if (value && !['development', 'production', 'test'].includes(value)) {
        return { valid: false, error: 'Must be development, production, or test' };
      }
      return { valid: true };
    }
  },
  {
    name: 'PORT',
    required: false,
    description: 'Server port (defaults to 4000)',
    validate: (value) => {
      if (value) {
        const port = parseInt(value, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          return { valid: false, error: 'Must be a valid port number (1-65535)' };
        }
      }
      return { valid: true };
    }
  },
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string',
    validate: (value) => {
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        return { valid: false, error: 'Must start with postgresql:// or postgres://' };
      }
      if (value.includes('localhost') && process.env.NODE_ENV === 'production') {
        return { valid: false, error: '⚠️  Using localhost in production is not recommended' };
      }
      return { valid: true };
    }
  },
  {
    name: 'XYO_API_KEY',
    required: true,
    description: 'XYO Network API key',
    validate: (value) => {
      if (value && value.length < 10) {
        return { valid: false, error: 'API key appears to be too short' };
      }
      return { valid: true };
    }
  },
  {
    name: 'WEB_URL',
    required: true,
    description: 'Web application URL',
    validate: (value) => {
      try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return { valid: false, error: 'Must be a valid HTTP or HTTPS URL' };
        }
        if (url.protocol === 'http:' && process.env.NODE_ENV === 'production') {
          return { valid: false, error: '⚠️  Using HTTP in production is not secure. Use HTTPS.' };
        }
      } catch {
        return { valid: false, error: 'Must be a valid URL' };
      }
      return { valid: true };
    }
  },
  {
    name: 'PINATA_API_KEY',
    required: false,
    description: 'Pinata API key (required for photo/signature uploads)',
    validate: (value) => {
      if (value && value.length < 10) {
        return { valid: false, error: 'API key appears to be too short' };
      }
      return { valid: true };
    }
  },
  {
    name: 'PINATA_SECRET_KEY',
    required: false,
    description: 'Pinata secret key (required for photo/signature uploads)',
    validate: (value) => {
      if (value && value.length < 10) {
        return { valid: false, error: 'Secret key appears to be too short' };
      }
      return { valid: true };
    }
  },
  {
    name: 'JWT_SECRET',
    required: false,
    description: 'JWT signing secret (required for production)',
    validate: (value) => {
      if (!value && process.env.NODE_ENV === 'production') {
        return { valid: false, error: 'Required in production environment' };
      }
      if (value && value.length < 32) {
        return { valid: false, error: '⚠️  Secret should be at least 32 characters for security' };
      }
      if (value === 'dev-secret-key-change-in-production') {
        return { valid: false, error: '⚠️  Using default dev secret. Generate a new secret for production.' };
      }
      return { valid: true };
    }
  },
  {
    name: 'XYO_WALLET_MNEMONIC',
    required: false,
    description: 'XL1 wallet mnemonic (required for real blockchain transactions)',
    validate: (value) => {
      if (value) {
        const words = value.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
          return { valid: false, error: 'Mnemonic must be 12 or 24 words' };
        }
      }
      return { valid: true };
    }
  },
  {
    name: 'XYO_ARCHIVIST_URL',
    required: false,
    description: 'XYO Archivist URL',
    validate: (value) => {
      if (value) {
        try {
          new URL(value);
        } catch {
          return { valid: false, error: 'Must be a valid URL' };
        }
      }
      return { valid: true };
    }
  },
  {
    name: 'XYO_DIVINER_URL',
    required: false,
    description: 'XYO Diviner URL',
    validate: (value) => {
      if (value) {
        try {
          new URL(value);
        } catch {
          return { valid: false, error: 'Must be a valid URL' };
        }
      }
      return { valid: true };
    }
  },
  {
    name: 'XYO_CHAIN_RPC_URL',
    required: false,
    description: 'XL1 Chain RPC URL',
    validate: (value) => {
      if (value) {
        try {
          new URL(value);
        } catch {
          return { valid: false, error: 'Must be a valid URL' };
        }
      }
      return { valid: true };
    }
  },
  {
    name: 'MOCK_XL1_TRANSACTIONS',
    required: false,
    description: 'Use mock XL1 transactions (for development)',
    validate: (value) => {
      if (value === 'true' && process.env.NODE_ENV === 'production') {
        return { valid: false, error: '⚠️  Mock mode should not be used in production' };
      }
      return { valid: true };
    }
  }
];

function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Validating environment variables...\n');

  for (const envVar of envVars) {
    const value = process.env[envVar.name];
    const isSet = value !== undefined && value !== '';

    // Check if required
    if (envVar.required && !isSet) {
      errors.push(`❌ ${envVar.name}: REQUIRED but not set - ${envVar.description}`);
      continue;
    }

    // Skip validation if not set and not required
    if (!isSet) {
      warnings.push(`⚠️  ${envVar.name}: Not set (optional) - ${envVar.description}`);
      continue;
    }

    // Run custom validation
    if (envVar.validate) {
      const result = envVar.validate(value);
      if (!result.valid) {
        if (result.error?.startsWith('⚠️')) {
          warnings.push(`⚠️  ${envVar.name}: ${result.error}`);
        } else {
          errors.push(`❌ ${envVar.name}: ${result.error || 'Validation failed'}`);
        }
      } else {
        console.log(`✅ ${envVar.name}: Set and valid`);
      }
    } else {
      console.log(`✅ ${envVar.name}: Set`);
    }
  }

  // Check for Pinata keys (both or neither)
  const hasPinataKey = !!process.env.PINATA_API_KEY;
  const hasPinataSecret = !!process.env.PINATA_SECRET_KEY;
  if (hasPinataKey && !hasPinataSecret) {
    errors.push('❌ PINATA_API_KEY is set but PINATA_SECRET_KEY is missing');
  }
  if (!hasPinataKey && hasPinataSecret) {
    errors.push('❌ PINATA_SECRET_KEY is set but PINATA_API_KEY is missing');
  }
  if (!hasPinataKey && !hasPinataSecret) {
    warnings.push('⚠️  Pinata keys not set - photo/signature uploads will fail');
  }

  // Check for XL1 wallet (if not using mock mode)
  const isMockMode = process.env.MOCK_XL1_TRANSACTIONS === 'true';
  const hasWallet = !!process.env.XYO_WALLET_MNEMONIC;
  if (!isMockMode && !hasWallet && process.env.NODE_ENV === 'production') {
    warnings.push('⚠️  XYO_WALLET_MNEMONIC not set - real blockchain transactions will fail');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Run validation
const result = validateEnvironment();

console.log('\n' + '='.repeat(60) + '\n');

if (result.warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  result.warnings.forEach(warning => console.log(`  ${warning}`));
  console.log('');
}

if (result.errors.length > 0) {
  console.log('❌ ERRORS:');
  result.errors.forEach(error => console.log(`  ${error}`));
  console.log('');
  console.log('❌ Environment validation FAILED');
  console.log('Please fix the errors above before deploying.\n');
  process.exit(1);
} else {
  console.log('✅ Environment validation PASSED');
  if (result.warnings.length > 0) {
    console.log('⚠️  Review warnings above for production deployment.\n');
  } else {
    console.log('All required variables are set and valid.\n');
  }
  process.exit(0);
}


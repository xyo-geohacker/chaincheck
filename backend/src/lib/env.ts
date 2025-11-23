import dotenv from 'dotenv';

dotenv.config();

const requiredVariables = ['PORT', 'DATABASE_URL', 'XYO_API_KEY', 'WEB_URL'] as const;

type RequiredVariable = (typeof requiredVariables)[number];

function ensureEnv(name: RequiredVariable): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: ensureEnv('DATABASE_URL'),
  xyoApiKey: ensureEnv('XYO_API_KEY'),
  webUrl: ensureEnv('WEB_URL'),
  // Server hostnames for status links (defaults to localhost for development)
  backendHost: process.env.BACKEND_HOST ?? 'localhost',
  webHost: process.env.WEB_HOST ?? 'localhost',
  mobileHost: process.env.MOBILE_HOST ?? 'localhost',
  // Archivist configuration
  // Based on SDK samples (sdk-xyo-client-js/packages/sdk-utils/packages/network/src/knownArchivists.ts):
  // - Main: https://api.archivist.xyo.network
  // - Beta: https://beta.api.archivist.xyo.network
  // - POST to: ${ARCHIVIST_URL}/${ARCHIVE_NAME} (e.g., https://api.archivist.xyo.network/chaincheck)
  // - GET from: ${ARCHIVIST_URL}/get/${hash} or ${ARCHIVIST_URL}/archivist/get/${hash}
  xyoArchivistUrl: process.env.XYO_ARCHIVIST_URL ?? 'https://api.archivist.xyo.network',
  xyoArchive: process.env.XYO_ARCHIVE ?? 'chaincheck',
  // Feature flags to disable Archivist/Diviner communication
  xyoArchivistDisabled: process.env.XYO_ARCHIVIST_DISABLED === 'true',
  xyoDivinerDisabled: process.env.XYO_DIVINER_DISABLED === 'true',
  // Diviner configuration (direct Diviner endpoint)
  // Based on SDK samples (sdk-xyo-client-js/packages/sdk-utils/packages/network/src/knownDiviners.ts):
  // - Main: https://api.location.diviner.xyo.network
  // - Beta: https://beta.api.location.diviner.xyo.network
  // - Location queries use: ${apiDomain}/location/query
  // - Generic bound witness queries may use: ${apiDomain}/query
  // Falls back to Archivist URL if XYO_DIVINER_URL is not set
  xyoDivinerUrl: process.env.XYO_DIVINER_URL ?? (process.env.XYO_ARCHIVIST_URL ?? 'https://api.location.diviner.xyo.network'),
  // Mock XL1 configuration
  mockXl1Transactions: process.env.MOCK_XL1_TRANSACTIONS !== 'false',
  mockXl1TransactionId: process.env.MOCK_XL1_TRANSACTION_ID,
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretKey: process.env.PINATA_SECRET_KEY,
  jwtSecret: process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'development' ? 'dev-secret-key-change-in-production' : undefined),
  // XL1 Configuration
  xyoWalletMnemonic: process.env.XYO_WALLET_MNEMONIC,
  // Optional explicit chain ID (e.g. dd381fbb392c85160d8b0453e446757b12384046)
  xyoChainId: process.env.XYO_CHAIN_ID,
  xyoChainRpcUrl: process.env.XYO_CHAIN_RPC_URL ?? 'http://localhost:8080/rpc',
} as const;


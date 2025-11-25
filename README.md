# ChainCheck - XYO Network Integration Reference

**Reference implementation** for integrating XYO Network and XL1 blockchain proof-of-location into existing supply chain and delivery systems. Designed for partners like FedEx to add cryptographic verification to their existing processes with minimal effort.

## Purpose

ChainCheck serves as a **reference implementation** and **integration guide** for XYO Network partners. The core XYO functionality is modular and can be:

- **Extracted** into existing systems
- **Integrated** via API calls
- **Used as a template** for custom implementations

**Primary Goal**: Enable "drop-in" integration of XYO Network/XL1 functionality into existing delivery verification systems.

[![CI](https://github.com/xyo-geohacker/chaincheck/workflows/CI/badge.svg)](https://github.com/xyo-geohacker/chaincheck/actions)
[![CodeQL](https://github.com/xyo-geohacker/chaincheck/workflows/CodeQL%20Security%20Analysis/badge.svg)](https://github.com/xyo-geohacker/chaincheck/security/code-scanning)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/xyo-geohacker/chaincheck/branch/main/graph/badge.svg)](https://codecov.io/gh/xyo-geohacker/chaincheck)
[![Contributors Welcome](https://img.shields.io/badge/contributors-welcome-brightgreen.svg)](CONTRIBUTING.md)

This project uses GitHub Actions for continuous integration. All tests, linting, and type checking run automatically on every push and pull request.

## For Partners: Quick Integration

**Want to add XYO Network to your existing system?**

1. **Extract XYO Services**: Copy `backend/src/services/xyo/` to your project
2. **Install Dependencies**: Add XYO SDK packages to your `package.json`
3. **Configure**: Set environment variables
4. **Use**: Call `xyoService.createLocationProofXL1()` in your verification flow

See [Integration Guide](./docs/INTEGRATION_GUIDE.md) for detailed instructions and code examples.

## Features

ChainCheck provides a comprehensive delivery verification platform with the following features:

- **Delivery Verification**: Cryptographically verified delivery proofs stored on the XYO Network's XL1 blockchain
- **Sensor Data Capture**: Elevation/altitude, barometric pressure, and accelerometer data captured at delivery time for enhanced provenance and multi-story delivery verification
- **ROI Dashboard**: Business value metrics including dispute reduction, fraud prevention, operational efficiency, and ROI calculations
- **Mobile Driver App**: React Native mobile application for drivers to verify deliveries with GPS location, photos, signatures, and sensor data
- **Web Dashboard**: Next.js web interface for viewing deliveries, verification proofs, and network statistics
- **Cryptographic Proof Chain**: Driver-specific proof chains linking consecutive deliveries for enhanced verification
- **Location Accuracy Metrics**: GPS accuracy analysis with XYO Network witness node data
- **Tamper Detection**: Cryptographic verification of delivery data integrity
- **Network Statistics**: Real-time XYO Network health, coverage, and witness node information
- **API Documentation**: Comprehensive Swagger/OpenAPI documentation for API integration
- **IPFS Integration**: Decentralized storage for delivery photos and signatures via Pinata/IPFS

## Powered by XYO Network

ChainCheck leverages the XYO Network and XL1 blockchain to provide enterprise-grade delivery verification with the following key benefits:

### Blockchain Immutability
- **Immutable Proof Storage**: All delivery verifications are permanently recorded on the XL1 blockchain, creating an unalterable audit trail
- **Tamper-Proof Records**: Once a delivery proof is committed to the blockchain, it cannot be modified or deleted, ensuring data integrity
- **Public Verifiability**: Anyone can verify the authenticity of delivery proofs by querying the XL1 blockchain
- **Long-Term Preservation**: Blockchain storage ensures delivery records persist independently of any single system or database

### Physical Driver Verification via NFC
- **Hardware-Based Authentication**: Drivers can verify their identity using physical NFC cards, providing an additional layer of security beyond passwords
- **Tamper-Resistant Verification**: NFC card scans create cryptographic proofs that are cryptographically linked to the delivery transaction
- **Per-Delivery Verification**: Each delivery can include NFC verification, ensuring the correct driver is physically present at the delivery location
- **Audit Trail**: NFC verification data is stored in the bound witness payload, creating a permanent record of driver identity confirmation

### Multi-Layer Sensor Data for Enhanced Provenance
- **GPS Location Data**: Precise latitude, longitude, and timestamp captured at the moment of delivery verification
- **Elevation/Altitude Capture**: GPS altitude data provides vertical positioning information, useful for multi-story building deliveries
- **Barometric Pressure**: Device barometric pressure sensors capture atmospheric pressure at delivery time, providing additional environmental context and more accurate elevation data
- **Accelerometer Data**: Device accelerometer captures device acceleration (x, y, z axes) at verification time. Low or zero acceleration values indicate the device (and driver) was stationary, providing objective evidence that the driver was physically present at the delivery location rather than just passing by
- **Cryptographically Bound**: All sensor data (location, altitude, barometric pressure, accelerometer) is cryptographically bound within the bound witness, ensuring data integrity and preventing tampering
- **Enhanced Verification**: Multiple independent sensor readings create a more robust proof of delivery location, especially valuable for complex delivery scenarios (multi-story buildings, underground facilities, etc.)
- **Immutable Record**: Sensor data is permanently stored on the XL1 blockchain as part of the delivery proof, creating an unalterable record of environmental conditions and device state at delivery time

### Cryptographic Verification
- **Bound Witness Technology**: Each delivery creates a cryptographically signed bound witness that proves the integrity of all delivery data
- **Signature Validation**: All delivery proofs include cryptographic signatures that can be independently verified
- **Data Integrity**: The XYO Network's cryptographic protocols ensure that location, timestamp, and other delivery data cannot be altered after verification
- **Proof Chain Integrity**: Driver-specific proof chains create a cryptographically linked sequence of deliveries, enhancing verification trust

### Decentralized Architecture
- **No Single Point of Failure**: Delivery proofs are stored on a decentralized blockchain network, not dependent on any single server or database
- **Network Resilience**: The XYO Network's distributed architecture ensures high availability and fault tolerance
- **Off-Chain Storage**: Optional Archivist integration provides efficient off-chain payload storage while maintaining blockchain verification
- **IPFS Integration**: Delivery photos and signatures are stored on IPFS, providing decentralized, content-addressed storage

### Additional XYO Network Benefits
- **Witness Node Network**: Leverages XYO Network's global network of witness nodes for location verification and network health monitoring
- **Real-Time Network Statistics**: Access to live XYO Network health metrics, coverage data, and node information
- **Enterprise-Grade Security**: Built on proven cryptographic protocols designed for enterprise supply chain applications
- **Scalable Architecture**: XYO Network infrastructure scales to support high-volume delivery operations

## CI/CD

This project uses GitHub Actions for continuous integration. All tests, linting, type checking, and builds run automatically on every push and pull request.

- **Main CI Workflow**: Runs tests, linting, type checking, and builds for all components
- **Code Quality Workflow**: Validates code quality standards across the codebase
- **Test Coverage Workflow**: Generates and tracks test coverage reports

## Structure

- `backend/` — Express + Prisma API
- `mobile/` — Expo React Native driver app
- `web/` — Next.js dashboard
- `shared/` — Shared TypeScript types
- `archivist/` — XYO Archivist server (local development)
- `diviner/` — XYO Diviner server (local development)

## API Documentation

ChainCheck provides comprehensive Swagger/OpenAPI documentation:

- **Interactive API Docs**: `http://localhost:4000/api-docs` (when backend is running)
- **OpenAPI JSON Spec**: `http://localhost:4000/api-docs.json`

See [API Documentation Guide](./docs/API_DOCUMENTATION.md) for details on using the API.

## Production Deployment

Ready to deploy ChainCheck to production? See the [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md) for:

- Platform-specific deployment instructions (Railway, Render, Vercel, AWS)
- Production environment configuration
- Database setup and migrations
- Monitoring and health checks
- Security best practices
- Troubleshooting guide

**Quick Deploy Options:**
- **Backend**: Railway or Render (PostgreSQL included)
- **Web Dashboard**: Vercel (optimized for Next.js)
- **Mobile App**: Expo Application Services (EAS) for app store distribution

## Prerequisites

Before getting started, ensure you have the following prerequisites installed and configured:

### Required Software

- **Node.js**: Version 18.18.0 or higher
- **PostgreSQL**: Version 15 or higher (must be installed and running)
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For cloning the repository

### Required Services & API Keys

#### Backend Prerequisites

**⚠️ These are mandatory for the backend to start:**

1. **PostgreSQL Database** (Required)
   - PostgreSQL must be installed and running
   - Create a database (e.g., `chaincheck`)
   - Update `DATABASE_URL` in `backend/.env` with your connection string
   - Format: `postgresql://username:password@localhost:5432/chaincheck`
   - **Installation**: [PostgreSQL Downloads](https://www.postgresql.org/download/)

2. **XYO API Key** (Required for public XYO services)
   - Get your XYO API key from [XYO Network](https://xyo.network)
   - Add to `backend/.env`:
     - `XYO_API_KEY=your_xyo_api_key`
   - **Note**: Backend will fail to start without this

3. **WEB_URL** (Required)
   - Set to your web application URL
   - For local development: `WEB_URL=http://localhost:3000`
   - Add to `backend/.env`:
     - `WEB_URL=http://localhost:3000`

**⚠️ These are required for specific features:**

4. **Pinata/IPFS Keys** (Required for photo/signature uploads)
   - Sign up at [Pinata](https://www.pinata.cloud/)
   - Get your API Key and Secret Key from the Pinata dashboard
   - Add to `backend/.env`:
     - `PINATA_API_KEY=your_pinata_api_key`
     - `PINATA_SECRET_KEY=your_pinata_secret_key`
   - **Note**: Photo and signature uploads will fail without these

5. **JWT Secret** (Required for production, optional for development)
   - Generate a strong random secret: `openssl rand -base64 32`
   - Add to `backend/.env`:
     - `JWT_SECRET=your_generated_secret`
   - **Note**: A default dev secret is used if not provided in development mode, but you should set this for production

6. **XL1 Wallet Mnemonic** (Required for real blockchain transactions)
   - Generate using: `GET /api/wallet/generate-mnemonic` (after backend starts)
   - Or follow: [Get XL1 Browser Wallet](https://docs.xyo.network/developers/xl1-wallet/get-xl1-browser-wallet)
   - Add to `backend/.env`:
     - `XYO_WALLET_MNEMONIC=your twelve word mnemonic phrase here`
   - **Note**: Optional if using `MOCK_XL1_TRANSACTIONS=true` for development (mock mode will generate temporary mnemonics)

#### Web Prerequisites

1. **Mapbox Access Token** (Required for map display)
   - Sign up at [Mapbox](https://account.mapbox.com/)
   - Get your access token from [Mapbox Access Tokens](https://account.mapbox.com/access-tokens/)
   - Token should start with `pk.`
   - Add to `web/.env.local`:
     - `NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here`
   - **Note**: Maps will not display without this token

#### Mobile Prerequisites

1. **Mapbox Access Token** (Required for map display)
   - Same as web - use your Mapbox access token
   - Add to `mobile/.env`:
     - `EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here`
   - **Note**: Maps will not display without this token

2. **Backend API URL** (Required)
   - For iOS Simulator: `http://localhost:4000`
   - For Android Emulator: `http://10.0.2.2:4000`
   - For Physical Device: `http://YOUR_COMPUTER_IP:4000` (e.g., `http://192.168.1.100:4000`)
   - Add to `mobile/.env`:
     - `EXPO_PUBLIC_API_URL=your_backend_url_here`
   - **Note**: App will not connect to backend without this

### Optional Services

- **MongoDB**: Required only if running local Archivist (see [Archivist Setup](#archivist-local-development))
- **Docker**: Required only if running local Archivist or Diviner via Docker
- **XYO Archivist**: Optional - can use remote Archivist or disable with `XYO_ARCHIVIST_DISABLED=true`
- **XYO Diviner**: Optional - can use remote Diviner or disable with `XYO_DIVINER_DISABLED=true`

## Getting Started

```bash
git clone https://github.com/xyo-geohacker/chaincheck.git
cd chaincheck
```

### Backend

**⚠️ Before starting**, ensure you have:

1. **PostgreSQL installed and running**
2. **Database created** (e.g., `chaincheck`)
3. **Required environment variables configured** in `backend/.env`:
   - `DATABASE_URL` - PostgreSQL connection string (required - backend will fail without this)
   - `XYO_API_KEY` - XYO Network API key (required - backend will fail without this)
   - `WEB_URL` - Web application URL (required - backend will fail without this)
   - `PINATA_API_KEY` - Pinata API key (required for photo/signature uploads)
   - `PINATA_SECRET_KEY` - Pinata secret key (required for photo/signature uploads)
   - `JWT_SECRET` - JWT signing secret (optional in dev, required in production)
   - `XYO_WALLET_MNEMONIC` - XL1 wallet mnemonic (optional if using mock mode)

```bash
cd backend
npm install
cp env.example .env
# Edit .env and add your required values (see Prerequisites above)
npx prisma migrate dev
npm run seed      # optional sample data

# Validate environment before starting (recommended)
npm run validate-env

npm run dev
```

**Troubleshooting**: If the backend fails to start, check that all required environment variables are set. The backend will throw an error if `DATABASE_URL`, `XYO_API_KEY`, or `WEB_URL` are missing. Run `npm run validate-env` to check your configuration.

### Mobile (Expo)

**Before starting**, ensure you have:
- Mapbox access token
- Backend API URL configured for your testing environment

```bash
cd mobile
npm install
cp env.example .env
# Edit .env and add your Mapbox token and API URL (see Prerequisites above)
npm run start
```

### Web (Next.js)

**Before starting**, ensure you have:
- Mapbox access token

```bash
cd web
npm install
cp env.local.example .env.local
# Edit .env.local and add your Mapbox token (see Prerequisites above)
npm run dev
```

### Archivist (Local Development)

The Archivist stores off-chain payload data. For local development:

```bash
cd archivist
# Create MongoDB key file (required for replica set)
openssl rand -base64 756 > mongodb.key
chmod 400 mongodb.key

# Start MongoDB and Archivist
docker-compose up -d

# Initialize MongoDB replica set (first time only)
./mongo-init-replica-set.sh
```

**Configuration:**
- MongoDB: `localhost:27017` (username: `root`, password: `example`)
- Archivist API: `http://localhost:8888`
- Set `XYO_ARCHIVIST_URL=http://localhost:8888` in `backend/.env`

See [Local Archivist Setup](#local-archivist-setup) below for detailed instructions.

### Diviner (Local Development)

The Diviner provides location verification queries. Requires local Archivist to be running first.

**Prerequisites:** Local Archivist must be running (see above).

```bash
cd diviner/api-diviner-nodejs

# Install Node.js 16.x (required for Diviner)
nvm install 16
nvm use 16

# Install dependencies
yarn install
yarn compile

# Configure environment
cp .example.env .env
# Edit .env: Set ARCHIVIST_URL=http://localhost:8888

# Start Diviner
yarn start
```

**Configuration:**
- Diviner API: `http://localhost:9999`
- Set `XYO_DIVINER_URL=http://localhost:9999` in `backend/.env`

See [Local Diviner Setup](#local-diviner-setup) below for detailed instructions.

Populate environment variables before running end-to-end tests:

- Backend: database URL, XYO API key, Pinata keys, `WEB_URL`, etc.
- Mobile/Web: backend API URL, Mapbox token (optional for map).

## Local Archivist Setup

Instead of using XYO Network's production Archivists, you can run a local Archivist with MongoDB for development and testing.

### Quick Start

1. **Navigate to the archivist directory**:
   ```bash
   cd archivist
   ```

2. **Create MongoDB key file** (required for replica set):
   ```bash
   # Generate a key file for MongoDB replica set authentication
   openssl rand -base64 756 > mongodb.key
   chmod 400 mongodb.key
   ```

3. **Start both MongoDB and Archivist**:
   ```bash
   docker-compose up -d
   ```

4. **Initialize MongoDB replica set** (required on first start):
   ```bash
   # Automated initialization script (recommended)
   ./mongo-init-replica-set.sh
   
   # Or manually:
   # docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example
   # rs.initiate({ _id: "dbrs", members: [{ _id: 0, host: "mongo:27017" }] })
   # rs.status()  # Wait until stateStr shows "PRIMARY"
   # exit
   ```
   
   The script automatically:
   - Checks if replica set is already initialized
   - Initializes it if needed
   - Ensures MongoDB is in PRIMARY state
   - Reports the final status

5. **Verify Archivist is running**:
   ```bash
   # Check logs
   docker-compose logs archivist
   
   # Test API endpoint
   curl http://localhost:8888/api
   ```

6. **Configure backend to use local Archivist**:
   
   Edit `backend/.env`:
   ```env
   # Use local Archivist instead of production
   XYO_ARCHIVIST_URL=http://localhost:8888
   XYO_API_KEY=12345678-1234-5678-90ab-1234567890ab
   ```

### Services

- **MongoDB**: `localhost:27017`
  - Username: `root`
  - Password: `example`
  - Database: `archivist`
  - **Note**: No database initialization required - collections are created automatically on first data insert
  
- **Archivist**: `http://localhost:8888`
  - API Key: `12345678-1234-5678-90ab-1234567890ab`
  - Default archive: `chaincheck` (or `temp` if it doesn't exist)
  - **Note**: The XYO SDK automatically creates collections and indexes when data is first inserted

### Useful Commands

```bash
# Navigate to archivist directory
cd archivist

# Start services
docker-compose up -d

# Initialize/verify MongoDB replica set (ensures PRIMARY state)
./mongo-init-replica-set.sh

# Stop services
docker-compose down

# View logs
docker-compose logs -f archivist

# Check MongoDB replica set status
docker exec mongo mongosh --authenticationDatabase admin -u root -p example --quiet --eval "rs.status().members[0].stateStr"
# Should output: PRIMARY

# Restart Archivist (after configuration changes)
docker-compose up -d --force-recreate archivist

# Remove all data and start fresh
docker-compose down -v
docker-compose up -d
# After removing data, re-run ./mongo-init-replica-set.sh
```

### Troubleshooting

**Archivist fails to start with "querySrv ENOTFOUND" error:**
- Ensure `MONGO_DOMAIN` is set to empty string in `docker-compose.yml`
- Verify `MONGO_CONNECTION_STRING` is set correctly

**MongoDB connection timeout:**
- Check MongoDB is healthy: `docker-compose ps mongo`
- Verify replica set is initialized and in PRIMARY state: `./mongo-init-replica-set.sh`
- Quick check: `docker exec mongo mongosh --authenticationDatabase admin -u root -p example --quiet --eval "rs.status().members[0].stateStr"` (should output "PRIMARY")
- Check connection string uses `w=1` for single-node setup

For more detailed information, see [Local Archivist Setup Guide](./archivist/LOCAL_ARCHIVIST_SETUP.md).

## Local Diviner Setup

Instead of using XYO Network's production Diviners, you can run a local Location Diviner for development and testing. The Diviner requires a local Archivist to be running first.

**Note**: The Diviner code in `./diviner` is from the GitHub repository [XYOracleNetwork/api-location.diviner.xyo.network-express](https://github.com/XYOracleNetwork/api-location.diviner.xyo.network-express), which has not been updated since August 2022. As a result:
- **Diviner functionality with XL1 is primarily mocked** - The Diviner does not fully support XL1 blockchain queries
- **Archivist is the off-chain source of record** - Location data is typically extracted directly from Archivist payloads rather than relying on Diviner queries
- The backend falls back to using Archivist data when Diviner queries fail or return empty results

### Quick Start

**Prerequisites**: Local Archivist must be running (see [Local Archivist Setup](#local-archivist-setup) above).

1. **Install Node.js 16.x** (required for Diviner):
   ```bash
   # Install nvm (if not already installed)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   
   # Install Node.js 16 for Diviner
   nvm install 16
   ```

2. **Navigate to Diviner project**:
   ```bash
   cd diviner/api-diviner-nodejs
   ```

3. **Install dependencies**:
   ```bash
   yarn install
   yarn compile
   ```

4. **Configure environment variables**:
   ```bash
   cp .example.env .env
   ```
   
   Edit `.env`:
   ```env
   # Connect to your local Archivist
   ARCHIVIST_URL=http://localhost:8888
   ARCHIVE=chaincheck
   APP_PORT=9999
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
   ```

5. **Start the Diviner** (in a terminal with Node 16):
   ```bash
   nvm use 16
   yarn start
   ```

6. **Configure backend to use local Diviner**:
   
   Edit `backend/.env`:
   ```env
   # Use local Diviner instead of production
   XYO_DIVINER_URL=http://localhost:9999
   XYO_DIVINER_DISABLED=false
   ```

### Services

- **Diviner**: `http://localhost:9999`
  - Requires: Local Archivist running at `http://localhost:8888`
  - Node.js: Version 16.x required
  - Port: 9999

### Node.js Version Management

The Diviner requires Node.js 16.x, while your other services use Node.js 24. You can run both simultaneously:

- **Diviner terminal**: Use `nvm use 16` before starting
- **Other services terminals**: Use `nvm use 24` (or your default version)

Each terminal session can have its own Node version - they don't conflict.

### Useful Commands

```bash
# Navigate to Diviner directory
cd diviner/api-diviner-nodejs

# Switch to Node 16 (required for Diviner)
nvm use 16

# Start Diviner (development mode)
yarn start

# Build Diviner (if needed)
yarn compile

# Check if Diviner is running
curl http://localhost:9999
```

### Troubleshooting

**Diviner requires Node.js 16.x**:
- Use `nvm` to install and switch to Node 16: `nvm install 16 && nvm use 16`
- Other services (backend, web, mobile) can continue using Node 24
- Each service runs in separate processes, so different Node versions don't conflict

**Diviner cannot connect to Archivist**:
- Verify Archivist is running: `curl http://localhost:8888/api`
- Check `ARCHIVIST_URL` in Diviner's `.env` is set to `http://localhost:8888`

**Port 9999 already in use**:
- Find and kill the process: `lsof -i :9999` then `kill -9 <PID>`
- Or change port in `.env`: `APP_PORT=10000`

For more detailed information, see [Local Diviner Setup Guide](./diviner/LOCAL_DIVINER_SETUP.md).

## Seed Data

`npm run seed` in `backend/` seeds sample deliveries for dashboards/testing.

## Known Limitations

### XL1 Transaction `previous_hash` Field

Due to SDK limitations in Node.js environments, the `previous_hash` field in XL1 blockchain transactions remains `null` for all transactions (including subsequent transactions after the first). This is because the XYO SDK relies on IndexedDB (browser-only) to retrieve account transaction history, which is not available in Node.js.

**Impact:**
- Blockchain transactions will have `previous_hashes: [null]` (SDK limitation)
- Application-level driver chains are maintained correctly in stored bound witness copies
- The Proof Chain UI works correctly using stored bound witness data

This limitation is accepted and does not affect the functionality of driver-specific proof chains in the application.

## XYO Integration

ChainCheck integrates with the XYO Network using:
- **XL1 Blockchain**: For immutable proof storage via `@xyo-network/xl1-protocol-sdk` and `@xyo-network/xl1-rpc`
- **Archivist**: For off-chain payload storage (optional, can be disabled)
- **Diviner**: For location verification queries (optional, can be disabled)

**Diviner Status**: The Diviner implementation (`./diviner`) is from [XYOracleNetwork/api-location.diviner.xyo.network-express](https://github.com/XYOracleNetwork/api-location.diviner.xyo.network-express) and has not been updated since August 2022. Diviner functionality with XL1 is primarily mocked, and **Archivist is used as the off-chain source of record** for location data.

The backend uses real XYO SDK packages for blockchain transactions. Mock mode (`MOCK_XL1_TRANSACTIONS=true`) is available for development without blockchain connectivity.

### XL1 Wallet Requirement

To interact with the XL1 blockchain, an XL1 wallet is required. The wallet mnemonic (seed phrase) must be configured in the backend environment variable `XYO_WALLET_MNEMONIC`.

**Getting an XL1 Wallet:**
- Follow the official XYO Network documentation: [Get XL1 Browser Wallet](https://docs.xyo.network/developers/xl1-wallet/get-xl1-browser-wallet)
- Generate a wallet mnemonic using the backend API endpoint: `GET /api/wallet/generate-mnemonic` (see [Development Guide](./DEVELOPMENT_GUIDE.md) for details)
- The generated mnemonic phrase corresponds to the `XYO_WALLET_MNEMONIC` environment variable in the backend `.env` file

**Important:** The seed phrase generated for the XL1 wallet must match the `XYO_WALLET_MNEMONIC` value in your backend configuration. This wallet is used to sign all blockchain transactions for delivery verifications.

### Technical Implementation

- **Blockchain Transactions**: Each delivery verification creates a bound witness transaction on the XL1 blockchain, including location coordinates (latitude, longitude, altitude), barometric pressure, accelerometer data (x, y, z axes), timestamp, driver identity, and optional NFC verification data
- **Cryptographic Signatures**: All bound witnesses are cryptographically signed using the driver's wallet, ensuring non-repudiation
- **Proof Chain Linking**: Application-level driver chains link consecutive deliveries by the same driver, creating an enhanced audit trail (see [Known Limitations](#known-limitations) for blockchain-level limitations)
- **Network Integration**: Real-time integration with XYO Network witness nodes for location verification and network health monitoring

## Scripts

- `npm run dev` — start development server
- `npm run lint` — lint source files
- `npm run build` — production build (backend/web)

## Documentation

- **[Development Guide](./DEVELOPMENT_GUIDE.md)** — Complete guide for setting up and developing ChainCheck, including:
  - Network statistics and health calculation logic
  - Coverage area calculation
  - Delivery verification flow
  - XYO Network integration details
  - Database schema and API endpoints

See the `docs/` directory for additional guides and analysis documents.

## Testing

ChainCheck includes comprehensive test coverage for critical functionality:

- **Backend**: Unit tests for routes, services, middleware, and utilities
- **Web**: Component tests for UI interactions
- **Mobile**: Screen and component tests

Run tests:
```bash
# Backend
cd backend && npm test

# Web
cd web && npm test

# Mobile
cd mobile && npm test
```

## Code Quality

ChainCheck follows industry best practices and standards:

- **Structured Logging**: Centralized logging system with environment-aware log levels
- **Type Safety**: TypeScript with strict mode and proper type definitions
- **Security**: Input validation, rate limiting, secure headers, no hardcoded secrets
- **Error Handling**: Comprehensive error handling with proper status codes
- **Code Organization**: Clear separation of concerns, consistent structure
- **Documentation**: Comprehensive documentation, API docs, inline comments

## For Partners: Integration Approach

ChainCheck is designed as a **reference implementation** for XYO Network partners. The XYO functionality is modular and can be integrated into existing systems in three ways:

### 1. Extract Services (Recommended)
Copy the XYO services (`backend/src/services/xyo/`) into your codebase. Minimal code changes required.

**Best for**: Full control, customization, minimal dependencies

### 2. API Integration
Use ChainCheck's backend as a microservice. Make API calls from your system.

**Best for**: Quick integration, no code changes, managed service

### 3. Reference Implementation
Use ChainCheck's code as a template for your own implementation.

**Best for**: Learning, custom requirements, different tech stack

See [Integration Guide](./docs/INTEGRATION_GUIDE.md) for detailed instructions and [Code Examples](./examples/) for ready-to-use templates.

## Dependency Management

ChainCheck uses stable, production-ready versions of major dependencies:

- **Backend**: Prisma 5.22.0, Express 4.21.2, Node.js 18.18.0+
- **Web**: Next.js 14.2.10, React 18.3.1
- **Mobile**: Expo SDK 51, React Native 0.74.5

**Upgrade Strategy**: Major dependency upgrades (Prisma 6, Next.js 15, Expo SDK 52) are planned for post-release to ensure stability. See [Dependency Upgrade Strategy](./docs/DEPENDENCY_UPGRADE_STRATEGY.md) for detailed upgrade plans and timelines.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- How to report bugs
- How to suggest features
- How to submit pull requests
- Code style and standards
- Development setup

Please also read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md) and report it responsibly.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [XYO Network](https://xyo.network) blockchain technology
- Uses [Expo](https://expo.dev) for mobile development
- Powered by [Next.js](https://nextjs.org) for web dashboard
- Database powered by [Prisma](https://www.prisma.io)



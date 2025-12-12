# ChainCheck Development Guide

<div align="center">
  <img src="chaincheck-logo.png" alt="ChainCheck Logo" width="300">
</div>

Complete guide for setting up and developing the ChainCheck delivery verification system from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Initial Setup](#initial-setup)
4. [Database Setup](#database-setup)
5. [Backend Setup](#backend-setup)
6. [Web Dashboard Setup](#web-dashboard-setup)
7. [Mobile App Setup](#mobile-app-setup)
   - [iOS Simulator Setup](#4-ios-simulator-setup-macos-only)
   - [Android Emulator Setup](#5-android-emulator-setup)
   - [Physical Device Testing](#6-physical-device-testing)
   - [Mobile Testing](#8-mobile-testing)
   - [Debugging Mobile Apps](#9-debugging-mobile-apps)
   - [Common Mobile Issues](#10-common-mobile-development-issues)
8. [Environment Configuration](#environment-configuration)
9. [Ethereum Escrow Payment Configuration](#10-ethereum-escrow-payment-configuration)
10. [Running the Application](#running-the-application)
11. [Development Workflow](#development-workflow)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: Version 18.18.0 or higher
  - Check version: `node --version`
  - Download: [nodejs.org](https://nodejs.org/)
  
- **npm**: Version 9.0.0 or higher (comes with Node.js)
  - Check version: `npm --version`

- **PostgreSQL**: Version 12 or higher
  - macOS: `brew install postgresql@14` or download from [postgresql.org](https://www.postgresql.org/download/)
  - Linux: `sudo apt-get install postgresql` (Ubuntu/Debian)
  - Windows: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
  - Verify: `psql --version`

- **Git**: For cloning the repository
  - Verify: `git --version`

### Optional but Recommended

- **PostgreSQL GUI Client**: pgAdmin, DBeaver, or TablePlus for database management
- **VS Code**: Recommended IDE with TypeScript support
- **Expo Go App**: For testing mobile app on physical device (iOS/Android)

---

## Project Overview

ChainCheck is a monorepo containing three main applications:

- **Backend** (`backend/`): Express.js API server with Prisma ORM
  - Handles delivery verification, XL1 blockchain transactions, XYO Network integration
  - Port: `4000` (default)

- **Web Dashboard** (`web/`): Next.js 14 web application
  - Real-time delivery verification dashboard
  - Port: `3000` (default)

- **Mobile App** (`mobile/`): Expo React Native application
  - Driver app for delivery verification
  - Runs via Expo development server

- **Shared Types** (`shared/`): TypeScript type definitions shared across applications

### Technology Stack

**Backend:**
- Node.js + Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- XYO Network SDK (`@xyo-network/xl1-protocol-sdk`, `@xyo-network/xl1-rpc`)
- JWT Authentication

**Web:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Mapbox GL (for maps)

**Mobile:**
- Expo (React Native)
- TypeScript
- React Navigation

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/xyo-geohacker/chaincheck.git
cd chaincheck
```

### 2. Verify Prerequisites

```bash
# Check Node.js version (must be >= 18.18.0)
node --version

# Check npm version
npm --version

# Check PostgreSQL is installed
psql --version

# Check Git
git --version
```

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Start PostgreSQL service
# macOS (Homebrew):
brew services start postgresql@14

# Linux (systemd):
sudo systemctl start postgresql

# Windows: Start PostgreSQL service from Services panel

# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE chaincheck;
CREATE USER dbuser WITH PASSWORD 'dbpass';
GRANT ALL PRIVILEGES ON DATABASE chaincheck TO dbuser;
\q
```

### 2. Verify Database Connection

```bash
psql -U dbuser -d chaincheck -h localhost
# Enter password: dbpass
# Should connect successfully
\q
```

---

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

**Note:** This may take a few minutes as it installs XYO Network SDK packages and applies patches.

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp env.example .env
```

Edit `.env` and configure the following **required** variables:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database (use the credentials you created above)
DATABASE_URL=postgresql://dbuser:dbpass@localhost:5432/chaincheck

# XYO Archive Name
XYO_ARCHIVE=chaincheck

# XYO API Key (required for Archivist/Diviner)
XYO_API_KEY=your_xyo_api_key_here

# Web Application URL (for CORS and verification links)
WEB_URL=http://localhost:3000

# Pinata IPFS Keys (for file uploads)
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret

# JWT Secret (for authentication)
# In development, defaults to 'dev-secret-key-change-in-production' if not set
JWT_SECRET=your_jwt_secret_here_change_in_production
```

**Optional but Recommended for Development:**

```env
# Mock XL1 Transactions (set to 'true' for development without blockchain)
MOCK_XL1_TRANSACTIONS=true

# XL1 Wallet Mnemonic (only required if MOCK_XL1_TRANSACTIONS=false)
# To interact with the XL1 blockchain, an XL1 wallet is required.
# Get an XL1 wallet: https://docs.xyo.network/developers/xl1-wallet/get-xl1-browser-wallet
# Generate a mnemonic using: GET /api/wallet/generate-mnemonic after server starts
# The generated mnemonic phrase corresponds to the XYO_WALLET_MNEMONIC value
XYO_WALLET_MNEMONIC=your twelve word mnemonic phrase here

# XL1 RPC Endpoint (defaults to localhost if not set)
XYO_CHAIN_RPC_URL=https://beta.api.chain.xyo.network/rpc

# Archivist URL (defaults to production if not set)
# For local Archivist: http://localhost:8888
XYO_ARCHIVIST_URL=https://beta.api.archivist.xyo.network
# XYO_ARCHIVIST_URL=http://localhost:8888  # Uncomment for local Archivist

# Diviner URL (defaults to Archivist URL if not set)
XYO_DIVINER_URL=https://beta.api.location.diviner.xyo.network
```

### 4. Run Database Migrations

```bash
# Generate Prisma Client and run migrations
npx prisma migrate dev

# This will:
# - Create the database schema
# - Generate Prisma Client
# - Apply all migrations
```

### 5. Seed Sample Data

The seed script populates the database with test data for development and testing.

```bash
npm run seed
```

**What the seed script creates:**
- **5 Drivers** with default password `Password1`:
  - `vbuterin`
  - `snakamoto`
  - `msaylor`
  - `barmstrong`
  - `czhao`
- **11 Sample Deliveries** with various statuses:
  - `PENDING` - Awaiting pickup
  - `IN_TRANSIT` - Currently being delivered
  - `DELIVERED` - Successfully completed (if verified)
  - `FAILED` - Delivery attempts failed
  - `DISPUTED` - Customer disputes

**Important Notes:**
- The seed script **deletes all existing data** before seeding (clean slate)
- All drivers use the same default password: `Password1`
- Sample deliveries are located in San Diego, CA (for map visualization)
- You can run `npm run seed` anytime to reset the database to a clean test state

**Use Cases:**
- Testing the web dashboard with sample data
- Testing mobile app delivery flows
- Development without creating manual test data
- Demonstrating the application to stakeholders

### 6. Start Development Server

```bash
npm run dev
```

The backend should start on `http://localhost:4000`.

**Verify it's working:**
```bash
curl http://localhost:4000/api/health
# Should return: {"status":"ok"}
```

### 7. Local Archivist Setup (Optional)

Instead of using XYO Network's production Archivists, you can run a local Archivist with MongoDB for development and testing. This is useful for:

- **Development**: Test XYO Network features without depending on external services
- **Testing**: Isolated testing environment with full control
- **Debugging**: Inspect Archivist data directly in MongoDB
- **Offline Development**: Work without internet connectivity to XYO Network

#### 7.1. Prerequisites

- **Docker**: Version 20.10 or higher
  - Download: [docker.com](https://www.docker.com/products/docker-desktop)
  - Verify: `docker --version`
- **Docker Compose**: Usually included with Docker Desktop
  - Verify: `docker-compose --version`

#### 7.2. Setup Local Archivist

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
   
   **Note**: The `mongodb.key` file is required for MongoDB replica set authentication. Keep this file secure.

3. **Start both MongoDB and Archivist**:
   ```bash
   docker-compose up -d
   ```
   
   This will:
   - Start MongoDB container on port 27017
   - Start Archivist container on port 8888
   - Wait for MongoDB to be healthy before starting Archivist
   - Create a shared Docker network for communication

4. **Initialize MongoDB replica set** (required on first start):
   
   **Option A: Automated Script (Recommended)**
   ```bash
   # Run the initialization script
   ./mongo-init-replica-set.sh
   ```
   
   The script automatically:
   - Checks if replica set is already initialized
   - Initializes it if needed with a single node
   - Waits for MongoDB to become PRIMARY state
   - Reports success/failure with status information
   
   **Option B: Manual Initialization**
   ```bash
   # Connect to MongoDB
   docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example
   
   # Initialize replica set
   rs.initiate({
     _id: "dbrs",
     members: [
       { _id: 0, host: "mongo:27017" }
     ]
   })
   
   # Wait for PRIMARY status (may take 10-30 seconds)
   # Run this command repeatedly until stateStr shows "PRIMARY"
   rs.status()
   
   # Verify PRIMARY state (should show "PRIMARY")
   rs.status().members[0].stateStr
   
   # Exit
   exit
   ```
   
   **Important**: 
   - The replica set must be initialized before the Archivist can connect successfully
   - MongoDB must be in PRIMARY state (not STARTUP, STARTUP2, or SECONDARY)
   - For single-node setups, use `w=1` write concern (already set in docker-compose.yml)
   - The automated script handles all of this automatically

5. **Verify Archivist is running**:
   ```bash
   # Check container status
   docker-compose ps
   # Both mongo and archivist should show "Up" status
   
   # Check Archivist logs
   docker-compose logs archivist
   # Should show "Server listening on port 8888" or similar
   
   # Test API endpoint
   curl http://localhost:8888/api
   ```

6. **Configure backend to use local Archivist**:
   
   Edit `backend/.env`:
   ```env
   # Use local Archivist instead of production
   XYO_ARCHIVIST_URL=http://localhost:8888
   
   # Use the API key from docker-compose.yml
   XYO_API_KEY=12345678-1234-5678-90ab-1234567890ab
   
   # Optional: Set archive name (defaults to 'chaincheck')
   XYO_ARCHIVE=chaincheck
   ```

7. **Restart backend** (if it's already running):
   ```bash
   cd backend
   # Stop current server (Ctrl+C)
   npm run dev
   ```

#### 7.3. Archivist Services

**MongoDB Container**:
- **Container Name**: `mongo`
- **Port**: `27017` (exposed to host)
- **Hostname**: `mongo` (for Docker networking)
- **Credentials**:
  - Username: `root`
  - Password: `example`
  - Database: `archivist`
  - Auth Source: `admin`
- **Replica Set**: `dbrs` (must be initialized)
- **Connection String**: `mongodb://root:example@localhost:27017/archivist?authSource=admin&retryWrites=true&w=1`
- **Database Initialization**: **Not required** - Collections and indexes are created automatically by the XYO SDK when data is first inserted

**Archivist Container**:
- **Container Name**: `archivist`
- **Port**: `8888` (exposed to host)
- **API URL**: `http://localhost:8888`
- **API Key**: `12345678-1234-5678-90ab-1234567890ab`
- **Default Archive**: `chaincheck` (or `temp` if it doesn't exist)
- **CORS Origins**: `http://localhost:3000,http://localhost:4000`

#### 7.4. Useful Commands

```bash
# Navigate to archivist directory
cd archivist

# Start services
docker-compose up -d

# Stop services
docker-compose down

# Initialize/verify MongoDB replica set (ensures PRIMARY state)
./mongo-init-replica-set.sh

# Check MongoDB replica set status
docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example --quiet --eval "rs.status().members[0].stateStr"

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f archivist
docker-compose logs -f mongo

# Restart Archivist (after configuration changes)
docker-compose up -d --force-recreate archivist

# Restart MongoDB
docker-compose restart mongo

# Check service status
docker-compose ps

# Remove all data and start fresh (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
# After removing data, re-run mongo-init-replica-set.sh

# Connect to MongoDB directly
docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example

# View MongoDB databases
docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example --eval "show dbs"

# View Archivist collections
docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example archivist --eval "show collections"

# Check if MongoDB is PRIMARY (quick check)
docker exec mongo mongosh --authenticationDatabase admin -u root -p example --quiet --eval "rs.status().members[0].stateStr"
# Should output: PRIMARY
```

#### 7.5. Troubleshooting

**Archivist fails to start with "querySrv ENOTFOUND _mongodb._tcp.mongo.mongodb.net" error:**
- **Cause**: The SDK is trying to construct a MongoDB Atlas connection string instead of using the provided connection string
- **Fix**: Ensure `MONGO_DOMAIN` is set to empty string (`""`) in `docker-compose.yml`
- **Verify**: Check `docker-compose.yml` has `MONGO_DOMAIN: ""` in the archivist service environment

**MongoDB connection timeout:**
- **Check MongoDB is healthy**: `docker-compose ps mongo` (should show "healthy")
- **Verify replica set is initialized**: Connect to MongoDB and run `rs.status()` (should show PRIMARY state)
- **Check connection string**: Ensure it uses `w=1` for single-node setup (not `w=majority`)
- **Restart MongoDB**: `docker-compose restart mongo`

**Archivist cannot connect to MongoDB:**
- **Verify MongoDB credentials**: Connect manually with `mongosh --authenticationDatabase admin -u root -p example`
- **Check Docker network**: Both containers should be on the same network (`archivist-network`)
- **Test connectivity**: `docker exec -it archivist ping mongo` (should succeed)
- **Check logs**: `docker-compose logs archivist | grep -i mongo`

**Replica set not initialized or not PRIMARY:**
- **Use automated script** (recommended): `./mongo-init-replica-set.sh`
- **Or manually**: Connect to MongoDB and initialize:
  ```bash
  docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example
  rs.initiate({ _id: "dbrs", members: [{ _id: 0, host: "mongo:27017" }] })
  # Wait 10-30 seconds, then check:
  rs.status().members[0].stateStr  # Should show "PRIMARY"
  exit
  ```
- **Check status**: Run `./mongo-init-replica-set.sh` to verify and fix if needed
- **Force reconfiguration** (if stuck): Run the script, it will attempt to reconfigure

**Port already in use:**
- **Check what's using the port**: `lsof -i :8888` (Archivist) or `lsof -i :27017` (MongoDB)
- **Stop conflicting service**: Kill the process or change ports in `docker-compose.yml`

**MongoDB key file not found:**
- **Create the key file**: `openssl rand -base64 756 > mongodb.key && chmod 400 mongodb.key`
- **Verify permissions**: `ls -l mongodb.key` (should show `-r--------`)

#### 7.6. Configuration

**Environment Variables in `docker-compose.yml`**:

All Archivist configuration is set in `archivist/docker-compose.yml`. Key variables:

- `API_KEY`: Archivist API key (default: `12345678-1234-5678-90ab-1234567890ab`)
- `APP_PORT`: Archivist port (default: `8888`)
- `MONGO_CONNECTION_STRING`: MongoDB connection string (uses Docker service name `mongo`)
- `MONGO_DATABASE`: Database name (default: `archivist`)
- `CORS_ALLOWED_ORIGINS`: Allowed CORS origins (default: `http://localhost:3000,http://localhost:4000`)

To modify configuration:

1. Edit `archivist/docker-compose.yml`
2. Restart the Archivist: `docker-compose up -d --force-recreate archivist`

#### 7.7. Data Persistence

MongoDB data is persisted in a Docker volume named `mongo_data`. This means:

- **Data survives container restarts**: Data persists even if containers are stopped
- **Data persists across updates**: Data remains when containers are recreated
- **Clean slate**: To remove all data, use `docker-compose down -v`

**To backup MongoDB data:**
```bash
# Create backup
docker exec mongo mongodump --authenticationDatabase admin -u root -p example --archive=/backup.archive --db=archivist
docker cp mongo:/backup.archive ./archivist-backup.archive

# Restore backup
docker cp ./archivist-backup.archive mongo:/backup.archive
docker exec mongo mongorestore --authenticationDatabase admin -u root -p example --archive=/backup.archive
```

#### 7.8. Connecting from Backend

Once the local Archivist is running, update your backend configuration:

1. **Set Archivist URL** in `backend/.env`:
   ```env
   XYO_ARCHIVIST_URL=http://localhost:8888
   ```

2. **Set API Key** in `backend/.env`:
   ```env
   XYO_API_KEY=12345678-1234-5678-90ab-1234567890ab
   ```

3. **Restart backend**:
   ```bash
   cd backend
   npm run dev
   ```

The backend will now use your local Archivist instead of production XYO Network Archivists.

**Note**: The local Archivist uses the archive name `chaincheck` (or `temp` if `chaincheck` doesn't exist). Make sure `XYO_ARCHIVE=chaincheck` is set in your backend `.env` file.

### 8. Local Diviner Setup (Optional)

Instead of using XYO Network's production Diviners, you can run a local Location Diviner for development and testing. This is useful for:

- **Development**: Test Diviner query functionality without depending on external services
- **Testing**: Verify location-based queries against your local Archivist data
- **Debugging**: Inspect Diviner query processing and results
- **Integration Testing**: Test complete Archivist + Diviner workflow locally

**Important Note**: The Diviner code in `./diviner` is from the GitHub repository [XYOracleNetwork/api-location.diviner.xyo.network-express](https://github.com/XYOracleNetwork/api-location.diviner.xyo.network-express), which has not been updated since August 2022. As a result:
- **Diviner functionality with XL1 is primarily mocked** - The Diviner does not fully support XL1 blockchain queries
- **Archivist is the off-chain source of record** - Location data is typically extracted directly from Archivist payloads rather than relying on Diviner queries
- The backend falls back to using Archivist data when Diviner queries fail or return empty results

**Prerequisites**: A local Archivist must be running (see [Local Archivist Setup](#7-local-archivist-setup-optional) above).

#### 8.1. Install Node.js 16.x

The Diviner requires Node.js 16.x, while your other services (backend, web, mobile) use Node.js 24. You can run both simultaneously using `nvm`:

1. **Install nvm** (if not already installed):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc  # or restart terminal
   ```

2. **Install both Node versions**:
   ```bash
   nvm install 16    # For Diviner
   nvm install 24    # For your other services (if not already installed)
   nvm alias default 24  # Set 24 as default for main services
   ```

3. **Verify versions**:
   ```bash
   nvm use 16
   node --version  # Should show v16.x.x
   
   nvm use 24
   node --version  # Should show v24.x.x
   ```

**Important**: Each terminal session can have its own Node version. Services run in separate processes, so different Node versions don't conflict.

#### 8.2. Setup Local Diviner

1. **Navigate to Diviner project**:
   ```bash
   cd diviner/api-diviner-nodejs
   ```

2. **Switch to Node.js 16**:
   ```bash
   nvm use 16
   # Or create .nvmrc file: echo "16" > .nvmrc, then use: nvm use
   ```

3. **Install dependencies**:
   ```bash
   yarn install
   ```
   
   **Note**: This may take a few minutes as it installs XYO Network SDK packages.

4. **Build the project**:
   ```bash
   yarn compile
   ```
   
   Or if using XYO build scripts:
   ```bash
   yarn xy build
   ```

5. **Configure environment variables**:
   ```bash
   cp .example.env .env
   ```
   
   Edit `.env`:
   ```env
   # Connect to your existing local Archivist
   ARCHIVIST_URL=http://localhost:8888
   
   # Archive name (use same as your backend for consistency)
   ARCHIVE=chaincheck
   # Or use temp:
   # ARCHIVE=temp
   
   # Port for Diviner server
   APP_PORT=9999
   
   # CORS allowed origins (comma-separated)
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
   ```

6. **Verify local Archivist is running**:
   ```bash
   # Test Archivist connection
   curl http://localhost:8888/api
   # Should return a response (even if it's an error, it means Archivist is reachable)
   ```

7. **Start the Diviner**:
   
   **Development mode** (with nodemon for auto-reload):
   ```bash
   yarn start
   ```
   
   **Production mode**:
   ```bash
   yarn launch
   ```
   
   The Diviner should start on port **9999**.

8. **Verify Diviner is running**:
   ```bash
   # Check if Diviner is responding
   curl http://localhost:9999
   
   # Or check health endpoint (if available)
   curl http://localhost:9999/health
   ```

#### 8.3. Configure Backend to Use Local Diviner

Update your `backend/.env`:

```env
# Use local Diviner instead of production
XYO_DIVINER_URL=http://localhost:9999

# Ensure Diviner is not disabled
XYO_DIVINER_DISABLED=false
```

Restart your backend service:

```bash
cd backend
# Stop current server (Ctrl+C)
npm run dev
```

#### 8.4. Diviner Services

**Diviner Process**:
- **Port**: `9999` (exposed to host)
- **API URL**: `http://localhost:9999`
- **Node.js Version**: 16.x (required)
- **Dependencies**: Requires Archivist to be running

**Archivist Connection**:
- **URL**: `http://localhost:8888` (your local Archivist)
- **Source Archive**: `chaincheck` (where delivery data is stored)
- **Result Archive**: `temp` (where Diviner stores queries and answers)

#### 8.5. Useful Commands

```bash
# Navigate to Diviner directory
cd diviner/api-diviner-nodejs

# Switch to Node 16 (required)
nvm use 16

# Start Diviner (development mode)
yarn start

# Build Diviner
yarn compile

# Check if Diviner is running
curl http://localhost:9999

# View Diviner logs (in terminal where yarn start is running)
# Logs appear in the terminal output
```

#### 8.6. Running Multiple Services with Different Node Versions

You can run all services simultaneously, each with its appropriate Node version:

**Terminal 1 - Archivist (Docker)**:
```bash
cd archivist
docker-compose up -d
# No Node.js needed - runs in Docker
```

**Terminal 2 - Diviner (Node 16)**:
```bash
cd diviner/api-diviner-nodejs
nvm use 16
yarn start
```

**Terminal 3 - Backend (Node 24)**:
```bash
cd backend
nvm use 24  # or just use default
npm run dev
```

**Terminal 4 - Web (Node 24)**:
```bash
cd web
nvm use 24  # or just use default
npm run dev
```

Each service runs independently with its own Node version - no conflicts!

#### 8.7. Troubleshooting

**Diviner requires Node.js 16.x**:
- **Use `nvm`** to install and switch: `nvm install 16 && nvm use 16`
- Other services can continue using Node 24
- Each terminal session can have its own Node version

**Diviner cannot connect to Archivist**:
- Verify Archivist is running: `curl http://localhost:8888/api`
- Check `ARCHIVIST_URL` in `.env` is set to `http://localhost:8888` (no trailing slash)
- Ensure Archivist container is healthy: `cd archivist && docker-compose ps`

**Port 9999 already in use**:
- Find process: `lsof -i :9999`
- Kill process: `kill -9 <PID>`
- Or change port in `.env`: `APP_PORT=10000`

**Build errors**:
- Clean build: `yarn clean`
- Reinstall dependencies: `yarn reinstall`
- Rebuild: `yarn compile`

**Node version conflicts**:
- Each service runs in its own process - no conflicts
- Use `nvm use <version>` in each terminal before starting the service
- Create `.nvmrc` files for auto-switching: `echo "16" > .nvmrc` then `nvm use`

For more detailed information, see [Local Diviner Setup Guide](./diviner/LOCAL_DIVINER_SETUP.md).

### 9. Prisma Studio - Database Management GUI

Prisma Studio provides a visual interface for managing your database data.

#### 9.1. Start Prisma Studio

In a new terminal:

```bash
cd backend
npm run studio
```

This opens Prisma Studio at `http://localhost:5556` in your default browser.

**Note:** Prisma Studio runs on port `5556` (not the default 5555) to avoid conflicts.

#### 9.2. Using Prisma Studio

**Viewing Data:**
- Click on any table (e.g., `Delivery`, `Driver`) to view all records
- Use the search bar to filter records
- Click on any record to view/edit details
- Use pagination controls at the bottom for large datasets

**Creating Records:**
1. Click the "+ Add record" button
2. Fill in the required fields
3. Click "Save 1 change" to create the record

**Editing Records:**
1. Click on any record to open the detail view
2. Modify fields directly in the form
3. Click "Save X changes" to update

**Deleting Records:**
1. Click on a record to open detail view
2. Click the trash icon (🗑️) in the top right
3. Confirm deletion

**Bulk Operations:**
- Select multiple records using checkboxes
- Use "Delete selected" to remove multiple records at once

**Useful Features:**
- **Relationships**: Click on relationship fields to navigate to related records
- **JSON Fields**: `boundWitnessData` and other JSON fields are displayed in a formatted view
- **Timestamps**: `createdAt` and `updatedAt` are automatically managed
- **Search**: Use the search bar to quickly find records by ID or other fields

#### 9.3. Common Tasks in Prisma Studio

**Reset Database to Seed State:**
1. Select all records in `Delivery` table → Delete
2. Select all records in `Driver` table → Delete
3. Run `npm run seed` in terminal to repopulate

**Create Test Delivery:**
1. Click "+ Add record" in `Delivery` table
2. Fill required fields:
   - `orderId`: Unique identifier (e.g., `ORD-TEST-001`)
   - `driverId`: Use one of the seeded drivers (e.g., `vbuterin`)
   - `recipientName`: Test recipient name
   - `recipientPhone`: Phone number
   - `deliveryAddress`: Full address
   - `destinationLat`: Latitude (e.g., `32.7134`)
   - `destinationLon`: Longitude (e.g., `-117.1532`)
   - `status`: Choose from `PENDING`, `IN_TRANSIT`, `DELIVERED`, `FAILED`, `DISPUTED`
3. Click "Save 1 change"

**Create Test Driver:**
1. Click "+ Add record" in `Driver` table
2. Fill required fields:
   - `driverId`: Unique driver ID (e.g., `testdriver`)
   - `passwordHash`: Use the seed script's hash function or create via API
3. Click "Save 1 change"

**View Verification Data:**
- Open a `Delivery` record that has been verified
- Check the `boundWitnessData` JSON field for:
  - `proofHash`: Blockchain proof hash
  - `xl1TransactionHash`: XL1 transaction identifier
  - `archivistResponse`: Archivist submission details
  - `divinerVerification`: Diviner network verification data

**Note:** Prisma Studio is read-only for some complex operations. For advanced queries, use Prisma Client in code or direct SQL queries.

---

### 10. Ethereum Escrow Payment Configuration

ChainCheck supports Ethereum-based escrow payments for secure payment-on-delivery. Funds are locked in a smart contract until delivery verification, then automatically released to the seller.

#### 10.1. Overview

The escrow payment system provides:

- **Secure Payment Holding**: Buyer funds are locked in a smart contract until delivery is verified
- **Automatic Release**: Funds are automatically released to the seller upon successful delivery verification
- **Smart Contract Security**: Payments are managed by an immutable smart contract on Ethereum
- **Refund Capability**: Funds can be refunded to the buyer if delivery fails or is disputed
- **30-Day Auto-Refund**: Automatic refund after 30 days if delivery is not verified

#### 10.2. Architecture

**Payment Flow:**
1. **Order Creation**: Buyer deposits ETH into escrow contract (or order is created with `requiresPaymentOnDelivery=true`)
2. **Escrow Lock**: Funds are locked in the smart contract with delivery ID
3. **Delivery Verification**: Driver verifies delivery via mobile app
4. **Automatic Release**: Backend service calls contract `release()` function
5. **Fund Transfer**: ETH is transferred from escrow to seller wallet

**Authorization:**
- The escrow contract uses an **owner-based authorization model**
- The contract owner (set at deployment) is the only address that can call `release()` or `refund()`
- The backend service wallet (configured via `ETHEREUM_PRIVATE_KEY`) must be the contract owner

#### 10.3. Prerequisites

**Required:**
- Ethereum wallet with ETH for gas fees (for contract deployment and transactions)
- Ethereum RPC endpoint (Infura, Alchemy, or local node)
- Solidity development environment (Hardhat, Foundry, or Remix IDE) for contract compilation

**Optional:**
- Testnet ETH (Sepolia) for testing without real funds
- MetaMask or similar wallet for contract interaction testing

#### 10.4. Smart Contract Deployment

**Step 1: Compile the Contract**

The escrow contract is located at `backend/contracts/DeliveryEscrow.sol`. You can compile it using:

**Option A: Remix IDE (Recommended for Quick Testing)**
1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create a new file and paste the contract code from `backend/contracts/DeliveryEscrow.sol`
3. Select Solidity compiler version 0.8.20 or higher
4. Click "Compile DeliveryEscrow.sol"

**Option B: Hardhat (Recommended for Production)**
```bash
cd backend
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Copy contracts/DeliveryEscrow.sol to hardhat/contracts/
npx hardhat compile
```

**Step 2: Deploy the Contract**

**Using Remix:**
1. In Remix, go to "Deploy & Run Transactions"
2. Select "Injected Web3" (MetaMask) or your preferred environment
3. Select the network (Sepolia testnet recommended for testing)
4. Click "Deploy"
5. Copy the deployed contract address

**Using Hardhat:**
```bash
# Create deployment script in hardhat/scripts/deploy.ts
npx hardhat run scripts/deploy.ts --network sepolia
```

**Important:** The wallet used to deploy the contract becomes the contract owner. This wallet must match the `ETHEREUM_PRIVATE_KEY` in your backend `.env` file.

**Step 3: Verify Contract Deployment**

1. Copy the deployed contract address
2. View on Etherscan (e.g., [Sepolia Etherscan](https://sepolia.etherscan.io))
3. Verify the contract owner matches your backend wallet address

#### 10.5. Backend Configuration

Add the following environment variables to `backend/.env`:

```env
#####################
# Ethereum Payment Configuration #
#####################

# Enable automatic payment release on successful delivery verification
ENABLE_PAYMENT_ON_VERIFICATION=true

# Payment mock mode (for development/testing)
# When enabled, payment transfers are simulated without actual blockchain transactions
PAYMENT_MOCK_MODE=false  # Set to true for testing without real ETH

# Ethereum RPC URL for payment transactions
# Mainnet: https://mainnet.infura.io/v3/YOUR_PROJECT_ID
# Sepolia (testnet): https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# Local: http://localhost:8545
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Ethereum private key for payment service/escrow wallet
# WARNING: Keep this secure! This wallet must be the contract owner.
# In production, use a hardware wallet or secure key management service.
ETHEREUM_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Ethereum Chain ID (optional, auto-detected if not provided)
# Mainnet: 1
# Sepolia: 11155111
# Goerli: 5
ETHEREUM_CHAIN_ID=11155111

#####################
# Ethereum Escrow Configuration #
#####################

# Escrow contract address (deployed smart contract)
# Deploy using: npm run deploy-escrow (or manually via Remix/Hardhat)
ETHEREUM_ESCROW_CONTRACT_ADDRESS=0xD5Dad3D8cd01d05Bcb8E9E85f77948105853aeC0

# Use escrow for payments (true) or direct transfer (false)
# When true, funds are locked in escrow contract until delivery verification
# When false, uses direct transfer from service wallet (original implementation)
USE_ESCROW=true
```

#### 10.6. Obtaining Ethereum RPC Endpoint

**Option A: Infura (Recommended)**
1. Sign up at [Infura](https://infura.io)
2. Create a new project
3. Select "Ethereum" network
4. Copy the project ID
5. Use: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID` (testnet) or `https://mainnet.infura.io/v3/YOUR_PROJECT_ID` (mainnet)

**Option B: Alchemy**
1. Sign up at [Alchemy](https://www.alchemy.com)
2. Create a new app
3. Select network (Sepolia or Mainnet)
4. Copy the API key
5. Use: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY` (testnet) or `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY` (mainnet)

**Option C: Local Node**
- Run a local Ethereum node (Geth, Erigon, etc.)
- Use: `http://localhost:8545`

#### 10.7. Wallet Configuration

**Critical Requirement:** The wallet used for `ETHEREUM_PRIVATE_KEY` must be the same wallet that deployed the escrow contract (contract owner).

**Getting a Private Key:**

**Option A: Generate New Wallet**
```bash
# Using Node.js
node -e "const { ethers } = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

**Option B: Export from MetaMask**
1. Open MetaMask
2. Click account icon → Settings → Security & Privacy
3. Click "Show Private Key" (enter password)
4. Copy the private key (starts with `0x`)

**Option C: Use Existing Wallet**
- If you already have a wallet, export its private key
- Ensure this wallet has sufficient ETH for gas fees

**Security Warning:**
- **Never commit private keys to version control**
- Store private keys securely (environment variables, secret management services)
- Use a dedicated service wallet (not your personal wallet)
- In production, consider using hardware wallets or key management services (AWS KMS, HashiCorp Vault, etc.)

#### 10.8. Buyer and Seller Wallet Addresses

Buyer and seller wallet addresses are stored in the `Delivery` model:

- **`buyerWalletAddress`**: Ethereum address of the buyer (who pays)
- **`sellerWalletAddress`**: Ethereum address of the seller (who receives payment)

**Setting Buyer/Seller Addresses:**

**Option A: Via Database Seed Script**
The seed script (`backend/prisma/seed.ts`) includes sample buyer and seller addresses. You can modify these:

```typescript
const sampleBuyerWallets = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Buyer 1
  '0x8ba1f109551bD432803012645Hac136c22C1779', // Buyer 2
  // ... more addresses
];

const sampleSellerWallets = [
  '0x1234567890123456789012345678901234567890', // Seller 1
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // Seller 2
  // ... more addresses
];
```

**Option B: Via API (When Creating Deliveries)**
When creating a delivery via API, include buyer and seller addresses:

```json
{
  "orderId": "ORD-1001",
  "buyerWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "sellerWalletAddress": "0x1234567890123456789012345678901234567890",
  "paymentAmount": 0.001,
  "requiresPaymentOnDelivery": true,
  "paymentCurrency": "ETH"
}
```

**Option C: Via Prisma Studio**
1. Open Prisma Studio: `cd backend && npm run studio`
2. Navigate to `Delivery` table
3. Edit a delivery record
4. Set `buyerWalletAddress` and `sellerWalletAddress` fields
5. Save changes

#### 10.9. Escrow Deposit Process

**For Testing/Demo:**
The backend can simulate escrow deposits for testing. In production, buyers would typically deposit directly from their wallet.

**Manual Deposit (Production):**
1. Buyer connects wallet (MetaMask, etc.) to the escrow contract
2. Buyer calls `deposit(deliveryIdBytes32, sellerAddress)` with ETH value
3. Contract locks funds in escrow
4. Delivery status updates to `ESCROWED`

**Backend-Assisted Deposit (Testing):**
The `EthereumEscrowService.createEscrowDeposit()` method can be used for testing, but requires the buyer to approve/transfer funds first.

#### 10.10. Payment Release Flow

**Automatic Release (Default):**
1. Driver verifies delivery via mobile app
2. XL1 transaction is posted successfully
3. Backend checks: `ENABLE_PAYMENT_ON_VERIFICATION=true` and `USE_ESCROW=true`
4. Backend checks: `paymentStatus === 'ESCROWED'`
5. Backend calls `escrowService.releaseEscrow(deliveryId)`
6. Contract verifies: `msg.sender == owner` (authorization check)
7. Contract releases funds to seller
8. Database updates: `paymentStatus = 'PAID'`, `escrowReleaseTxHash` and `escrowReleaseBlock` are set

**Manual Release (If Automatic Fails):**
```bash
# Via API
POST /api/deliveries/:id/payment/release
Authorization: Bearer <token>
```

#### 10.11. Payment Status Values

The `paymentStatus` field can have the following values:

- **`PENDING`**: Payment not yet initiated (no escrow deposit)
- **`ESCROWED`**: Funds locked in escrow contract (awaiting delivery verification)
- **`PAID`**: Payment successfully released to seller
- **`FAILED`**: Payment transfer failed (check `paymentError` field)
- **`REFUNDED`**: Payment refunded to buyer

#### 10.12. Testing Escrow Payments

**Step 1: Enable Mock Mode (Recommended for Initial Testing)**
```env
PAYMENT_MOCK_MODE=true
USE_ESCROW=true
ENABLE_PAYMENT_ON_VERIFICATION=true
```

This simulates transactions without real blockchain calls.

**Step 2: Test with Real Contract (Sepolia Testnet)**
```env
PAYMENT_MOCK_MODE=false
USE_ESCROW=true
ENABLE_PAYMENT_ON_VERIFICATION=true
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ETHEREUM_PRIVATE_KEY=0x...  # Contract owner wallet
ETHEREUM_ESCROW_CONTRACT_ADDRESS=0x...  # Deployed contract
```

**Step 3: Get Testnet ETH**
- Sepolia Faucet: [https://cloud.google.com/application/web3/faucet/ethereum/sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- Or use other Sepolia faucets

**Step 4: Create Test Delivery with Escrow**
1. Create a delivery with `requiresPaymentOnDelivery=true`
2. Set `buyerWalletAddress` and `sellerWalletAddress`
3. Set `paymentCurrency='ETH'` and `paymentAmount` (e.g., 0.001)
4. Manually deposit to escrow (or use backend-assisted deposit for testing)
5. Verify delivery via mobile app
6. Check that payment status changes to `PAID`

#### 10.13. Troubleshooting

**Error: "Not authorized"**
- **Cause**: Backend wallet is not the contract owner
- **Solution**: Verify contract owner matches `ETHEREUM_PRIVATE_KEY` wallet address
- **Check**: Call `contract.owner()` on Etherscan or Remix

**Error: "Escrow contract not initialized"**
- **Cause**: Missing or invalid configuration
- **Solution**: Verify all required environment variables are set:
  - `ETHEREUM_RPC_URL`
  - `ETHEREUM_PRIVATE_KEY`
  - `ETHEREUM_ESCROW_CONTRACT_ADDRESS`
  - `USE_ESCROW=true`

**Error: "Insufficient funds for gas"**
- **Cause**: Owner wallet doesn't have enough ETH for gas fees
- **Solution**: Fund the owner wallet with ETH (for gas, not for payments)

**Payment Status Stuck on ESCROWED**
- **Cause**: Automatic release failed (check logs)
- **Solution**: Manually release via API: `POST /api/deliveries/:id/payment/release`

**Contract Not Found**
- **Cause**: Invalid contract address or wrong network
- **Solution**: Verify contract address on Etherscan matches the network (Sepolia/Mainnet)

#### 10.14. Security Best Practices

1. **Private Key Security**:
   - Never commit `ETHEREUM_PRIVATE_KEY` to version control
   - Use environment variables or secret management services
   - Rotate keys periodically
   - Use hardware wallets for production

2. **Contract Ownership**:
   - Use a dedicated service wallet for contract owner
   - Don't use the owner wallet for other purposes
   - Consider multi-sig wallets for production

3. **Network Selection**:
   - Use testnet (Sepolia) for development and testing
   - Only use mainnet after thorough testing
   - Verify contract address matches the network

4. **Gas Management**:
   - Monitor owner wallet balance
   - Set up alerts for low balance
   - Estimate gas costs before transactions

5. **Access Control**:
   - Secure backend API endpoints
   - Use authentication for payment operations
   - Implement rate limiting

#### 10.15. Production Deployment Checklist

Before deploying to production:

- [ ] Contract deployed to mainnet
- [ ] Contract address verified on Etherscan
- [ ] Owner wallet is dedicated service wallet
- [ ] Owner wallet has sufficient ETH for gas
- [ ] `ETHEREUM_PRIVATE_KEY` stored securely (not in code)
- [ ] `PAYMENT_MOCK_MODE=false`
- [ ] `USE_ESCROW=true`
- [ ] `ENABLE_PAYMENT_ON_VERIFICATION=true`
- [ ] RPC endpoint is production-grade (Infura/Alchemy)
- [ ] Monitoring set up for payment transactions
- [ ] Backup/restore procedures documented
- [ ] Security audit completed (for production contracts)

---

## Web Dashboard Setup

### 1. Navigate to Web Directory

```bash
cd web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp env.local.example .env.local
```

Edit `.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Mapbox Token (optional, for map visualization)
# Get a free token at: https://account.mapbox.com/access-tokens/
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

### 4. Start Development Server

**Standard HTTP (Default):**
```bash
npm run dev
```

The web dashboard should start on `http://localhost:3000`.

**HTTPS with Custom Domain (Optional):**
For features requiring Web Crypto API (`crypto.subtle`) with a FQDN like `www.chaincheck.com`:

1. **Generate SSL certificate:**
   ```bash
   npm run generate-cert
   ```

2. **Add to `/etc/hosts`:**
   ```bash
   sudo nano /etc/hosts
   # Add:
   # 127.0.0.1  www.chaincheck.com
   # 127.0.0.1  chaincheck.com
   ```

3. **Trust certificate (macOS):**
   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/chaincheck.crt
   ```

4. **Start HTTPS server:**
   ```bash
   npm run dev:https
   ```

Visit: `https://www.chaincheck.com:3000`

**Why HTTPS?**
- The Web Crypto API (`crypto.subtle`) requires HTTPS when using a FQDN (not just `localhost`)
- Enables tampering detection features that use cryptographic hashing
- Professional-looking URL for demos (`www.chaincheck.com` instead of `localhost`)

**Verify it's working:**
- HTTP: Open `http://localhost:3000` in your browser
- HTTPS: Open `https://www.chaincheck.com:3000` in your browser
- You should see the ChainCheck dashboard

**Note:** Self-signed certificates will show a browser security warning on first visit. After trusting the certificate in macOS, Safari should not show warnings. Other browsers may still show a warning - click "Advanced" → "Proceed" to continue.

---

## Mobile App Setup

### Prerequisites for Mobile Development

**For iOS Development (macOS only):**
- **Xcode**: Version 14.0 or higher
  - Download from [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) or [Apple Developer](https://developer.apple.com/xcode/)
  - Install Command Line Tools: `xcode-select --install`
  - Verify: `xcodebuild -version`
- **CocoaPods**: iOS dependency manager
  - Install: `sudo gem install cocoapods`
  - Verify: `pod --version`
- **iOS Simulator**: Included with Xcode
  - Open via: `open -a Simulator` or Xcode → Open Developer Tool → Simulator

**For Android Development (All Platforms):**
- **Java Development Kit (JDK)**: Version 17 or higher
  - macOS: `brew install openjdk@17`
  - Linux: `sudo apt-get install openjdk-17-jdk`
  - Windows: Download from [Oracle](https://www.oracle.com/java/technologies/downloads/) or use [Adoptium](https://adoptium.net/)
  - Verify: `java -version`
- **Android Studio**: Latest version
  - Download from [developer.android.com/studio](https://developer.android.com/studio)
  - Install Android SDK (API Level 33+)
  - Install Android Virtual Device (AVD) Manager
- **Android SDK**: Included with Android Studio
  - Set `ANDROID_HOME` environment variable:
    - macOS/Linux: `export ANDROID_HOME=$HOME/Library/Android/sdk`
    - Windows: `set ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk`
  - Add to PATH: `$ANDROID_HOME/platform-tools` and `$ANDROID_HOME/tools`

**For Physical Device Testing:**
- **Expo Go App**: Free app for testing
  - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
  - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **USB Debugging** (Android physical devices):
  - Enable Developer Options on Android device
  - Enable USB Debugging
  - Connect device via USB

### 1. Navigate to Mobile Directory

```bash
cd mobile
```

### 2. Install Dependencies

```bash
npm install
```

**Note:** This may take several minutes as it installs React Native and Expo dependencies.

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp env.example .env
```

Edit `.env` based on your testing method:

**For iOS Simulator / Android Emulator:**
```env
# Use localhost (simulator/emulator can access host machine's localhost)
EXPO_PUBLIC_API_URL=http://localhost:4000
```

**For Physical Device Testing:**
```env
# Use your computer's local IP address
# Find your IP address:
# macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1
# Windows: ipconfig | findstr IPv4
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
```

**Important Notes:**
- Physical devices cannot access `localhost` - you must use your computer's IP address
- Ensure your device and computer are on the same Wi-Fi network
- Firewall may block connections - allow port 4000 if needed

### 4. iOS Simulator Setup (macOS Only)

**Note:** This is an Expo project. The native `ios/` directory is automatically generated when you first run `npm run ios`. You don't need to manually create it or run `pod install` separately.

#### 4.0. iOS Prerequisites

Before building the iOS app, you need to configure Mapbox authentication:

**Mapbox Setup (Required for Maps):**

1. **Get Mapbox Tokens:**
   - Go to [Mapbox Access Tokens](https://account.mapbox.com/access-tokens/)
   - Create or copy your **Public Access Token** (starts with `pk.`)
   - Create or copy your **Secret Download Token** (starts with `sk.`) with `Downloads:Read` scope

2. **Configure Environment Variables:**
   ```bash
   cd mobile
   cp env.example .env
   # Edit .env and add:
   # EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_public_token_here
   # MAPBOX_DOWNLOADS_TOKEN=sk.your_secret_token_here
   ```

3. **Configure Android Gradle Properties (Required for Android builds):**
   ```bash
   cd mobile/android
   cp gradle.properties.example gradle.properties
   # Edit gradle.properties and add your MAPBOX_DOWNLOADS_TOKEN after the = sign
   # Example: MAPBOX_DOWNLOADS_TOKEN=sk.your_secret_token_here
   ```
   **Important**: The `gradle.properties` file is gitignored and will NOT be committed. This is intentional to keep your token secure.

4. **Configure Mapbox SDK Downloads:**
   ```bash
   # Create ~/.netrc file for Mapbox SDK authentication
   cat > ~/.netrc << EOF
   machine api.mapbox.com
   login mapbox
   password sk.your_secret_token_here
   EOF
   chmod 600 ~/.netrc
   ```
   Replace `sk.your_secret_token_here` with your actual Mapbox secret download token.

**Note:** The `~/.netrc` file is required for CocoaPods to download the Mapbox iOS SDK during `pod install`. This file is user-specific and should not be committed to the repository.

#### 4.1. Start iOS Simulator (Optional)

You can start the simulator manually, or `npm run ios` will start it automatically if it's not running.

**Option A: Via Command Line**
```bash
# List available simulators
xcrun simctl list devices

# Boot a specific simulator (e.g., iPhone 15 Pro)
xcrun simctl boot "iPhone 15 Pro"

# Or open Simulator app
open -a Simulator
```

**Option B: Via Xcode**
- Open Xcode
- Xcode → Open Developer Tool → Simulator
- Select device: File → Open Simulator → Choose device

#### 4.2. Run App on iOS Simulator

```bash
cd mobile
npm run ios
```

This will:
- Automatically generate the native `ios/` directory (if it doesn't exist)
- Automatically run `pod install` to install iOS dependencies
- **Automatically start Metro bundler** (no need to run `npm start` separately)
- Build the iOS app
- Launch the app in the iOS Simulator (or use an already-running simulator)
- Enable hot reloading

**Metro Bundler:** Both `expo run:ios` and `expo run:android` **automatically start Metro bundler** for you. You do **not** need to run `npm start` in a separate terminal before running these commands.

**Optional - Running Metro Separately:** If you want to keep Metro running across multiple builds or see Metro logs in a separate terminal, you can:
1. Run `npm start` in one terminal (this starts Metro bundler)
2. Run `npm run ios -- --no-bundler` or `npm run android -- --no-bundler` in another terminal (this skips starting Metro since it's already running)

**First-time setup may take 5-10 minutes** as it generates the native iOS project and builds it.

**Important Notes:**
- **Patches Applied Automatically:** The project uses `patch-package` to apply necessary patches to `react-native` and `@rnmapbox/maps` during `npm install`. These patches fix compatibility issues and are automatically applied via the `postinstall` script.
- **Mapbox Native Module:** The Mapbox native module is automatically added to the Podfile after Expo prebuild runs. The `npm run ios` command uses a wrapper script that ensures Mapbox is properly linked even if Expo prebuild regenerates the Podfile. This is necessary because Mapbox requires SDK downloads via `.netrc` authentication.
- **First Build CRC Error (Known Expo Bug):** On the first `npm run ios` execution after a clean install (`rm -rf node_modules && npm install`), you may see a CRC error from `jimp-compact` during Expo prebuild. This is a **documented Expo bug** with image processing that cannot be fully worked around. **The script attempts automatic retries with cache clearing**, but if it still fails after 3 attempts, **simply run `npm run ios` again** - it will almost certainly succeed on the second run. This is a transient issue that resolves once the image cache is "warmed up". The error does not indicate actual file corruption.

**Note:** If you need to manually reinstall iOS dependencies (e.g., after adding a new native module), you can run:
```bash
cd mobile
npx expo prebuild --platform ios --clean
cd ios
pod install
```

### 5. Android Emulator Setup

#### 5.1. Create Android Virtual Device (AVD)

**Via Android Studio:**
1. Open Android Studio
2. Tools → Device Manager
3. Click "Create Device"
4. Select device (e.g., Pixel 6)
5. Select system image (API Level 33+ recommended)
6. Click "Finish"

**Via Command Line:**
```bash
# List available system images
sdkmanager --list | grep "system-images"

# Install system image (example)
sdkmanager "system-images;android-33;google_apis;x86_64"

# Create AVD
avdmanager create avd -n Pixel6_API33 -k "system-images;android-33;google_apis;x86_64"
```

#### 5.2. Start Android Emulator

**Via Android Studio:**
- Tools → Device Manager → Click ▶️ next to your AVD

**Via Command Line:**
```bash
# List available AVDs
emulator -list-avds

# Start specific AVD
emulator -avd Pixel6_API33

# Or use the default
emulator -avd @Pixel6_API33
```

#### 5.3. Run App on Android Emulator

```bash
cd mobile
npm run android
```

This will:
- **Automatically start Metro bundler** (no need to run `npm start` separately)
- Build the Android app
- Install and launch the app in the emulator
- Enable hot reloading

**Note:** Like iOS, `expo run:android` automatically starts Metro bundler. You do **not** need to run `npm start` separately.

**First-time setup may take 10-15 minutes** as it builds the native Android project.

**Troubleshooting Android Build:**
```bash
# If build fails, clean and rebuild
cd android
./gradlew clean
cd ..
npm run android
```

### 6. Physical Device Testing

#### 6.1. Find Your Computer's IP Address

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Look for: inet 192.168.1.100
```

**Windows:**
```cmd
ipconfig
# Look for IPv4 Address under your active network adapter
```

#### 6.2. Update Environment Variable

Edit `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:4000
```

#### 6.3. Ensure Backend is Accessible

**Check Backend is Running:**
```bash
# From your computer
curl http://localhost:4000/api/health

# From your device's browser (should work if on same network)
# Navigate to: http://YOUR_IP_ADDRESS:4000/api/health
```

**Firewall Configuration:**
- macOS: System Settings → Network → Firewall → Allow incoming connections for Node
- Linux: `sudo ufw allow 4000`
- Windows: Windows Defender Firewall → Allow app through firewall → Node.js

#### 6.4. Start Expo Development Server

```bash
cd mobile
npm run start
```

This displays:
- QR code in terminal
- Metro bundler URL
- Expo DevTools URL

#### 6.5. Connect Physical Device

**Option A: Expo Go App (Recommended for Development)**
1. Install Expo Go on your device (iOS App Store / Android Play Store)
2. Open Expo Go app
3. Scan the QR code displayed in terminal
   - iOS: Use Camera app (iOS 11+)
   - Android: Use Expo Go app's built-in scanner
4. App should load on your device

**Option B: Development Build (For Native Features)**
```bash
# Build and install development build
npm run ios    # For iOS (requires macOS)
npm run android # For Android
```

### 7. Mobile App Configuration

#### 7.1. App Configuration (`app.config.js`)

The app configuration is in `mobile/app.config.js`. Key settings:

```javascript
{
  name: 'ChainCheck',
  slug: 'chaincheck',
  version: '0.1.0',
  orientation: 'portrait',
  ios: {
    supportsTablet: true
  },
  android: {
    package: 'com.chaincheck.app'
  },
  plugins: [
    'expo-location',  // Location permissions
    'expo-camera'     // Camera permissions
  ]
}
```

#### 7.2. Permissions Configuration

**Location Permissions:**
- Configured in `app.config.js` under `expo-location` plugin
- iOS: Requires `Info.plist` entries (auto-generated by Expo)
- Android: Requires `AndroidManifest.xml` entries (auto-generated by Expo)

**Camera Permissions:**
- Configured in `app.config.js` under `expo-camera` plugin
- Required for delivery photo capture

### 8. Mobile Testing

#### 8.0. Quick Start: Testing on iOS and Android

**High-Level Overview:**

Both iOS Simulator (macOS only) and Android Emulator provide sufficient testing environments for most development work. Physical devices are only required for NFC functionality and final production validation.

##### iOS Simulator Testing (macOS Only)

**Prerequisites:**
- macOS with Xcode installed
- CocoaPods: `sudo gem install cocoapods` (installed automatically with Xcode Command Line Tools)

**Quick Start:**
1. **Start iOS Simulator:**
   - Via Xcode: Xcode → Open Developer Tool → Simulator
   - Via command line: `open -a Simulator`

2. **Run the app:**
   ```bash
   cd mobile
   npm run ios
   ```

**Note:** The first time you run `npm run ios`, Expo will automatically:
- Generate the native `ios/` directory (if it doesn't exist)
- Run `pod install` to install iOS dependencies
- Build the iOS app
- Launch it in the simulator

This first-time setup may take 5-10 minutes.

**What Works:**
- ✅ Core app functionality (UI, navigation, screens)
- ✅ API integration (use `http://localhost:4000` for backend)
- ✅ Location services (simulated locations)
- ✅ Camera (uses Mac's camera)
- ✅ Most sensors (accelerometer, barometer - may be simulated)
- ✅ Map display (Mapbox)
- ✅ Signature capture
- ✅ Photo capture

**Limitations:**
- ❌ NFC card scanning (requires physical device)
- ⚠️ Sensor accuracy may differ from real devices
- ⚠️ Performance may differ from real devices

**Is Simulator Sufficient?**
Yes, for most development and testing. Use a physical device only for:
- NFC functionality testing
- Final sensor accuracy validation
- Production-ready performance testing

##### Android Emulator Testing

**Prerequisites:**
- Android Studio installed
- Android SDK and emulator configured

**Quick Start:**
1. **Create Android Virtual Device (AVD)** (one-time):
   - Open Android Studio
   - Tools → Device Manager → Create Device
   - Select device (e.g., Pixel 6) and system image (API 33+)

2. **Start Android Emulator:**
   - Via Android Studio: Tools → Device Manager → Click ▶️ next to AVD
   - Via command line: `emulator -avd <AVD_NAME>`

3. **Run the app:**
   ```bash
   cd mobile
   npm run android
   ```

**What Works:**
- ✅ Core app functionality (UI, navigation, screens)
- ✅ API integration (use `http://10.0.2.2:4000` for backend - Android emulator localhost)
- ✅ Location services (simulated locations)
- ✅ Camera (uses host machine's camera)
- ✅ Most sensors (accelerometer, barometer - may be simulated)
- ✅ Map display (Mapbox)
- ✅ Signature capture
- ✅ Photo capture

**Limitations:**
- ❌ NFC card scanning (requires physical device)
- ⚠️ Sensor accuracy may differ from real devices
- ⚠️ Performance may differ from real devices

**Is Emulator Sufficient?**
Yes, for most development and testing. Use a physical device only for:
- NFC functionality testing
- Final sensor accuracy validation
- Production-ready performance testing

**Important Configuration Notes:**
- **iOS Simulator**: Use `http://localhost:4000` for `EXPO_PUBLIC_API_URL` in `mobile/.env`
- **Android Emulator**: Use `http://10.0.2.2:4000` for `EXPO_PUBLIC_API_URL` in `mobile/.env` (Android emulator maps `10.0.2.2` to host machine's `localhost`)

#### 8.0.1. Mock Driver Location Mode (Testing Feature)

**Purpose:**
Mock location mode allows testing delivery verifications without physically being at the delivery address. This is useful for:
- Testing deliveries from various locations
- Simulating realistic delivery scenarios
- Generating test data for multiple delivery addresses
- Development and QA testing without GPS requirements

**How to Enable:**
1. Open `mobile/.env`
2. Add or update:
   ```env
   EXPO_PUBLIC_MOCK_DRIVER_LOCATION=true
   ```
3. Restart the mobile app (not just reload - full restart required)

**How It Works:**
When `EXPO_PUBLIC_MOCK_DRIVER_LOCATION=true`:
- The app automatically uses the delivery destination coordinates instead of actual GPS location
- The "Within range" check is automatically satisfied (bypasses 50m distance requirement)
- A yellow banner is displayed indicating mock location mode is active
- All other features work normally (photo capture, signature, NFC, sensor data)
- Delivery verification proceeds as if the driver is at the exact delivery location

**Visual Indicator:**
When mock location mode is active, a yellow banner appears in the delivery verification screen:
```
🧪 Mock Location Mode: Using delivery destination coordinates
```

**Use Cases:**
- **Development Testing**: Test delivery verification flow without GPS requirements
- **QA Testing**: Generate test data for multiple delivery addresses quickly
- **Demo/Showcase**: Demonstrate the system with various delivery scenarios
- **Offline Testing**: Test app functionality when GPS is unavailable or inaccurate

**Important Notes:**
- Mock location mode should **NOT** be enabled in production builds
- The banner clearly indicates when mock mode is active to prevent confusion
- All other verification features (photos, signatures, NFC, sensors) work normally
- Mock location coordinates are the exact delivery destination (no distance offset)

**Disabling Mock Location:**
Set `EXPO_PUBLIC_MOCK_DRIVER_LOCATION=false` or remove the variable entirely, then restart the app.

#### 8.1. Unit Testing

```bash
cd mobile

# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

#### 8.2. Manual Testing Checklist

**Authentication:**
- [ ] Driver login
- [ ] Driver registration
- [ ] JWT token storage
- [ ] Token refresh

**Delivery Features:**
- [ ] View delivery list
- [ ] View delivery details
- [ ] Capture delivery photo
- [ ] Capture signature
- [ ] Verify delivery location
- [ ] Submit verification

**Location Services:**
- [ ] Request location permission
- [ ] Get current location
- [ ] Display location on map
- [ ] Calculate distance to destination

**Camera:**
- [ ] Request camera permission
- [ ] Capture photo
- [ ] Preview photo
- [ ] Upload photo to IPFS

**Network:**
- [ ] Handle offline state
- [ ] Retry failed requests
- [ ] Display network errors

#### 8.3. Device-Specific Testing

**iOS Testing:**
- Test on multiple iOS versions (iOS 13+)
- Test on iPhone and iPad
- Test with different screen sizes
- Test location services accuracy
- Test camera functionality

**Android Testing:**
- Test on multiple Android versions (Android 10+)
- Test on different manufacturers (Samsung, Google, etc.)
- Test with different screen sizes
- Test location services accuracy
- Test camera functionality

### 9. Debugging Mobile Apps

#### 9.1. Expo DevTools

When you run `npm run start`, Expo DevTools opens automatically at:
- http://localhost:19002

Features:
- View logs
- Reload app
- Open developer menu
- View network requests

#### 9.2. React Native Debugger

**Install:**
```bash
# macOS
brew install --cask react-native-debugger

# Or download from: https://github.com/jhen0409/react-native-debugger/releases
```

**Usage:**
1. Start app: `npm run start`
2. Open React Native Debugger
3. In app, shake device (or Cmd+D / Ctrl+M)
4. Select "Debug"

#### 9.3. Chrome DevTools (Web Debugging)

1. Start app: `npm run start`
2. In app, shake device (or Cmd+D / Ctrl+M)
3. Select "Debug"
4. Chrome DevTools opens automatically
5. Use Console, Network, Sources tabs

#### 9.4. Native Logs

**iOS:**
```bash
# View iOS simulator logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "ChainCheck"'

# Or use Console.app (macOS)
# Open Console.app → Select your simulator → Filter by "ChainCheck"
```

**Android:**
```bash
# View Android logs
adb logcat | grep -i chaincheck

# Or use Android Studio Logcat
# Android Studio → View → Tool Windows → Logcat
```

#### 9.5. Network Debugging

**Enable Network Inspector:**
- Shake device → "Show Inspector" → Network tab
- Or use Expo DevTools → Network tab

**Test API Calls:**
```bash
# From device, test backend connectivity
# Use a browser on device: http://YOUR_IP:4000/api/health

# Check backend logs for incoming requests
# Backend terminal will show all API requests
```

### 10. Common Mobile Development Issues

#### 10.1. Metro Bundler Issues

**Clear Metro Cache:**
```bash
cd mobile
npm start -- --reset-cache
```

**Clear Watchman (if installed):**
```bash
watchman watch-del-all
```

#### 10.2. Build Issues

**iOS:**
```bash
cd mobile
# Regenerate iOS project and reinstall pods
npx expo prebuild --platform ios --clean
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

**Android:**
```bash
cd mobile/android
./gradlew clean
cd ..
npm run android
```

**Note:** If you encounter "native code not available" errors for Mapbox on iOS:
1. Verify `~/.netrc` file exists and contains your Mapbox secret token:
   ```bash
   cat ~/.netrc
   # Should show:
   # machine api.mapbox.com
   # login mapbox
   # password sk.your_token_here
   ```
2. Ensure `MAPBOX_DOWNLOADS_TOKEN` is set in `mobile/.env`
3. Clean and rebuild:
   ```bash
   cd mobile/ios
   rm -rf Pods Podfile.lock
   pod install
   cd ..
   npm run ios
   ```
4. If issues persist, verify patches are applied:
   ```bash
   cd mobile
   npm run postinstall  # This applies patch-package patches
   ```

#### 10.3. Permission Issues

**iOS:**
- Check `Info.plist` has required permission descriptions
- Reset simulator: Device → Erase All Content and Settings

**Android:**
- Check `AndroidManifest.xml` has required permissions
- Uninstall and reinstall app: `adb uninstall com.chaincheck.app`

#### 10.4. Network Connection Issues

**Physical Device Can't Connect:**
- Verify device and computer are on same Wi-Fi network
- Check firewall allows port 4000
- Verify backend is running: `curl http://localhost:4000/api/health`
- Test from device browser: `http://YOUR_IP:4000/api/health`

**Simulator/Emulator Can't Connect:**
- Use `localhost` in `.env` (not IP address)
- Verify backend is running
- Check CORS settings in backend

#### 10.5. Location Services Not Working

**iOS Simulator:**
- Features → Location → Custom Location
- Set coordinates manually for testing

**Android Emulator:**
- Extended Controls (⋯) → Location
- Set coordinates manually

**Physical Device:**
- Check location permissions in device settings
- Ensure location services are enabled
- Test in a location with GPS signal

### 11. Performance Optimization

#### 11.1. Enable Hermes (Android)

Hermes is enabled by default in Expo SDK 51+. Verify in `app.config.js`:
```javascript
android: {
  jsEngine: 'hermes'  // Default in Expo 51+
}
```

#### 11.2. Enable Flipper (Optional)

Flipper provides advanced debugging tools:
```bash
# Install Flipper
# macOS: brew install --cask flipper
# Then enable in app.config.js if needed
```

#### 11.3. Monitor Performance

**React Native Performance Monitor:**
- Shake device → "Show Perf Monitor"
- Shows FPS, memory usage, etc.

**Chrome DevTools Performance:**
- Open Chrome DevTools → Performance tab
- Record performance profile

### 12. Building for Production

#### 12.1. iOS Build (macOS only)

**Development Build:**
```bash
cd mobile
eas build --platform ios --profile development
```

**Production Build:**
```bash
eas build --platform ios --profile production
```

**Note:** Requires Expo Application Services (EAS) account and Apple Developer account.

#### 12.2. Android Build

**Development Build:**
```bash
cd mobile
eas build --platform android --profile development
```

**Production Build:**
```bash
eas build --platform android --profile production
```

**Note:** Requires Expo Application Services (EAS) account and Google Play Developer account.

### 13. Mobile-Specific Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend API URL | `http://localhost:4000` (simulator)<br>`http://192.168.1.100:4000` (device) |
| `EXPO_PUBLIC_MOCK_DRIVER_LOCATION` | No | Mock driver location mode. When `true`, uses delivery destination coordinates instead of actual GPS location. Useful for testing without being physically at delivery addresses. | `true` or `false` (default: `false`) |

**Important Notes:**
- Variables prefixed with `EXPO_PUBLIC_` are exposed to the app
- Changes require app restart (not just reload)
- Use `localhost` for simulators/emulators
- Use IP address for physical devices
- **Mock Location Mode**: When `EXPO_PUBLIC_MOCK_DRIVER_LOCATION=true`, the app will:
  - Automatically set the current location to the delivery destination coordinates
  - Always show "Within range" status (bypasses 50m distance check)
  - Display a yellow banner indicating mock location mode is active
  - Allow testing deliveries from any location without GPS requirements
  - Generate realistic delivery verification data for testing scenarios

---

## Environment Configuration

### Required Environment Variables Summary

#### Backend (`backend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | Yes | Backend server port | `4000` |
| `NODE_ENV` | Yes | Environment mode | `development` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/chaincheck` |
| `XYO_API_KEY` | Yes | XYO Network API key | `your_key_here` |
| `WEB_URL` | Yes | Web app URL for CORS | `http://localhost:3000` |
| `PINATA_API_KEY` | Yes | Pinata IPFS API key | `your_key` |
| `PINATA_SECRET_KEY` | Yes | Pinata IPFS secret | `your_secret` |
| `JWT_SECRET` | No* | JWT signing secret | `your_secret` |
| `XYO_WALLET_MNEMONIC` | Conditional** | XL1 wallet mnemonic (seed phrase). Required for blockchain transactions. See [XL1 Wallet Setup](#xl1-wallet-setup) | `word1 word2 ... word12` |
| `MOCK_XL1_TRANSACTIONS` | No | Mock blockchain transactions | `true` |

\* Defaults to dev secret in development mode  
\** Required if `MOCK_XL1_TRANSACTIONS=false`

#### Web (`web/.env.local`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL | `http://localhost:4000` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox token for maps | `pk.xxx...` |

#### Mobile (`mobile/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend API URL | `http://localhost:4000` |
| `EXPO_PUBLIC_MOCK_DRIVER_LOCATION` | No | Mock driver location mode for testing. When `true`, uses delivery destination coordinates instead of actual GPS. | `false` (default) |

### Getting API Keys

**XYO API Key:**
- Contact XYO Network for API access
- Or use mock mode (`MOCK_XL1_TRANSACTIONS=true`) for development

**Pinata Keys:**
1. Sign up at [pinata.cloud](https://www.pinata.cloud/)
2. Go to API Keys section
3. Create a new API key with admin permissions
4. Copy the API Key and Secret

**Mapbox Token:**
1. Sign up at [mapbox.com](https://www.mapbox.com/)
2. Go to Account → Access Tokens
3. Create a new token with public scope
4. Copy the token

### XL1 Wallet Setup

To interact with the XL1 blockchain, an XL1 wallet is required. The wallet mnemonic (seed phrase) must be configured in the backend environment variable `XYO_WALLET_MNEMONIC`.

**Getting an XL1 Wallet:**
1. Follow the official XYO Network documentation: [Get XL1 Browser Wallet](https://docs.xyo.network/developers/xl1-wallet/get-xl1-browser-wallet)
2. Generate a wallet mnemonic using the backend API endpoint (after starting the server):
   ```bash
   curl http://localhost:4000/api/wallet/generate-mnemonic
   ```
3. Save the returned mnemonic phrase securely and add it to your `backend/.env` file:
   ```env
   XYO_WALLET_MNEMONIC=your twelve word mnemonic phrase here
   ```

**Important:** The seed phrase generated for the XL1 wallet must match the `XYO_WALLET_MNEMONIC` value in your backend configuration. This wallet is used to sign all blockchain transactions for delivery verifications. The same mnemonic phrase can be used in an XL1 browser wallet to view and interact with the same wallet address.

---

## Running the Application

### Development Mode (All Services)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Web Dashboard:**
```bash
cd web
npm run dev
```

**Terminal 3 - Mobile App (optional):**
```bash
cd mobile
npm run start
```

### Access Points

- **Backend API**: http://localhost:4000
- **Web Dashboard**: http://localhost:3000
- **Prisma Studio**: http://localhost:5556 (run `npm run studio` in backend)
- **API Health Check**: http://localhost:4000/api/health

---

## Development Workflow

### Project Structure

```
chaincheck/
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/    # API route handlers
│   │   ├── services/  # Business logic (XYO, IPFS, etc.)
│   │   ├── lib/       # Utilities (env, prisma, etc.)
│   │   └── middleware/# Express middleware
│   ├── prisma/        # Database schema and migrations
│   └── .env           # Backend environment variables
│
├── web/               # Next.js web dashboard
│   ├── app/           # Next.js app router pages
│   ├── components/    # React components
│   ├── lib/           # Utilities (API client, etc.)
│   └── .env.local     # Web environment variables
│
├── mobile/            # Expo React Native app
│   ├── src/
│   │   ├── screens/   # App screens
│   │   ├── services/  # API client, etc.
│   │   └── navigation/# Navigation setup
│   └── .env           # Mobile environment variables
│
└── shared/            # Shared TypeScript types
    └── types/          # Type definitions
```

### Common Development Tasks

**Database Changes:**
```bash
cd backend
# Edit prisma/schema.prisma
npx prisma migrate dev --name your_migration_name
```

**View and Manage Database:**
```bash
cd backend
# Open Prisma Studio GUI (visual database browser)
npm run studio
# Opens at http://localhost:5556

# Or reset database with seed data
npm run seed
```

**Run Tests:**
```bash
# Backend tests
cd backend
npm test

# Web tests
cd web
npm test
```

**Lint Code:**
```bash
# Backend
cd backend
npm run lint

# Web
cd web
npm run lint
```

**Build for Production:**
```bash
# Backend
cd backend
npm run build
npm start

# Web
cd web
npm run build
npm start
```

---

## System Architecture & Implementation Details

This section provides detailed information about the ChainCheck system architecture, key features, and implementation details.

### Network Statistics & Health

The Network Statistics panel on the XYO Network Overview page displays real-time metrics about the XYO Network infrastructure based on XL1 blockchain transactions and delivery records.

#### Network Health Calculation

Network health is determined by analyzing node activity, composition, and network size. The health status is calculated using the following logic (evaluated in order):

**Excellent:**
- **Active ratio** ≥ 80% (activeNodes / totalNodes)
- **Has bridges** (bridge count > 0)
- **Has sentinels** (sentinel count > 0)
- **Total nodes** ≥ 10

**Good:**
- **Active ratio** ≥ 60%
- **Has bridges** (bridge count > 0)
- **Total nodes** ≥ 5

**Fair:**
- **Active ratio** ≥ 40%
- **Total nodes** ≥ 3

**Poor:**
- All other cases, including:
  - Total nodes = 0
  - Total nodes < 3
  - Active ratio < 40%
  - Missing required node types (bridges for "Good", bridges + sentinels for "Excellent")

#### Implementation

The network health calculation is implemented in `backend/src/services/xyo/network-service.ts`:

```typescript
private calculateNetworkHealth(stats: {
  totalNodes: number;
  activeNodes: number;
  nodeTypes: {
    sentinel: number;
    bridge: number;
    diviner: number;
  };
}): 'excellent' | 'good' | 'fair' | 'poor' {
  if (stats.totalNodes === 0) return 'poor';
  
  const activeRatio = stats.activeNodes / stats.totalNodes;
  const hasBridges = stats.nodeTypes.bridge > 0;
  const hasSentinels = stats.nodeTypes.sentinel > 0;
  
  if (activeRatio >= 0.8 && hasBridges && hasSentinels && stats.totalNodes >= 10) {
    return 'excellent';
  } else if (activeRatio >= 0.6 && hasBridges && stats.totalNodes >= 5) {
    return 'good';
  } else if (activeRatio >= 0.4 && stats.totalNodes >= 3) {
    return 'fair';
  }
  
  return 'poor';
}
```

#### Node Activity Threshold

A node is considered "active" if it has been seen within the last **7 days** (168 hours). This threshold is defined as:

```typescript
const RECENT_ACTIVITY_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
```

#### Data Sources

- **Node counts and types**: Extracted from XL1 blockchain transactions (bound witnesses)
- **Active nodes**: Nodes that have participated in transactions within the last 7 days
- **Delivery statistics**: Calculated from verified delivery records in the database

### Coverage Calculation

The coverage area represents the geographic footprint of the delivery network based on actual delivery locations.

#### Calculation Method

1. **Location Extraction**: 
   - Uses `actualLat`/`actualLon` if available (from mobile GPS)
   - Falls back to `destinationLat`/`destinationLon` if actual location is not available
   - Only includes verified deliveries (those with a `proofHash`)

2. **Unique Location Grouping**:
   - Locations are rounded to ~1km precision (0.01 degrees) to group nearby deliveries
   - Duplicate locations are deduplicated

3. **Area Calculation**:
   - **Single location**: Returns a minimum service area of ~314 km² (representing a 10km radius circle)
   - **Multiple locations**: Calculates bounding box area using:
     - Latitude span: `(maxLat - minLat) * 111 km`
     - Longitude span: `(maxLon - minLon) * 111 km * cos(avgLat)`
     - Total area: `latSpan * lonSpan`

4. **Country Estimation**:
   - Single location or spread < 20 degrees: 1 country
   - Spread ≥ 20 degrees: Estimated as `floor(spread / 20)` countries

#### Implementation

Located in `backend/src/services/xyo/network-service.ts` → `calculateCoverageFromDeliveries()`

### Delivery Verification Flow

#### Mobile App Flow

1. Driver logs in and views active deliveries
2. Driver navigates to delivery destination
3. Driver captures:
   - GPS location (actualLat/actualLon)
   - Delivery photo (uploaded to IPFS)
   - Recipient signature (uploaded to IPFS)
4. Mobile app creates bound witness with:
   - Location payload
   - Delivery metadata
   - IPFS hashes for photo and signature
5. Bound witness is posted to XL1 blockchain
6. Transaction hash is stored as `proofHash` in database
7. Delivery status updated to `DELIVERED`

#### Backend Processing

1. Receives delivery verification request from mobile app
2. Creates XYO bound witness with location and metadata
3. Posts transaction to XL1 blockchain via RPC
4. Stores transaction hash and bound witness data in database
5. Optionally stores off-chain payload in Archivist (if enabled)
6. Returns verification result to mobile app

#### Verification Details

- **Proof Hash**: XL1 transaction hash (stored in `delivery.proofHash`)
- **Block Number**: XL1 block number when transaction is committed
- **Bound Witness Data**: Stored as JSON in `delivery.boundWitnessData`
- **Verification Timestamp**: Stored in `delivery.verifiedAt`

### XYO Network Integration Details

#### XL1 Blockchain

ChainCheck uses the XL1 blockchain for immutable proof storage:

- **RPC Endpoint**: Configured via `XYO_CHAIN_RPC_URL` environment variable
- **Transaction Format**: Bound witness transactions containing location and delivery metadata
- **Viewer API**: Used to query transaction details by hash

#### Archivist (Optional)

The Archivist stores off-chain payload data:

- **Code Location**: `./archivist/`
- **Enabled/Disabled**: Controlled via `XYO_ARCHIVIST_DISABLED` environment variable
- **URL**: Configured via `XYO_ARCHIVIST_URL`
- **Purpose**: Stores full payload data referenced by on-chain hashes

For local development setup, see [Local Archivist Setup](#7-local-archivist-setup-optional) above.

#### Diviner (Optional)

The Diviner provides location verification queries:

- **Code Location**: `./diviner/api-diviner-nodejs/`
- **Source Repository**: [XYOracleNetwork/api-location.diviner.xyo.network-express](https://github.com/XYOracleNetwork/api-location.diviner.xyo.network-express)
- **Last Updated**: August 2022 (repository has not been updated since)
- **Enabled/Disabled**: Controlled via `XYO_DIVINER_DISABLED` environment variable
- **URL**: Configured via `XYO_DIVINER_URL`
- **Purpose**: Answers location queries using network consensus

**Current Status**: Due to the Diviner repository not being updated since August 2022, Diviner functionality with XL1 is primarily mocked. The backend uses **Archivist as the off-chain source of record** for location data, extracting location information directly from Archivist payloads when Diviner queries fail or return empty results.

For local development setup, see [Local Diviner Setup](#8-local-diviner-setup-optional) above.

#### Mock Mode

For development and testing:

- **Mock XL1 Transactions**: Set `MOCK_XL1_TRANSACTIONS=true`
- **Mock Transaction ID**: Set `MOCK_XL1_TRANSACTION_ID` to use a specific transaction hash
- When enabled, transactions are not posted to XL1 but mock data is returned

### Database Schema

#### Key Models

**Delivery:**
```prisma
model Delivery {
  id                String         @id @default(uuid())
  orderId           String         @unique
  driverId          String
  proofHash         String?        @unique  // XL1 transaction hash
  boundWitnessData  Json?                    // XL1 transaction data
  blockNumber       Int?                      // XL1 block number
  verifiedAt        DateTime?
  actualLat         Float?                    // GPS location from mobile
  actualLon         Float?
  destinationLat    Float                     // Delivery destination
  destinationLon    Float
  status            DeliveryStatus @default(PENDING)
  // ... other fields
}
```

**Driver:**
```prisma
model Driver {
  id                  String   @id @default(uuid())
  driverId            String   @unique
  passwordHash        String
  xyoNfcUserRecord    String?   // NFC Record 1
  xyoNfcSerialNumber  String?   // NFC Serial number
  // ... timestamps
}
```

### API Endpoints

#### Delivery Verification

- **POST** `/api/deliveries/:id/verify`
  - Verifies a delivery and posts to XL1 blockchain
  - Requires authentication token
  - Returns: `{ proofHash, blockNumber, boundWitnessData }`
  - Note: Uses delivery `id` (UUID), not `orderId`

#### Network Statistics

- **GET** `/api/network/statistics`
  - Returns network-wide statistics
  - Response: `NetworkStatistics` interface

#### Witness Nodes

- **GET** `/api/network/nodes`
  - Returns witness node information
  - Query params: `type`, `status`, `minLat`, `maxLat`, `minLon`, `maxLon`

- **GET** `/api/network/nodes/:nodeAddress`
  - Returns specific witness node information by address

### Development Tips

#### Testing Network Statistics

1. Seed test data: `npm run seed` in `backend/`
2. Verify a delivery via mobile app or API
3. Check Network Overview page: `http://localhost:3000/network`
4. View backend logs for `[Coverage]` and network statistics messages

#### Debugging Network Health

- Check backend logs for node extraction messages
- Verify deliveries have `proofHash` set (verified deliveries)
- Ensure `boundWitnessData` contains valid bound witness structure
- Check that nodes are within 7-day activity window for "active" status

#### Coverage Calculation Issues

- Ensure deliveries have location data (`destinationLat`/`destinationLon` always present)
- Check that verified deliveries have `proofHash` set
- Review console logs for `[Coverage]` messages showing delivery and location counts

---

## Testing

### Backend API Testing

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- deliveries-routes.test.ts
```

### Web Testing

```bash
cd web

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

### Manual Testing

#### Backend Testing with Seed Data

**Reset to Clean Test State:**
```bash
cd backend
npm run seed
```

This creates:
- 5 test drivers (login with any driver ID, password: `Password1`)
- 11 sample deliveries with various statuses
- Perfect for testing dashboard filters, delivery flows, etc.

**View/Manage Test Data:**
```bash
# Open Prisma Studio to view and edit test data
npm run studio
# Opens at http://localhost:5556
```

#### Testing Workflow

1. **Create a Delivery:**
   - Use the mobile app or API to create a delivery
   - Or use seed data: `npm run seed` in backend
   - Or create manually in Prisma Studio

2. **Verify a Delivery:**
   - Use mobile app to verify delivery location
   - Check web dashboard for verification status
   - View verification data in Prisma Studio (`boundWitnessData` field)

3. **View Verification Details:**
   - Navigate to delivery details page
   - Check proof hash, blockchain data, etc.
   - Use Prisma Studio to inspect `boundWitnessData` JSON structure

#### Using Prisma Studio for Testing

**Quick Data Inspection:**
- Open Prisma Studio: `npm run studio` in backend directory
- Browse deliveries to see current state
- Check `proofHash`, `verifiedAt`, `status` fields
- Inspect `boundWitnessData` JSON for verification details

**Create Test Scenarios:**
- Create deliveries with different statuses
- Add test drivers
- Modify delivery data to test edge cases
- Delete records to test empty states

**Verify Data Integrity:**
- Check relationships between `Delivery` and `Driver` tables
- Verify `proofHash` uniqueness
- Inspect JSON fields for proper structure

---

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Find process using port 4000
lsof -i :4000
# Kill process
kill -9 <PID>
```

**Database Connection Error:**
- Verify PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check DATABASE_URL in `.env` matches your PostgreSQL credentials
- Verify database exists: `psql -U dbuser -d chaincheck -h localhost`

**Prisma Client Not Generated:**
```bash
cd backend
npx prisma generate
```

**Prisma Studio Won't Start:**
- Check if port 5556 is available: `lsof -i :5556`
- Kill process if needed: `kill -9 <PID>`
- Verify database connection in `.env` file
- Try: `npx prisma studio --port 5556`

**Seed Script Fails:**
- Verify database is running: `psql -U dbuser -d chaincheck -h localhost`
- Check `DATABASE_URL` in `.env` is correct
- Ensure migrations are applied: `npx prisma migrate dev`
- Check seed script syntax: `cat prisma/seed.ts`

**Module Not Found Errors:**
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Web
cd web
rm -rf node_modules package-lock.json
npm install
```

**XYO SDK Errors:**
- Ensure `patch-package` ran: `npm run postinstall` in backend
- Check patches are applied: `ls backend/patches/`

**Mobile App Can't Connect to Backend:**
- Ensure backend is running on `http://localhost:4000`
- For physical device: Use your computer's IP address in `EXPO_PUBLIC_API_URL`
- Ensure device and computer are on same network
- Check firewall settings
- See [Mobile Network Connection Issues](#104-network-connection-issues) for detailed troubleshooting

**Map Not Displaying:**
- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set in `web/.env.local`
- Check browser console for Mapbox errors

**XL1 Transaction Errors:**
- If `MOCK_XL1_TRANSACTIONS=true`, transactions are mocked (expected)
- If `MOCK_XL1_TRANSACTIONS=false`, ensure:
  - `XYO_WALLET_MNEMONIC` is set
  - `XYO_CHAIN_RPC_URL` is correct
  - Network connectivity to XYO RPC endpoint

### Getting Help

- Check existing issues in GitHub
- Review logs in terminal output
- Check Prisma Studio for database state
- Verify all environment variables are set correctly

---

## Next Steps

After setup:

1. **Explore the Codebase:**
   - Review API routes in `backend/src/routes/`
   - Check web components in `web/components/`
   - Examine mobile screens in `mobile/src/screens/`

2. **Read Documentation:**
   - Check `docs/` folder for detailed implementation guides
   - Review XYO Network integration docs

3. **Start Developing:**
   - Create a feature branch
   - Make your changes
   - Test locally
   - Submit a pull request

---

## Additional Resources

- [XYO Network Documentation](https://docs.xyo.network/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Express.js Documentation](https://expressjs.com/)

---

**Happy Coding! 🚀**


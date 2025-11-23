# ChainCheck Development Guide

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
9. [Running the Application](#running-the-application)
10. [Development Workflow](#development-workflow)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

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
git clone https://github.com/your-org/chaincheck.git
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
# Generate one using: GET /api/wallet/generate-mnemonic after server starts
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

```bash
npm run dev
```

The web dashboard should start on `http://localhost:3000`.

**Verify it's working:**
- Open `http://localhost:3000` in your browser
- You should see the ChainCheck dashboard

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

#### 4.1. Install iOS Dependencies

```bash
cd mobile
cd ios
pod install
cd ..
```

**Note:** Only needed if you've modified native iOS code or first-time setup.

#### 4.2. Start iOS Simulator

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

#### 4.3. Run App on iOS Simulator

```bash
cd mobile
npm run ios
```

This will:
- Start Metro bundler
- Build the iOS app
- Launch the app in the iOS Simulator
- Enable hot reloading

**First-time setup may take 5-10 minutes** as it builds the native iOS project.

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
- Start Metro bundler
- Build the Android app
- Install and launch the app in the emulator
- Enable hot reloading

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
cd mobile/ios
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

**Important Notes:**
- Variables prefixed with `EXPO_PUBLIC_` are exposed to the app
- Changes require app restart (not just reload)
- Use `localhost` for simulators/emulators
- Use IP address for physical devices

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
| `XYO_WALLET_MNEMONIC` | Conditional** | XL1 wallet mnemonic | `word1 word2 ... word12` |
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

**Generate Wallet Mnemonic:**
After starting the backend server:
```bash
curl http://localhost:4000/api/wallet/generate-mnemonic
```
Save the returned mnemonic phrase securely.

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


# Running a Local Diviner

This document summarizes how to run a local Location Diviner based on examples found in the XYO sample projects.

## Table of Contents

- [api-location.diviner.xyo.network-express](#api-locationdivineryonetwork-express)
- [Prerequisites](#prerequisites)
- [Recommended Setup](#recommended-setup)
- [Quick Start](#quick-start)
- [Standalone Setup (Recommended)](#standalone-setup-recommended)
- [Docker Setup (Alternative)](#docker-setup-alternative)
- [Environment Variables](#environment-variables)
- [Running the Diviner](#running-the-diviner)
- [Connecting to Local Diviner](#connecting-to-local-diviner)
- [Integration with Local Archivist](#integration-with-local-archivist)
- [Troubleshooting](#troubleshooting)

---

## api-location.diviner.xyo.network-express

The `api-location.diviner.xyo.network-express` project provides a complete local Location Diviner implementation.

### Project Location

`./diviner/api-diviner-nodejs/`

### Overview

The Location Diviner provides endpoints for querying location data from Archivists and returning divined answers. It processes location queries asynchronously and stores results in archives.

**Note**: This Diviner implementation is located in the `diviner/` directory and provides a complete local Location Diviner for development and testing.

---

## Prerequisites

### Required Services

- **Archivist**: Must be running and accessible
  - Local Archivist: `http://localhost:8888` (recommended - see [Local Archivist Setup](./LOCAL_ARCHIVIST_SETUP.md))
  - Or port 8080 if using sample project default
  - Or production/staging Archivist URL

### Required Software

- **Node.js**: Version 16.x (required by the project)
  - Check version: `node --version`
  - Note: This project requires Node 16.x, which is older. Consider using `nvm` to manage Node versions.
  - Download: [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
- **Yarn**: Package manager
  - Check version: `yarn --version`
  - Install: `npm install -g yarn`
- **Docker** (optional): For Docker Compose setup only
  - Check version: `docker --version`
  - Download: [docker.com](https://www.docker.com/products/docker-desktop)

---

## Recommended Setup

### ✅ Standalone Diviner (Recommended)

**Recommended if you already have a local Archivist running** (which you do in `./archivist/`):

- ✅ **Simpler setup** - Just connect to existing Archivist
- ✅ **Less resource usage** - No duplicate MongoDB/Archivist containers
- ✅ **Easier debugging** - Direct access to logs and processes
- ✅ **More flexible** - Easy to modify code and restart
- ✅ **Reuses infrastructure** - Connects to your existing Archivist at `localhost:8888`

### Docker Compose (Alternative)

**Use only if you want a completely isolated test environment**:

- ⚠️ Creates duplicate MongoDB and Archivist containers
- ⚠️ More resource intensive
- ⚠️ More complex networking (requires `host.docker.internal`)
- ⚠️ Uses older Archivist image
- ⚠️ Harder to debug and develop with

---

## Quick Start

### Recommended: Standalone Diviner

Since you already have a local Archivist running with MongoDB:

```bash
cd diviner/api-diviner-nodejs
cp .example.env .env
# Edit .env and set ARCHIVIST_URL=http://localhost:8888
yarn install
yarn start
```

The Diviner will start on port **9999** and connect to your existing Archivist.

### Alternative: Docker Compose

Only use this if you want a completely isolated environment:

```bash
cd diviner/api-diviner-nodejs
docker-compose up
```

This will start:
- MongoDB on port 27017 (duplicate of your existing one)
- Archivist on port 8080 (different from your local one at 8888)
- Diviner on port 9999

---

## Standalone Setup (Recommended)

This setup connects to your existing local Archivist and MongoDB infrastructure.

### Step 1: Ensure Local Archivist is Running

Verify your local Archivist is running:

```bash
cd archivist
docker-compose ps

# Should show:
# - mongo: running
# - archivist: running on port 8888

# Test Archivist connection
curl http://localhost:8888/api
```

### Step 2: Install Node.js 16.x (if needed)

The Diviner requires Node.js 16.x. **Your other services (backend, web, mobile) can use Node.js 24** - they run in separate processes, so different Node versions won't conflict.

**Best Practice: Use `nvm` to manage multiple Node versions**

1. **Install nvm** (if not already installed):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   # Restart your terminal or run: source ~/.bashrc
   ```

2. **Install both Node versions**:
   ```bash
   # Install Node.js 16 for Diviner
   nvm install 16
   
   # Install Node.js 24 for your other services (if not already installed)
   nvm install 24
   ```

3. **Switch versions per shell**:
   - **For Diviner** (Terminal 1):
     ```bash
     cd diviner/api-diviner-nodejs
     nvm use 16
     node --version  # Should show v16.x.x
     yarn start
     ```
   
   - **For Backend/Web/Mobile** (Terminal 2, 3, etc.):
     ```bash
     # Default to Node 24 for your main services
     nvm use 24
     # Or set as default: nvm alias default 24
     node --version  # Should show v24.x.x
     
     cd backend  # or web, mobile
     npm run dev
     ```

4. **Auto-switch with `.nvmrc` files** (Recommended):
   
   Create `.nvmrc` in the Diviner directory:
   ```bash
   cd diviner/api-diviner-nodejs
   echo "16" > .nvmrc
   ```
   
   Then `nvm use` will automatically switch to Node 16 when you `cd` into that directory (if you have auto-switching enabled):
   ```bash
   nvm use  # Automatically uses Node 16 from .nvmrc
   ```

**Important Notes**:
- ✅ **Different shells = Different Node versions**: Each terminal session can have its own Node version active
- ✅ **No conflicts**: Processes run independently, so Node 16 and Node 24 can run simultaneously
- ✅ **Port-based separation**: Diviner (9999), Backend (4000), Web (3000) - no conflicts
- ✅ **Recommended workflow**: Use separate terminals for each service, each with its appropriate Node version

### Step 3: Navigate to Diviner Project

```bash
cd diviner/api-diviner-nodejs
```

### Step 4: Install Dependencies

```bash
yarn install
```

**Note**: This may take a few minutes as it installs XYO Network SDK packages.

### Step 5: Build the Project

```bash
yarn compile
```

Or if using XYO build scripts:

```bash
yarn xy build
```

### Step 6: Configure Environment Variables

```bash
cp .example.env .env
```

Edit `.env` with your configuration:

```env
# Connect to your existing local Archivist
ARCHIVIST_URL=http://localhost:8888

# Archive name to use (can be same as your Archivist archive)
ARCHIVE=chaincheck

# Port for Diviner server
APP_PORT=9999

# CORS allowed origins (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

**Key Configuration**:
- `ARCHIVIST_URL`: Set to `http://localhost:8888` to connect to your local Archivist
- `ARCHIVE`: Use the same archive name as your backend (`chaincheck`) or use `temp`
- `CORS_ALLOWED_ORIGINS`: Add your web dashboard URL (`http://localhost:3000`)

### Step 7: Verify Archivist Connection

Before starting the Diviner, ensure your Archivist is accessible:

```bash
# Test Archivist connection
curl http://localhost:8888/api

# Should return a response (even if it's an error, it means Archivist is reachable)
```

### Step 8: Start the Diviner

**Development mode** (with nodemon for auto-reload):

```bash
yarn start
```

**Production mode**:

```bash
yarn launch
```

The Diviner should start on port **9999**.

### Step 9: Verify Diviner is Running

```bash
# Check if Diviner is responding
curl http://localhost:9999

# Or check health endpoint (if available)
curl http://localhost:9999/health
```

---

## Docker Setup (Alternative)

Only use this if you want a completely isolated environment or are testing from scratch.

### Using Docker Compose

The `api-location.diviner.xyo.network-express` project includes a `docker-compose.yml` file that sets up:

1. **MongoDB** (for Archivist) - **NOTE**: This duplicates your existing MongoDB
2. **Archivist** (required dependency) - **NOTE**: This runs on port 8080, not 8888
3. **Diviner** (main service) - Runs on port 9999

**To run with Docker Compose**:

```bash
cd diviner/api-diviner-nodejs
docker-compose up
```

Or in detached mode:

```bash
docker-compose up -d
```

**To stop services**:

```bash
docker-compose down
```

**To view logs**:

```bash
# All services
docker-compose logs -f

# Diviner only
docker-compose logs -f diviner

# Archivist only
docker-compose logs -f archivist
```

### Docker Compose Configuration

The `docker-compose.yml` includes:

```yaml
services:
  diviner:
    container_name: diviner
    build: .
    restart: always
    depends_on:
      - archivist
    ports:
      - "9999:9999"
    environment:
      APP_PORT: 9999
      ARCHIVIST_URL: http://host.docker.internal:8080  # Note: connects to containerized Archivist
      ARCHIVE: temp
      CORS_ALLOWED_ORIGINS: http://localhost:3000
  
  mongo:
    container_name: mongo
    image: mongo:4.4
    restart: always
    ports:
      - "27017:27017"  # NOTE: Conflicts with your existing MongoDB!
  
  archivist:
    container_name: archivist
    image: public.ecr.aws/t4x5y6n8/api-xyo-archivist:latest
    restart: always
    depends_on:
      - mongo
    ports:
      - "8080:8080"  # NOTE: Different port from your local Archivist (8888)
```

**Important Notes**:
- ⚠️ This creates a **duplicate MongoDB** on port 27017 (conflicts with your existing one)
- ⚠️ This creates an **Archivist on port 8080** (different from your local one at 8888)
- ⚠️ The Diviner connects to the **containerized Archivist**, not your local one
- ⚠️ Data in the Docker Compose setup is **separate** from your local Archivist data

**Why Standalone is Better**:
- ✅ Reuses your existing MongoDB and Archivist
- ✅ Single source of truth for data
- ✅ Simpler configuration
- ✅ Easier to debug

---

## Environment Variables

### Required Environment Variables

From `.example.env`:

```bash
# Archivist URL (required)
# For standalone setup with local Archivist:
ARCHIVIST_URL=http://localhost:8888

# For Docker Compose (Archivist in Docker):
ARCHIVIST_URL=http://host.docker.internal:8080

# For remote Archivist:
# ARCHIVIST_URL=https://api.archivist.xyo.network

# Archive name (default: temp)
# Use same archive as your backend for consistency:
ARCHIVE=chaincheck
# Or use temp:
# ARCHIVE=temp

# Port for Diviner server (default: 9999)
APP_PORT=9999

# CORS allowed origins (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

### Recommended Configuration for Your Setup

Since you have a local Archivist at `localhost:8888`:

```env
ARCHIVIST_URL=http://localhost:8888
ARCHIVE=chaincheck
APP_PORT=9999
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

---

## Running the Diviner

### Development Mode (Recommended)

```bash
cd diviner/api-diviner-nodejs
yarn start
```

This uses `nodemon` to automatically restart the server when files change.

### Production Mode

```bash
yarn launch
```

This runs the compiled CJS version with optimized memory settings.

### Verify Diviner is Running

```bash
# Check if Diviner is responding
curl http://localhost:9999

# Or check health endpoint (if available)
curl http://localhost:9999/health
```

---

## API Endpoints

Based on the Diviner Express project analysis, the Diviner provides these endpoints:

### 1. POST `/location/query` - Create Location Query

**Request Body**:
```json
{
  "sourceArchivist": { "apiDomain": "http://localhost:8888" },
  "sourceArchive": "chaincheck",
  "resultArchivist": { "apiDomain": "http://localhost:8888" },
  "resultArchive": "temp",
  "query": {
    "schema": "network.xyo.location.range.query",
    "startTime": "2024-01-01T00:00:00Z",
    "stopTime": "2024-12-31T23:59:59Z"
  },
  "schema": "network.xyo.location.range.query"
}
```

**Response**:
```json
{
  "hash": "bound_witness_hash_here",
  "sourceArchivist": { "apiDomain": "http://localhost:8888" },
  "sourceArchive": "chaincheck",
  "resultArchivist": { "apiDomain": "http://localhost:8888" },
  "resultArchive": "temp",
  "query": { ... },
  "schema": "network.xyo.location.range.query"
}
```

### 2. GET `/location/query/:hash` - Retrieve Query Result

**Response**:
```json
{
  "queryHash": "bound_witness_hash_here",
  "answerHash": "answer_bound_witness_hash_here"  // Optional, if query is complete
}
```

---

## Connecting to Local Diviner

### From Backend Service

Update your `backend/.env`:

```env
# Diviner URL
XYO_DIVINER_URL=http://localhost:9999

# Ensure Diviner is not disabled
XYO_DIVINER_DISABLED=false
```

### Testing the Connection

```bash
# Test Diviner endpoint
curl -X POST http://localhost:9999/location/query \
  -H "Content-Type: application/json" \
  -d '{
    "sourceArchivist": { "apiDomain": "http://localhost:8888" },
    "sourceArchive": "chaincheck",
    "resultArchivist": { "apiDomain": "http://localhost:8888" },
    "resultArchive": "temp",
    "query": {
      "schema": "network.xyo.location.range.query",
      "startTime": "2024-01-01T00:00:00Z",
      "stopTime": "2024-12-31T23:59:59Z"
    },
    "schema": "network.xyo.location.range.query"
  }'
```

---

## Integration with Local Archivist

The Diviner requires an Archivist to function:

1. **Source Archivist**: Where location witness data is read from
2. **Result Archivist**: Where query and answer are stored

### Recommended Setup with Your Local Archivist

Since you have a local Archivist running at `localhost:8888`:

**Option 1: Same Archivist, Different Archives** (Recommended):
```json
{
  "sourceArchivist": { "apiDomain": "http://localhost:8888" },
  "sourceArchive": "chaincheck",  // Your delivery data archive
  "resultArchivist": { "apiDomain": "http://localhost:8888" },
  "resultArchive": "temp"  // Diviner query/answer archive
}
```

**Option 2: Same Archivist, Same Archive**:
```json
{
  "sourceArchivist": { "apiDomain": "http://localhost:8888" },
  "sourceArchive": "chaincheck",
  "resultArchivist": { "apiDomain": "http://localhost:8888" },
  "resultArchive": "chaincheck"  // Store queries in same archive
}
```

### Complete Setup Steps

1. **Ensure Local Archivist is Running**:
   ```bash
   cd archivist
   docker-compose ps
   # Should show mongo and archivist running
   
   # Verify Archivist is accessible
   curl http://localhost:8888/api
   ```

2. **Start Local Diviner** (Standalone):
   ```bash
   cd diviner/api-diviner-nodejs
   # Configure .env with ARCHIVIST_URL=http://localhost:8888
   yarn start
   ```

3. **Verify Both Services**:
   ```bash
   # Check Archivist
   curl http://localhost:8888/api
   
   # Check Diviner
   curl http://localhost:9999
   ```

4. **Update Backend Configuration**:
   ```bash
   # Edit backend/.env
   XYO_DIVINER_URL=http://localhost:9999
   XYO_DIVINER_DISABLED=false
   ```

---

## Troubleshooting

### Diviner Cannot Connect to Archivist

**Error**: Connection refused or timeout errors

**Solution**:
1. Verify Archivist is running:
   ```bash
   cd archivist
   docker-compose ps
   # Should show archivist running
   
   curl http://localhost:8888/api
   ```

2. Check `ARCHIVIST_URL` in `.env`:
   ```bash
   # For standalone setup (recommended)
   ARCHIVIST_URL=http://localhost:8888
   
   # Verify the URL is correct (no trailing slash)
   ```

3. Check firewall settings (ensure ports are accessible)

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::9999`

**Solution**:
1. Find process using port 9999:
   ```bash
   lsof -i :9999
   # Or
   netstat -an | grep 9999
   ```

2. Kill the process:
   ```bash
   kill -9 <PID>
   ```

3. Or change port in `.env`:
   ```env
   APP_PORT=10000
   ```
   Then update backend `.env`: `XYO_DIVINER_URL=http://localhost:8083`

### Node.js Version Mismatch

**Error**: Requires Node.js 16.x

**Solution**:
1. Check current Node.js version:
   ```bash
   node --version
   ```

2. Use Node Version Manager (nvm) to switch versions:
   ```bash
   # Install nvm (if not installed)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   # Restart terminal or: source ~/.bashrc
   
   # Install Node.js 16
   nvm install 16
   
   # Switch to Node 16 in current shell
   nvm use 16
   
   # Verify version
   node --version  # Should show v16.x.x
   ```

3. **Using Multiple Node Versions Simultaneously**:
   
   You can run different Node versions in different terminals:
   
   **Terminal 1 (Diviner)**:
   ```bash
   nvm use 16
   cd diviner/api-diviner-nodejs
   yarn start
   ```
   
   **Terminal 2 (Backend)**:
   ```bash
   nvm use 24  # or your default version
   cd backend
   npm run dev
   ```
   
   **Terminal 3 (Web)**:
   ```bash
   nvm use 24
   cd web
   npm run dev
   ```
   
   Each process uses its own Node version - no conflicts!

4. **Auto-switch with `.nvmrc`**:
   
   Create `.nvmrc` file in Diviner directory:
   ```bash
   cd diviner/api-diviner-nodejs
   echo "16" > .nvmrc
   ```
   
   Then just run:
   ```bash
   nvm use  # Automatically uses version from .nvmrc
   ```

5. **Note**: 
   - Node.js 16.x is older and may have security vulnerabilities - use only for local development
   - Your other services (backend, web, mobile) can continue using Node.js 24
   - Each service runs in its own process, so different Node versions don't conflict

### Build Errors

**Error**: TypeScript compilation errors

**Solution**:
1. Clean build artifacts:
   ```bash
   yarn clean
   ```

2. Reinstall dependencies:
   ```bash
   yarn reinstall
   ```

3. Build again:
   ```bash
   yarn compile
   ```

### CORS Errors

**Error**: CORS policy blocking requests

**Solution**:
1. Update `CORS_ALLOWED_ORIGINS` in `.env`:
   ```env
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:3001
   ```

2. Restart the Diviner

### MongoDB Connection Issues (Docker Compose Only)

**Error**: MongoDB connection errors (only if using Docker Compose)

**Note**: You shouldn't encounter this with standalone setup since you're using your existing MongoDB.

**Solution** (if using Docker Compose):
1. Verify MongoDB is healthy:
   ```bash
   docker-compose ps mongo
   ```

2. Check MongoDB logs:
   ```bash
   docker-compose logs mongo
   ```

3. **Better Solution**: Use standalone setup instead to avoid duplicate MongoDB

---

## Key Differences from Production Diviner

The local Diviner from sample projects may have these differences:

1. **Older SDK Version**: Uses XYO SDK v2.x (may be older than current)
2. **Limited Features**: May not have all features of production Diviner
3. **In-Memory Queue**: Query processing may use in-memory queue (not persistent)
4. **No Authentication**: May not require API keys or authentication
5. **Development Mode**: Designed for development/testing, not production

**Recommendation**: Use this for local development and testing. For production, use XYO Network's production Diviner services.

---

## Summary

### ✅ Recommended: Standalone Diviner

**Why**:
- ✅ **Simpler setup** - Connects to existing Archivist and MongoDB
- ✅ **Less resource usage** - No duplicate containers
- ✅ **Easier debugging** - Direct access to logs
- ✅ **Single source of truth** - Same data as your backend
- ✅ **More flexible** - Easy to modify and restart

**Quick Start**:
```bash
cd diviner/api-diviner-nodejs
cp .example.env .env
# Set ARCHIVIST_URL=http://localhost:8888
yarn install
yarn compile
yarn start
```

### ⚠️ Alternative: Docker Compose

**Why**:
- Creates isolated environment
- Includes everything needed
- But duplicates your existing services

**Use only if**: You want a completely separate test environment

---

## Additional Resources

- [Diviner API Express Analysis](./diviner-api-express-analysis.md) - Detailed API patterns and implementation details
- [Local Archivist Setup](./LOCAL_ARCHIVIST_SETUP.md) - Setup guide for local Archivist
- [XYO Network Documentation](https://docs.xyo.network/) - Official XYO Network documentation

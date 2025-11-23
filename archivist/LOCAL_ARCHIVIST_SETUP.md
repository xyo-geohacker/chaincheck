# Running a Local Archivist

This document summarizes how to run a local Archivist based on examples found in the XYO sample projects.

## Table of Contents

- [api-archivist-nodejs](#api-archivist-nodejs)
- [Docker Setup](#docker-setup)
- [MongoDB Setup](#mongodb-setup)
- [Environment Variables](#environment-variables)
- [Running the Archivist](#running-the-archivist)
- [Connecting to Local Archivist](#connecting-to-local-archivist)

---

## api-archivist-nodejs

The `api-archivist-nodejs` project provides a complete local Archivist implementation.

### Project Location
`./backend/xyo-sample-projects/api-archivist-nodejs/`

### Quick Start

1. **Navigate to the project**:
   ```bash
   cd backend/xyo-sample-projects/api-archivist-nodejs
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Build the project**:
   ```bash
   yarn xy build
   ```

4. **Set up environment variables**:
   ```bash
   cp .example.env .env
   # Edit .env with your configuration
   ```

5. **Run the Archivist**:
   ```bash
   # Development mode (with nodemon)
   yarn start
   
   # Production mode
   yarn start-esm
   ```

The Archivist will start on port **8080** by default.

---

## Docker Setup

### Using Docker Compose

The `api-archivist-nodejs` project includes a `docker-compose.yml` file:

```yaml
version: "3"

services:
  archivist:
    build:
      context: .
      dockerfile: Dockerfile
    env_file:
      - .env
    ports:
      - "8080:8080"
```

**To run with Docker Compose**:

```bash
cd backend/xyo-sample-projects/api-archivist-nodejs
docker-compose up --build
```

This will:
1. Build the Docker image from the Dockerfile
2. Load environment variables from `.env` file
3. Expose the Archivist on port 8080

---

## MongoDB Setup

The Archivist requires MongoDB for data storage. The `clients` and `sdk-xyo-client-js` projects include MongoDB setup examples.

### Using Docker Compose (Recommended)

**From `clients/docker-compose.yml`**:

```yaml
services:
  mongo:
    container_name: mongo
    hostname: mongo  # Explicitly set hostname (prevents Docker from using container ID)
    image: mongo:8.2.1
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
      MONGO_INITDB_DATABASE: archivist
    healthcheck:
      test:
        [
          "CMD",
          "/usr/bin/mongosh",
          "-u",
          "root",
          "-p",
          "example",
          "--quiet",
          "/opt/mongo/joinReplicaSet.js",
        ]
      interval: 5s
      timeout: 10s
      retries: 3
      start_period: 1s
    volumes:
      - mongo_data:/data/db
      - ./scripts/mongo/opt/mongo:/opt/mongo
      - ./scripts/mongo/docker-entrypoint-initdb.d:/docker-entrypoint-initdb.d
    command:
      [
        "--auth",
        "--bind_ip_all",
        "--keyFile",
        "/tmp/mongodb.key",
        "--replSet",
        "dbrs",
      ]

volumes:
  mongo_data:
```

**To start MongoDB**:

```bash
cd backend/xyo-sample-projects/clients
docker-compose up -d mongo
```

**Important**: The `hostname: mongo` field in the docker-compose.yml ensures Docker sets a proper hostname instead of defaulting to the container ID. This prevents connection issues where the SDK might try to resolve the container ID as a hostname.

**If you already have a MongoDB container running without a hostname set**, you'll need to recreate it:

```bash
cd backend/xyo-sample-projects/clients
docker-compose down
docker-compose up -d mongo
```

Or if you started the container manually:

```bash
docker stop <container-id>
docker rm <container-id>
# Then use docker-compose to recreate with proper hostname
cd backend/xyo-sample-projects/clients
docker-compose up -d mongo
```

**Alternative (sdk-xyo-client-js)**:

```bash
cd backend/xyo-sample-projects/sdk-xyo-client-js
docker-compose up -d mongo
```

This uses MongoDB 6.0.3 instead of 8.2.1.

### Connecting to MongoDB

**Using mongosh**:

```bash
mongosh --authenticationDatabase admin mongodb://root:example@localhost:27017/archivist
```

**Connection String**:
```
mongodb://root:example@localhost:27017/archivist?authSource=admin
```

---

## Environment Variables

### Required Environment Variables

From `.example.env` in `api-archivist-nodejs`:

```bash
# API Key (can be a placeholder for local development)
API_KEY=00000000-0000-0000-0000-000000000000

# Port to run Archivist server on
APP_PORT=8080

# Seed used for generating wallet archivist signs with
ACCOUNT_SEED="default insecure account seed"

# Comma-separated list of allowed CORS origins
CORS_ALLOWED_ORIGINS=http://localhost:3000

# JWT Secret
JWT_SECRET=TOP_SECRET

# MongoDB Connection String (Option 1) - MUST include database name
# Note: Use w=1 for single-node MongoDB, w=majority requires a properly configured replica set
MONGO_CONNECTION_STRING=mongodb://root:example@localhost:27017/archivist?authSource=admin&retryWrites=true&w=1

# MongoDB Connection using individual variables (Option 2)
# Note: The SDK requires BOTH connection string AND individual variables
MONGO_DATABASE=archivist
MONGO_DOMAIN=localhost
MONGO_PASSWORD=example
MONGO_USERNAME=root

# Wallet Mnemonic
MNEMONIC="sand patient donkey rude degree lady wheel cabin opera relax foil chaos lion shrimp repeat"

# Optional: Infura Project ID/Secret (for blockchain features)
INFURA_PROJECT_ID=xxx
INFURA_PROJECT_SECRET=xxx
```

### MongoDB Connection Options

You can use either:

1. **Connection String** (recommended):
   ```bash
   # For single-node MongoDB (local development):
   MONGO_CONNECTION_STRING=mongodb://root:example@localhost:27017/archivist?authSource=admin&retryWrites=true&w=1
   
   # For replica set MongoDB (production):
   MONGO_CONNECTION_STRING=mongodb://root:example@localhost:27017/archivist?authSource=admin&retryWrites=true&w=majority
   ```
   **Important**: The connection string MUST include:
   - The database name (`/archivist` after the port)
   - `authSource=admin` (since MongoDB auth is in the `admin` database)
   - Use `localhost` (not `127.0.0.1` or container IDs) when connecting from the host machine
   - Use `w=1` for single-node MongoDB, `w=majority` requires a properly configured replica set with a primary

2. **Individual Variables**:
   ```bash
   MONGO_DATABASE=archivist
   MONGO_DOMAIN=localhost
   MONGO_PASSWORD=example
   MONGO_USERNAME=root
   ```

---

## Running the Archivist

### Development Mode

**Using nodemon** (auto-reload on changes):

```bash
cd backend/xyo-sample-projects/api-archivist-nodejs
yarn start
```

This runs:
```bash
nodemon
```

Which executes:
```bash
node ./dist/node/index.mjs
```

### Production Mode

**Direct execution**:

```bash
cd backend/xyo-sample-projects/api-archivist-nodejs
yarn start-esm
```

This runs:
```bash
node ./dist/node/index.mjs
```

### Using Docker

**Build and run**:

```bash
cd backend/xyo-sample-projects/api-archivist-nodejs
docker-compose up --build
```

**Or build separately**:

```bash
docker build -t xyo-archivist .
docker run -p 8080:8080 --env-file .env xyo-archivist
```

---

## Database Initialization

**Important**: The XYO Archivist **does not require manual database initialization**. 

- Collections are created automatically when the first document is inserted
- Indexes are created automatically by the XYO SDK
- No setup scripts or manual collection creation is needed

The only requirement is that MongoDB is running and the replica set is in PRIMARY state (see [MongoDB Setup](#mongodb-setup) above).

For more details, see [Archivist Database Initialization](../archivist/DATABASE_INITIALIZATION.md).

## Connecting to Local Archivist

### URL

The local Archivist runs at:
```
http://localhost:8080
```

### API Endpoints

Based on the known Archivist patterns:

- **Insert**: `POST http://localhost:8080/{archive_name}`
- **Get**: `POST http://localhost:8080/{archive_name}`
- **API Docs**: `http://localhost:8080/api` (if available)

### From JavaScript/TypeScript

**Using the SDK**:

```typescript
import { knownArchivists } from '@xyo-network/sdk-utils'

// The SDK includes a local Archivist reference:
const localArchivist = {
  docs: 'http://localhost:8080/api',
  name: 'XYO Shared Archivist (local)',
  schema: NetworkNodeSchema,
  slug: 'local',
  type: 'archivist',
  uri: 'http://localhost:8080',
  web: 'http://localhost:8081',
}
```

**Using HttpBridge** (from `clients` package):

```typescript
import { HttpBridge, HttpBridgeConfigSchema } from '@xyo-network/bridge-http'

const apiDomain = process.env.API_DOMAIN || 'http://localhost:8080'
const bridge = await HttpBridge.create({ 
  config: { 
    nodeUrl: apiDomain, 
    schema: HttpBridgeConfigSchema 
  } 
})
await bridge.start()
```

### From Android/Kotlin

**Using NodeClient**:

```kotlin
val nodeUrl = "http://localhost:8080"
val nodeClient = NodeClient(nodeUrl, account, context)
val archivistWrapper = ArchivistWrapper(nodeClient)
```

**Note**: For Android emulator, use `10.0.2.2` instead of `localhost`:
```kotlin
val nodeUrl = "http://10.0.2.2:8080"
```

---

## Complete Setup Example

### Step 1: Start MongoDB

```bash
cd backend/xyo-sample-projects/clients
docker-compose up -d mongo
```

Wait for MongoDB to be ready (check logs):
```bash
docker-compose logs -f mongo
```

### Step 2: Configure Archivist

```bash
cd backend/xyo-sample-projects/api-archivist-nodejs
cp .example.env .env
# Edit .env if needed
```

### Step 3: Install and Build

```bash
yarn install
yarn xy build
```

### Step 4: Start Archivist

```bash
yarn start
```

### Step 5: Verify

**Check if Archivist is running**:

```bash
curl http://localhost:8080/api
```

**Or check health endpoint** (if available):

```bash
curl http://localhost:8080/health
```

---

## Troubleshooting

### Port Already in Use

If port 8080 is already in use:

1. **Change the port in `.env`**:
   ```bash
   APP_PORT=8081
   ```

2. **Or kill the process using port 8080**:
   ```bash
   # From clients or sdk-xyo-client-js
   yarn free-8080
   # Or manually:
   kill -9 $(lsof -t -i :8080)
   ```

### MongoDB Connection Issues

1. **Verify MongoDB is running**:
   ```bash
   docker ps | grep mongo
   ```

2. **Check MongoDB logs**:
   ```bash
   docker-compose logs mongo
   ```

3. **Test MongoDB connection**:
   ```bash
   mongosh --authenticationDatabase admin mongodb://root:example@localhost:27017/archivist
   ```

4. **Verify connection string in `.env`**:
   ```bash
   # MUST include database name and authSource
   MONGO_CONNECTION_STRING=mongodb://root:example@localhost:27017/archivist?authSource=admin&retryWrites=true&w=majority
   
   # Individual variables (also required by SDK)
   MONGO_DATABASE=archivist
   MONGO_DOMAIN=localhost  # Use 'localhost', NOT container ID or IP
   MONGO_PASSWORD=example
   MONGO_USERNAME=root
   ```

5. **Error: "getaddrinfo ENOTFOUND <container-id>"**:
   - This error means the SDK is trying to use a container ID as a hostname
   - **Root Cause**: Docker containers default to using their container ID as the hostname if not explicitly set. This can cause issues if the SDK or application tries to resolve the container's hostname.
   - **Possible causes**:
     - MongoDB container's `hostname` is set to container ID (check with `docker inspect <container-id> --format '{{.Config.Hostname}}'`)
     - `MONGO_DOMAIN` is set to a container ID instead of `localhost`
     - `MONGO_CONNECTION_STRING` is missing or invalid, causing SDK to fall back to constructing from `MONGO_DOMAIN`
     - Environment variables are not being loaded correctly
   - **Solution**:
     - **Fix Docker container hostname**: Add `hostname: mongo` to the MongoDB service in `docker-compose.yml`:
       ```yaml
       services:
         mongo:
           container_name: mongo
           hostname: mongo  # Add this line
           image: mongo:8.2.1
           # ... rest of config
       ```
     - **Restart MongoDB container** after updating docker-compose.yml:
       ```bash
       docker-compose down
       docker-compose up -d mongo
       ```
     - Ensure `MONGO_DOMAIN=localhost` (not a container ID, IP address, or container name)
     - Ensure `MONGO_CONNECTION_STRING` is set and uses `localhost` (not `127.0.0.1` or container ID)
     - The connection string MUST include the database name: `/archivist` after the port
     - **For single-node MongoDB**: Use `w=1` instead of `w=majority` in the connection string
     - `w=majority` requires a properly configured replica set with a primary node
     - Verify both `MONGO_CONNECTION_STRING` and individual variables are set correctly
     - Check that `.env` file is in the correct location and being loaded
     - Try restarting the Archivist after updating `.env` file

6. **Error: "Server selection timed out after 60000 ms"**:
   - This error means MongoDB is not reachable or not ready
   - **Possible causes**:
     - MongoDB container is not running
     - Connection string uses `w=majority` but replica set has no primary
     - MongoDB is still initializing
     - Network/firewall issues
   - **Solution**:
     - Check MongoDB container is running: `docker ps | grep mongo`
     - Check MongoDB logs: `docker logs mongo --tail 50`
     - Test connection: `mongosh --authenticationDatabase admin mongodb://root:example@localhost:27017/archivist`
     - **For single-node MongoDB**: Change `w=majority` to `w=1` in `MONGO_CONNECTION_STRING`
     - Wait for MongoDB to fully initialize (check logs for "Waiting for connections")
     - If using replica set, ensure it's properly initialized: `mongosh --authenticationDatabase admin mongodb://root:example@localhost:27017/admin --eval "rs.status()"`

### Build Issues

1. **Ensure Node.js version**:
   - Required: Node.js >= 22
   - Check: `node --version`

2. **Clean and rebuild**:
   ```bash
   rm -rf node_modules dist
   yarn install
   yarn xy build
   ```

---

## References

### Project Files

- **Archivist API**: `backend/xyo-sample-projects/api-archivist-nodejs/`
  - `docker-compose.yml` - Docker setup
  - `Dockerfile` - Container build
  - `.example.env` - Environment variables template
  - `src/index.ts` - Entry point
  - `package.json` - Dependencies and scripts

- **MongoDB Setup**: `backend/xyo-sample-projects/clients/`
  - `docker-compose.yml` - MongoDB container
  - `scripts/mongo/` - Initialization scripts

- **SDK References**: `backend/xyo-sample-projects/sdk-xyo-client-js/`
  - `packages/sdk-utils/packages/network/src/knownArchivists.ts` - Local Archivist config
  - `docker-compose.yml` - Alternative MongoDB setup

### Key Code References

1. **Archivist Entry Point**:
   ```typescript
   // api-archivist-nodejs/src/index.ts
   import { getNode } from '@xyo-network/node-app'
   void getNode()
   ```

2. **Local Archivist Config**:
   ```typescript
   // sdk-xyo-client-js/packages/sdk-utils/packages/network/src/knownArchivists.ts
   const localArchivist = (): NetworkNodePayload => {
     return {
       docs: 'http://localhost:8080/api',
       name: 'XYO Shared Archivist (local)',
       schema: NetworkNodeSchema,
       slug: 'local',
       type: 'archivist',
       uri: 'http://localhost:8080',
       web: 'http://localhost:8081',
     }
   }
   ```

3. **Connection Example**:
   ```typescript
   // clients/packages/cli/src/lib/connect/connect.ts
   const apiDomain = process.env.API_DOMAIN || 'http://localhost:8080'
   const bridge = await HttpBridge.create({ 
     config: { 
       nodeUrl: apiDomain, 
       schema: HttpBridgeConfigSchema 
     } 
   })
   ```

---

## Notes

1. **MongoDB Replica Set**: The MongoDB setup uses a replica set (`dbrs`), which is required for certain MongoDB features. The initialization scripts handle this automatically.

2. **Port Mapping**: The Archivist runs on port 8080 by default, but this can be changed via the `APP_PORT` environment variable.

3. **CORS**: Make sure to configure `CORS_ALLOWED_ORIGINS` if you're accessing the Archivist from a web browser.

4. **Security**: The default `.example.env` values are **not secure** and should only be used for local development. Never use these values in production.

5. **Docker vs Local**: You can run MongoDB in Docker while running the Archivist locally, or run both in Docker using docker-compose.


# ChainCheck Monorepo

Delivery verification system using XYO Network proofs.

## Structure

- `backend/` — Express + Prisma API
- `mobile/` — Expo React Native driver app
- `web/` — Next.js dashboard
- `shared/` — Shared TypeScript types

## Getting Started

```bash
git clone https://github.com/your-org/chaincheck.git
cd chaincheck
```

### Backend

```bash
cd backend
npm install
cp env.example .env
npx prisma migrate dev
npm run seed      # optional sample data
npm run dev
```

### Mobile (Expo)

```bash
cd mobile
npm install
cp env.example .env
npm run start
```

### Web (Next.js)

```bash
cd web
npm install
cp env.local.example .env.local
npm run dev
```

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

> **XYO integration**  
> The current backend ships with a lightweight mock `XyoService` that generates deterministic hashes for development. Once the upstream SDK dependency issues are resolved, replace the stub with a real client implementation using `@xyo-network/sdk-xyo-client-js` or the official HTTP APIs.

## Scripts

- `npm run dev` — start development server
- `npm run lint` — lint source files
- `npm run build` — production build (backend/web)

## Documentation

- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** — Detailed development documentation including:
  - Network statistics and health calculation logic
  - Coverage area calculation
  - Delivery verification flow
  - XYO Network integration details
  - Database schema and API endpoints

See the `docs/` directory for additional guides and analysis documents.



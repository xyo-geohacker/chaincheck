# XYO Archivist with MongoDB - Docker Compose Setup

This directory contains a single Docker Compose file that sets up both MongoDB and the XYO Archivist server with minimal configuration.

## Quick Start

1. **Start both services**:
   ```bash
   cd ~/Development/XYO/Cursor/xyo-archivist/xyo-archivist-mongodb
   docker-compose up -d
   ```

2. **Check service status**:
   ```bash
   docker-compose ps
   ```

3. **View logs**:
   ```bash
   # All services
   docker-compose logs -f
   
   # MongoDB only
   docker-compose logs -f mongo
   
   # Archivist only
   docker-compose logs -f archivist
   ```

4. **Stop services**:
   ```bash
   docker-compose down
   ```

5. **Stop and remove volumes** (clean slate):
   ```bash
   docker-compose down -v
   ```

## Services

### MongoDB
- **Container**: `mongo`
- **Port**: `27017` (exposed to host)
- **Hostname**: `mongo` (for Docker networking)
- **Credentials**:
  - Username: `root`
  - Password: `example`
  - Database: `archivist`
- **Replica Set**: `dbrs` (configured but requires initialization)

### Archivist
- **Container**: `archivist`
- **Port**: `8888` (exposed to host)
- **API URL**: `http://localhost:8888`
- **MongoDB Connection**: Uses service name `mongo` for Docker networking
- **Logging**: 
  - Default: `info` level
  - Set `LOG_LEVEL=debug` in `docker-compose.yml` for verbose DEBUG logging
  - View logs: `docker-compose logs -f archivist`

## Initial Setup

### Initialize MongoDB Replica Set

After starting the services, you need to initialize the MongoDB replica set and ensure it's in PRIMARY state:

**Option A: Automated Script (Recommended)**

```bash
# Run the initialization script
./mongo-init-replica-set.sh
```

The script automatically:
- Checks if replica set is already initialized
- Initializes it if needed with a single node
- Waits for MongoDB to become PRIMARY state (required for writes)
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
# Check status repeatedly until stateStr shows "PRIMARY"
rs.status()

# Verify PRIMARY state
rs.status().members[0].stateStr  # Should output: PRIMARY

# Exit
exit
```

**Important**: MongoDB must be in PRIMARY state before the Archivist can connect successfully.

### Verify Archivist Connection

Check that the Archivist can connect to MongoDB:

```bash
# Check Archivist logs
docker-compose logs archivist | grep -i mongo

# Test Archivist API
curl http://localhost:8888/api
```

## Configuration

### MongoDB Connection

The Archivist connects to MongoDB using:
- **Connection String**: `mongodb://root:example@mongo:27017/archivist?authSource=admin&retryWrites=true&w=1`
- **Service Name**: `mongo` (Docker internal networking)
- **Write Concern**: `w=1` (for single-node setup)

### Environment Variables

All Archivist environment variables are set in the `docker-compose.yml` file. To modify:

1. Edit `docker-compose.yml`
2. Restart the Archivist service:
   ```bash
   docker-compose up -d --force-recreate archivist
   ```

**Logging Configuration:**
- `LOG_LEVEL`: Set to `debug` or `DEBUG` for verbose logging, `info` for normal logging (default)
- To enable DEBUG logging, add or update in `docker-compose.yml`:
  ```yaml
  LOG_LEVEL: "debug"
  ```
- After changing, restart the Archivist: `docker-compose up -d --force-recreate archivist`

### Ports

- **MongoDB**: `27017` (exposed to host for direct access)
- **Archivist**: `8888` (exposed to host)

To change ports, modify the `ports` section in `docker-compose.yml`.

## Troubleshooting

### MongoDB Not Starting

```bash
# Check MongoDB logs
docker-compose logs mongo

# Check if port 27017 is already in use
lsof -i :27017

# Restart MongoDB
docker-compose restart mongo
```

### Archivist Cannot Connect to MongoDB

1. **Verify MongoDB is healthy**:
   ```bash
   docker-compose ps mongo
   # Should show "healthy"
   ```

2. **Check MongoDB connection from Archivist container**:
   ```bash
   docker exec -it archivist ping mongo
   ```

3. **Verify MongoDB credentials**:
   ```bash
   docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example
   ```

4. **Check Archivist logs**:
   ```bash
   docker-compose logs archivist | grep -i "mongo\|error"
   ```

### Replica Set Issues

If you see "No primary exists currently" or MongoDB is not in PRIMARY state:

**Option A: Use Automated Script (Recommended)**
```bash
# Run the initialization script - it will check and fix issues automatically
./mongo-init-replica-set.sh
```

**Option B: Manual Fix**
```bash
# Connect to MongoDB
docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example

# Check replica set status
rs.status()

# Check current state
rs.status().members[0].stateStr  # Should show "PRIMARY"

# If not PRIMARY, reconfigure:
cfg = rs.conf()
cfg.members[0].host = "mongo:27017"
rs.reconfig(cfg, {force: true})

# Wait and check again (may take 10-30 seconds)
rs.status().members[0].stateStr  # Should eventually show "PRIMARY"

# Exit
exit
```

**Quick Status Check:**
```bash
# Check if MongoDB is PRIMARY (should output "PRIMARY")
docker exec mongo mongosh --authenticationDatabase admin -u root -p example --quiet --eval "rs.status().members[0].stateStr"
```

## Data Persistence

MongoDB data is persisted in a Docker volume named `mongo_data`. To remove all data:

```bash
docker-compose down -v
```

## Network Access

- **From Host**: Use `localhost:27017` for MongoDB, `localhost:8888` for Archivist
- **From Docker Containers**: Use service names `mongo:27017` and `archivist:8888`

## Files

- `docker-compose.yml` - Combined Docker Compose configuration
- `mongodb.key` - MongoDB replica set key file (required for replica set, create with: `openssl rand -base64 756 > mongodb.key && chmod 400 mongodb.key`)
- `mongo-init-replica-set.sh` - Automated script to initialize MongoDB replica set and ensure PRIMARY state
- `README.md` - This file

## Notes

- The MongoDB replica set (`dbrs`) is configured but requires manual initialization (see above)
- For local development, `w=1` write concern is used (single-node)
- The `mongodb.key` file must have proper permissions (400) for MongoDB to use it
- All services are on the same Docker network (`archivist-network`) for internal communication


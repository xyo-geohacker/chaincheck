#!/bin/bash
# Initialize MongoDB replica set for single-node setup
# This script ensures MongoDB is in PRIMARY state for a single-node replica set

set -e

MONGO_CONTAINER="mongo"
MONGO_USER="root"
MONGO_PASSWORD="example"
REPLICA_SET_NAME="dbrs"
MONGO_HOST="mongo:27017"

echo "🔍 Checking if MongoDB container is running..."
if ! docker ps | grep -q "$MONGO_CONTAINER"; then
    echo "❌ Error: MongoDB container '$MONGO_CONTAINER' is not running"
    echo "   Please start it with: docker-compose up -d mongo"
    exit 1
fi

echo "✅ MongoDB container is running"
echo ""

# Wait a moment for MongoDB to be fully ready
sleep 2

echo "🔍 Checking replica set status..."

# Check if we can connect and if replica set is configured
RS_STATUS=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet --eval "try { var status = rs.status(); status.ok } catch(e) { 0 }" 2>&1 || echo "0")

if [ "$RS_STATUS" = "1" ]; then
    echo "✅ Replica set is already initialized"
    
    # Get detailed status
    PRIMARY_CHECK=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet --eval "try { rs.status().members[0].stateStr } catch(e) { 'ERROR: ' + e.message }" 2>&1 | grep -v "^$" | tail -1)
    
    echo "   Current state: $PRIMARY_CHECK"
    
    if [ "$PRIMARY_CHECK" = "PRIMARY" ]; then
        echo "✅ MongoDB is in PRIMARY state"
        echo ""
        echo "📊 Current replica set status:"
        docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet --eval "rs.status().members.forEach(m => print('  - ' + m.name + ': ' + m.stateStr))"
        exit 0
    else
        echo "⚠️  MongoDB is not in PRIMARY state (current: $PRIMARY_CHECK)"
        echo "   Attempting to reconfigure..."
        
        # Get current config
        CONFIG_CHECK=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet --eval "try { rs.conf()._id } catch(e) { 'ERROR' }" 2>&1 | grep -v "^$" | tail -1)
        
        if [ "$CONFIG_CHECK" = "ERROR" ]; then
            echo "❌ Cannot read replica set configuration"
            echo "   Attempting to reinitialize..."
            
            # Try to initialize again
            INIT_RESULT=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet <<EOF 2>&1
try {
  rs.initiate({
    _id: "$REPLICA_SET_NAME",
    members: [
      { _id: 0, host: "$MONGO_HOST" }
    ]
  })
  print("INIT_SUCCESS")
} catch(e) {
  print("INIT_ERROR: " + e.message)
}
EOF
)
            
            if echo "$INIT_RESULT" | grep -q "INIT_SUCCESS"; then
                echo "✅ Replica set reinitialized"
            else
                echo "❌ Failed to reinitialize: $INIT_RESULT"
                exit 1
            fi
        else
            # Try to reconfigure existing config
            RECONFIG_RESULT=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet <<EOF 2>&1
try {
  var cfg = rs.conf()
  cfg.members[0].host = "$MONGO_HOST"
  rs.reconfig(cfg, {force: true})
  print("RECONFIG_SUCCESS")
} catch(e) {
  print("RECONFIG_ERROR: " + e.message)
}
EOF
)
            
            if echo "$RECONFIG_RESULT" | grep -q "RECONFIG_SUCCESS"; then
                echo "✅ Replica set reconfigured"
            else
                echo "⚠️  Reconfiguration failed: $RECONFIG_RESULT"
                echo "   Will wait for PRIMARY state..."
            fi
        fi
        
        # Wait for PRIMARY state after reconfig
        echo "⏳ Waiting for MongoDB to become PRIMARY (up to 60 seconds)..."
        MAX_WAIT=60
        ELAPSED=0
        while [ $ELAPSED -lt $MAX_WAIT ]; do
            PRIMARY_CHECK=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet --eval "try { rs.status().members[0].stateStr } catch(e) { 'ERROR' }" 2>&1 | grep -v "^$" | tail -1)
            
            if [ "$PRIMARY_CHECK" = "PRIMARY" ]; then
                echo "✅ MongoDB is now in PRIMARY state!"
                break
            fi
            
            echo "   Current state: $PRIMARY_CHECK ($ELAPSED/$MAX_WAIT seconds)"
            sleep 3
            ELAPSED=$((ELAPSED + 3))
        done
        
        if [ "$PRIMARY_CHECK" != "PRIMARY" ]; then
            echo "❌ Failed to set MongoDB to PRIMARY state after $MAX_WAIT seconds"
            echo "   Current status: $PRIMARY_CHECK"
            echo "   Check logs with: docker-compose logs mongo | tail -50"
            exit 1
        fi
    fi
else
    echo "⚠️  Replica set is not initialized"
    echo "   Initializing replica set '$REPLICA_SET_NAME' with single node at '$MONGO_HOST'..."
    
    # Verify hostname resolution inside container
    echo "   Verifying hostname resolution..."
    HOST_CHECK=$(docker exec "$MONGO_CONTAINER" ping -c 1 mongo 2>&1 | grep -q "1 received" && echo "OK" || echo "FAIL")
    if [ "$HOST_CHECK" != "OK" ]; then
        echo "⚠️  Warning: Cannot resolve hostname 'mongo' inside container"
        echo "   Trying with 'localhost' instead..."
        MONGO_HOST="localhost:27017"
    fi
    
    # Initialize replica set with better error handling
    echo "   Initializing replica set..."
    INIT_RESULT=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" <<EOF 2>&1
try {
  var result = rs.initiate({
    _id: "$REPLICA_SET_NAME",
    members: [
      { _id: 0, host: "$MONGO_HOST" }
    ]
  })
  print("INIT_SUCCESS: " + JSON.stringify(result))
} catch(e) {
  print("INIT_ERROR: " + e.message)
  print("ERROR_DETAILS: " + JSON.stringify(e))
}
EOF
)
    
    # Check for errors in initialization
    if echo "$INIT_RESULT" | grep -q "INIT_ERROR"; then
        ERROR_MSG=$(echo "$INIT_RESULT" | grep "INIT_ERROR" | sed 's/INIT_ERROR: //')
        echo "❌ Failed to initialize replica set: $ERROR_MSG"
        echo ""
        echo "Full output:"
        echo "$INIT_RESULT"
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check MongoDB logs: docker-compose logs mongo | tail -50"
        echo "2. Verify MongoDB is fully started: docker-compose ps mongo"
        echo "3. Try restarting MongoDB: docker-compose restart mongo"
        exit 1
    fi
    
    if echo "$INIT_RESULT" | grep -q "INIT_SUCCESS"; then
        echo "✅ Replica set initialization command succeeded"
    else
        echo "⚠️  Unexpected response from rs.initiate()"
        echo "$INIT_RESULT"
    fi
    
    echo "⏳ Waiting for replica set to become PRIMARY (this may take 60-120 seconds)..."
    echo "   MongoDB needs time to elect itself as PRIMARY in a single-node setup"
    
    # Wait for PRIMARY state with longer timeout and better feedback
    MAX_WAIT=180
    ELAPSED=0
    LAST_STATE=""
    
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        PRIMARY_CHECK=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet --eval "try { rs.status().members[0].stateStr } catch(e) { 'STARTUP' }" 2>&1 | grep -v "^$" | tail -1)
        
        # Only print if state changed
        if [ "$PRIMARY_CHECK" != "$LAST_STATE" ]; then
            case "$PRIMARY_CHECK" in
                "PRIMARY")
                    echo "✅ MongoDB is now in PRIMARY state!"
                    break
                    ;;
                "STARTUP"|"STARTUP2")
                    echo "   Initializing... ($ELAPSED/$MAX_WAIT seconds) - MongoDB is starting up"
                    ;;
                "RECOVERING")
                    echo "   Recovering... ($ELAPSED/$MAX_WAIT seconds) - MongoDB is recovering"
                    ;;
                "ROLLBACK")
                    echo "   Rolling back... ($ELAPSED/$MAX_WAIT seconds) - MongoDB is rolling back"
                    ;;
                *)
                    echo "   Current state: $PRIMARY_CHECK ($ELAPSED/$MAX_WAIT seconds)"
                    ;;
            esac
            LAST_STATE="$PRIMARY_CHECK"
        else
            # Print progress every 15 seconds even if state hasn't changed
            if [ $((ELAPSED % 15)) -eq 0 ] && [ $ELAPSED -gt 0 ]; then
                echo "   Still waiting... Current state: $PRIMARY_CHECK ($ELAPSED/$MAX_WAIT seconds)"
            fi
        fi
        
        sleep 3
        ELAPSED=$((ELAPSED + 3))
    done
    
    if [ "$PRIMARY_CHECK" != "PRIMARY" ]; then
        echo ""
        echo "❌ Error: MongoDB did not become PRIMARY within $MAX_WAIT seconds"
        echo "   Current status: $PRIMARY_CHECK"
        echo ""
        echo "Diagnostics:"
        echo "   Checking replica set status..."
        docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet --eval "try { rs.status() } catch(e) { print('ERROR: ' + e.message) }" 2>&1 | head -20
        
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check MongoDB logs: docker-compose logs mongo | tail -100"
        echo "2. Try restarting MongoDB: docker-compose restart mongo"
        echo "3. Check if hostname 'mongo' is resolvable: docker exec mongo ping -c 1 mongo"
        echo "4. Verify MongoDB key file exists: ls -la mongodb.key"
        echo "5. Check MongoDB configuration: docker exec mongo cat /etc/mongodb.key"
        exit 1
    fi
fi

echo ""
echo "📊 Final replica set status:"
FINAL_STATUS=$(docker exec "$MONGO_CONTAINER" mongosh --authenticationDatabase admin -u "$MONGO_USER" -p "$MONGO_PASSWORD" --quiet --eval "try { rs.status().members.forEach(m => print('  - ' + m.name + ': ' + m.stateStr)) } catch(e) { print('ERROR: ' + e.message) }" 2>&1)
echo "$FINAL_STATUS"

echo ""
echo "✅ MongoDB replica set is ready!"
echo "   Replica Set Name: $REPLICA_SET_NAME"
echo "   Status: PRIMARY"
echo "   Connection String: mongodb://$MONGO_USER:$MONGO_PASSWORD@localhost:27017/archivist?authSource=admin&retryWrites=true&w=1"

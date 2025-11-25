# Archivist Database Initialization

## Overview

The XYO Archivist **does not require manual database initialization**. Collections and indexes are created automatically by the XYO SDK when data is first inserted.

## Automatic Collection Creation

The XYO Archivist uses MongoDB's automatic collection creation feature:

- **Collections are created automatically** when the first document is inserted
- **Indexes are created automatically** by the XYO SDK when collections are first used
- **No manual setup scripts are required**

## Database Structure

The Archivist uses the following MongoDB structure:

- **Database**: `archivist` (configurable via `MONGO_DATABASE` environment variable)
- **Collections**: Created dynamically based on archive names and data types
  - Archive-specific collections (e.g., `chaincheck`, `temp`)
  - Bound witness collections
  - Payload collections

## Verification

To verify the Archivist database is ready:

```bash
# Check if database exists
docker exec mongo mongosh --authenticationDatabase admin -u root -p example --quiet --eval "db.getMongo().getDBNames()"

# Check collections (will be empty until first data is inserted)
docker exec mongo mongosh --authenticationDatabase admin -u root -p example archivist --quiet --eval "db.getCollectionNames()"

# Check if Archivist is running
curl http://localhost:8888/api
```

## First Data Insert

When you first insert data into the Archivist (via API calls from your application):

1. The XYO SDK automatically creates the necessary collections
2. Indexes are created for optimal query performance
3. No manual intervention is required

## Manual Index Creation (Optional)

If you want to pre-create indexes for better performance, you can run:

```bash
# Connect to MongoDB
docker exec -it mongo mongosh --authenticationDatabase admin -u root -p example archivist

# Create indexes (example - adjust based on your archive names)
# Note: These will be created automatically on first insert, but you can pre-create them

# Exit
exit
```

However, this is **not necessary** as the XYO SDK handles index creation automatically.

## Troubleshooting

**Issue: Collections not appearing after data insert**

1. **Check Archivist logs**:
   ```bash
   docker-compose logs archivist | grep -i "error\|collection\|index"
   ```

2. **Verify MongoDB connection**:
   ```bash
   docker exec mongo mongosh --authenticationDatabase admin -u root -p example --quiet --eval "db.adminCommand('ping')"
   ```

3. **Check if replica set is PRIMARY**:
   ```bash
   docker exec mongo mongosh --authenticationDatabase admin -u root -p example --quiet --eval "rs.status().members[0].stateStr"
   # Should output: PRIMARY
   ```

4. **Verify database name**:
   ```bash
   # Check environment variable
   docker exec archivist env | grep MONGO_DATABASE
   # Should match the database you're checking
   ```

## Summary

✅ **No database initialization required**  
✅ **Collections created automatically on first insert**  
✅ **Indexes created automatically by XYO SDK**  
✅ **Just ensure MongoDB is running and replica set is PRIMARY**

The only requirement is that:
1. MongoDB is running and healthy
2. Replica set is initialized and in PRIMARY state (for single-node setup)
3. Archivist can connect to MongoDB (connection string is correct)


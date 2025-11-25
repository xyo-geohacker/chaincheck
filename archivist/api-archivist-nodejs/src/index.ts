// Suppress errors from agenda module (job scheduler) - MUST be first
// Agenda tries to connect to MongoDB but may fail in some configurations
// This doesn't affect the MongoDB Archivist which uses our direct config
// We catch both unhandled rejections and uncaught exceptions to prevent crashes
const isAgendaError = (error: unknown): boolean => {
  const errorString = String(error)
  const stack = error && typeof error === 'object' && 'stack' in error ? String(error.stack) : ''
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : errorString
  const combined = `${errorString} ${message} ${stack}`.toLowerCase()

  return (
    combined.includes('querysrv enotfound')
    || combined.includes('agenda')
    || combined.includes('econnrefused')
    || combined.includes('mongoserverselectionerror')
    || combined.includes('runtimeerror')
    || combined.includes('_mongodb._tcp')
    || combined.includes('127.0.0.1:27017')
    || combined.includes('localhost:27017')
    || combined.includes('abort(')
  )
}

// Enhanced error handler for unhandled rejections
process.on('unhandledRejection', (reason, _promise) => {
  if (isAgendaError(reason)) {
    const errorMsg = reason && typeof reason === 'object' && 'message' in reason
      ? String(reason.message)
      : String(reason)
    console.warn('⚠ Agenda module MongoDB connection issue (non-critical, continuing...):', errorMsg.slice(0, 100))
    return // Suppress the error - don't crash
  }
  // Log but don't crash for other unhandled rejections in development
  if (process.env.NODE_ENV === 'development') {
    console.error('⚠ Unhandled rejection (development mode, continuing...):', reason)
    return
  }
  // In production, log and exit gracefully
  console.error('❌ Unhandled rejection:', reason)
  process.exit(1)
})

// Enhanced error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  if (isAgendaError(error)) {
    const errorMsg = error.message !== undefined && error.message !== '' ? error.message : String(error)
    console.warn('⚠ Caught exception from agenda module (non-critical, continuing...):', errorMsg.slice(0, 150))
    return // Don't crash the process
  }
  // Log but don't crash for other uncaught exceptions in development
  if (process.env.NODE_ENV === 'development') {
    console.error('⚠ Uncaught exception (development mode, continuing...):', error)
    return
  }
  // In production, log and exit gracefully
  console.error('❌ Uncaught exception:', error)
  process.exit(1)
})

// Set Node.js to not exit on unhandled rejections
// This is critical - without this, unhandled rejections will crash the process
process.setUncaughtExceptionCaptureCallback((error) => {
  if (isAgendaError(error)) {
    const errorMsg = error.message !== undefined && error.message !== '' ? error.message : String(error)
    console.warn('⚠ Captured agenda exception (non-critical, continuing...):', errorMsg.slice(0, 150))
    return true // Suppress the error
  }
  return false // Let other errors through to normal handlers
})

import type { BaseMongoSdkConfig } from '@xylabs/mongo'
import { MongoDBArchivist } from '@xyo-network/archivist-mongodb'
import { COLLECTIONS } from '@xyo-network/module-abstract-mongodb'
import { getNode } from '@xyo-network/node-app'

// Try to configure agenda module with MongoDB connection string before getNode() initializes it
// This must happen before getNode() is called, as agenda is initialized during node creation
// Note: The XYO SDK constructs agenda's connection from MONGO_DOMAIN/MONGO_USERNAME/MONGO_PASSWORD
// which may not work in Docker. Our error handlers will catch agenda errors and allow the server to continue.
function configureAgenda() {
  const mongoConnectionString = process.env.MONGO_CONNECTION_STRING
  const agendaDbUri = process.env.AGENDA_DB_URI || mongoConnectionString

  // Explicitly check for valid string value
  const hasValidUri = agendaDbUri !== undefined
    && agendaDbUri !== null
    && typeof agendaDbUri === 'string'
    && agendaDbUri !== ''

  if (hasValidUri) {
    // Set environment variables that agenda might use
    // Agenda typically looks for: db.address, db.uri, or MONGODB_URI
    process.env.MONGODB_URI = agendaDbUri
    process.env.AGENDA_DB_URI = agendaDbUri
    console.log('✓ Agenda environment variables configured (connection may still fail - non-critical)')
  }
}

// Configure agenda before initializing the node
configureAgenda()

// Initialize the XYO Node - this will start the HTTP server automatically
// getNode() must be called at the top level - the SDK will start the Express server
// WARNING: getNode() may hang if agenda initialization fails
// We call it without await to allow the server to potentially start from SDK internal logic
console.log('🔄 Initializing XYO Node (this may take a moment)...')

// Call getNode() without blocking - the SDK should start the server asynchronously
// If getNode() hangs, the server might still start from internal SDK initialization
getNode()
  .then((node) => {
    console.log('✓ XYO Node initialized')
    // Configure MongoDB Archivist after node is initialized
    configureMongoDBArchivist(node).catch((error) => {
      console.error('❌ MongoDB Archivist configuration failed (non-critical):', error)
    })
  })
  .catch((error) => {
    console.error('❌ Failed to initialize XYO Node:', error)
    console.warn('⚠ Server may still be starting from SDK internal logic')
  })

// Check if default Archivist is already using MongoDB
async function checkDefaultArchivist(node: Awaited<ReturnType<typeof getNode>>): Promise<boolean> {
  try {
    const defaultArchivist = await node.resolve('XYOPublic:Archivist')
    if (defaultArchivist && typeof defaultArchivist === 'object' && 'config' in defaultArchivist) {
      const config = (defaultArchivist as { config?: { labels?: Record<string, string> } }).config
      const storageClass = config?.labels?.['network.xyo.storage.class']

      if (storageClass === 'mongodb') {
        console.log('✓ Default Archivist is already using MongoDB storage')
        if ('address' in defaultArchivist && typeof defaultArchivist.address === 'string') {
          console.log(`  - Address: ${defaultArchivist.address}`)
          console.log('  - /Archivist route resolves to this MongoDB Archivist')
          console.log('  - No need to create a second MongoDB Archivist')
          return true // Use the existing MongoDB Archivist
        }
      } else {
        console.log('ℹ Default Archivist is using in-memory storage, will create MongoDB Archivist')
      }
    }
  } catch {
    // Default Archivist not found or not resolvable - create our own
    console.log('ℹ No default Archivist found, will create MongoDB Archivist')
  }
  return false
}

// Verify that /Archivist resolves to our MongoDB Archivist
async function verifyArchivistResolution(
  node: Awaited<ReturnType<typeof getNode>>,
  mongoArchivistAddress: string,
): Promise<void> {
  try {
    const resolvedArchivist = await node.resolve('XYOPublic:Archivist')
    if (resolvedArchivist && 'address' in resolvedArchivist) {
      const resolvedAddress = String((resolvedArchivist as { address: string }).address)
      if (resolvedAddress === mongoArchivistAddress) {
        console.log(`  ✓ Verified: /Archivist route resolves to MongoDB Archivist (${resolvedAddress})`)
      } else {
        console.warn(`  ⚠ Warning: /Archivist route resolves to different address: ${resolvedAddress} (expected: ${mongoArchivistAddress})`)
        console.warn('  ⚠ This means the default in-memory Archivist is still being used')
        console.warn(`  ⚠ Use /node/${mongoArchivistAddress} directly for MongoDB Archivist operations`)
      }
    }
  } catch (error) {
    console.warn('  ⚠ Could not verify Archivist resolution:', error)
  }
}

async function configureMongoDBArchivist(node: Awaited<ReturnType<typeof getNode>>) {
  // Check if MongoDB connection string is configured
  const mongoConnectionString = process.env.MONGO_CONNECTION_STRING
  if (mongoConnectionString === undefined || mongoConnectionString === '') {
    console.warn('⚠ MONGO_CONNECTION_STRING not set - Archivist will use in-memory storage')
    return
  }

  // First, check if the default Archivist (created by getNode()) is already using MongoDB
  // The XYO SDK may automatically configure it to use MongoDB if MONGO_CONNECTION_STRING is set
  const useDefaultArchivist = await checkDefaultArchivist(node)
  if (useDefaultArchivist) {
    return // Use the existing MongoDB Archivist
  }

  // Configure MongoDB collections
  const boundWitnessesConfig: BaseMongoSdkConfig = {
    collection: COLLECTIONS.BoundWitnesses,
    dbConnectionString: mongoConnectionString,
  }

  const payloadsConfig: BaseMongoSdkConfig = {
    collection: COLLECTIONS.Payloads,
    dbConnectionString: mongoConnectionString,
  }

  try {
    // Create MongoDB Archivist
    // The name "Archivist" is important - it must match what addDataLakeRoutes expects ("XYOPublic:Archivist")
    const mongoArchivist = await MongoDBArchivist.create({
      account: node.account,
      boundWitnessSdkConfig: boundWitnessesConfig,
      config: {
        schema: MongoDBArchivist.defaultConfigSchema,
        name: 'Archivist', // This name is used for resolution: "XYOPublic:Archivist"
      },
      payloadSdkConfig: payloadsConfig,
    })

    // Register the MongoDB Archivist with the node
    // Type assertion needed due to version mismatch in nested dependencies
    // The MongoDBArchivist is compatible at runtime, but TypeScript sees different module-model versions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await node.register(mongoArchivist as any)

    // Attach it as a public child so it can be resolved by name "XYOPublic:Archivist"
    // The archivistMiddleware uses node.resolve('XYOPublic:Archivist') which should find this module
    // IMPORTANT: Attaching with the same name should make it the primary Archivist
    await node.attach(mongoArchivist.address, true) // true = external/public

    console.log('✓ MongoDB Archivist configured and attached')
    console.log(`  - Address: ${mongoArchivist.address}`)
    console.log(`  - MongoDB: ${mongoConnectionString.replace(/:[^:@]+@/, ':****@')}`)
    const archivistName = mongoArchivist.config?.name
    console.log(`  - Name: ${archivistName !== undefined && archivistName !== null ? archivistName : 'Archivist'}`)
    console.log('  - Note: /Archivist route should now resolve to this MongoDB Archivist')

    // Verify that /Archivist resolves to our MongoDB Archivist
    await verifyArchivistResolution(node, mongoArchivist.address)
  } catch (error) {
    console.error('❌ Failed to configure MongoDB Archivist:', error)
    console.warn('⚠ Falling back to in-memory Archivist')
  }
}

/**
 * Custom Next.js server with HTTPS support
 * For local development/demo with self-signed certificate
 */

const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
// Use hostname from env or default to www.chaincheck.com for demo
// Note: This should match what's in /etc/hosts
const hostname = process.env.HOSTNAME || 'www.chaincheck.com';
const port = parseInt(process.env.PORT || '3000', 10);

// Certificate paths
const certsDir = path.join(__dirname, 'certs');
const keyPath = path.join(certsDir, 'chaincheck.key');
const certPath = path.join(certsDir, 'chaincheck.crt');

// Check if certificates exist
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ SSL certificates not found!');
  console.error(`   Expected files:`);
  console.error(`   - ${keyPath}`);
  console.error(`   - ${certPath}`);
  console.error('');
  console.error('   Run: bash scripts/generate-ssl-cert.sh');
  process.exit(1);
}

// Read certificate files
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

// Initialize Next.js app
console.log('⏳ Initializing Next.js app...');
// Note: hostname parameter is optional and may cause issues in some Next.js versions
// We'll bind the server to 0.0.0.0 instead to listen on all interfaces
const app = next({ dev });
const handle = app.getRequestHandler();

// Server instance (will be set after server is created)
let serverInstance = null;
let isShuttingDown = false;
let forceExitTimer = null;

// Graceful shutdown handler (register once, before server creation)
function gracefulShutdown(signal) {
  return () => {
    if (isShuttingDown) {
      return; // Already shutting down, ignore duplicate signals
    }
    isShuttingDown = true;
    
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    if (serverInstance) {
      // Set up force exit timeout first
      forceExitTimer = setTimeout(() => {
        console.error('⚠ Forced shutdown after timeout');
        process.exit(1);
      }, 5000);
      
      // Close the server (this will stop accepting new connections)
      // The callback is called when all connections are closed
      serverInstance.close(() => {
        if (forceExitTimer) {
          clearTimeout(forceExitTimer);
          forceExitTimer = null;
        }
        console.log('✓ HTTPS server closed');
        process.exit(0);
      });
    } else {
      // Server not created yet, exit immediately
      process.exit(0);
    }
  };
}

// Register signal handlers once (before server creation to prevent multiple registrations)
// Remove any existing listeners first to prevent duplicates
process.removeAllListeners('SIGTERM');
process.removeAllListeners('SIGINT');
process.once('SIGTERM', gracefulShutdown('SIGTERM'));
process.once('SIGINT', gracefulShutdown('SIGINT'));

app.prepare()
  .then(() => {
    console.log('✅ Next.js app prepared');
    console.log('⏳ Starting HTTPS server...');
    
    serverInstance = createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    serverInstance.listen(port, '0.0.0.0', () => {
      console.log(`> Ready on https://${hostname}:${port}`);
      console.log(`> Local: https://localhost:${port}`);
      console.log('');
      console.log('⚠️  Using self-signed certificate for development');
      console.log('   You may need to accept the security warning in your browser');
    });

    // Handle server errors
    serverInstance.on('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`   Port ${port} is already in use`);
        console.error(`   Try: PORT=3001 npm run dev:https`);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to prepare Next.js app:', err);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  });


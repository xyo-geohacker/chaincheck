/**
 * Server Status API Routes
 * Provides status information for backend, web, mobile, Archivist, and Diviner services
 */

import { Router } from 'express';
import { authenticateConfigToken } from '../middleware/config-auth-middleware.js';
import { env } from '../lib/env.js';
import axios from 'axios';
import https from 'https';

const router = Router();

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'unknown';
  url?: string;
  port?: number;
  lastChecked: string;
  error?: string;
}

/**
 * Check backend service status
 */
async function checkBackendStatus(): Promise<ServiceStatus> {
  const backendHost = env.backendHost;
  const backendPort = env.port;
  const backendUrl = `http://${backendHost}:${backendPort}`;
  const healthUrl = `${backendUrl}/health`;
  
  // Build list of URLs to try
  // If using FQDN, try localhost first (faster) then FQDN
  // If using localhost, just try that
  const urlsToTry: string[] = [];
  const isFQDN = backendHost !== 'localhost' && backendHost !== '127.0.0.1' && backendHost.includes('.');
  
  if (isFQDN) {
    // Try localhost first (faster, more reliable), then FQDN
    urlsToTry.push(`http://localhost:${backendPort}/health`);
    urlsToTry.push(healthUrl);
  } else {
    // Just use the configured host
    urlsToTry.push(healthUrl);
  }
  
  // Try each URL until one succeeds
  let lastError: Error | null = null;
  for (const urlToTry of urlsToTry) {
    try {
      // eslint-disable-next-line no-console
      console.log(`[Status Check] Backend: Trying ${urlToTry}...`);
      const response = await axios.get(urlToTry, { 
        timeout: 5000, // Increased timeout
        validateStatus: () => true // Don't throw on any status code
      });
      
      // eslint-disable-next-line no-console
      console.log(`[Status Check] Backend: ${urlToTry} responded with status ${response.status}`);
      
      // Success - return status
      return {
        name: 'Backend',
        status: response.status === 200 ? 'running' : 'stopped',
        url: backendUrl, // Return original URL (not fallback localhost) for display
        port: backendPort,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      // Store error and try next URL
      const errorMsg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.log(`[Status Check] Backend: ${urlToTry} failed: ${errorMsg}`);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }
  
  // All URLs failed - use last error
  const error = lastError || new Error('All connection attempts failed');
  
  // Extract more detailed error information
  let errorMessage = 'Service unavailable';
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      errorMessage = `timeout of 5000ms exceeded`;
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      errorMessage = `DNS resolution failed - ensure ${backendHost} is in /etc/hosts or DNS`;
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = `Connection refused - server may not be running on port ${backendPort}`;
    } else {
      errorMessage = error.message;
    }
  }
  
  return {
    name: 'Backend',
    status: 'stopped',
    url: backendUrl,
    port: backendPort,
    lastChecked: new Date().toISOString(),
    error: errorMessage
  };
}

/**
 * Check web service status
 */
async function checkWebStatus(): Promise<ServiceStatus> {
  try {
    // Use WEB_URL if available (includes protocol), otherwise construct from host/port
    let webUrl: string;
    let webPort: number;
    
    if (env.webUrl) {
      // Parse WEB_URL to extract protocol and port
      try {
        const url = new URL(env.webUrl);
        webUrl = env.webUrl; // Use full URL (includes protocol: http:// or https://)
        webPort = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
      } catch {
        // If WEB_URL is not a valid URL, fall back to constructing from host/port
        const webPortEnv = process.env.WEB_PORT || 3000;
        const webHost = env.webHost;
        webUrl = `http://${webHost}:${webPortEnv}`;
        webPort = Number(webPortEnv);
      }
    } else {
      // Fallback: construct URL from host and port (defaults to HTTP)
      const webPortEnv = process.env.WEB_PORT || 3000;
      const webHost = env.webHost;
      const webProtocol = process.env.WEB_PROTOCOL || 'http'; // Allow override via WEB_PROTOCOL
      webUrl = `${webProtocol}://${webHost}:${webPortEnv}`;
      webPort = Number(webPortEnv);
    }
    
    // Extract hostname for potential fallback
    let webHostname: string;
    try {
      const url = new URL(webUrl);
      webHostname = url.hostname;
    } catch {
      webHostname = env.webHost;
    }
    
    // Build list of URLs to try
    // If using FQDN, try localhost first (faster) then FQDN
    // If using localhost, just try that
    const urlsToTry: string[] = [];
    const isFQDN = webHostname !== 'localhost' && webHostname !== '127.0.0.1' && webHostname.includes('.');
    
    if (isFQDN) {
      // Try localhost first (faster, more reliable), then FQDN
      try {
        const url = new URL(webUrl);
        const localhostUrl = `${url.protocol}//localhost:${url.port || (url.protocol === 'https:' ? '443' : '80')}`;
        urlsToTry.push(localhostUrl);
        urlsToTry.push(webUrl);
      } catch {
        // If URL parsing fails, just try the original URL
        urlsToTry.push(webUrl);
      }
    } else {
      // Just use the configured URL
      urlsToTry.push(webUrl);
    }
    
    // Try each URL until one succeeds
    let lastError: Error | null = null;
    for (const urlToTry of urlsToTry) {
      try {
        // Try HTTPS first if URL uses HTTPS, otherwise try HTTP
        // Also handle self-signed certificates by rejecting unauthorized errors
        // Increase timeout for HTTPS (self-signed certs may take longer)
        const response = await axios.get(urlToTry, { 
          timeout: 5000, // Increased timeout for HTTPS with self-signed certs
          validateStatus: () => true, // Don't throw on any status code
          httpsAgent: urlToTry.startsWith('https://') ? new https.Agent({
            rejectUnauthorized: false // Allow self-signed certificates for local dev
          }) : undefined,
          // Add headers to help with connection
          headers: {
            'User-Agent': 'ChainCheck-Backend-Status-Check/1.0'
          }
        });
        
        // Success - return status (use original URL for display, not fallback)
        return {
          name: 'Web',
          status: response.status === 200 ? 'running' : 'stopped',
          url: webUrl, // Return original URL (not fallback localhost) for display
          port: webPort !== 443 && webPort !== 80 ? webPort : undefined,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        // Store error and try next URL
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }
    
    // All URLs failed - use last error
    throw lastError || new Error('All connection attempts failed');
  } catch (error) {
    // Determine URL for error response
    let errorUrl: string;
    if (env.webUrl) {
      errorUrl = env.webUrl;
    } else {
      const webPortEnv = process.env.WEB_PORT || 3000;
      const webHost = env.webHost;
      const webProtocol = process.env.WEB_PROTOCOL || 'http';
      errorUrl = `${webProtocol}://${webHost}:${webPortEnv}`;
    }
    
    // Extract more detailed error information
    let errorMessage = 'Service unavailable';
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = `timeout of 5000ms exceeded`;
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorMessage = `DNS resolution failed - ensure ${new URL(errorUrl).hostname} is in /etc/hosts or DNS`;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused - server may not be running on port ${new URL(errorUrl).port || 3000}`;
      } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
        errorMessage = `SSL/TLS error: ${error.message}`;
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      name: 'Web',
      status: 'stopped',
      url: errorUrl,
      port: Number(process.env.WEB_PORT || 3000),
      lastChecked: new Date().toISOString(),
      error: errorMessage
    };
  }
}

/**
 * Check mobile service status (Expo dev server)
 */
async function checkMobileStatus(): Promise<ServiceStatus> {
  // Expo dev server typically runs on port 8081
  const expoPort = Number(process.env.EXPO_PORT || 8081);
  const mobileHost = env.mobileHost;
  const expoUrl = `http://${mobileHost}:${expoPort}`;
  
  // Build list of URLs to try
  // If using FQDN, try localhost first (faster) then FQDN
  // If using localhost, just try that
  const urlsToTry: string[] = [];
  const isFQDN = mobileHost !== 'localhost' && mobileHost !== '127.0.0.1' && mobileHost.includes('.');
  
  if (isFQDN) {
    // Try localhost first (faster, more reliable), then FQDN
    urlsToTry.push(`http://localhost:${expoPort}`);
    urlsToTry.push(expoUrl);
  } else {
    // Just use the configured host
    urlsToTry.push(expoUrl);
  }
  
  // Try each URL until one succeeds
  let lastError: Error | null = null;
  for (const urlToTry of urlsToTry) {
    try {
      // eslint-disable-next-line no-console
      console.log(`[Status Check] Mobile: Trying ${urlToTry}...`);
      const response = await axios.get(urlToTry, { 
        timeout: 5000, // Increased timeout
        validateStatus: () => true // Don't throw on any status code
      });
      
      // eslint-disable-next-line no-console
      console.log(`[Status Check] Mobile: ${urlToTry} responded with status ${response.status}`);
      
      // Success - return status
      return {
        name: 'Mobile',
        status: response.status === 200 ? 'running' : 'stopped',
        url: expoUrl, // Return original URL (not fallback localhost) for display
        port: expoPort,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      // Store error and try next URL
      const errorMsg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.log(`[Status Check] Mobile: ${urlToTry} failed: ${errorMsg}`);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }
  
  // All URLs failed - use last error
  const error = lastError || new Error('All connection attempts failed');
  
  // Extract more detailed error information
  let errorMessage = 'Service unavailable';
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      errorMessage = `timeout of 5000ms exceeded`;
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      errorMessage = `DNS resolution failed - ensure ${mobileHost} is in /etc/hosts or DNS`;
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = `Connection refused - server may not be running on port ${expoPort}`;
    } else {
      errorMessage = error.message;
    }
  }
  
  return {
    name: 'Mobile',
    status: 'stopped',
    url: expoUrl,
    port: expoPort,
    lastChecked: new Date().toISOString(),
    error: errorMessage
  };
}

/**
 * Check Archivist service status
 */
async function checkArchivistStatus(): Promise<ServiceStatus> {
  // Check if Archivist is disabled
  if (env.xyoArchivistDisabled) {
    return {
      name: 'Archivist',
      status: 'unknown',
      url: env.xyoArchivistUrl,
      lastChecked: new Date().toISOString(),
      error: 'Archivist is disabled (XYO_ARCHIVIST_DISABLED=true)'
    };
  }

  try {
    const archivistUrl = env.xyoArchivistUrl;
    
    // Try root URL first (primary health check endpoint)
    // Local Archivist typically responds to root URL (/)
    const healthEndpoints = [
      `${archivistUrl}/`,
      `${archivistUrl}/api`,
      `${archivistUrl}/health`,
      archivistUrl
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const response = await axios.get(endpoint, {
          timeout: 3000,
          headers: {
            'x-api-key': env.xyoApiKey,
            'Accept': 'application/json'
          },
          validateStatus: () => true // Don't throw on any status code
        });

        // Any 2xx or 3xx response indicates the service is reachable
        if (response.status >= 200 && response.status < 400) {
          // Extract port from URL if available
          const urlObj = new URL(archivistUrl);
          const port = urlObj.port ? Number(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80);
          
          return {
            name: 'Archivist',
            status: 'running',
            url: archivistUrl,
            port: port !== 443 && port !== 80 ? port : undefined,
            lastChecked: new Date().toISOString()
          };
        }
      } catch (error) {
        // Continue to next endpoint
        continue;
      }
    }

    // All endpoints failed
    return {
      name: 'Archivist',
      status: 'stopped',
      url: archivistUrl,
      lastChecked: new Date().toISOString(),
      error: 'Unable to reach Archivist at any health endpoint'
    };
  } catch (error) {
    return {
      name: 'Archivist',
      status: 'stopped',
      url: env.xyoArchivistUrl,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service unavailable'
    };
  }
}

/**
 * Check Diviner service status
 */
async function checkDivinerStatus(): Promise<ServiceStatus> {
  // Check if Diviner is disabled
  if (env.xyoDivinerDisabled) {
    return {
      name: 'Diviner',
      status: 'unknown',
      url: env.xyoDivinerUrl,
      lastChecked: new Date().toISOString(),
      error: 'Diviner is disabled (XYO_DIVINER_DISABLED=true)'
    };
  }

  try {
    const divinerUrl = env.xyoDivinerUrl;
    
    // Try root URL first (primary health check endpoint)
    // Local Diviner typically responds to root URL (/)
    const healthEndpoints = [
      `${divinerUrl}/`,
      `${divinerUrl}/health`,
      `${divinerUrl}/api`,
      divinerUrl
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const response = await axios.get(endpoint, {
          timeout: 3000,
          headers: {
            'x-api-key': env.xyoApiKey,
            'Accept': 'application/json'
          },
          validateStatus: () => true // Don't throw on any status code
        });

        // Any 2xx or 3xx response indicates the service is reachable
        if (response.status >= 200 && response.status < 400) {
          // Extract port from URL if available
          const urlObj = new URL(divinerUrl);
          const port = urlObj.port ? Number(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80);
          
          return {
            name: 'Diviner',
            status: 'running',
            url: divinerUrl,
            port: port !== 443 && port !== 80 ? port : undefined,
            lastChecked: new Date().toISOString()
          };
        }
      } catch (error) {
        // Continue to next endpoint
        continue;
      }
    }

    // All endpoints failed
    return {
      name: 'Diviner',
      status: 'stopped',
      url: divinerUrl,
      lastChecked: new Date().toISOString(),
      error: 'Unable to reach Diviner at any health endpoint'
    };
  } catch (error) {
    return {
      name: 'Diviner',
      status: 'stopped',
      url: env.xyoDivinerUrl,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service unavailable'
    };
  }
}

/**
 * @swagger
 * /api/server-status:
 *   get:
 *     summary: Get server status
 *     description: Get health status of all services (backend, web, mobile, archivist, diviner)
 *     tags: [Server Status]
 *     security:
 *       - configBearerAuth: []
 *     responses:
 *       200:
 *         description: Server status for all services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 services:
 *                   type: object
 *                   properties:
 *                     backend:
 *                       type: object
 *                     web:
 *                       type: object
 *                     mobile:
 *                       type: object
 *                     archivist:
 *                       type: object
 *                     diviner:
 *                       type: object
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/server-status - Get status of all services
router.get('/server-status', authenticateConfigToken, async (_req, res) => {
  try {
    const [backend, web, mobile, archivist, diviner] = await Promise.all([
      checkBackendStatus(),
      checkWebStatus(),
      checkMobileStatus(),
      checkArchivistStatus(),
      checkDivinerStatus()
    ]);

    return res.json({
      success: true,
      services: {
        backend,
        web,
        mobile,
        archivist,
        diviner
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to check server status:', error);
    return res.status(500).json({
      error: 'Failed to check server status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/server-status/:service - Get status of a specific service
router.get('/server-status/:service', authenticateConfigToken, async (req, res) => {
  try {
    const { service } = req.params;

    let status: ServiceStatus;

    switch (service) {
      case 'backend':
        status = await checkBackendStatus();
        break;
      case 'web':
        status = await checkWebStatus();
        break;
      case 'mobile':
        status = await checkMobileStatus();
        break;
      case 'archivist':
        status = await checkArchivistStatus();
        break;
      case 'diviner':
        status = await checkDivinerStatus();
        break;
      default:
        return res.status(400).json({
          error: 'Invalid service',
          message: 'Service must be one of: backend, web, mobile, archivist, diviner'
        });
    }

    return res.json({
      success: true,
      service: status
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to check service status:', error);
    return res.status(500).json({
      error: 'Failed to check service status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/xyo-services/verify - Verify connectivity to Archivist and Diviner
// This endpoint performs actual connectivity tests, not just health checks
router.get('/xyo-services/verify', authenticateConfigToken, async (_req, res) => {
  try {
    const results: {
      archivist: {
        configured: boolean;
        disabled: boolean;
        reachable: boolean;
        url: string;
        error?: string;
        details?: unknown;
      };
      diviner: {
        configured: boolean;
        disabled: boolean;
        reachable: boolean;
        url: string;
        error?: string;
        details?: unknown;
      };
    } = {
      archivist: {
        configured: !!env.xyoArchivistUrl,
        disabled: env.xyoArchivistDisabled,
        reachable: false,
        url: env.xyoArchivistUrl
      },
      diviner: {
        configured: !!env.xyoDivinerUrl,
        disabled: env.xyoDivinerDisabled,
        reachable: false,
        url: env.xyoDivinerUrl
      }
    };

    // Test Archivist connectivity
    if (!env.xyoArchivistDisabled && env.xyoArchivistUrl) {
      try {
        const testEndpoints = [
          `${env.xyoArchivistUrl}/`,
          `${env.xyoArchivistUrl}/api`,
          `${env.xyoArchivistUrl}/health`,
          env.xyoArchivistUrl
        ];

        for (const endpoint of testEndpoints) {
          try {
            const response = await axios.get(endpoint, {
              timeout: 5000,
              headers: {
                'x-api-key': env.xyoApiKey,
                'Accept': 'application/json'
              },
              validateStatus: () => true
            });

            if (response.status >= 200 && response.status < 400) {
              results.archivist.reachable = true;
              results.archivist.details = {
                endpoint,
                status: response.status,
                hasData: !!response.data
              };
              break;
            }
          } catch (error) {
            continue;
          }
        }

        if (!results.archivist.reachable) {
          results.archivist.error = 'Unable to reach Archivist at any endpoint';
        }
      } catch (error) {
        results.archivist.error = error instanceof Error ? error.message : String(error);
      }
    } else if (env.xyoArchivistDisabled) {
      results.archivist.error = 'Archivist is disabled via XYO_ARCHIVIST_DISABLED flag';
    } else {
      results.archivist.error = 'Archivist URL not configured';
    }

    // Test Diviner connectivity
    if (!env.xyoDivinerDisabled && env.xyoDivinerUrl) {
      try {
        const testEndpoints = [
          `${env.xyoDivinerUrl}/`,
          `${env.xyoDivinerUrl}/health`,
          `${env.xyoDivinerUrl}/api`,
          env.xyoDivinerUrl
        ];

        for (const endpoint of testEndpoints) {
          try {
            const response = await axios.get(endpoint, {
              timeout: 5000,
              headers: {
                'x-api-key': env.xyoApiKey,
                'Accept': 'application/json'
              },
              validateStatus: () => true
            });

            if (response.status >= 200 && response.status < 400) {
              results.diviner.reachable = true;
              results.diviner.details = {
                endpoint,
                status: response.status,
                hasData: !!response.data
              };
              break;
            }
          } catch (error) {
            continue;
          }
        }

        if (!results.diviner.reachable) {
          results.diviner.error = 'Unable to reach Diviner at any endpoint';
        }
      } catch (error) {
        results.diviner.error = error instanceof Error ? error.message : String(error);
      }
    } else if (env.xyoDivinerDisabled) {
      results.diviner.error = 'Diviner is disabled via XYO_DIVINER_DISABLED flag';
    } else {
      results.diviner.error = 'Diviner URL not configured';
    }

    return res.json({
      success: true,
      verification: results,
      summary: {
        archivist: results.archivist.reachable ? 'reachable' : 'unreachable',
        diviner: results.diviner.reachable ? 'reachable' : 'unreachable',
        allReachable: results.archivist.reachable && results.diviner.reachable
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to verify XYO services:', error);
    return res.status(500).json({
      error: 'Failed to verify XYO services',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;


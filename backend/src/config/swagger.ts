/**
 * Swagger/OpenAPI Configuration
 * Provides interactive API documentation
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../lib/env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ChainCheck API',
      version: '1.0.0',
      description: 'ChainCheck Delivery Verification API - Powered by XYO Network',
      contact: {
        name: 'ChainCheck Support',
        email: 'support@chaincheck.io'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: env.nodeEnv === 'production' 
          ? 'https://api.chaincheck.io' 
          : `http://localhost:${env.port}`,
        description: env.nodeEnv === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login endpoint'
        },
        configBearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/config-auth/login endpoint (for configuration access)'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            message: {
              type: 'string',
              description: 'Detailed error message'
            }
          }
        },
        Delivery: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique delivery identifier'
            },
            orderId: {
              type: 'string',
              description: 'Order identifier'
            },
            driverId: {
              type: 'string',
              description: 'Driver identifier'
            },
            recipientName: {
              type: 'string',
              description: 'Recipient name'
            },
            recipientPhone: {
              type: 'string',
              description: 'Recipient phone number'
            },
            deliveryAddress: {
              type: 'string',
              description: 'Delivery address'
            },
            destinationLat: {
              type: 'number',
              format: 'double',
              description: 'Destination latitude'
            },
            destinationLon: {
              type: 'number',
              format: 'double',
              description: 'Destination longitude'
            },
            proofHash: {
              type: 'string',
              nullable: true,
              description: 'XL1 transaction hash (proof hash)'
            },
            blockNumber: {
              type: 'integer',
              nullable: true,
              description: 'XL1 block number'
            },
            verifiedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Verification timestamp'
            },
            actualLat: {
              type: 'number',
              format: 'double',
              nullable: true,
              description: 'Actual delivery latitude'
            },
            actualLon: {
              type: 'number',
              format: 'double',
              nullable: true,
              description: 'Actual delivery longitude'
            },
            distanceFromDest: {
              type: 'number',
              format: 'double',
              nullable: true,
              description: 'Distance from destination in meters'
            },
            photoIpfsHash: {
              type: 'string',
              nullable: true,
              description: 'IPFS hash of delivery photo'
            },
            signatureIpfsHash: {
              type: 'string',
              nullable: true,
              description: 'IPFS hash of recipient signature'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'DISPUTED'],
              description: 'Delivery status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        LocationProofDetails: {
          type: 'object',
          properties: {
            proofHash: {
              type: 'string',
              description: 'XL1 transaction hash'
            },
            blockNumber: {
              type: 'integer',
              nullable: true,
              description: 'XL1 block number'
            },
            xl1TransactionHash: {
              type: 'string',
              nullable: true,
              description: 'XL1 transaction hash'
            },
            xl1BlockNumber: {
              type: 'integer',
              nullable: true,
              description: 'XL1 block number'
            },
            isXL1: {
              type: 'boolean',
              description: 'Whether this is an XL1 transaction'
            },
            isMocked: {
              type: 'boolean',
              description: 'Whether this is mock data'
            }
          }
        },
        ROIMetrics: {
          type: 'object',
          properties: {
            disputeReduction: {
              type: 'object',
              properties: {
                totalDisputes: { type: 'integer' },
                disputesWithProof: { type: 'integer' },
                disputesWithoutProof: { type: 'integer' },
                reductionPercent: { type: 'number' },
                estimatedCostSavings: { type: 'number' },
                avgDisputeResolutionTime: { type: 'number' },
                avgDisputeCost: { type: 'number' }
              }
            },
            fraudPrevention: {
              type: 'object',
              properties: {
                totalDeliveries: { type: 'integer' },
                verifiedDeliveries: { type: 'integer' },
                verificationRate: { type: 'number' },
                tamperDetections: { type: 'integer' },
                estimatedFraudPrevented: { type: 'number' }
              }
            },
            operationalEfficiency: {
              type: 'object',
              properties: {
                totalDeliveries: { type: 'integer' },
                verifiedDeliveries: { type: 'integer' },
                avgVerificationTime: { type: 'number' },
                customerServiceCallsReduced: { type: 'number' },
                timeSavedOnDisputes: { type: 'number' }
              }
            },
            financialSummary: {
              type: 'object',
              properties: {
                totalCostSavings: { type: 'number' },
                disputeCostSavings: { type: 'number' },
                fraudPreventionSavings: { type: 'number' },
                operationalEfficiencySavings: { type: 'number' },
                roi: { type: 'number' }
              }
            },
            period: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' },
                days: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Driver and configuration authentication endpoints'
      },
      {
        name: 'Deliveries',
        description: 'Delivery management and verification endpoints'
      },
      {
        name: 'Analytics',
        description: 'ROI and business metrics endpoints'
      },
      {
        name: 'Network',
        description: 'XYO Network statistics and witness nodes'
      },
      {
        name: 'Wallet',
        description: 'Wallet and mnemonic generation endpoints'
      },
      {
        name: 'Configuration',
        description: 'Application configuration management'
      },
      {
        name: 'Server Status',
        description: 'Server and service health check endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/index.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);


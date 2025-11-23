import { z } from 'zod';

/**
 * Validation schemas for request validation
 * Using Zod for type-safe runtime validation
 */

// ==================== Authentication Schemas ====================

/**
 * Login request schema
 */
export const loginSchema = z.object({
  driverId: z
    .string({ required_error: 'Driver ID is required' })
    .min(1, 'Driver ID cannot be empty')
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
});

/**
 * Logout request schema (no body required, but included for consistency)
 */
export const logoutSchema = z.object({}).optional();

// ==================== Delivery Verification Schemas ====================

/**
 * Delivery verification request schema
 * Validates location and timestamp for delivery verification
 */
export const deliveryVerificationSchema = z.object({
  // NFC fields are optional
  nfcRecord1: z.string().optional(),
  nfcSerialNumber: z.string().optional(),
  latitude: z
    .number({
      required_error: 'Latitude is required',
      invalid_type_error: 'Latitude must be a number'
    })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number({
      required_error: 'Longitude is required',
      invalid_type_error: 'Longitude must be a number'
    })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  timestamp: z
    .number({
      required_error: 'Timestamp is required',
      invalid_type_error: 'Timestamp must be a number'
    })
    .int('Timestamp must be an integer')
    .positive('Timestamp must be a positive number')
    .refine(
      (val) => {
        // Check if timestamp is within reasonable range (not too old, not too far in future)
        const now = Date.now();
        const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
        const oneYearFromNow = now + 365 * 24 * 60 * 60 * 1000;
        return val >= oneYearAgo && val <= oneYearFromNow;
      },
      {
        message: 'Timestamp must be within the last year and not more than a year in the future'
      }
    ),
  notes: z
    .string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable()
});

/**
 * Delivery ID parameter schema
 */
export const deliveryIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Delivery ID is required' })
    .uuid('Delivery ID must be a valid UUID')
});

/**
 * Proof hash parameter schema
 */
export const proofHashParamSchema = z.object({
  proofHash: z
    .string({ required_error: 'Proof hash is required' })
    .min(1, 'Proof hash cannot be empty')
    .regex(/^[a-f0-9]+$/i, 'Proof hash must be a valid hexadecimal string')
});

/**
 * Order ID parameter schema
 */
export const orderIdParamSchema = z.object({
  orderId: z
    .string({ required_error: 'Order ID is required' })
    .min(1, 'Order ID cannot be empty')
    .max(100, 'Order ID cannot exceed 100 characters')
});

// ==================== Signature Upload Schemas ====================

/**
 * Signature upload request schema
 * Accepts base64-encoded signature data
 */
export const signatureUploadSchema = z.object({
  signatureBase64: z
    .string({ required_error: 'Signature data is required' })
    .min(1, 'Signature data cannot be empty')
    .refine(
      (val) => {
        // Check if it's a valid base64 data URI
        const dataUriPattern = /^data:image\/(png|jpeg|jpg|webp);base64,/i;
        return dataUriPattern.test(val) || /^[A-Za-z0-9+/=]+$/.test(val);
      },
      {
        message: 'Signature must be a valid base64-encoded image or data URI'
      }
    )
});

// ==================== Query Parameter Schemas ====================

/**
 * Delivery list query schema
 * Optional driverId filter
 */
export const deliveryListQuerySchema = z.object({
  driverId: z
    .string()
    .min(1, 'Driver ID cannot be empty')
    .optional()
});

// ==================== Wallet Schemas ====================

/**
 * Mnemonic validation schema
 */
export const mnemonicSchema = z.object({
  mnemonic: z
    .string({ required_error: 'Mnemonic is required' })
    .min(1, 'Mnemonic cannot be empty')
    .refine(
      (val) => {
        // Check if it's a valid mnemonic (12 or 24 words)
        const words = val.trim().split(/\s+/);
        return words.length === 12 || words.length === 24;
      },
      {
        message: 'Mnemonic must be 12 or 24 words'
      }
    )
});

// ==================== Network Schemas ====================

/**
 * Node address parameter schema
 */
export const nodeAddressParamSchema = z.object({
  nodeAddress: z
    .string({ required_error: 'Node address is required' })
    .min(1, 'Node address cannot be empty')
    .regex(/^0x[a-f0-9]+$/i, 'Node address must be a valid hexadecimal address starting with 0x')
});

/**
 * Network nodes query schema
 */
export const networkNodesQuerySchema = z.object({
  type: z.enum(['sentinel', 'bridge', 'diviner']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  minLat: z.coerce.number().min(-90).max(90).optional(),
  maxLat: z.coerce.number().min(-90).max(90).optional(),
  minLon: z.coerce.number().min(-180).max(180).optional(),
  maxLon: z.coerce.number().min(-180).max(180).optional()
});

// ==================== Type Exports ====================

export type LoginRequest = z.infer<typeof loginSchema>;
export type DeliveryVerificationRequest = z.infer<typeof deliveryVerificationSchema>;
export type SignatureUploadRequest = z.infer<typeof signatureUploadSchema>;
export type DeliveryListQuery = z.infer<typeof deliveryListQuerySchema>;
export type MnemonicRequest = z.infer<typeof mnemonicSchema>;


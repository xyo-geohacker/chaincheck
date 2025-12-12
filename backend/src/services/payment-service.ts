/**
 * @deprecated This service has been replaced by EthereumPaymentService.
 * 
 * This file is kept for backward compatibility but should not be used for new implementations.
 * Use `ethereum-payment-service.ts` instead, which supports Ethereum payments with proper
 * smart contract capabilities.
 * 
 * The old XL1 payment implementation was removed because:
 * - XL1 is designed for proof-of-location, not payments
 * - Ethereum has mature smart contract support
 * - Ethereum has better tooling and ecosystem for financial transactions
 * 
 * Migration: Replace `PaymentService` imports with `EthereumPaymentService`
 */

export { EthereumPaymentService as PaymentService } from './ethereum-payment-service.js';
export type { PaymentResult } from './ethereum-payment-service.js';

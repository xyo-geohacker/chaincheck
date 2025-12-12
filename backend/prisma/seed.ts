import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Helper function to hash password with SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  try {
    await prisma.delivery.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.configurationUser.deleteMany();

    // ⚠️ WARNING: Development-only default passwords
    // These passwords are for development/testing purposes only.
    // In production, users should set their own secure passwords.
    // DO NOT use these default passwords in production environments.
    
    // Create drivers with default password "Password1"
    const defaultPassword = 'Password1';
    const passwordHash = hashPassword(defaultPassword);

    // Extract unique driver IDs from deliveries
    const driverIds = ['vbuterin', 'snakamoto', 'msaylor', 'barmstrong', 'czhao'];

    await prisma.driver.createMany({
      data: driverIds.map((driverId) => ({
        driverId,
        passwordHash
      }))
    });

    // eslint-disable-next-line no-console
    console.log(`Created ${driverIds.length} drivers with default password "${defaultPassword}"`);

    // Create configuration admin user
    // ⚠️ WARNING: Default admin credentials are for development only
    // Username: "admin", Password: "admin"
    // Change these credentials immediately in production environments.
    const adminPassword = 'admin';
    const adminPasswordHash = hashPassword(adminPassword);
    
    await prisma.configurationUser.upsert({
      where: { username: 'admin' },
      update: {
        passwordHash: adminPasswordHash
      },
      create: {
        username: 'admin',
        passwordHash: adminPasswordHash
      }
    });

    // eslint-disable-next-line no-console
    console.log(`Created configuration admin user with username "admin" and password "admin"`);

    // Sample Ethereum wallet addresses for payment-on-verification feature demonstration
    // These are example Ethereum addresses that can be used to test automatic payment release
    // when deliveries are verified. In production, these would be real Ethereum wallet addresses.
    // 
    // Payment flow:
    // 1. Order created with buyer/seller Ethereum wallet addresses and payment amount (ETH)
    // 2. Delivery verified with location proof on XL1 blockchain
    // 3. Payment automatically transferred from buyer to seller Ethereum wallet via Ethereum blockchain
    const sampleBuyerWallets = [
      '0x1234567890abcdef1234567890abcdef12345678', // Buyer 1 (Ethereum address)
      '0xabcdef1234567890abcdef1234567890abcdef12', // Buyer 2 (Ethereum address)
      '0x9876543210fedcba9876543210fedcba98765432', // Buyer 3 (Ethereum address)
      '0xfedcba0987654321fedcba0987654321fedcba09', // Buyer 4 (Ethereum address)
      '0x1111111111111111111111111111111111111111', // Buyer 5 (Ethereum address)
      '0x2222222222222222222222222222222222222222', // Buyer 6 (Ethereum address)
      '0x3333333333333333333333333333333333333333', // Buyer 7 (Ethereum address)
      '0x4444444444444444444444444444444444444444', // Buyer 8 (Ethereum address)
      '0x5555555555555555555555555555555555555555', // Buyer 9 (Ethereum address)
      '0x6666666666666666666666666666666666666666', // Buyer 10 (Ethereum address)
      '0x9dea5f19cf5e1cd5e38ebaf1e02f0d2f41788cef', // Buyer 11 (Ethereum address)
    ];

    const sampleSellerWallets = [
      '0xSeller1Address1234567890abcdef1234567890', // Seller 1 (Ethereum address)
      '0xSeller2Addressabcdef1234567890abcdef1234', // Seller 2 (Ethereum address)
      '0xSeller3Address9876543210fedcba9876543210', // Seller 3 (Ethereum address)
      '0xSeller4Addressfedcba0987654321fedcba0987', // Seller 4 (Ethereum address)
      '0xSeller5Address11111111111111111111111111', // Seller 5 (Ethereum address)
      '0xSeller6Address22222222222222222222222222', // Seller 6 (Ethereum address)
      '0xSeller7Address33333333333333333333333333', // Seller 7 (Ethereum address)
      '0xSeller8Address44444444444444444444444444', // Seller 8 (Ethereum address)
      '0xSeller9Address55555555555555555555555555', // Seller 9 (Ethereum address)
      '0xSeller10Address6666666666666666666666666', // Seller 10 (Ethereum address)
      '0xceac5ca9aa5c4f4c0a1170579878d411c15abb25', // Seller 11 (Ethereum address)
    ];

    await prisma.delivery.createMany({
      data: [
        {
          orderId: 'ORD-1001',
          driverId: 'barmstrong',
          recipientName: 'Arie Trouw',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101 (XY Labs)',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'IN_TRANSIT',
          requiresPaymentOnDelivery: true, // Payment required on delivery verification
          paymentCurrency: 'ETH', // Payment will be made in ETH upon verification
          buyerWalletAddress: sampleBuyerWallets[0],
          sellerWalletAddress: sampleSellerWallets[0],
          paymentAmount: 0.00001,
          paymentStatus: 'PENDING'
        },
        {
          orderId: 'ORD-1002',
          driverId: 'vbuterin',
          recipientName: 'Markus Levin',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101 (XY Labs)',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'PENDING',
          requiresPaymentOnDelivery: false, // Payment not required - order already paid
          paymentCurrency: 'USD', // Order already paid in USD
          buyerWalletAddress: sampleBuyerWallets[1],
          sellerWalletAddress: sampleSellerWallets[1],
          paymentAmount: 1.5,
          paymentStatus: 'PAID'
        },
        {
          orderId: 'ORD-1003',
          driverId: 'czhao',
          recipientName: 'Maryann Cummings',
          recipientPhone: '555-1212',
          deliveryAddress: '350 5th Ave, New York, NY 10118 (Empire State Building)',
          destinationLat: 40.7484,
          destinationLon: -73.9857,
          status: 'IN_TRANSIT',
          requiresPaymentOnDelivery: true, // Payment required on delivery verification
          paymentCurrency: 'ETH', // Payment will be made in ETH upon verification
          buyerWalletAddress: sampleBuyerWallets[2],
          sellerWalletAddress: sampleSellerWallets[2],
          paymentAmount: 0.00001,
          paymentStatus: 'PENDING'
        },
        {
          orderId: 'ORD-1004',
          driverId: 'vbuterin',
          recipientName: 'Jordan Trouw',
          recipientPhone: '555-1212',
          deliveryAddress: 'Golden Gate Bridge, San Francisco, CA 94129',
          destinationLat: 37.8199,
          destinationLon: -122.4783,
          status: 'PENDING',
          requiresPaymentOnDelivery: false, // Payment not required - order already paid
          paymentCurrency: 'USD', // Order already paid in USD
          buyerWalletAddress: sampleBuyerWallets[3],
          sellerWalletAddress: sampleSellerWallets[3],
          paymentAmount: 1,
          paymentStatus: 'PAID'
        },
        {
          orderId: 'ORD-1005',
          driverId: 'snakamoto',
          recipientName: 'Christine Sako',
          recipientPhone: '555-1212',
          deliveryAddress: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France (Eiffel Tower)',
          destinationLat: 48.8584,
          destinationLon: 2.2945,
          status: 'FAILED',
          notes: 'Recipient unavailable; will retry next business day.',
          requiresPaymentOnDelivery: true, // Payment required on delivery verification
          paymentCurrency: 'ETH', // Payment will be made in ETH upon verification
          buyerWalletAddress: sampleBuyerWallets[4],
          sellerWalletAddress: sampleSellerWallets[4],
          paymentAmount: 0.00001,
          paymentStatus: 'PENDING'
        },
        {
          orderId: 'ORD-1006',
          driverId: 'msaylor',
          recipientName: 'John Arana',
          recipientPhone: '555-1212',
          deliveryAddress: 'Westminster, London SW1A 0AA, United Kingdom (Big Ben)',
          destinationLat: 51.4994,
          destinationLon: -0.1245,
          status: 'FAILED',
          notes: 'Recipient unavailable; will retry next business day.',
          requiresPaymentOnDelivery: false, // Payment not required - order already paid
          paymentCurrency: 'USD', // Order already paid in USD
          buyerWalletAddress: sampleBuyerWallets[5],
          sellerWalletAddress: sampleSellerWallets[5],
          paymentAmount: 1,
          paymentStatus: 'PAID'
        },
        {
          orderId: 'ORD-1007',
          driverId: 'vbuterin',
          recipientName: 'Joe Bader',
          recipientPhone: '555-1212',
          deliveryAddress: 'Liberty Island, New York, NY 10004 (Statue of Liberty)',
          destinationLat: 40.6892,
          destinationLon: -74.0445,
          status: 'DISPUTED',
          notes: 'Customer claims delivery was left at wrong location.',
          requiresPaymentOnDelivery: true, // Payment required on delivery verification
          paymentCurrency: 'ETH', // Payment will be made in ETH upon verification
          buyerWalletAddress: sampleBuyerWallets[6],
          sellerWalletAddress: sampleSellerWallets[6],
          paymentAmount: 0.00001,
          paymentStatus: 'PENDING'
        },
        {
          orderId: 'ORD-1008',
          driverId: 'msaylor',
          recipientName: 'Ryan Hansen',
          recipientPhone: '555-1212',
          deliveryAddress: '400 Broad St, Seattle, WA 98109 (Space Needle)',
          destinationLat: 47.6205,
          destinationLon: -122.3493,
          status: 'PENDING',
          requiresPaymentOnDelivery: false, // Payment not required - order already paid
          paymentCurrency: 'USD', // Order already paid in USD
          buyerWalletAddress: sampleBuyerWallets[7],
          sellerWalletAddress: sampleSellerWallets[7],
          paymentAmount: 1,
          paymentStatus: 'PAID'
        },
        {
          orderId: 'ORD-1009',
          driverId: 'snakamoto',
          recipientName: 'Joel Carter',
          recipientPhone: '555-1212',
          deliveryAddress: '2800 E Observatory Rd, Los Angeles, CA 90027 (Hollywood Sign)',
          destinationLat: 34.1341,
          destinationLon: -118.3216,
          status: 'IN_TRANSIT',
          requiresPaymentOnDelivery: true, // Payment required on delivery verification
          paymentCurrency: 'ETH', // Payment will be made in ETH upon verification
          buyerWalletAddress: sampleBuyerWallets[8],
          sellerWalletAddress: sampleSellerWallets[8],
          paymentAmount: 0.00001,
          paymentStatus: 'PENDING'
        },
        {
          orderId: 'ORD-1010',
          driverId: 'barmstrong',
          recipientName: 'Matt Jones',
          recipientPhone: '555-1212',
          deliveryAddress: '1600 Pennsylvania Avenue NW, Washington, DC 20500 (White House)',
          destinationLat: 38.8977,
          destinationLon: -77.0365,
          status: 'PENDING',
          requiresPaymentOnDelivery: false, // Payment not required - order already paid
          paymentCurrency: 'USD', // Order already paid in USD
          buyerWalletAddress: sampleBuyerWallets[9],
          sellerWalletAddress: sampleSellerWallets[9],
          paymentAmount: 1,
          paymentStatus: 'PAID'
        },
        {
          orderId: 'ORD-1011',
          driverId: 'czhao',
          recipientName: 'Timmay',
          recipientPhone: '555-1212',
          deliveryAddress: 'Times Square, New York, NY 10036',
          destinationLat: 40.7580,
          destinationLon: -73.9855,
          status: 'PENDING',
          requiresPaymentOnDelivery: true, // Payment required on delivery verification
          paymentCurrency: 'ETH', // Payment will be made in ETH upon verification
          buyerWalletAddress: sampleBuyerWallets[10],
          sellerWalletAddress: sampleSellerWallets[10],
          paymentAmount: 0.00001,
          paymentStatus: 'PENDING'
        },
      ]
    });

    // eslint-disable-next-line no-console
    console.log('Seed completed: sample deliveries created.');
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    throw error;
  });


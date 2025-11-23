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

    const now = new Date();

    await prisma.delivery.createMany({
      data: [
        {
          orderId: 'ORD-1001',
          driverId: 'barmstrong',
          recipientName: 'Arie Trouw',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'IN_TRANSIT'
        },
        {
          orderId: 'ORD-1002',
          driverId: 'vbuterin',
          recipientName: 'Markus Levin',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'PENDING'
        },
        {
          orderId: 'ORD-1003',
          driverId: 'czhao',
          recipientName: 'Maryann Cummings',
          recipientPhone: '555-1212',
          deliveryAddress: '30 Hunter Mill Way, Londonderry, NH 03053',
          destinationLat: 42.9396,
          destinationLon: -71.3683,
          status: 'IN_TRANSIT'
        },
        {
          orderId: 'ORD-1004',
          driverId: 'vbuterin',
          recipientName: 'Jordan Trouw',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'PENDING'
        },
        {
          orderId: 'ORD-1005',
          driverId: 'snakamoto',
          recipientName: 'Christine Sako',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'FAILED',
          notes: 'Recipient unavailable; will retry next business day.'
        },
        {
          orderId: 'ORD-1006',
          driverId: 'msaylor',
          recipientName: 'John Arana',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'FAILED',
          notes: 'Recipient unavailable; will retry next business day.'
        },
        {
          orderId: 'ORD-1007',
          driverId: 'vbuterin',
          recipientName: 'Joe Bader',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'DISPUTED',
          notes: 'Customer claims delivery was left at wrong location.'
        },
        {
          orderId: 'ORD-1008',
          driverId: 'msaylor',
          recipientName: 'Ryan Hansen',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'PENDING'
        },
        {
          orderId: 'ORD-1009',
          driverId: 'snakamoto',
          recipientName: 'Joel Carter',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'IN_TRANSIT'
        },
        {
          orderId: 'ORD-1010',
          driverId: 'barmstrong',
          recipientName: 'Matt Jones',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'PENDING'
        },
        {
          orderId: 'ORD-1011',
          driverId: 'czhao',
          recipientName: 'Timmay-CA',
          recipientPhone: '555-1212',
          deliveryAddress: '740 13th Street #224. San Diego, CA 92101',
          destinationLat: 32.7134,
          destinationLon: -117.1532,
          status: 'PENDING'
        },
        {
          orderId: 'ORD-1012',
          driverId: 'czhao',
          recipientName: 'Timmay-NH',
          recipientPhone: '555-1212',
          deliveryAddress: '30 Hunter Mill Way, Londonderry, NH 03053',
          destinationLat: 42.9396,
          destinationLon: -71.3683,
          status: 'PENDING'
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


import React from 'react';
import { render, screen } from '@testing-library/react';
import VerifyPage from '../page';
import * as api from '@lib/api';
import { notFound } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));

// Mock API functions
jest.mock('@lib/api', () => ({
  fetchDeliveryByProof: jest.fn(),
  fetchProofDetails: jest.fn()
}));

// Mock components
jest.mock('@components/ArchivistPayloadPanel', () => ({
  ArchivistPayloadPanel: ({ proofHash }: any) => (
    <div data-testid="archivist-panel">Archivist Panel: {proofHash}</div>
  )
}));

jest.mock('@components/CollapsibleSection', () => ({
  CollapsibleSection: ({ title, children }: any) => (
    <div data-testid="collapsible-section">
      <div>{title}</div>
      {children}
    </div>
  )
}));

jest.mock('@components/DeliveryMap', () => ({
  DeliveryMap: ({ destination }: any) => (
    <div data-testid="delivery-map">
      Map: {destination?.lat}, {destination?.lon}
    </div>
  )
}));

jest.mock('@components/DriverVerificationBadge', () => ({
  DriverVerificationBadge: ({ driverId }: any) => (
    <div data-testid="driver-badge">
      Driver: {driverId} Verified
    </div>
  )
}));

jest.mock('@components/ProofTimeline', () => ({
  ProofTimeline: ({ proofHash }: any) => (
    <div data-testid="proof-timeline">Timeline: {proofHash}</div>
  )
}));

jest.mock('@components/TamperDetectionPanel', () => ({
  TamperDetectionPanel: ({ proofHash }: any) => (
    <div data-testid="tamper-panel">Tamper: {proofHash}</div>
  )
}));

jest.mock('@components/VerificationCard', () => ({
  VerificationCard: ({ proofHash }: any) => (
    <div data-testid="verification-card">Verification: {proofHash}</div>
  )
}));

describe('VerifyPage', () => {
  const mockDelivery = {
    id: 'delivery-001',
    orderId: 'ORDER-001',
    driverId: 'driver-001',
    status: 'DELIVERED' as const,
    destination: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: '123 Main St'
    },
    actualLocation: {
      latitude: 37.7750,
      longitude: -122.4195
    },
    proofHash: 'test-proof-hash',
    boundWitnessData: {
      isXL1: true,
      isMocked: false,
      xl1TransactionHash: 'xl1-hash-123'
    }
  };

  const mockProof = {
    hash: 'test-proof-hash',
    data: [
      [
        {
          payload_hashes: ['hash1', 'hash2'],
          payload_schemas: ['schema1', 'schema2']
        },
        []
      ]
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(mockDelivery);
    (api.fetchProofDetails as jest.Mock).mockResolvedValue(mockProof);
  });

  it('should render verification page with delivery data', async () => {
    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    expect(screen.getByText('ORDER-001')).toBeTruthy();
  });

  it('should call notFound when delivery is not found', async () => {
    (api.fetchDeliveryByProof as jest.Mock).mockRejectedValue(new Error('Not found'));

    await expect(VerifyPage({ params: { proofHash: 'invalid-hash' } })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalled();
  });

  it('should call notFound when delivery is null', async () => {
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(null);

    await expect(VerifyPage({ params: { proofHash: 'test-proof-hash' } })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalled();
  });

  it('should render delivery map with destination', async () => {
    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    expect(screen.getByTestId('delivery-map')).toBeTruthy();
  });

  it('should render driver verification badge', async () => {
    const deliveryWithNFC = {
      ...mockDelivery,
      driverNfcVerified: true
    };
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(deliveryWithNFC);

    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    // Driver verification badge should be present when driverNfcVerified is true
    expect(screen.getByTestId('driver-badge')).toBeTruthy();
    expect(screen.getByText(/Verified/)).toBeTruthy();
  });

  it('should render verification card', async () => {
    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    expect(screen.getByTestId('verification-card')).toBeTruthy();
  });

  it('should render proof timeline', async () => {
    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    expect(screen.getByTestId('proof-timeline')).toBeTruthy();
  });

  it('should render tamper detection panel', async () => {
    const deliveryWithArchivist = {
      ...mockDelivery,
      proofHash: 'test-proof-hash',
      boundWitnessData: {
        ...mockDelivery.boundWitnessData,
        archivistResponse: {
          success: true,
          offChainPayload: { data: { test: 'data' } }
        }
      }
    };
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(deliveryWithArchivist);

    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    // Tamper detection panel should be present when archivistResponse exists
    expect(screen.getByTestId('tamper-panel')).toBeTruthy();
  });

  it('should render archivist payload panel', async () => {
    const deliveryWithArchivist = {
      ...mockDelivery,
      boundWitnessData: {
        ...mockDelivery.boundWitnessData,
        archivistResponse: {
          success: true,
          offChainPayload: { data: { test: 'data' } }
        }
      }
    };
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(deliveryWithArchivist);

    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    // Archivist payload panel should be present when archivistResponse exists
    expect(screen.getByTestId('archivist-panel')).toBeTruthy();
  });

  it('should handle missing proof details gracefully', async () => {
    (api.fetchProofDetails as jest.Mock).mockRejectedValue(new Error('No proof'));

    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    // Should still render the page
    expect(screen.getByText('ORDER-001')).toBeTruthy();
  });

  it('should extract bound witness from proof data', async () => {
    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    // Page should render successfully with bound witness data
    expect(screen.getByText('ORDER-001')).toBeTruthy();
  });

  it('should handle bound witness data with XL1 transaction', async () => {
    const deliveryWithXL1 = {
      ...mockDelivery,
      boundWitnessData: {
        isXL1: true,
        xl1TransactionHash: 'xl1-hash-123',
        isMocked: false
      }
    };
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(deliveryWithXL1);

    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    expect(screen.getByText('ORDER-001')).toBeTruthy();
  });

  it('should handle mocked bound witness data', async () => {
    const deliveryWithMock = {
      ...mockDelivery,
      boundWitnessData: {
        isXL1: false,
        isMocked: true
      }
    };
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(deliveryWithMock);

    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    expect(screen.getByText('ORDER-001')).toBeTruthy();
  });

  it('should handle delivery without actual location', async () => {
    const deliveryWithoutLocation = {
      ...mockDelivery,
      actualLocation: null
    };
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(deliveryWithoutLocation);

    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    expect(screen.getByTestId('delivery-map')).toBeTruthy();
  });

  it('should handle delivery without bound witness data', async () => {
    const deliveryWithoutBW = {
      ...mockDelivery,
      boundWitnessData: null
    };
    (api.fetchDeliveryByProof as jest.Mock).mockResolvedValue(deliveryWithoutBW);

    const page = await VerifyPage({ params: { proofHash: 'test-proof-hash' } });
    render(page);

    expect(screen.getByText('ORDER-001')).toBeTruthy();
  });
});


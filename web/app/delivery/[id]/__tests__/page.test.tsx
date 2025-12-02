import React from 'react';
import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import DeliveryPage from '../page';
import type { DeliveryRecord } from '@shared/types/delivery.types';
import { DeliveryStatus } from '@shared/types/delivery.types';
import { fetchDeliveryById } from '@lib/api';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })),
  usePathname: jest.fn(() => '/delivery/test-id'),
  useSearchParams: jest.fn(() => new URLSearchParams())
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock the API
jest.mock('@lib/api', () => ({
  fetchDeliveryById: jest.fn()
}));

// Mock DeliveryMap component
jest.mock('@components/DeliveryMap', () => ({
  DeliveryMap: ({ destination, actualLocation }: { destination: { lat: number; lon: number }; actualLocation?: { lat: number; lon: number } }) => (
    <div data-testid="delivery-map">
      <div data-testid="destination-lat">{destination.lat}</div>
      <div data-testid="destination-lon">{destination.lon}</div>
      {actualLocation && (
        <>
          <div data-testid="actual-lat">{actualLocation.lat}</div>
          <div data-testid="actual-lon">{actualLocation.lon}</div>
        </>
      )}
    </div>
  )
}));

// Mock ProofTimeline component
jest.mock('@components/ProofTimeline', () => ({
  ProofTimeline: ({ delivery, proofHash }: { delivery: DeliveryRecord; proofHash: string }) => (
    <div data-testid="proof-timeline">
      <div data-testid="proof-hash">{proofHash}</div>
      <div data-testid="delivery-order-id">{delivery.orderId}</div>
    </div>
  )
}));

const mockDelivery: DeliveryRecord = {
  id: 'test-delivery-id',
  orderId: 'TEST-ORDER-001',
  driverId: 'test-driver-001',
  recipientName: 'John Doe',
  recipientPhone: '555-0100',
  deliveryAddress: '123 Test Street, San Francisco, CA 94102',
  destinationLat: 37.7749,
  destinationLon: -122.4194,
  status: DeliveryStatus.DELIVERED,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  verifiedAt: new Date('2024-01-01T12:00:00Z'),
  proofHash: 'a'.repeat(64),
  actualLat: 37.7750,
  actualLon: -122.4195,
  distanceFromDest: 12.5,
  photoIpfsHash: 'QmPhotoHash123',
  signatureIpfsHash: 'QmSignatureHash123',
  notes: 'Left at front door',
  boundWitnessData: null
};

describe('Delivery Details Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render delivery details successfully', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByText('Delivery details for')).toBeInTheDocument();
    // Order ID appears multiple times, use getAllByText and check at least one exists
    expect(screen.getAllByText('TEST-ORDER-001').length).toBeGreaterThan(0);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('123 Test Street, San Francisco, CA 94102')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getByText('test-driver-001')).toBeInTheDocument();
  });

  it('should display delivery status', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    // Status appears multiple times, check that it exists
    expect(screen.getAllByText(/Delivered/i).length).toBeGreaterThan(0);
  });

  it('should display verification timestamp when available', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    const verifiedAtText = screen.getByText(/Verified At/i);
    expect(verifiedAtText).toBeInTheDocument();
    // Check that the timestamp is displayed (in the same div as the label)
    const verifiedContainer = verifiedAtText.closest('div');
    expect(verifiedContainer).toBeInTheDocument();
    // The timestamp should be in a dd element within the same div
    const timestampElement = verifiedContainer?.querySelector('dd');
    expect(timestampElement).toBeInTheDocument();
  });

  it('should display actual location when available', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByText(/Actual Location/i)).toBeInTheDocument();
    expect(screen.getByText(/37\.775000, -122\.419500/)).toBeInTheDocument();
  });

  it('should display distance from destination when available', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByText(/Distance from Destination/i)).toBeInTheDocument();
    expect(screen.getByText(/12\.50 meters/)).toBeInTheDocument();
  });

  it('should display notes when available', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Left at front door')).toBeInTheDocument();
  });

  it('should display map when destination coordinates are available', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByTestId('delivery-map')).toBeInTheDocument();
    expect(screen.getByTestId('destination-lat')).toHaveTextContent('37.7749');
    expect(screen.getByTestId('destination-lon')).toHaveTextContent('-122.4194');
  });

  it('should display actual location on map when available', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByTestId('actual-lat')).toHaveTextContent('37.775');
    expect(screen.getByTestId('actual-lon')).toHaveTextContent('-122.4195');
  });

  it('should display proof timeline when proof hash is available', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByTestId('proof-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('proof-hash')).toHaveTextContent('a'.repeat(64));
  });

  it('should use delivery ID as fallback proof hash when proofHash is not available', async () => {
    const deliveryWithoutProof = {
      ...mockDelivery,
      proofHash: null
    };
    (fetchDeliveryById as jest.Mock).mockResolvedValue(deliveryWithoutProof);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByTestId('proof-hash')).toHaveTextContent('test-delivery-id');
  });

  it('should display verification pending message when proof hash is not available', async () => {
    const deliveryWithoutProof = {
      ...mockDelivery,
      proofHash: null
    };
    (fetchDeliveryById as jest.Mock).mockResolvedValue(deliveryWithoutProof);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByText('Verification Pending')).toBeInTheDocument();
    expect(screen.getByText(/This delivery has not yet been verified/)).toBeInTheDocument();
  });

  it('should not display verification pending message when proof hash is available', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.queryByText('Verification Pending')).not.toBeInTheDocument();
  });

  it('should display message when destination coordinates are not available', async () => {
    const deliveryWithoutCoords = {
      ...mockDelivery,
      destinationLat: null,
      destinationLon: null
    };
    (fetchDeliveryById as jest.Mock).mockResolvedValue(deliveryWithoutCoords);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByText('Destination coordinates not available')).toBeInTheDocument();
    expect(screen.queryByTestId('delivery-map')).not.toBeInTheDocument();
  });

  it('should handle different delivery statuses', async () => {
    const statuses = [
      DeliveryStatus.PENDING,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.DELIVERED,
      DeliveryStatus.FAILED,
      DeliveryStatus.DISPUTED
    ];

    for (const status of statuses) {
      const delivery = { ...mockDelivery, status };
      (fetchDeliveryById as jest.Mock).mockResolvedValue(delivery);

      const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
      const { unmount } = render(page);

      const statusText = status.replace(/_/g, ' ');
      // Status may appear multiple times, use getAllByText
      const statusElements = screen.getAllByText(new RegExp(statusText, 'i'));
      expect(statusElements.length).toBeGreaterThan(0);

      unmount();
    }
  });

  it('should format created date correctly', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.getByText(/Created/i)).toBeInTheDocument();
    // The date should be formatted (exact format depends on locale)
    // The structure is: <div><p>Created</p><p>date</p></div>
    const createdLabel = screen.getByText(/Created/i);
    const createdContainer = createdLabel.closest('div');
    expect(createdContainer).toBeInTheDocument();
    // The date should be in the same container (as a sibling p element)
    const dateElement = createdContainer?.querySelector('p:last-of-type');
    expect(dateElement).toBeInTheDocument();
    expect(dateElement?.textContent).toBeTruthy();
    expect(dateElement?.textContent).not.toBe('N/A');
  });

  it('should display back to dashboard link', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(mockDelivery);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    const backLink = screen.getByText('← Back to Dashboard');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should call notFound when delivery is not found', async () => {
    (fetchDeliveryById as jest.Mock).mockResolvedValue(null);

    try {
      await DeliveryPage({ params: { id: 'non-existent-id' } });
    } catch {
      // notFound() throws, which is expected
    }

    expect(notFound).toHaveBeenCalled();
  });

  it('should call notFound when API throws error', async () => {
    (fetchDeliveryById as jest.Mock).mockRejectedValue(new Error('API error'));

    try {
      await DeliveryPage({ params: { id: 'test-delivery-id' } });
    } catch {
      // notFound() throws, which is expected
    }

    expect(notFound).toHaveBeenCalled();
  });

  it('should handle delivery without notes', async () => {
    const deliveryWithoutNotes = {
      ...mockDelivery,
      notes: null
    };
    (fetchDeliveryById as jest.Mock).mockResolvedValue(deliveryWithoutNotes);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('should handle delivery without actual location', async () => {
    const deliveryWithoutActual = {
      ...mockDelivery,
      actualLat: null,
      actualLon: null,
      distanceFromDest: null
    };
    (fetchDeliveryById as jest.Mock).mockResolvedValue(deliveryWithoutActual);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.queryByText(/Actual Location/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Distance from Destination/i)).not.toBeInTheDocument();
  });

  it('should handle delivery without verifiedAt timestamp', async () => {
    const deliveryWithoutVerified = {
      ...mockDelivery,
      verifiedAt: null
    };
    (fetchDeliveryById as jest.Mock).mockResolvedValue(deliveryWithoutVerified);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    expect(screen.queryByText(/Verified At/i)).not.toBeInTheDocument();
  });

  it('should wrap long notes text correctly', async () => {
    const longNotes = 'A'.repeat(200) + ' ' + 'B'.repeat(200);
    const deliveryWithLongNotes = {
      ...mockDelivery,
      notes: longNotes
    };
    (fetchDeliveryById as jest.Mock).mockResolvedValue(deliveryWithLongNotes);

    const page = await DeliveryPage({ params: { id: 'test-delivery-id' } });
    render(page);

    const notesElement = screen.getByText(longNotes);
    expect(notesElement).toBeInTheDocument();
    // Check that wrapping classes are applied
    expect(notesElement).toHaveClass('break-all', 'whitespace-pre-wrap', 'overflow-wrap-anywhere');
  });
});


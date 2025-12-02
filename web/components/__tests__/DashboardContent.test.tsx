import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardContent } from '../DashboardContent';
import type { DeliveryRecord } from '@shared/types/delivery.types';
import { DeliveryStatus } from '@shared/types/delivery.types';
import { fetchDeliveries } from '@lib/api';

// Mock the API
jest.mock('@lib/api', () => ({
  fetchDeliveries: jest.fn()
}));

// Mock DeliveryTable component
jest.mock('../DeliveryTable', () => ({
  DeliveryTable: ({ deliveries, initialStatusFilter }: { deliveries: DeliveryRecord[]; initialStatusFilter?: DeliveryStatus | 'all' }) => (
    <div data-testid="delivery-table">
      <div data-testid="delivery-count">{deliveries.length}</div>
      <div data-testid="status-filter">{initialStatusFilter || 'all'}</div>
    </div>
  )
}));

const mockDeliveries: DeliveryRecord[] = [
  {
    id: '1',
    orderId: 'ORD-001',
    driverId: 'driver-001',
    recipientName: 'John Doe',
    recipientPhone: '555-0100',
    deliveryAddress: '123 Main St',
    destinationLat: 37.7749,
    destinationLon: -122.4194,
    status: DeliveryStatus.DELIVERED,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    proofHash: 'abc123',
    verifiedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    orderId: 'ORD-002',
    driverId: 'driver-002',
    recipientName: 'Jane Smith',
    recipientPhone: '555-0200',
    deliveryAddress: '456 Oak Ave',
    destinationLat: 37.7849,
    destinationLon: -122.4094,
    status: DeliveryStatus.IN_TRANSIT,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: '3',
    orderId: 'ORD-003',
    driverId: 'driver-001',
    recipientName: 'Bob Johnson',
    recipientPhone: '555-0300',
    deliveryAddress: '789 Pine Rd',
    destinationLat: 37.7949,
    destinationLon: -122.3994,
    status: DeliveryStatus.PENDING,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  },
  {
    id: '4',
    orderId: 'ORD-004',
    driverId: 'driver-003',
    recipientName: 'Alice Williams',
    recipientPhone: '555-0400',
    deliveryAddress: '321 Elm St',
    destinationLat: 37.8049,
    destinationLon: -122.3894,
    status: DeliveryStatus.FAILED,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04')
  },
  {
    id: '5',
    orderId: 'ORD-005',
    driverId: 'driver-002',
    recipientName: 'Charlie Brown',
    recipientPhone: '555-0500',
    deliveryAddress: '654 Maple Ave',
    destinationLat: 37.8149,
    destinationLon: -122.3794,
    status: DeliveryStatus.DISPUTED,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  }
];

const mockMetrics = [
  {
    label: 'Total Deliveries',
    value: 5,
    description: 'All time',
    statusFilter: 'all' as const
  },
  {
    label: 'Verified Proofs',
    value: 1,
    description: '20.0% verification rate',
    statusFilter: DeliveryStatus.DELIVERED
  },
  {
    label: 'In Transit',
    value: 1,
    description: 'Active deliveries',
    statusFilter: DeliveryStatus.IN_TRANSIT
  },
  {
    label: 'Pending',
    value: 1,
    description: 'Awaiting pickup',
    statusFilter: DeliveryStatus.PENDING
  },
  {
    label: 'Failed',
    value: 1,
    description: 'Delivery attempts',
    statusFilter: DeliveryStatus.FAILED
  },
  {
    label: 'Disputes',
    value: 1,
    description: 'Requires attention',
    statusFilter: DeliveryStatus.DISPUTED
  }
];

describe('DashboardContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchDeliveries as jest.Mock).mockResolvedValue(mockDeliveries);
  });

  it('should render initial deliveries and metrics', () => {
    render(<DashboardContent deliveries={mockDeliveries} metrics={mockMetrics} />);

    expect(screen.getByText('All Deliveries')).toBeInTheDocument();
    expect(screen.getByText('5 records')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-count')).toHaveTextContent('5');
  });

  it('should render MetricsCards with provided metrics', () => {
    render(<DashboardContent deliveries={mockDeliveries} metrics={mockMetrics} />);

    expect(screen.getByText('Total Deliveries')).toBeInTheDocument();
    // Check for metric values within their specific cards
    const totalDeliveriesCard = screen.getByText('Total Deliveries').closest('button');
    expect(totalDeliveriesCard).toHaveTextContent('5');
    expect(screen.getByText('Verified Proofs')).toBeInTheDocument();
    const verifiedProofsCard = screen.getByText('Verified Proofs').closest('button');
    expect(verifiedProofsCard).toHaveTextContent('1');
  });

  it('should update status filter when metric is clicked', () => {
    render(<DashboardContent deliveries={mockDeliveries} metrics={mockMetrics} />);

    // Click on "Verified Proofs" metric
    const verifiedProofsButton = screen.getByText('Verified Proofs').closest('button');
    fireEvent.click(verifiedProofsButton!);

    // DeliveryTable should receive the updated status filter
    expect(screen.getByTestId('status-filter')).toHaveTextContent(DeliveryStatus.DELIVERED);
  });

  it('should update status filter to "all" when Total Deliveries is clicked', () => {
    render(<DashboardContent deliveries={mockDeliveries} metrics={mockMetrics} />);

    // Click on "Total Deliveries" metric
    const totalDeliveriesButton = screen.getByText('Total Deliveries').closest('button');
    fireEvent.click(totalDeliveriesButton!);

    // DeliveryTable should receive "all" as status filter
    expect(screen.getByTestId('status-filter')).toHaveTextContent('all');
  });

  it('should refresh deliveries when refresh button is clicked', async () => {
    const refreshedDeliveries = [
      ...mockDeliveries,
      {
        id: '6',
        orderId: 'ORD-006',
        driverId: 'driver-001',
        recipientName: 'New Delivery',
        recipientPhone: '555-0600',
        deliveryAddress: '999 New St',
        destinationLat: 37.8249,
        destinationLon: -122.3694,
        status: DeliveryStatus.DELIVERED,
        createdAt: new Date('2024-01-06'),
        updatedAt: new Date('2024-01-06'),
        proofHash: 'xyz789',
        verifiedAt: new Date('2024-01-06')
      }
    ];

    // Create a promise we can control
    let resolveRefresh: (value: DeliveryRecord[]) => void;
    const refreshPromise = new Promise<DeliveryRecord[]>((resolve) => {
      resolveRefresh = resolve;
    });

    (fetchDeliveries as jest.Mock).mockReturnValue(refreshPromise);

    render(<DashboardContent deliveries={mockDeliveries} metrics={mockMetrics} />);

    // Initial state
    expect(screen.getByTestId('delivery-count')).toHaveTextContent('5');

    // Click refresh button
    const refreshButton = screen.getByTitle('Refresh deliveries');
    fireEvent.click(refreshButton);

    // Button should show "Refreshing..." state
    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });

    // Resolve the promise
    resolveRefresh!(refreshedDeliveries);

    // Wait for refresh to complete
    await waitFor(() => {
      expect(fetchDeliveries).toHaveBeenCalledTimes(1);
    });

    // Button should return to normal state
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    // Delivery count should update
    await waitFor(() => {
      expect(screen.getByTestId('delivery-count')).toHaveTextContent('6');
    });
  });

  it('should handle refresh errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fetchDeliveries as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<DashboardContent deliveries={mockDeliveries} metrics={mockMetrics} />);

    const refreshButton = screen.getByTitle('Refresh deliveries');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetchDeliveries).toHaveBeenCalledTimes(1);
    });

    // Should log error but not crash
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh deliveries:', expect.any(Error));
    });

    // Button should return to normal state
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should disable refresh button while refreshing', async () => {
    // Create a promise that we can control
    let resolveRefresh: (value: DeliveryRecord[]) => void;
    const refreshPromise = new Promise<DeliveryRecord[]>((resolve) => {
      resolveRefresh = resolve;
    });

    (fetchDeliveries as jest.Mock).mockReturnValue(refreshPromise);

    render(<DashboardContent deliveries={mockDeliveries} metrics={mockMetrics} />);

    const refreshButton = screen.getByTitle('Refresh deliveries');
    fireEvent.click(refreshButton);

    // Button should be disabled and show "Refreshing..."
    expect(refreshButton).toBeDisabled();
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();

    // Resolve the promise
    resolveRefresh!(mockDeliveries);

    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled();
    });
  });

  it('should update metrics when deliveries are refreshed', async () => {
    const newDeliveries: DeliveryRecord[] = [
      {
        id: '1',
        orderId: 'ORD-001',
        driverId: 'driver-001',
        recipientName: 'John Doe',
        recipientPhone: '555-0100',
        deliveryAddress: '123 Main St',
        destinationLat: 37.7749,
        destinationLon: -122.4194,
        status: DeliveryStatus.DELIVERED,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        proofHash: 'abc123',
        verifiedAt: new Date('2024-01-01')
      },
      {
        id: '2',
        orderId: 'ORD-002',
        driverId: 'driver-002',
        recipientName: 'Jane Smith',
        recipientPhone: '555-0200',
        deliveryAddress: '456 Oak Ave',
        destinationLat: 37.7849,
        destinationLon: -122.4094,
        status: DeliveryStatus.DELIVERED,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        proofHash: 'def456',
        verifiedAt: new Date('2024-01-02')
      }
    ];

    (fetchDeliveries as jest.Mock).mockResolvedValue(newDeliveries);

    render(<DashboardContent deliveries={mockDeliveries} metrics={mockMetrics} />);

    // Initial metrics show 1 verified proof - check within the card
    const initialVerifiedProofsCard = screen.getByText('Verified Proofs').closest('button');
    expect(initialVerifiedProofsCard).toHaveTextContent('1');

    // Click refresh
    const refreshButton = screen.getByTitle('Refresh deliveries');
    fireEvent.click(refreshButton);

    // Wait for refresh to complete
    await waitFor(() => {
      expect(fetchDeliveries).toHaveBeenCalledTimes(1);
    });

    // Metrics should be recalculated (2 verified proofs now = 100% rate)
    await waitFor(() => {
      const verifiedProofsCard = screen.getByText('Verified Proofs').closest('button');
      expect(verifiedProofsCard).toHaveTextContent('2');
    });
  });

  it('should display correct record count', () => {
    const singleDelivery = [mockDeliveries[0]];
    render(<DashboardContent deliveries={singleDelivery} metrics={mockMetrics} />);

    expect(screen.getByText('1 records')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-count')).toHaveTextContent('1');
  });

  it('should handle empty deliveries array', () => {
    const emptyMetrics = [
      {
        label: 'Total Deliveries',
        value: 0,
        description: 'All time',
        statusFilter: 'all' as const
      }
    ];

    render(<DashboardContent deliveries={[]} metrics={emptyMetrics} />);

    expect(screen.getByText('0 records')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-count')).toHaveTextContent('0');
  });
});


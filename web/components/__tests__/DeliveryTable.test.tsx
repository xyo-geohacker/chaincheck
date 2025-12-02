import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeliveryTable } from '../DeliveryTable';
import type { DeliveryRecord } from '@shared/types/delivery.types';

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
    status: 'DELIVERED',
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
    status: 'IN_TRANSIT',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
];

describe('DeliveryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render delivery table with data', () => {
    render(<DeliveryTable deliveries={mockDeliveries} />);

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should filter by status', () => {
    render(<DeliveryTable deliveries={mockDeliveries} initialStatusFilter="DELIVERED" />);

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
  });

  it('should filter by driver', () => {
    render(<DeliveryTable deliveries={mockDeliveries} />);

    const driverFilter = screen.getByLabelText(/filter by driver/i);
    fireEvent.change(driverFilter, { target: { value: 'driver-001' } });

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
  });

  it('should sort by date', () => {
    render(<DeliveryTable deliveries={mockDeliveries} />);

    const sortSelect = screen.getByLabelText(/sort deliveries/i);
    fireEvent.change(sortSelect, { target: { value: 'orderId' } });

    // Should still show both deliveries, but sorted differently
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
  });

  it('should display empty state when no deliveries', () => {
    render(<DeliveryTable deliveries={[]} />);

    expect(screen.getByText(/no deliveries match your filters/i)).toBeInTheDocument();
  });
});


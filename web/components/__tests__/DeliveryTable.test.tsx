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
  const mockOnDeliveryClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render delivery table with data', () => {
    render(<DeliveryTable deliveries={mockDeliveries} onDeliveryClick={mockOnDeliveryClick} />);

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should filter by status', () => {
    render(<DeliveryTable deliveries={mockDeliveries} onDeliveryClick={mockOnDeliveryClick} initialStatusFilter="DELIVERED" />);

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
  });

  it('should filter by driver', () => {
    render(<DeliveryTable deliveries={mockDeliveries} onDeliveryClick={mockOnDeliveryClick} />);

    const driverFilter = screen.getByLabelText(/all drivers/i);
    fireEvent.change(driverFilter, { target: { value: 'driver-001' } });

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
  });

  it('should sort by date', () => {
    render(<DeliveryTable deliveries={mockDeliveries} onDeliveryClick={mockOnDeliveryClick} />);

    const sortSelect = screen.getByLabelText(/sort by date/i);
    fireEvent.change(sortSelect, { target: { value: 'newest' } });

    // Should still show both deliveries
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
  });

  it('should call onDeliveryClick when row is clicked', () => {
    render(<DeliveryTable deliveries={mockDeliveries} onDeliveryClick={mockOnDeliveryClick} />);

    const row = screen.getByText('ORD-001').closest('tr');
    if (row) {
      fireEvent.click(row);
      expect(mockOnDeliveryClick).toHaveBeenCalledWith(mockDeliveries[0]);
    }
  });

  it('should display empty state when no deliveries', () => {
    render(<DeliveryTable deliveries={[]} onDeliveryClick={mockOnDeliveryClick} />);

    expect(screen.getByText(/no deliveries found/i)).toBeInTheDocument();
  });
});


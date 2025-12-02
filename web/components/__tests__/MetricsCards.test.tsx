import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricsCards } from '../MetricsCards';
import { DeliveryStatus } from '@shared/types/delivery.types';

const mockMetrics = [
  {
    label: 'Total Deliveries',
    value: 100,
    description: 'All time',
    statusFilter: 'all' as const
  },
  {
    label: 'Verified Proofs',
    value: 75,
    description: '75.0% verification rate',
    statusFilter: DeliveryStatus.DELIVERED
  },
  {
    label: 'In Transit',
    value: 15,
    description: 'Active deliveries',
    statusFilter: DeliveryStatus.IN_TRANSIT
  },
  {
    label: 'Pending',
    value: 5,
    description: 'Awaiting pickup',
    statusFilter: DeliveryStatus.PENDING
  },
  {
    label: 'Failed',
    value: 3,
    description: 'Delivery attempts',
    statusFilter: DeliveryStatus.FAILED
  },
  {
    label: 'Disputes',
    value: 2,
    description: 'Requires attention',
    statusFilter: DeliveryStatus.DISPUTED
  }
];

describe('MetricsCards', () => {
  const mockOnMetricClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all metrics', () => {
    render(<MetricsCards metrics={mockMetrics} onMetricClick={mockOnMetricClick} />);

    expect(screen.getByText('Total Deliveries')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Verified Proofs')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('should render metric descriptions when provided', () => {
    render(<MetricsCards metrics={mockMetrics} onMetricClick={mockOnMetricClick} />);

    expect(screen.getByText('All time')).toBeInTheDocument();
    expect(screen.getByText('75.0% verification rate')).toBeInTheDocument();
    expect(screen.getByText('Active deliveries')).toBeInTheDocument();
  });

  it('should call onMetricClick with correct statusFilter when metric is clicked', () => {
    render(<MetricsCards metrics={mockMetrics} onMetricClick={mockOnMetricClick} />);

    const totalDeliveriesButton = screen.getByText('Total Deliveries').closest('button');
    fireEvent.click(totalDeliveriesButton!);

    expect(mockOnMetricClick).toHaveBeenCalledWith('all');
    expect(mockOnMetricClick).toHaveBeenCalledTimes(1);
  });

  it('should call onMetricClick with DELIVERED status when Verified Proofs is clicked', () => {
    render(<MetricsCards metrics={mockMetrics} onMetricClick={mockOnMetricClick} />);

    const verifiedProofsButton = screen.getByText('Verified Proofs').closest('button');
    fireEvent.click(verifiedProofsButton!);

    expect(mockOnMetricClick).toHaveBeenCalledWith(DeliveryStatus.DELIVERED);
  });

  it('should call onMetricClick with IN_TRANSIT status when In Transit is clicked', () => {
    render(<MetricsCards metrics={mockMetrics} onMetricClick={mockOnMetricClick} />);

    const inTransitButton = screen.getByText('In Transit').closest('button');
    fireEvent.click(inTransitButton!);

    expect(mockOnMetricClick).toHaveBeenCalledWith(DeliveryStatus.IN_TRANSIT);
  });

  it('should use "all" as default statusFilter when statusFilter is undefined', () => {
    const metricsWithoutFilter = [
      {
        label: 'Custom Metric',
        value: 42,
        description: 'Test description'
        // statusFilter is undefined
      }
    ];

    render(<MetricsCards metrics={metricsWithoutFilter} onMetricClick={mockOnMetricClick} />);

    const customButton = screen.getByText('Custom Metric').closest('button');
    fireEvent.click(customButton!);

    expect(mockOnMetricClick).toHaveBeenCalledWith('all');
  });

  it('should render metrics without descriptions', () => {
    const metricsWithoutDescriptions = [
      {
        label: 'Metric Without Description',
        value: 10,
        statusFilter: 'all' as const
      }
    ];

    render(<MetricsCards metrics={metricsWithoutDescriptions} onMetricClick={mockOnMetricClick} />);

    expect(screen.getByText('Metric Without Description')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    // Description should not be rendered
    expect(screen.queryByText('All time')).not.toBeInTheDocument();
  });

  it('should render all metric buttons as clickable', () => {
    render(<MetricsCards metrics={mockMetrics} onMetricClick={mockOnMetricClick} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(mockMetrics.length);

    // All buttons should have type="button"
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});


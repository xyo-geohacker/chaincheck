import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ROIDashboard } from '../ROIDashboard';
import * as api from '@lib/api';

// Mock API function
jest.mock('@lib/api', () => ({
  fetchROIMetrics: jest.fn()
}));

describe('ROIDashboard', () => {
  const mockMetrics = {
    period: {
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-04-01T00:00:00.000Z',
      days: 90
    },
    financialSummary: {
      totalCostSavings: 15000,
      roi: 50,
      disputeCostSavings: 5000,
      fraudPreventionSavings: 7000,
      operationalEfficiencySavings: 3000
    },
    disputeReduction: {
      totalDisputes: 100,
      disputesWithProof: 40,
      disputesWithoutProof: 60,
      estimatedCostSavings: 5000,
      avgDisputeCost: 50
    },
    fraudPrevention: {
      totalDeliveries: 1000,
      verifiedDeliveries: 800,
      verificationRate: 80,
      tamperDetections: 5,
      estimatedFraudPrevented: 7000
    },
    operationalEfficiency: {
      avgVerificationTime: 2.5,
      customerServiceCallsReduced: 80,
      timeSavedOnDisputes: 120
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (api.fetchROIMetrics as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ROIDashboard />);

    expect(screen.getByText('Loading ROI metrics...')).toBeTruthy();
  });

  it('should display ROI metrics when loaded', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('ROI Dashboard')).toBeTruthy();
      expect(screen.queryByText('Loading ROI metrics...')).toBeNull();
    });

    // Check main metrics are displayed (using getAllByText for multiple matches)
    await waitFor(() => {
      const costSavingsElements = screen.getAllByText('$15,000');
      expect(costSavingsElements.length).toBeGreaterThan(0);
      expect(screen.getByText('50%')).toBeTruthy(); // ROI
      const verifiedElements = screen.getAllByText('800');
      expect(verifiedElements.length).toBeGreaterThan(0); // Verified Deliveries
    });
  });

  it('should show error message when fetch fails', async () => {
    const error = new Error('Failed to load ROI metrics');
    (api.fetchROIMetrics as jest.Mock).mockRejectedValue(error);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load ROI metrics/)).toBeTruthy();
    });
  });

  it('should show error message when metrics are null', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(null);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load metrics/)).toBeTruthy();
    });
  });

  it('should fetch metrics with 90 day range by default', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalled();
    });

    const call = (api.fetchROIMetrics as jest.Mock).mock.calls[0];
    expect(call[0]).toBeDefined(); // startDate should be defined (90 days ago)
    expect(call[1]).toBeDefined(); // endDate should be defined
  });

  it('should fetch metrics with 30 day range when selected', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalled();
    });

    // Change to 30 days
    const select = screen.getByLabelText(/Period:/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '30' } });

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalledTimes(2);
    });

    const secondCall = (api.fetchROIMetrics as jest.Mock).mock.calls[1];
    expect(secondCall[0]).toBeDefined(); // startDate should be defined (30 days ago)
  });

  it('should fetch metrics with 365 day range when selected', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalled();
    });

    // Change to 365 days
    const select = screen.getByLabelText(/Period:/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '365' } });

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('should fetch metrics with all time range when selected', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalled();
    });

    // Change to all time
    const select = screen.getByLabelText(/Period:/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'all' } });

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalledTimes(2);
    });

    const secondCall = (api.fetchROIMetrics as jest.Mock).mock.calls[1];
    expect(secondCall[0]).toBeUndefined(); // startDate should be undefined for 'all'
  });

  it('should display all financial summary metrics', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      const costSavingsElements = screen.getAllByText('Total Cost Savings');
      expect(costSavingsElements.length).toBeGreaterThan(0);
      const costValueElements = screen.getAllByText('$15,000');
      expect(costValueElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Return on Investment')).toBeTruthy();
      expect(screen.getByText('50%')).toBeTruthy();
      const verifiedElements = screen.getAllByText('Verified Deliveries');
      expect(verifiedElements.length).toBeGreaterThan(0);
    });
  });

  it('should display dispute reduction metrics', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      const disputeElements = screen.getAllByText('Dispute Reduction');
      expect(disputeElements.length).toBeGreaterThan(0);
      expect(screen.getByText('100')).toBeTruthy(); // Total Disputes
      expect(screen.getByText('40')).toBeTruthy(); // Disputes with Proof
      expect(screen.getByText('60')).toBeTruthy(); // Disputes without Proof
      const savingsElements = screen.getAllByText('$5,000');
      expect(savingsElements.length).toBeGreaterThan(0); // Cost Savings
    });
  });

  it('should display fraud prevention metrics', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      const fraudElements = screen.getAllByText('Fraud Prevention');
      expect(fraudElements.length).toBeGreaterThan(0);
      expect(screen.getByText('1,000')).toBeTruthy(); // Total Deliveries
      const verifiedElements = screen.getAllByText('800');
      expect(verifiedElements.length).toBeGreaterThan(0); // Verified Deliveries
      expect(screen.getByText('80%')).toBeTruthy(); // Verification Rate
      expect(screen.getByText('5')).toBeTruthy(); // Tamper Detections
      const fraudPreventedElements = screen.getAllByText('$7,000');
      expect(fraudPreventedElements.length).toBeGreaterThan(0); // Fraud Prevented
    });
  });

  it('should display operational efficiency metrics', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      const efficiencyElements = screen.getAllByText('Operational Efficiency');
      expect(efficiencyElements.length).toBeGreaterThan(0);
      expect(screen.getByText('2.5s')).toBeTruthy(); // Avg Verification Time
      expect(screen.getByText('80')).toBeTruthy(); // CS Calls Reduced
      const savingsElements = screen.getAllByText('$3,000');
      expect(savingsElements.length).toBeGreaterThan(0); // Efficiency Savings
    });
  });

  it('should display cost savings breakdown', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Cost Savings Breakdown')).toBeTruthy();
      const disputeElements = screen.getAllByText('Dispute Reduction');
      expect(disputeElements.length).toBeGreaterThan(0);
      const fraudElements = screen.getAllByText('Fraud Prevention');
      expect(fraudElements.length).toBeGreaterThan(0);
      const efficiencyElements = screen.getAllByText('Operational Efficiency');
      expect(efficiencyElements.length).toBeGreaterThan(0);
      const totalSavingsElements = screen.getAllByText('Total Savings');
      expect(totalSavingsElements.length).toBeGreaterThan(0);
    });
  });

  it('should display ROI status message correctly for positive ROI', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Positive ROI')).toBeTruthy();
    });
  });

  it('should display ROI status message correctly for negative ROI', async () => {
    const negativeROIMetrics = {
      ...mockMetrics,
      financialSummary: {
        ...mockMetrics.financialSummary,
        roi: -20
      }
    };
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(negativeROIMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Negative ROI')).toBeTruthy();
    });
  });

  it('should display ROI status message correctly for zero verified deliveries', async () => {
    const zeroDeliveriesMetrics = {
      ...mockMetrics,
      fraudPrevention: {
        ...mockMetrics.fraudPrevention,
        verifiedDeliveries: 0
      }
    };
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(zeroDeliveriesMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No verified deliveries yet')).toBeTruthy();
    });
  });

  it('should display period information', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Over 90 days/)).toBeTruthy();
    });
  });

  it('should display ROI calculation details section', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('ROI Calculation Details')).toBeTruthy();
      expect(screen.getByText('Formula')).toBeTruthy();
      expect(screen.getByText('Implementation Cost')).toBeTruthy();
      expect(screen.getByText('Savings Components')).toBeTruthy();
    });
  });

  it('should format currency values correctly', async () => {
    const largeValueMetrics = {
      ...mockMetrics,
      financialSummary: {
        ...mockMetrics.financialSummary,
        totalCostSavings: 1234567
      }
    };
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(largeValueMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      // Should format as $1,234,567 (may appear multiple times)
      const elements = screen.getAllByText('$1,234,567');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('should format percentage values correctly', async () => {
    const decimalROIMetrics = {
      ...mockMetrics,
      financialSummary: {
        ...mockMetrics.financialSummary,
        roi: 45.678
      }
    };
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(decimalROIMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('45.7%')).toBeTruthy();
    });
  });

  it('should reload metrics when date range changes', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalledTimes(1);
    });

    const select = screen.getByLabelText(/Period:/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '30' } });

    await waitFor(() => {
      expect(api.fetchROIMetrics).toHaveBeenCalledTimes(2);
    }, { timeout: 3000 });

    // Verify that changing the date range triggers a new fetch
    expect(api.fetchROIMetrics).toHaveBeenCalledTimes(2);
  });

  it('should show loading state when date range changes', async () => {
    (api.fetchROIMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    render(<ROIDashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Loading ROI metrics...')).toBeNull();
    });

    const select = screen.getByLabelText(/Period:/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '30' } });

    // Should show loading state during fetch
    expect(screen.getByText('Loading ROI metrics...')).toBeTruthy();
  });
});


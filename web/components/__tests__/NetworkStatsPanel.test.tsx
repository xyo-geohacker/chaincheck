import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NetworkStatsPanel } from '../NetworkStatsPanel';
import * as api from '@lib/api';

// Mock API function
jest.mock('@lib/api', () => ({
  fetchNetworkStatistics: jest.fn()
}));

describe('NetworkStatsPanel', () => {
  const mockStats = {
    totalNodes: 100,
    activeNodes: 95,
    nodeTypes: {
      sentinel: 50,
      bridge: 30,
      diviner: 20
    },
    coverageArea: {
      totalKm2: 1000000,
      countries: 5
    },
    networkHealth: 'excellent' as const,
    lastUpdated: Date.now(),
    isMocked: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (api.fetchNetworkStatistics as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<NetworkStatsPanel />);

    expect(screen.getByText('Network Statistics')).toBeTruthy();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('should display network statistics when loaded', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeTruthy(); // Total nodes
      expect(screen.getByText('95')).toBeTruthy(); // Active nodes
    });

    expect(screen.getByText('50')).toBeTruthy(); // Sentinels
    expect(screen.getByText('30')).toBeTruthy(); // Bridges
    expect(screen.getByText('20')).toBeTruthy(); // Diviners
  });

  it('should show error message when fetch fails', async () => {
    const error = new Error('Failed to load');
    (api.fetchNetworkStatistics as jest.Mock).mockRejectedValue(error);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeTruthy();
    });
  });

  it('should show mock badge when isMocked is true', async () => {
    const mockedStats = { ...mockStats, isMocked: true };
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockedStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText('🧪 Mock')).toBeTruthy();
    });
  });

  it('should display network health badge', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Excellent')).toBeTruthy();
    });
  });

  it('should display different health colors for different health levels', async () => {
    const fairStats = { ...mockStats, networkHealth: 'fair' as const };
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(fairStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Fair')).toBeTruthy();
    });
  });

  it('should format coverage area for large values (millions)', async () => {
    const largeStats = {
      ...mockStats,
      coverageArea: { totalKm2: 2_500_000, countries: 10 }
    };
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(largeStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/2\.5M km²/)).toBeTruthy();
    });
  });

  it('should format coverage area for medium values (thousands)', async () => {
    const mediumStats = {
      ...mockStats,
      coverageArea: { totalKm2: 5000, countries: 2 }
    };
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mediumStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/5\.0K km²/)).toBeTruthy();
    });
  });

  it('should display delivery statistics when available', async () => {
    const statsWithDeliveries = {
      ...mockStats,
      deliveries: {
        total: 1000,
        verified: 950,
        uniqueDrivers: 50,
        uniqueLocations: 200
      }
    };
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(statsWithDeliveries);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Delivery Activity')).toBeTruthy();
      expect(screen.getByText('1,000')).toBeTruthy(); // Total deliveries
      expect(screen.getByText('950')).toBeTruthy(); // Verified
    });
  });

  it('should display data source info when not mocked', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Data Source/)).toBeTruthy();
    });
  });

  it('should not display data source info when mocked', async () => {
    const mockedStats = { ...mockStats, isMocked: true };
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockedStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.queryByText(/Data Source/)).toBeNull();
    });
  });

  it('should display last updated timestamp', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkStatsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeTruthy();
    });
  });
});


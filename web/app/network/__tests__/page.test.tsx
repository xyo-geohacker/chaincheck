import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NetworkPage from '../page';
import * as api from '@lib/api';

// Mock API function
jest.mock('@lib/api', () => ({
  fetchNetworkStatistics: jest.fn()
}));

// Mock components
jest.mock('@components/NetworkStatsPanel', () => ({
  NetworkStatsPanel: () => <div data-testid="network-stats-panel">Network Stats Panel</div>
}));

jest.mock('@components/WitnessNodeMap', () => ({
  WitnessNodeMap: ({ filters, isMocked }: any) => (
    <div data-testid="witness-node-map" data-mocked={isMocked}>
      Witness Node Map
      {filters.type && <span data-testid="filter-type">{filters.type}</span>}
      {filters.status && <span data-testid="filter-status">{filters.status}</span>}
    </div>
  )
}));

describe('NetworkPage', () => {
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

  it('should render network overview page', () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    expect(screen.getByText('XYO Network Overview')).toBeTruthy();
    expect(screen.getByText('Explore the decentralized network infrastructure')).toBeTruthy();
  });

  it('should render back to dashboard link', () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    const backLink = screen.getByText('← Back to Dashboard');
    expect(backLink).toBeTruthy();
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should render NetworkStatsPanel', () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    expect(screen.getByTestId('network-stats-panel')).toBeTruthy();
  });

  it('should render WitnessNodeMap', () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    expect(screen.getByTestId('witness-node-map')).toBeTruthy();
  });

  it('should load mock status on mount', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    await waitFor(() => {
      expect(api.fetchNetworkStatistics).toHaveBeenCalled();
    });
  });

  it('should set isMocked to false when stats are not mocked', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    await waitFor(() => {
      const map = screen.getByTestId('witness-node-map');
      expect(map).toHaveAttribute('data-mocked', 'false');
    });
  });

  it('should set isMocked to true when stats are mocked', async () => {
    const mockedStats = { ...mockStats, isMocked: true };
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockedStats);

    render(<NetworkPage />);

    await waitFor(() => {
      const map = screen.getByTestId('witness-node-map');
      expect(map).toHaveAttribute('data-mocked', 'true');
    });
  });

  it('should handle fetchNetworkStatistics error gracefully', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockRejectedValue(new Error('Failed'));

    render(<NetworkPage />);

    // Should still render the page
    expect(screen.getByText('XYO Network Overview')).toBeTruthy();
  });

  it('should filter by node type', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId('witness-node-map')).toBeTruthy();
    });

    const nodeTypeSelect = screen.getByLabelText(/Node Type:/i) as HTMLSelectElement;
    fireEvent.change(nodeTypeSelect, { target: { value: 'sentinel' } });

    await waitFor(() => {
      expect(screen.getByTestId('filter-type')).toHaveTextContent('sentinel');
    });
  });

  it('should filter by status', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId('witness-node-map')).toBeTruthy();
    });

    const statusSelect = screen.getByLabelText(/Status:/i) as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    await waitFor(() => {
      expect(screen.getByTestId('filter-status')).toHaveTextContent('active');
    });
  });

  it('should clear filters when "All Types" is selected', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId('witness-node-map')).toBeTruthy();
    });

    const nodeTypeSelect = screen.getByLabelText(/Node Type:/i) as HTMLSelectElement;
    fireEvent.change(nodeTypeSelect, { target: { value: 'sentinel' } });

    await waitFor(() => {
      expect(screen.getByTestId('filter-type')).toBeTruthy();
    });

    fireEvent.change(nodeTypeSelect, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByTestId('filter-type')).toBeNull();
    });
  });

  it('should display information about node types', () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    expect(screen.getByText('About XYO Network')).toBeTruthy();
    // Use getAllByText since these appear in both select options and h4 elements
    const sentinelsElements = screen.getAllByText('Sentinels');
    expect(sentinelsElements.length).toBeGreaterThan(0);
    const bridgesElements = screen.getAllByText('Bridges');
    expect(bridgesElements.length).toBeGreaterThan(0);
    const divinersElements = screen.getAllByText('Diviners');
    expect(divinersElements.length).toBeGreaterThan(0);
  });

  it('should combine multiple filters', async () => {
    (api.fetchNetworkStatistics as jest.Mock).mockResolvedValue(mockStats);

    render(<NetworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId('witness-node-map')).toBeTruthy();
    });

    const nodeTypeSelect = screen.getByLabelText(/Node Type:/i) as HTMLSelectElement;
    const statusSelect = screen.getByLabelText(/Status:/i) as HTMLSelectElement;

    fireEvent.change(nodeTypeSelect, { target: { value: 'bridge' } });
    fireEvent.change(statusSelect, { target: { value: 'inactive' } });

    await waitFor(() => {
      expect(screen.getByTestId('filter-type')).toHaveTextContent('bridge');
      expect(screen.getByTestId('filter-status')).toHaveTextContent('inactive');
    });
  });
});


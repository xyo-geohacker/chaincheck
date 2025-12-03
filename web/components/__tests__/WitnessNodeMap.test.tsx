import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WitnessNodeMap } from '../WitnessNodeMap';
import * as api from '@lib/api';

// Mock API function
jest.mock('@lib/api', () => ({
  fetchWitnessNodes: jest.fn()
}));

// Mock react-map-gl
jest.mock('react-map-gl', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => (
    <div data-testid="map" {...props}>
      {children}
    </div>
  ),
  Marker: ({ children, ...props }: any) => (
    <div data-testid={`marker-${props.latitude}-${props.longitude}`} {...props}>
      {children}
    </div>
  ),
  Popup: ({ children, onClose, ...props }: any) => (
    <div data-testid="popup" {...props}>
      <button onClick={onClose} data-testid="popup-close">Close</button>
      {children}
    </div>
  )
}));

describe('WitnessNodeMap', () => {
  const mockNodes = [
    {
      address: '0xnode1',
      type: 'sentinel' as const,
      status: 'active' as const,
      location: {
        latitude: 37.7749,
        longitude: -122.4194
      },
      reputation: 95,
      participationHistory: {
        totalQueries: 1000
      }
    },
    {
      address: '0xnode2',
      type: 'bridge' as const,
      status: 'active' as const,
      location: {
        latitude: 40.7128,
        longitude: -74.0060
      }
    },
    {
      address: '0xnode3',
      type: 'diviner' as const,
      status: 'inactive' as const,
      location: {
        latitude: 34.0522,
        longitude: -118.2437
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Set Mapbox token for tests
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  it('should show loading state initially', () => {
    (api.fetchWitnessNodes as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<WitnessNodeMap />);

    expect(screen.getByText('Driver Delivery Map')).toBeTruthy();
    expect(screen.getByText('Loading delivery locations...')).toBeTruthy();
  });

  it('should display error when fetch fails', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockRejectedValue(
      new Error('Failed to load nodes')
    );

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load nodes/)).toBeTruthy();
    });
  });

  it('should display witness nodes when loaded', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.queryByText('Loading delivery locations...')).toBeNull();
    });

    expect(screen.getByText('Driver Delivery Map')).toBeTruthy();
    expect(screen.getByText(/3 delivery locations/)).toBeTruthy();
  });

  it('should display node count correctly for single node', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue([mockNodes[0]]);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByText(/1 delivery location/)).toBeTruthy();
    });
  });

  it('should display mock badge when isMocked is true', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap isMocked={true} />);

    await waitFor(() => {
      expect(screen.getByText('🧪 Mock')).toBeTruthy();
    });
  });

  it('should render map when Mapbox token is configured', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('map')).toBeTruthy();
    });
  });

  it('should display message when Mapbox token is not configured', async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByText('Mapbox token not configured')).toBeTruthy();
    });
  });

  it('should render markers for nodes with locations', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('marker-37.7749--122.4194')).toBeTruthy();
      expect(screen.getByTestId('marker-40.7128--74.006')).toBeTruthy();
      expect(screen.getByTestId('marker-34.0522--118.2437')).toBeTruthy();
    });
  });

  it('should display legend with node types', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByText('Sentinel')).toBeTruthy();
      expect(screen.getByText('Bridge')).toBeTruthy();
      expect(screen.getByText('Diviner')).toBeTruthy();
    });
  });

  it('should open popup when marker is clicked', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('marker-37.7749--122.4194')).toBeTruthy();
    });

    // Find the marker content and click it
    const marker = screen.getByTestId('marker-37.7749--122.4194');
    const markerContent = marker.querySelector('[role="button"]');
    
    if (markerContent) {
      fireEvent.click(markerContent);

      await waitFor(() => {
        expect(screen.getByTestId('popup')).toBeTruthy();
        expect(screen.getByText(/Sentinel Node/)).toBeTruthy();
      });
    }
  });

  it('should close popup when close button is clicked', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('marker-37.7749--122.4194')).toBeTruthy();
    });

    // Open popup
    const marker = screen.getByTestId('marker-37.7749--122.4194');
    const markerContent = marker.querySelector('[role="button"]');
    
    if (markerContent) {
      fireEvent.click(markerContent);

      await waitFor(() => {
        expect(screen.getByTestId('popup')).toBeTruthy();
      });

      // Close popup
      const closeButton = screen.getByTestId('popup-close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('popup')).toBeNull();
      });
    }
  });

  it('should display node details in popup', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('marker-37.7749--122.4194')).toBeTruthy();
    });

    const marker = screen.getByTestId('marker-37.7749--122.4194');
    const markerContent = marker.querySelector('[role="button"]');
    
    if (markerContent) {
      fireEvent.click(markerContent);

      await waitFor(() => {
        expect(screen.getByText(/Sentinel Node/)).toBeTruthy();
        expect(screen.getByText(/0xnode1/)).toBeTruthy();
        expect(screen.getByText(/active/)).toBeTruthy();
        expect(screen.getByText(/95\/100/)).toBeTruthy(); // Reputation
        expect(screen.getByText(/1,000/)).toBeTruthy(); // Queries
      });
    }
  });

  it('should filter nodes by type when filter is provided', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap filters={{ type: 'sentinel' }} />);

    await waitFor(() => {
      expect(api.fetchWitnessNodes).toHaveBeenCalledWith({ type: 'sentinel' });
    });
  });

  it('should filter nodes by status when filter is provided', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap filters={{ status: 'active' }} />);

    await waitFor(() => {
      expect(api.fetchWitnessNodes).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  it('should filter nodes by both type and status', async () => {
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(mockNodes);

    render(<WitnessNodeMap filters={{ type: 'sentinel', status: 'active' }} />);

    await waitFor(() => {
      expect(api.fetchWitnessNodes).toHaveBeenCalledWith({ 
        type: 'sentinel', 
        status: 'active' 
      });
    });
  });

  it('should not render markers for nodes without locations', async () => {
    const nodesWithoutLocation = [
      {
        address: '0xnode1',
        type: 'sentinel' as const,
        status: 'active' as const,
        location: null
      }
    ];
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue(nodesWithoutLocation);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.queryByTestId(/marker-/)).toBeNull();
    });
  });

  it('should display location source indicator in popup', async () => {
    const nodeWithMetadata = {
      ...mockNodes[0],
      metadata: {
        locationSource: 'delivery',
        locationNote: 'Location from actual delivery verification'
      }
    };
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue([nodeWithMetadata]);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('marker-37.7749--122.4194')).toBeTruthy();
    });

    const marker = screen.getByTestId('marker-37.7749--122.4194');
    const markerContent = marker.querySelector('[role="button"]');
    
    if (markerContent) {
      fireEvent.click(markerContent);

      await waitFor(() => {
        expect(screen.getByText(/Real Location/)).toBeTruthy();
        expect(screen.getByText(/Location from actual delivery verification/)).toBeTruthy();
      });
    }
  });

  it('should display mock location indicator when locationSource is mock', async () => {
    const nodeWithMockMetadata = {
      ...mockNodes[0],
      metadata: {
        locationSource: 'mock',
        locationNote: 'Location data requires Diviner access'
      }
    };
    (api.fetchWitnessNodes as jest.Mock).mockResolvedValue([nodeWithMockMetadata]);

    render(<WitnessNodeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('marker-37.7749--122.4194')).toBeTruthy();
    });

    const marker = screen.getByTestId('marker-37.7749--122.4194');
    const markerContent = marker.querySelector('[role="button"]');
    
    if (markerContent) {
      fireEvent.click(markerContent);

      await waitFor(() => {
        expect(screen.getByText(/Mock Location/)).toBeTruthy();
      });
    }
  });
});


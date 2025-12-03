import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LocationAccuracyPanel } from '../LocationAccuracyPanel';
import * as api from '@lib/api';

// Mock API function
jest.mock('@lib/api', () => ({
  fetchLocationAccuracy: jest.fn()
}));

describe('LocationAccuracyPanel', () => {
  const mockAccuracy = {
    accuracyScore: 5.5,
    xyoNetworkAccuracy: 4.2,
    gpsAccuracy: 10.0,
    accuracyImprovement: 58.0,
    witnessNodeCount: 3,
    precisionRadius: 50,
    consensusAgreement: 95.5,
    nodeProximityScore: 88.2,
    confidenceLevel: 'high' as const,
    isMocked: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (api.fetchLocationAccuracy as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    expect(screen.getByText('XYO Location Accuracy')).toBeTruthy();
    expect(screen.getByText('Loading accuracy metrics...')).toBeTruthy();
  });

  it('should display accuracy data when loaded', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('±5.5m')).toBeTruthy();
      expect(screen.getByText(/precision/)).toBeTruthy();
    });
  });

  it('should show error message when fetch fails', async () => {
    const error = new Error('Failed to load');
    (api.fetchLocationAccuracy as jest.Mock).mockRejectedValue(error);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Error:|Failed to load accuracy data/)).toBeTruthy();
    });
  });

  it('should display mock badge when isMocked is true', async () => {
    const mockedAccuracy = { ...mockAccuracy, isMocked: true };
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockedAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('🧪 Mock')).toBeTruthy();
    });
  });

  it('should display confidence level badge', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('High Confidence')).toBeTruthy();
    });
  });

  it('should display different confidence levels', async () => {
    const mediumAccuracy = { ...mockAccuracy, confidenceLevel: 'medium' as const };
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mediumAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Medium Confidence')).toBeTruthy();
    });
  });

  it('should display accuracy metrics', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('GPS Accuracy (Typical)')).toBeTruthy();
      expect(screen.getByText(/±\s*10\s*m/i)).toBeTruthy();
      expect(screen.getByText('Actual Delivery Accuracy')).toBeTruthy();
      // Use getAllByText since "±4.2 m" appears in both the description and the metrics section
      const accuracyElements = screen.getAllByText(/±\s*4\.2\s*m/i);
      expect(accuracyElements.length).toBeGreaterThan(0);
    });
  });

  it('should display accuracy improvement when positive', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Better than Typical GPS')).toBeTruthy();
      expect(screen.getByText(/\+58\s*%/i)).toBeTruthy();
    });
  });

  it('should not display improvement when zero or negative', async () => {
    const noImprovementAccuracy = { ...mockAccuracy, accuracyImprovement: 0 };
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(noImprovementAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.queryByText('Better than Typical GPS')).toBeNull();
    });
  });

  it('should display witness node count', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Witness Nodes')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  it('should display precision radius', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Precision Radius')).toBeTruthy();
      expect(screen.getByText('±50m')).toBeTruthy();
    });
  });

  it('should display consensus agreement', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Consensus')).toBeTruthy();
      expect(screen.getByText('96%')).toBeTruthy(); // Rounded to 0 decimal places
    });
  });

  it('should display node proximity score', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Node Proximity')).toBeTruthy();
      expect(screen.getByText('88%')).toBeTruthy(); // Rounded to 0 decimal places
    });
  });

  it('should display XL1 verification badge when not mocked', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Cryptographically Verified on XL1 Blockchain/)).toBeTruthy();
    });
  });

  it('should not display XL1 verification badge when mocked', async () => {
    const mockedAccuracy = { ...mockAccuracy, isMocked: true };
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockedAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.queryByText(/Cryptographically Verified on XL1 Blockchain/)).toBeNull();
    });
  });

  it('should handle singular witness node count', async () => {
    const singleNodeAccuracy = { ...mockAccuracy, witnessNodeCount: 1 };
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(singleNodeAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/participant/)).toBeTruthy();
    });
  });

  it('should handle plural witness node count', async () => {
    (api.fetchLocationAccuracy as jest.Mock).mockResolvedValue(mockAccuracy);

    render(<LocationAccuracyPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/participants/)).toBeTruthy();
    });
  });

  it('should not fetch when proofHash is empty', () => {
    render(<LocationAccuracyPanel proofHash="" />);

    expect(api.fetchLocationAccuracy).not.toHaveBeenCalled();
  });
});


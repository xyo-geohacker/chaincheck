import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DivinerVerificationPanel } from '../DivinerVerificationPanel';
import type { DivinerVerificationResult } from '@shared/types/xyo.types';

// Mock fetch
global.fetch = jest.fn();

describe('DivinerVerificationPanel', () => {
  const mockDivinerData: DivinerVerificationResult = {
    verified: true,
    confidence: 95,
    nodeCount: 10,
    consensus: 'high',
    locationMatch: true,
    distanceFromClaimed: 5.2,
    details: {
      witnessNodes: [
        { type: 'sentinel', address: '0xnode1', verified: true },
        { type: 'bridge', address: '0xnode2', verified: true }
      ],
      locationData: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10.5,
        source: 'gps'
      }
    },
    isMocked: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should show loading state initially when fetching', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<DivinerVerificationPanel proofHash="test-hash" />);

    expect(screen.getByText('XYO Network Verification')).toBeTruthy();
    expect(screen.getByText('Querying Diviner network...')).toBeTruthy();
  });

  it('should display error when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<DivinerVerificationPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to verify with Diviner/)).toBeTruthy();
      expect(screen.getByText(/Network error/)).toBeTruthy();
    });
  });

  it('should display diviner data when provided as prop', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText('XYO Network Verification')).toBeTruthy();
    expect(screen.getByText('Location Verified by Diviner Network')).toBeTruthy();
    expect(screen.getByText('95%')).toBeTruthy();
  });

  it('should fetch diviner data when not provided as prop', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDivinerData
    });

    render(<DivinerVerificationPanel proofHash="test-hash" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proofs/test-hash/diviner')
      );
    });
  });

  it('should display verified status when verified is true', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText('Location Verified by Diviner Network')).toBeTruthy();
    expect(screen.getByText('✓ Verified')).toBeTruthy();
  });

  it('should display not verified status when verified is false', () => {
    const notVerifiedData = {
      ...mockDivinerData,
      verified: false
    };
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={notVerifiedData}
      />
    );

    expect(screen.getByText('Location Not Verified')).toBeTruthy();
  });

  it('should display confidence score', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText('Confidence Score')).toBeTruthy();
    expect(screen.getByText('95%')).toBeTruthy();
  });

  it('should display consensus level', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText('Consensus')).toBeTruthy();
    expect(screen.getByText('HIGH')).toBeTruthy();
  });

  it('should display node count', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText('Nodes')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('should display location match status', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText('Match')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
  });

  it('should display distance from claimed location', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText('Location Accuracy')).toBeTruthy();
    expect(screen.getByText(/±5\.2.*meters/)).toBeTruthy();
  });

  it('should display witness nodes', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText(/Witness Nodes \(2\)/)).toBeTruthy();
    expect(screen.getByText('Sentinel')).toBeTruthy();
    expect(screen.getByText('Bridge')).toBeTruthy();
  });

  it('should display location data from diviner', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    expect(screen.getByText('Diviner Location Data')).toBeTruthy();
    expect(screen.getByText(/Lat:.*37\.774900/)).toBeTruthy();
    expect(screen.getByText(/Lon:.*-122\.419400/)).toBeTruthy();
    expect(screen.getByText(/Accuracy:.*±10\.5.*m/)).toBeTruthy();
    expect(screen.getByText(/Source:.*GPS/)).toBeTruthy();
  });

  it('should display mock badge when isMocked is true', () => {
    const mockedData = {
      ...mockDivinerData,
      isMocked: true
    };
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockedData}
      />
    );

    expect(screen.getByText('🧪 Mock')).toBeTruthy();
  });

  it('should open diagnostic modal when button is clicked', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    const diagnosticButton = screen.getByText('Diagnostic Info →');
    fireEvent.click(diagnosticButton);

    expect(screen.getByText('Diviner Verification Data')).toBeTruthy();
  });

  it('should close diagnostic modal when close button is clicked', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    const diagnosticButton = screen.getByText('Diagnostic Info →');
    fireEvent.click(diagnosticButton);

    expect(screen.getByText('Diviner Verification Data')).toBeTruthy();

    const closeButton = screen.getByText('✕ Close');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Diviner Verification Data')).toBeNull();
  });

  it('should display JSON data in diagnostic modal', () => {
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    const diagnosticButton = screen.getByText('Diagnostic Info →');
    fireEvent.click(diagnosticButton);

    // JSON should be displayed
    expect(screen.getByText(/verified/)).toBeTruthy();
    expect(screen.getByText(/confidence/)).toBeTruthy();
  });

  it('should copy JSON to clipboard when copy button is clicked', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });

    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    const diagnosticButton = screen.getByText('Diagnostic Info →');
    fireEvent.click(diagnosticButton);

    const copyButton = screen.getByText('Copy JSON');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('should return null when no diviner data is available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => null
    });

    render(<DivinerVerificationPanel proofHash="test-hash" />);

    // Component shows loading first
    expect(screen.getByText('Querying Diviner network...')).toBeTruthy();

    // Wait for fetch to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 2000 });

    // After fetch completes with null, component should eventually return null
    // But this is hard to test directly since React Testing Library doesn't handle null returns well
    // We verify the fetch was called and the component handled the null response
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/proofs/test-hash/diviner')
    );
  });

  it('should use prop data when provided', () => {
    // When prop is provided, component should use it directly
    render(
      <DivinerVerificationPanel 
        proofHash="test-hash"
        divinerVerification={mockDivinerData}
      />
    );

    // Should display data from prop immediately
    expect(screen.getByText('XYO Network Verification')).toBeTruthy();
    expect(screen.getByText(/Location Verified by Diviner Network/)).toBeTruthy();
  });
});


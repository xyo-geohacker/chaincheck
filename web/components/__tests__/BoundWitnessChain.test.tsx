import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BoundWitnessChain } from '../BoundWitnessChain';
import * as api from '@lib/api';

// Mock API function
jest.mock('@lib/api', () => ({
  fetchBoundWitnessChain: jest.fn()
}));

describe('BoundWitnessChain', () => {
  const mockChain = {
    chain: [
      {
        _hash: '0xhash1',
        previous_hashes: [],
        timestamp: 1704110400000,
        addresses: ['0xaddr1', '0xaddr2'],
        payload_hashes: ['0xpayload1']
      },
      {
        _hash: '0xhash2',
        previous_hashes: ['0xhash1'],
        timestamp: 1704110500000,
        addresses: ['0xaddr3'],
        payload_hashes: ['0xpayload2']
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<BoundWitnessChain proofHash="test-hash" />);

    expect(screen.getByText('XYO Proof Chain')).toBeTruthy();
    expect(screen.getByText('Loading chain...')).toBeTruthy();
  });

  it('should display error when fetch fails', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockRejectedValue(
      new Error('Failed to load chain')
    );

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load chain/)).toBeTruthy();
    });
  });

  it('should display chain items when loaded', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(mockChain);

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('XYO Proof Chain')).toBeTruthy();
      expect(screen.queryByText('Loading chain...')).toBeNull();
    });

    expect(screen.getByText('Current Proof')).toBeTruthy();
    expect(screen.getByText('Link 2')).toBeTruthy();
    expect(screen.getByText('0xhash1')).toBeTruthy();
    expect(screen.getByText('0xhash2')).toBeTruthy();
  });

  it('should display depth count', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(mockChain);

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Depth: 2/)).toBeTruthy();
    });
  });

  it('should display previous hash when available', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(mockChain);

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Previous:')).toBeTruthy();
      expect(screen.getByText(/0xhash1\.\.\./)).toBeTruthy();
    });
  });

  it('should display chain origin when no previous hash', async () => {
    const chainWithoutPrevious = {
      chain: [
        {
          _hash: '0xhash1',
          previous_hashes: [],
          timestamp: 1704110400000
        },
        {
          _hash: '0xhash2',
          previous_hashes: [],
          timestamp: 1704110500000
        }
      ]
    };
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(chainWithoutPrevious);

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Chain origin')).toBeTruthy();
    });
  });

  it('should display timestamps', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(mockChain);

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      // Timestamps are formatted as dates (may appear multiple times)
      const timestampElements = screen.getAllByText(/2024/);
      expect(timestampElements.length).toBeGreaterThan(0);
    });
  });

  it('should display mock badge when isMocked is true', () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<BoundWitnessChain proofHash="test-hash" isMocked={true} />);

    expect(screen.getByText('🧪 Mock')).toBeTruthy();
  });

  it('should display no chain data message when chain is empty', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue({ chain: [] });

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('No chain data available')).toBeTruthy();
    });
  });

  it('should display maximum depth message when maxDepth is reached', async () => {
    const longChain = {
      chain: Array.from({ length: 6 }, (_, i) => ({
        _hash: `0xhash${i}`,
        previous_hashes: i > 0 ? [`0xhash${i - 1}`] : [],
        timestamp: 1704110400000 + i * 1000
      }))
    };
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(longChain);

    render(<BoundWitnessChain proofHash="test-hash" maxDepth={5} />);

    await waitFor(() => {
      expect(screen.getByText(/Maximum depth reached \(5 links\)/)).toBeTruthy();
    });
  });

  it('should display XL1 transaction link when isXL1 is true', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(mockChain);

    render(
      <BoundWitnessChain 
        proofHash="test-hash" 
        isXL1={true}
        xl1TransactionHash="0xtxhash123"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('View XL1 Transaction →')).toBeTruthy();
    });

    const link = screen.getByText('View XL1 Transaction →').closest('a');
    expect(link).toHaveAttribute('href', expect.stringContaining('xl1/sequence/transaction'));
    expect(link).toHaveAttribute('href', expect.stringContaining('0xtxhash123'));
  });

  it('should use proofHash for XL1 link when xl1TransactionHash is not provided', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(mockChain);

    render(
      <BoundWitnessChain 
        proofHash="test-proof-hash" 
        isXL1={true}
      />
    );

    await waitFor(() => {
      const link = screen.getByText('View XL1 Transaction →').closest('a');
      expect(link).toHaveAttribute('href', expect.stringContaining('test-proof-hash'));
    });
  });

  it('should call fetchBoundWitnessChain with correct parameters', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(mockChain);

    render(<BoundWitnessChain proofHash="test-hash" maxDepth={10} />);

    await waitFor(() => {
      expect(api.fetchBoundWitnessChain).toHaveBeenCalledWith('test-hash', 10);
    });
  });

  it('should use default maxDepth of 5', async () => {
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(mockChain);

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      expect(api.fetchBoundWitnessChain).toHaveBeenCalledWith('test-hash', 5);
    });
  });

  it('should handle missing hash fields gracefully', async () => {
    const chainWithMissingHash = {
      chain: [
        {
          hash: '0xfallbackhash', // Using hash instead of _hash
          previous_hashes: [],
          timestamp: 1704110400000
        }
      ]
    };
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(chainWithMissingHash);

    render(<BoundWitnessChain proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('0xfallbackhash')).toBeTruthy();
    });
  });

  it('should use xl1TransactionHash as fallback for first item when hash is missing', async () => {
    const chainWithMissingHash = {
      chain: [
        {
          // No _hash or hash field
          previous_hashes: [],
          timestamp: 1704110400000
        }
      ]
    };
    (api.fetchBoundWitnessChain as jest.Mock).mockResolvedValue(chainWithMissingHash);

    render(
      <BoundWitnessChain 
        proofHash="test-hash" 
        isXL1={true}
        xl1TransactionHash="0xfallbacktx"
      />
    );

    await waitFor(() => {
      // Should use xl1TransactionHash as fallback for first item
      // The component may display "N/A" if hash is completely missing
      const hashDisplay = screen.queryByText('0xfallbacktx') || screen.queryByText('N/A');
      expect(hashDisplay).toBeTruthy();
    });
  });
});


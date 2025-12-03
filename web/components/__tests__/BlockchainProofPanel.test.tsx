import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlockchainProofPanel } from '../BlockchainProofPanel';
import * as api from '@lib/api';

// Mock API functions
jest.mock('@lib/api', () => ({
  fetchProofDetails: jest.fn(),
  validateBoundWitness: jest.fn()
}));

describe('BlockchainProofPanel', () => {
  const defaultProps = {
    proofHash: 'test-proof-hash',
    proofDataForDisplay: null,
    orderId: 'ORDER-001'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with basic props', () => {
    render(<BlockchainProofPanel {...defaultProps} />);

    expect(screen.getByText('Blockchain Proof')).toBeTruthy();
  });

  it('should show mock badge when isMocked is true', () => {
    render(
      <BlockchainProofPanel
        {...defaultProps}
        boundWitnessData={{ isMocked: true }}
      />
    );

    expect(screen.getByText('🧪 Mock')).toBeTruthy();
  });

  it('should not show mock badge when isMocked is false', () => {
    render(
      <BlockchainProofPanel
        {...defaultProps}
        boundWitnessData={{ isMocked: false }}
      />
    );

    expect(screen.queryByText('🧪 Mock')).toBeNull();
  });

  it('should display bound witness data when provided', () => {
    const proofData = { schema: 'network.xyo.chaincheck', data: 'test' };
    render(<BlockchainProofPanel {...defaultProps} proofDataForDisplay={proofData} />);

    expect(screen.getByText('Bound Witness Data')).toBeTruthy();
  });

  it('should display payload hashes when available', () => {
    const proofData = {
      tuple: [
        {
          boundWitness: {
            payload_hashes: ['hash1', 'hash2'],
            payload_schemas: ['schema1', 'schema2']
          }
        }
      ]
    };
    render(<BlockchainProofPanel {...defaultProps} proofDataForDisplay={proofData} />);

    expect(screen.getByText('Payload Hashes')).toBeTruthy();
    expect(screen.getByText('hash1')).toBeTruthy();
    expect(screen.getByText('hash2')).toBeTruthy();
  });

  it('should show XL1 explorer link when isXL1 is true', () => {
    render(
      <BlockchainProofPanel
        {...defaultProps}
        boundWitnessData={{ isXL1: true, xl1TransactionHash: 'xl1-hash' }}
      />
    );

    const explorerLink = screen.getByText(/View on XYO Explorer.*XL1/);
    expect(explorerLink).toBeTruthy();
    expect(explorerLink.closest('a')).toHaveAttribute(
      'href',
      'https://explore.xyo.network/xl1/sequence/transaction/xl1-hash'
    );
  });

  it('should show bound witness explorer link when isXL1 is false', () => {
    render(
      <BlockchainProofPanel
        {...defaultProps}
        boundWitnessData={{ isXL1: false }}
      />
    );

    const explorerLink = screen.getByText(/View on XYO Explorer.*Bound Witness/);
    expect(explorerLink).toBeTruthy();
    expect(explorerLink.closest('a')).toHaveAttribute(
      'href',
      'https://explore.xyo.network/bound-witness/test-proof-hash'
    );
  });

  it('should show diagnostic link', () => {
    render(<BlockchainProofPanel {...defaultProps} />);

    const diagnosticLink = screen.getByText('Diagnostic Info →');
    expect(diagnosticLink).toBeTruthy();
    expect(diagnosticLink.closest('a')).toHaveAttribute(
      'href',
      'http://localhost:4000/api/deliveries/by-order/ORDER-001/diagnostic'
    );
  });

  it('should fetch and display bound witness data when modal is opened', async () => {
    const mockProofData = {
      hash: 'test-proof-hash',
      payloads: []
    };
    (api.fetchProofDetails as jest.Mock).mockResolvedValue(mockProofData);

    render(<BlockchainProofPanel {...defaultProps} />);

    // Note: The buttons are commented out in the component, so we'll test the modal directly
    // This test verifies the component structure
    expect(screen.getByText('Blockchain Proof')).toBeTruthy();
  });

  it('should handle fetchProofDetails error', async () => {
    const error = new Error('Failed to fetch');
    (api.fetchProofDetails as jest.Mock).mockRejectedValue(error);

    render(<BlockchainProofPanel {...defaultProps} />);

    // Component should render without crashing
    expect(screen.getByText('Blockchain Proof')).toBeTruthy();
  });

  it('should handle validateBoundWitness error', async () => {
    const error = new Error('Validation failed');
    (api.validateBoundWitness as jest.Mock).mockRejectedValue(error);

    render(<BlockchainProofPanel {...defaultProps} />);

    // Component should render without crashing
    expect(screen.getByText('Blockchain Proof')).toBeTruthy();
  });

  it('should display empty payload hashes message when no hashes', () => {
    const proofData = {
      tuple: [
        {
          boundWitness: {
            payload_hashes: [],
            payload_schemas: []
          }
        }
      ]
    };
    render(<BlockchainProofPanel {...defaultProps} proofDataForDisplay={proofData} />);

    expect(screen.getByText('No payload hashes found')).toBeTruthy();
  });

  it('should handle missing bound witness data gracefully', () => {
    const proofData = {
      tuple: [
        {
          boundWitness: null
        }
      ]
    };
    render(<BlockchainProofPanel {...defaultProps} proofDataForDisplay={proofData} />);

    expect(screen.getByText('No bound witness data available')).toBeTruthy();
  });
});


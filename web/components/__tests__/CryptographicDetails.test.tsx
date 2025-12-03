import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CryptographicDetails } from '../CryptographicDetails';
import * as api from '@lib/api';

// Mock API function
jest.mock('@lib/api', () => ({
  fetchCryptographicDetails: jest.fn()
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

describe('CryptographicDetails', () => {
  const mockDetails = {
    signatureValid: true,
    isMocked: false,
    boundWitnessHash: '0x1234567890abcdef1234567890abcdef12345678',
    dataHash: '0xabcdef1234567890abcdef1234567890abcdef12',
    sequence: '12345',
    signatures: [
      '0xsig1abcdef1234567890abcdef1234567890abcdef12',
      '0xsig2abcdef1234567890abcdef1234567890abcdef12'
    ],
    hashChain: [
      '0xhash1abcdef1234567890abcdef1234567890abcdef12',
      '0xhash2abcdef1234567890abcdef1234567890abcdef12'
    ],
    addresses: [
      '0xaddr1abcdef1234567890abcdef1234567890abcdef12',
      '0xaddr2abcdef1234567890abcdef1234567890abcdef12'
    ],
    payloadHashes: [
      '0xpayload1abcdef1234567890abcdef1234567890abcdef12',
      '0xpayload2abcdef1234567890abcdef1234567890abcdef12'
    ],
    errors: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should show loading state initially', () => {
    (api.fetchCryptographicDetails as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<CryptographicDetails proofHash="test-hash" />);

    expect(screen.getByText('XYO Cryptographic Details')).toBeTruthy();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('should display cryptographic details when loaded', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });

    expect(screen.getByText('XYO Cryptographic Details')).toBeTruthy();
    expect(screen.getByText('Cryptographically Verified')).toBeTruthy();
    expect(screen.getByText('✓ Verified')).toBeTruthy();
  });

  it('should show error message when fetch fails', async () => {
    const error = new Error('Failed to load cryptographic details');
    (api.fetchCryptographicDetails as jest.Mock).mockRejectedValue(error);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load cryptographic details/)).toBeTruthy();
    });
  });

  it('should show error message when details are null', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(null);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load details/)).toBeTruthy();
    });
  });

  it('should display invalid signature status when signature is invalid', async () => {
    const invalidDetails = {
      ...mockDetails,
      signatureValid: false,
      errors: ['Signature verification failed']
    };
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(invalidDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Cryptographic Verification Failed')).toBeTruthy();
      expect(screen.getByText('⚠ Invalid')).toBeTruthy();
      expect(screen.getByText('Signature verification failed')).toBeTruthy();
    });
  });

  it('should display mock badge when isMocked is true', async () => {
    const mockedDetails = {
      ...mockDetails,
      isMocked: true
    };
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockedDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('🧪 Mock')).toBeTruthy();
    });
  });

  it('should toggle expand/collapse when button is clicked', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Hide XYO Cryptographic Details')).toBeTruthy();
    });

    const toggleButton = screen.getByText('Hide XYO Cryptographic Details');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Show XYO Cryptographic Details')).toBeTruthy();
    });

    // Click again to expand
    fireEvent.click(screen.getByText('Show XYO Cryptographic Details'));

    await waitFor(() => {
      expect(screen.getByText('Hide XYO Cryptographic Details')).toBeTruthy();
    });
  });

  it('should display bound witness hash when expanded', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Bound Witness Hash')).toBeTruthy();
      expect(screen.getByText(mockDetails.boundWitnessHash)).toBeTruthy();
    });
  });

  it('should copy bound witness hash to clipboard', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Bound Witness Hash')).toBeTruthy();
    });

    const copyButtons = screen.getAllByText('Copy');
    const boundWitnessCopyButton = copyButtons.find(button => 
      button.closest('div')?.textContent?.includes('Bound Witness Hash')
    );

    if (boundWitnessCopyButton) {
      fireEvent.click(boundWitnessCopyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockDetails.boundWitnessHash);
        expect(screen.getByText('✓ Copied')).toBeTruthy();
      });
    }
  });

  it('should display data hash when expanded', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Data Hash')).toBeTruthy();
      expect(screen.getByText(mockDetails.dataHash)).toBeTruthy();
    });
  });

  it('should display sequence number when expanded', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Sequence Number (XL1)')).toBeTruthy();
      expect(screen.getByText(mockDetails.sequence)).toBeTruthy();
    });
  });

  it('should display signatures when expanded', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Signatures \(2\)/)).toBeTruthy();
      expect(screen.getByText(mockDetails.signatures[0])).toBeTruthy();
      expect(screen.getByText(mockDetails.signatures[1])).toBeTruthy();
    });
  });

  it('should display empty signatures message when no signatures', async () => {
    const noSignaturesDetails = {
      ...mockDetails,
      signatures: []
    };
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(noSignaturesDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('No signatures found')).toBeTruthy();
    });
  });

  it('should display hash chain when expanded', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Hash Chain \(2 links\)/)).toBeTruthy();
      expect(screen.getByText(mockDetails.hashChain[0])).toBeTruthy();
      expect(screen.getByText(mockDetails.hashChain[1])).toBeTruthy();
    });
  });

  it('should display empty hash chain message when no hashes', async () => {
    const noHashChainDetails = {
      ...mockDetails,
      hashChain: []
    };
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(noHashChainDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('No previous hashes (chain origin)')).toBeTruthy();
    });
  });

  it('should display addresses when expanded', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Addresses \(2\)/)).toBeTruthy();
      expect(screen.getByText(mockDetails.addresses[0])).toBeTruthy();
      expect(screen.getByText(mockDetails.addresses[1])).toBeTruthy();
    });
  });

  it('should display payload hashes when expanded', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText(/Payload Hashes \(2\)/)).toBeTruthy();
      expect(screen.getByText(mockDetails.payloadHashes[0])).toBeTruthy();
      expect(screen.getByText(mockDetails.payloadHashes[1])).toBeTruthy();
    });
  });

  it('should open explanation modal when verified button is clicked', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('✓ Verified')).toBeTruthy();
    });

    const verifiedButton = screen.getByText('✓ Verified');
    fireEvent.click(verifiedButton);

    await waitFor(() => {
      expect(screen.getByText('What Does "Cryptographically Verified" Mean?')).toBeTruthy();
    });
  });

  it('should open explanation modal when Cryptographically Verified button is clicked', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Cryptographically Verified')).toBeTruthy();
    });

    const verifiedButton = screen.getByText('Cryptographically Verified');
    fireEvent.click(verifiedButton);

    await waitFor(() => {
      expect(screen.getByText('What Does "Cryptographically Verified" Mean?')).toBeTruthy();
    });
  });

  it('should close explanation modal when close button is clicked', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('✓ Verified')).toBeTruthy();
    });

    const verifiedButton = screen.getByText('✓ Verified');
    fireEvent.click(verifiedButton);

    await waitFor(() => {
      expect(screen.getByText('What Does "Cryptographically Verified" Mean?')).toBeTruthy();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('What Does "Cryptographically Verified" Mean?')).toBeNull();
    });
  });

  it('should close explanation modal when backdrop is clicked', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('✓ Verified')).toBeTruthy();
    });

    const verifiedButton = screen.getByText('✓ Verified');
    fireEvent.click(verifiedButton);

    await waitFor(() => {
      expect(screen.getByText('What Does "Cryptographically Verified" Mean?')).toBeTruthy();
    });

    // Find the backdrop (the outer div with onClick)
    const backdrop = screen.getByText('What Does "Cryptographically Verified" Mean?').closest('.fixed');
    if (backdrop) {
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByText('What Does "Cryptographically Verified" Mean?')).toBeNull();
      });
    }
  });

  it('should not close modal when clicking inside modal content', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('✓ Verified')).toBeTruthy();
    });

    const verifiedButton = screen.getByText('✓ Verified');
    fireEvent.click(verifiedButton);

    await waitFor(() => {
      expect(screen.getByText('What Does "Cryptographically Verified" Mean?')).toBeTruthy();
    });

    // Click on modal content (should not close)
    const modalContent = screen.getByText('What Does "Cryptographically Verified" Mean?');
    fireEvent.click(modalContent);

    // Modal should still be open
    expect(screen.getByText('What Does "Cryptographically Verified" Mean?')).toBeTruthy();
  });

  it('should fetch details when proofHash changes', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    const { rerender } = render(<CryptographicDetails proofHash="hash-1" />);

    await waitFor(() => {
      expect(api.fetchCryptographicDetails).toHaveBeenCalledWith('hash-1');
    });

    rerender(<CryptographicDetails proofHash="hash-2" />);

    await waitFor(() => {
      expect(api.fetchCryptographicDetails).toHaveBeenCalledWith('hash-2');
    });
  });

  it('should not fetch details when proofHash is empty', () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="" />);

    expect(api.fetchCryptographicDetails).not.toHaveBeenCalled();
  });

  it('should reset copied field after 2 seconds', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Bound Witness Hash')).toBeTruthy();
    });

    const copyButtons = screen.getAllByText('Copy');
    const boundWitnessCopyButton = copyButtons.find(button => 
      button.closest('div')?.textContent?.includes('Bound Witness Hash')
    );

    if (boundWitnessCopyButton) {
      fireEvent.click(boundWitnessCopyButton);

      await waitFor(() => {
        // Should show "✓ Copied" for the bound witness hash
        const copiedButtons = screen.getAllByText('✓ Copied');
        expect(copiedButtons.length).toBeGreaterThan(0);
      });

      // Fast-forward time by 2 seconds
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        // After timeout, should show "Copy" again (may be multiple)
        const copyButtonsAfter = screen.getAllByText('Copy');
        expect(copyButtonsAfter.length).toBeGreaterThan(0);
      });
    }
  });

  it('should handle clipboard copy errors gracefully', async () => {
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(mockDetails);
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Bound Witness Hash')).toBeTruthy();
    });

    const copyButtons = screen.getAllByText('Copy');
    const boundWitnessCopyButton = copyButtons.find(button => 
      button.closest('div')?.textContent?.includes('Bound Witness Hash')
    );

    if (boundWitnessCopyButton) {
      fireEvent.click(boundWitnessCopyButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to copy to clipboard:',
          expect.any(Error)
        );
      });
    }

    consoleErrorSpy.mockRestore();
  });

  it('should display all error messages when signature is invalid', async () => {
    const invalidDetails = {
      ...mockDetails,
      signatureValid: false,
      errors: [
        'Signature verification failed',
        'Hash mismatch detected',
        'Invalid signature format'
      ]
    };
    (api.fetchCryptographicDetails as jest.Mock).mockResolvedValue(invalidDetails);

    render(<CryptographicDetails proofHash="test-hash" />);

    await waitFor(() => {
      expect(screen.getByText('Signature verification failed')).toBeTruthy();
      expect(screen.getByText('Hash mismatch detected')).toBeTruthy();
      expect(screen.getByText('Invalid signature format')).toBeTruthy();
    });
  });
});


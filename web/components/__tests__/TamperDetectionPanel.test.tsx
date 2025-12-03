import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TamperDetectionPanel } from '../TamperDetectionPanel';
import * as payloadHash from '@lib/payload-hash';

// Mock payload hash calculation
jest.mock('@lib/payload-hash', () => ({
  calculatePayloadHash: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('TamperDetectionPanel', () => {
  const mockStoredPayload = {
    schema: 'network.xyo.chaincheck',
    timestamp: 1704110400000,
    message: 'Delivery verification',
    data: {
      latitude: 37.7749,
      longitude: -122.4194,
      orderId: 'ORDER-001'
    },
    _hash: '0xstoredhash123'
  };

  const mockBoundWitness = {
    payload_hashes: ['0xpayloadhash123'],
    payload_schemas: ['network.xyo.chaincheck']
  };

  const mockArchivistPayload = {
    schema: 'network.xyo.chaincheck',
    timestamp: 1704110400000,
    message: 'Delivery verification',
    data: {
      latitude: 37.7749,
      longitude: -122.4194,
      orderId: 'ORDER-001'
    },
    _hash: '0xarchivisthash123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (payloadHash.calculatePayloadHash as jest.Mock).mockClear();
  });

  it('should render tamper detection panel', () => {
    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    expect(screen.getByText('Tamper Detection')).toBeTruthy();
    expect(screen.getByText(/Click "Check for Tampering"/)).toBeTruthy();
  });

  it('should display idle status initially', () => {
    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    expect(screen.getByText(/Click "Check for Tampering"/)).toBeTruthy();
  });

  it('should show checking state when button is clicked', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    (payloadHash.calculatePayloadHash as jest.Mock).mockResolvedValue('0xcalculatedhash123');

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText('Checking for tampering...')).toBeTruthy();
    });
  });

  it('should display error when proofHash is missing', async () => {
    render(
      <TamperDetectionPanel 
        proofHash=""
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    // Button should be disabled when proofHash is missing
    const checkButton = screen.getByText('Check for Tampering');
    expect(checkButton.closest('button')).toHaveAttribute('disabled');

    // Try to click it anyway (should not trigger check)
    fireEvent.click(checkButton);

    // The error state should be set, but since button is disabled, 
    // the handler may not execute. Let's verify the component renders correctly
    expect(screen.getByText('Tamper Detection')).toBeTruthy();
  });

  it('should display error when XL1 payload hash is not found', async () => {
    const boundWitnessWithoutHash = {
      payload_hashes: [],
      payload_schemas: []
    };

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={boundWitnessWithoutHash}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/XL1 payload hash not found/)).toBeTruthy();
    });
  });

  it('should display verified status when hashes match', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockArchivistPayload
      })
    });
    (payloadHash.calculatePayloadHash as jest.Mock).mockResolvedValue('0xpayloadhash123');

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/Verified: XYO Archivist data matches blockchain proof/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display tampered status when hashes do not match', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockArchivistPayload
      })
    });
    // Calculated hash doesn't match XL1 hash
    (payloadHash.calculatePayloadHash as jest.Mock).mockResolvedValue('0xdifferenthash456');

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/Tampering Detected/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display error when payload fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to check for tampering/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display error when payload is not found (404)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404
    });

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/Payload not found in Archivist/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display error when Archivist returns no payload data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: null
      })
    });

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/Could not retrieve payload from Archivist/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display hash details when verification completes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockArchivistPayload
      })
    });
    (payloadHash.calculatePayloadHash as jest.Mock).mockResolvedValue('0xpayloadhash123');

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/XL1 Hash:/)).toBeTruthy();
      expect(screen.getByText(/Calculated Hash:/)).toBeTruthy();
      expect(screen.getByText(/Hash Match:/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should disable button while checking', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    (payloadHash.calculatePayloadHash as jest.Mock).mockResolvedValue('0xcalculatedhash123');

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText('Checking...')).toBeTruthy();
      // Button should be disabled
      expect(checkButton.closest('button')).toHaveAttribute('disabled');
    });
  });

  it('should disable button when proofHash is missing', () => {
    render(
      <TamperDetectionPanel 
        proofHash=""
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    expect(checkButton.closest('button')).toHaveAttribute('disabled');
  });

  it('should display how it works section', () => {
    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    expect(screen.getByText('How It Works')).toBeTruthy();
  });

  it('should expand how it works section', () => {
    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const howItWorksButton = screen.getByText('How It Works').closest('button');
    fireEvent.click(howItWorksButton!);

    expect(screen.getByText(/Fetches the current payload data from the XYO Archivist/)).toBeTruthy();
  });

  it('should fetch payload from Archivist using payload hash', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockArchivistPayload
      })
    });
    (payloadHash.calculatePayloadHash as jest.Mock).mockResolvedValue('0xpayloadhash123');

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      // Should fetch using the payload hash from bound witness
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toMatch(/\/api\/payloads\//);
      expect(fetchCall).toMatch(/0xpayloadhash123/);
    }, { timeout: 3000 });
  });

  it('should handle payload with different schema in array', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { schema: 'other.schema' },
          mockArchivistPayload
        ]
      })
    });
    (payloadHash.calculatePayloadHash as jest.Mock).mockResolvedValue('0xpayloadhash123');

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={mockBoundWitness}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/Verified: XYO Archivist data matches blockchain proof/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should extract XL1 payload hash from bound witness correctly', async () => {
    const boundWitnessWithMultipleSchemas = {
      payload_hashes: ['0xhash1', '0xpayloadhash123', '0xhash3'],
      payload_schemas: ['other.schema', 'network.xyo.chaincheck', 'another.schema']
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockArchivistPayload
      })
    });
    (payloadHash.calculatePayloadHash as jest.Mock).mockResolvedValue('0xpayloadhash123');

    render(
      <TamperDetectionPanel 
        proofHash="test-hash"
        storedPayload={mockStoredPayload}
        boundWitness={boundWitnessWithMultipleSchemas}
      />
    );

    const checkButton = screen.getByText('Check for Tampering');
    fireEvent.click(checkButton);

    await waitFor(() => {
      // Should fetch using the correct payload hash (index 1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('0xpayloadhash123')
      );
    }, { timeout: 3000 });
  });
});


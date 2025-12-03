import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArchivistPayloadPanel } from '../ArchivistPayloadPanel';
import type { ArchivistSubmissionResult } from '@shared/types/xyo.types';

describe('ArchivistPayloadPanel', () => {
  const mockPayload = {
    schema: 'network.xyo.chaincheck',
    timestamp: 1704110400000,
    message: 'Delivery verification',
    data: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 10.5,
      barometricPressure: 1013.25,
      accelerometer: { x: 0.1, y: 0.2, z: 9.8 },
      photoHash: '0xphoto123',
      signatureHash: '0xsig123',
      timestamp: 1704110400000,
      orderId: 'ORDER-001',
      driverId: 'driver-001',
      deliveryAddress: '123 Main St'
    },
    _hash: '0xpayloadhash123'
  };

  const mockArchivistResponse: ArchivistSubmissionResult = {
    success: true,
    offChainPayload: mockPayload
  };

  it('should display no data message when archivistResponse is null', () => {
    render(<ArchivistPayloadPanel archivistResponse={null} />);

    expect(screen.getByText('XYO (Archivist) Off-Chain Data')).toBeTruthy();
    expect(screen.getByText('No Archivist data available')).toBeTruthy();
  });

  it('should display error when archivist response failed', () => {
    const errorResponse: ArchivistSubmissionResult = {
      success: false,
      error: 'Submission failed'
    };
    render(<ArchivistPayloadPanel archivistResponse={errorResponse} />);

    expect(screen.getByText('XYO (Archivist) Off-Chain Data')).toBeTruthy();
    expect(screen.getByText('Archivist Error:')).toBeTruthy();
    expect(screen.getByText('Submission failed')).toBeTruthy();
  });

  it('should display no payload message when payload is missing', () => {
    const responseWithoutPayload: ArchivistSubmissionResult = {
      success: true,
      offChainPayload: null
    };
    render(<ArchivistPayloadPanel archivistResponse={responseWithoutPayload} />);

    expect(screen.getByText('No off-chain payload data available')).toBeTruthy();
  });

  it('should display stored badge when payload is available', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('✓ Stored')).toBeTruthy();
  });

  it('should display schema', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Schema')).toBeTruthy();
    expect(screen.getByText('network.xyo.chaincheck')).toBeTruthy();
  });

  it('should display location data', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Location')).toBeTruthy();
    expect(screen.getByText(/37\.774900/)).toBeTruthy();
    expect(screen.getByText(/-122\.419400/)).toBeTruthy();
  });

  it('should display altitude', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Altitude')).toBeTruthy();
    expect(screen.getByText(/10\.50.*m/)).toBeTruthy();
  });

  it('should display barometric pressure', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Pressure')).toBeTruthy();
    expect(screen.getByText(/1013\.25.*hPa/)).toBeTruthy();
  });

  it('should display accelerometer data', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Acceleration')).toBeTruthy();
    expect(screen.getByText(/X:.*0\.100.*m\/s²/)).toBeTruthy();
    expect(screen.getByText(/Y:.*0\.200.*m\/s²/)).toBeTruthy();
    expect(screen.getByText(/Z:.*9\.800.*m\/s²/)).toBeTruthy();
  });

  it('should display photo hash', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Photo Hash')).toBeTruthy();
    expect(screen.getByText('0xphoto123')).toBeTruthy();
  });

  it('should display signature hash', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Signature Hash')).toBeTruthy();
    expect(screen.getByText('0xsig123')).toBeTruthy();
  });

  it('should display order ID', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Order ID')).toBeTruthy();
    expect(screen.getByText('ORDER-001')).toBeTruthy();
  });

  it('should display driver ID', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Driver ID')).toBeTruthy();
    expect(screen.getByText('driver-001')).toBeTruthy();
  });

  it('should display delivery address', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Delivery Address')).toBeTruthy();
    expect(screen.getByText('123 Main St')).toBeTruthy();
  });

  it('should display XL1 transaction hash when provided', () => {
    render(
      <ArchivistPayloadPanel 
        archivistResponse={mockArchivistResponse}
        xl1TransactionHash="0xtxhash123"
      />
    );

    expect(screen.getByText('XL1 Bound Witness Hash:')).toBeTruthy();
    expect(screen.getByText('0xtxhash123')).toBeTruthy();
  });

  it('should display archivist bound witness hash when provided', () => {
    render(
      <ArchivistPayloadPanel 
        archivistResponse={mockArchivistResponse}
        archivistBoundWitnessHash="0xarchivistbw123"
      />
    );

    expect(screen.getByText('Archivist Bound Witness Hash:')).toBeTruthy();
    expect(screen.getByText('0xarchivistbw123')).toBeTruthy();
  });

  it('should display payload hash from _hash field', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('XL1 Off-Chain Data Hash:')).toBeTruthy();
    expect(screen.getByText('0xpayloadhash123')).toBeTruthy();
  });

  it('should display correlation note when both hashes are present', () => {
    render(
      <ArchivistPayloadPanel 
        archivistResponse={mockArchivistResponse}
        xl1TransactionHash="0xtxhash123"
        archivistBoundWitnessHash="0xarchivistbw123"
      />
    );

    expect(screen.getByText(/These are different bound witnesses/)).toBeTruthy();
  });

  it('should display full payload JSON in collapsible section', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('View Full Archivist Payload (JSON)')).toBeTruthy();
  });

  it('should handle timestamp display', () => {
    render(<ArchivistPayloadPanel archivistResponse={mockArchivistResponse} />);

    expect(screen.getByText('Timestamp')).toBeTruthy();
    // Timestamp format may vary
    expect(screen.getByText(/2024/)).toBeTruthy();
  });

  it('should display XYO driver record indicator when present', () => {
    const payloadWithNfc = {
      ...mockPayload,
      data: {
        ...mockPayload.data,
        xyoNfcUserRecord: { some: 'data' }
      }
    };
    const responseWithNfc: ArchivistSubmissionResult = {
      success: true,
      offChainPayload: payloadWithNfc
    };
    render(<ArchivistPayloadPanel archivistResponse={responseWithNfc} />);

    expect(screen.getByText('XYO Driver Record')).toBeTruthy();
    expect(screen.getByText('Present')).toBeTruthy();
  });
});


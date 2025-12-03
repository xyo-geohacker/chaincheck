import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProofTimeline } from '../ProofTimeline';
import type { DeliveryRecord } from '@shared/types/delivery.types';
import { DeliveryStatus } from '@shared/types/delivery.types';

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe('ProofTimeline', () => {
  const mockDelivery: DeliveryRecord = {
    id: 'delivery-1',
    orderId: 'ORDER-001',
    driverId: 'driver-001',
    recipientName: 'John Doe',
    recipientPhone: '555-0100',
    deliveryAddress: '123 Main St',
    destinationLat: 37.7749,
    destinationLon: -122.4194,
    status: DeliveryStatus.DELIVERED,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    verifiedAt: '2024-01-01T12:30:00Z',
    proofHash: '0xproofhash123'
  };

  it('should render timeline title', () => {
    render(<ProofTimeline delivery={mockDelivery} proofHash="test-hash" />);

    expect(screen.getByText('Delivery/Proof Timeline')).toBeTruthy();
  });

  it('should display delivery created event', () => {
    render(<ProofTimeline delivery={mockDelivery} proofHash="test-hash" />);

    expect(screen.getByText('Delivery Created')).toBeTruthy();
    expect(screen.getByText(/ORDER-001/)).toBeTruthy();
    expect(screen.getByText(/driver-001/)).toBeTruthy();
  });

  it('should display delivery verified event when proof is valid', () => {
    const boundWitnessData = {
      isXL1: true,
      xl1TransactionHash: '0xtxhash',
      isMocked: false,
      archivistResponse: { success: true }
    };
    render(
      <ProofTimeline 
        delivery={mockDelivery} 
        boundWitnessData={boundWitnessData}
        proofHash="test-hash" 
      />
    );

    expect(screen.getByText('Delivery Verified')).toBeTruthy();
    expect(screen.getByText(/Proof hash.*submitted to XYO\/XL1/)).toBeTruthy();
  });

  it('should display verification pending when no valid proof', () => {
    const deliveryWithoutProof = {
      ...mockDelivery,
      proofHash: null,
      verifiedAt: null
    };
    render(<ProofTimeline delivery={deliveryWithoutProof} proofHash="" />);

    expect(screen.getByText('Verification Pending')).toBeTruthy();
    expect(screen.getByText('Awaiting proof submission to blockchain')).toBeTruthy();
  });

  it('should display verification failed when archivist response failed', () => {
    const boundWitnessData = {
      isXL1: true,
      xl1TransactionHash: '0xtxhash',
      isMocked: false,
      archivistResponse: { success: false, error: 'Submission failed' }
    };
    render(
      <ProofTimeline 
        delivery={mockDelivery} 
        boundWitnessData={boundWitnessData}
        proofHash="test-hash" 
      />
    );

    expect(screen.getByText('Verification Failed')).toBeTruthy();
    expect(screen.getByText(/Proof submission failed/)).toBeTruthy();
    expect(screen.getByText(/Submission failed/)).toBeTruthy();
  });

  it('should display verification pending when proofHash exists but no verifiedAt', () => {
    const deliveryWithProofButNoVerified = {
      ...mockDelivery,
      verifiedAt: null
    };
    render(<ProofTimeline delivery={deliveryWithProofButNoVerified} proofHash="test-hash" />);

    expect(screen.getByText('Verification Pending')).toBeTruthy();
  });

  it('should display verified event when isMocked is true', () => {
    const boundWitnessData = {
      isXL1: true,
      xl1TransactionHash: '0xtxhash',
      isMocked: true
    };
    render(
      <ProofTimeline 
        delivery={mockDelivery} 
        boundWitnessData={boundWitnessData}
        proofHash="test-hash" 
      />
    );

    expect(screen.getByText('Delivery Verified')).toBeTruthy();
  });

  it('should format timestamps correctly', () => {
    render(<ProofTimeline delivery={mockDelivery} proofHash="test-hash" />);

    // Check that timestamps are displayed (format may vary by locale)
    const timestampElements = screen.getAllByText(/2024/);
    expect(timestampElements.length).toBeGreaterThan(0);
  });

  it('should display pending for events without timestamps', () => {
    const deliveryWithoutVerified = {
      ...mockDelivery,
      verifiedAt: null
    };
    render(<ProofTimeline delivery={deliveryWithoutVerified} proofHash="" />);

    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('should display proof hash in verified event description', () => {
    const boundWitnessData = {
      isXL1: true,
      xl1TransactionHash: '0xtxhash',
      isMocked: false,
      archivistResponse: { success: true }
    };
    const deliveryWithProofHash = {
      ...mockDelivery,
      proofHash: 'test-hash-123'
    };
    render(
      <ProofTimeline 
        delivery={deliveryWithProofHash} 
        boundWitnessData={boundWitnessData}
        proofHash="test-hash-123" 
      />
    );

    // The component uses delivery.proofHash, not the prop
    expect(screen.getByText(/test-hash-123/)).toBeTruthy();
  });
});


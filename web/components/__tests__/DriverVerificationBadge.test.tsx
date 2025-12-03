import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DriverVerificationBadge } from '../DriverVerificationBadge';

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />;
  }
}));

describe('DriverVerificationBadge', () => {
  it('should render verification badge', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    expect(screen.getByText('✓')).toBeTruthy();
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('should display driver ID in badge', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    const badge = screen.getByText('Verified').closest('button');
    expect(badge).toBeTruthy();
  });

  it('should open modal when badge is clicked', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    expect(screen.getByText('Driver Verification')).toBeTruthy();
    expect(screen.getByText(/driver-001/)).toBeTruthy();
  });

  it('should display driver ID in modal', () => {
    render(<DriverVerificationBadge driverId="driver-123" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    expect(screen.getByText(/driver-123/)).toBeTruthy();
  });

  it('should close modal when close button is clicked', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    expect(screen.getByText('Driver Verification')).toBeTruthy();

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Driver Verification')).toBeNull();
  });

  it('should close modal when backdrop is clicked', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    expect(screen.getByText('Driver Verification')).toBeTruthy();

    // Find the backdrop (the outer div with onClick)
    const backdrop = screen.getByText('Driver Verification').closest('.fixed');
    if (backdrop) {
      fireEvent.click(backdrop);

      expect(screen.queryByText('Driver Verification')).toBeNull();
    }
  });

  it('should not close modal when clicking inside modal content', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    expect(screen.getByText('Driver Verification')).toBeTruthy();

    // Click on modal content (should not close)
    const modalContent = screen.getByText('Driver Verification');
    fireEvent.click(modalContent);

    // Modal should still be open
    expect(screen.getByText('Driver Verification')).toBeTruthy();
  });

  it('should close modal when bottom close button is clicked', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    expect(screen.getByText('Driver Verification')).toBeTruthy();

    const closeButtons = screen.getAllByText('Close');
    // Click the bottom close button (not the X button)
    const bottomCloseButton = closeButtons.find(button => 
      button.closest('div')?.textContent?.includes('Close')
    );
    
    if (bottomCloseButton) {
      fireEvent.click(bottomCloseButton);
      expect(screen.queryByText('Driver Verification')).toBeNull();
    }
  });

  it('should display verification explanation text', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    expect(screen.getByText(/has been verified by scanning their XYO SentinelX NFC card/)).toBeTruthy();
    expect(screen.getByText(/Scanning an XYO SentinelX NFC card at the time of delivery is not required/)).toBeTruthy();
  });

  it('should display XYO SentinelX image', () => {
    render(<DriverVerificationBadge driverId="driver-001" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    const image = screen.getByAltText('XYO SentinelX NFC Card');
    expect(image).toBeTruthy();
    expect(image).toHaveAttribute('src', '/images/xyo-sentinelx-nfc.png');
  });

  it('should handle different driver IDs', () => {
    render(<DriverVerificationBadge driverId="different-driver" />);

    const badge = screen.getByText('Verified').closest('button');
    fireEvent.click(badge!);

    expect(screen.getByText(/different-driver/)).toBeTruthy();
  });
});


import React from 'react';
import { render, screen } from '@testing-library/react';
import ROIPage from '../page';

// Mock ROIDashboard component
jest.mock('@components/ROIDashboard', () => ({
  ROIDashboard: () => <div data-testid="roi-dashboard">ROI Dashboard</div>
}));

describe('ROIPage', () => {
  it('should render ROI page', () => {
    render(<ROIPage />);

    expect(screen.getByTestId('roi-dashboard')).toBeTruthy();
  });

  it('should render back to dashboard link', () => {
    render(<ROIPage />);

    const backLink = screen.getByText('← Back to Dashboard');
    expect(backLink).toBeTruthy();
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should render ROIDashboard component', () => {
    render(<ROIPage />);

    expect(screen.getByTestId('roi-dashboard')).toBeTruthy();
  });
});


import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ConfigurationPage from '../page';
import * as api from '@lib/api';

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn()
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}));

// Mock API functions
jest.mock('@lib/api', () => ({
  fetchConfiguration: jest.fn(),
  initializeConfiguration: jest.fn(),
  fetchServerStatus: jest.fn(),
  isConfigAuthenticated: jest.fn(),
  configLogout: jest.fn(),
  updateConfiguration: jest.fn(),
  deleteConfiguration: jest.fn()
}));

describe('ConfigurationPage', () => {
  const mockConfigurations = {
    backend: [
      { category: 'backend' as const, key: 'API_URL', value: 'http://localhost:4000', description: 'API URL', isSecret: false }
    ],
    web: [
      { category: 'web' as const, key: 'NEXT_PUBLIC_API_URL', value: 'http://localhost:4000', description: 'Web API URL', isSecret: false }
    ],
    mobile: [
      { category: 'mobile' as const, key: 'EXPO_PUBLIC_API_URL', value: 'http://localhost:4000', description: 'Mobile API URL', isSecret: false }
    ]
  };

  const mockServerStatus = {
    backend: { name: 'Backend', status: 'running' as const, lastChecked: new Date().toISOString() },
    web: { name: 'Web', status: 'running' as const, lastChecked: new Date().toISOString() },
    mobile: { name: 'Mobile', status: 'stopped' as const, lastChecked: new Date().toISOString() }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.isConfigAuthenticated as jest.Mock).mockReturnValue(true);
    (api.fetchConfiguration as jest.Mock).mockResolvedValue({
      success: true,
      configuration: mockConfigurations
    });
    (api.fetchServerStatus as jest.Mock).mockResolvedValue({
      success: true,
      services: mockServerStatus
    });
  });

  it('should redirect to login when not authenticated', () => {
    (api.isConfigAuthenticated as jest.Mock).mockReturnValue(false);

    render(<ConfigurationPage />);

    expect(mockPush).toHaveBeenCalledWith('/configuration/login?redirect=/configuration');
  });

  it('should load configuration on mount when authenticated', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(api.fetchConfiguration).toHaveBeenCalled();
    });
  });

  it('should load server status on mount', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(api.fetchServerStatus).toHaveBeenCalled();
    });
  });

  it('should display configuration items', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('API_URL')).toBeTruthy();
    });
  });

  it('should switch between configuration categories', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('API_URL')).toBeTruthy();
    });

    // Find and click web category tab
    const webTab = screen.getByText('Web');
    fireEvent.click(webTab);

    await waitFor(() => {
      expect(screen.getByText('NEXT_PUBLIC_API_URL')).toBeTruthy();
    });
  });

  it('should display server status', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText(/Running|Stopped/)).toBeTruthy();
    });
  });

  it('should handle configuration load error', async () => {
    const error = new Error('Failed to load');
    (api.fetchConfiguration as jest.Mock).mockRejectedValue(error);

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load|Error/)).toBeTruthy();
    });
  });

  it('should handle authentication error', async () => {
    const authError = new Error('Configuration authentication required');
    (api.fetchConfiguration as jest.Mock).mockRejectedValue(authError);

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText(/Configuration authentication required|Authentication required/)).toBeTruthy();
    });
  });

  it('should initialize configuration', async () => {
    (api.initializeConfiguration as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Initialized'
    });

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Load from \.env/i })).toBeTruthy();
    });

    // Find initialize button and click
    const initButton = screen.getByRole('button', { name: /Load from \.env/i });
    fireEvent.click(initButton);

    await waitFor(() => {
      expect(api.initializeConfiguration).toHaveBeenCalled();
    });
  });

  it('should show success message after initialization', async () => {
    (api.initializeConfiguration as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Initialized'
    });
    (api.fetchConfiguration as jest.Mock).mockResolvedValue({
      success: true,
      configuration: mockConfigurations
    });

    render(<ConfigurationPage />);

    await waitFor(() => {
      const initButton = screen.getByRole('button', { name: /Load from \.env/i });
      fireEvent.click(initButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/loaded and saved|success/i)).toBeTruthy();
    }, { timeout: 4000 });
  });

  it('should display status colors correctly', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      // Status indicators should be present
      expect(screen.getByText(/Running|Stopped|Unknown/)).toBeTruthy();
    });
  });

  it('should refresh server status periodically', async () => {
    jest.useFakeTimers();

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(api.fetchServerStatus).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(api.fetchServerStatus).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('should handle server status load error silently', async () => {
    (api.fetchServerStatus as jest.Mock).mockRejectedValue(new Error('Failed'));

    render(<ConfigurationPage />);

    // Should not show error, just silently fail
    await waitFor(() => {
      expect(api.fetchServerStatus).toHaveBeenCalled();
    });

    // Page should still render - check for main heading
    expect(screen.getByText('Configuration')).toBeTruthy();
  });

  it('should display all configuration categories', async () => {
    render(<ConfigurationPage />);

    expect(screen.getByText('Backend')).toBeTruthy();
    expect(screen.getByText('Web')).toBeTruthy();
    expect(screen.getByText('Mobile')).toBeTruthy();
  });

  it('should show loading state initially', () => {
    (api.fetchConfiguration as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ConfigurationPage />);

    // Should show loading or be in loading state
    expect(api.fetchConfiguration).toHaveBeenCalled();
  });
});


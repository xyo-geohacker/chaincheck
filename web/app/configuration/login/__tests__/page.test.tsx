import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConfigurationLoginPage from '../page';
import { configLogin } from '@lib/api';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn()
}));

// Mock Next.js Image and Link components
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
  )
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

// Mock API
jest.mock('@lib/api', () => ({
  configLogin: jest.fn()
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ConfigurationLoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockGet.mockReturnValue(null);
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: mockGet
    });
  });

  it('should render login form', () => {
    render(<ConfigurationLoginPage />);

    expect(screen.getByText('Configuration Access')).toBeInTheDocument();
    expect(screen.getByText('Sign in to manage application settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should redirect if already authenticated', () => {
    localStorageMock.setItem('configToken', 'existing-token');

    render(<ConfigurationLoginPage />);

    expect(mockPush).toHaveBeenCalledWith('/configuration');
  });

  it('should redirect to custom redirect path if provided', () => {
    localStorageMock.setItem('configToken', 'existing-token');
    mockGet.mockReturnValue('/custom-path');

    render(<ConfigurationLoginPage />);

    expect(mockPush).toHaveBeenCalledWith('/custom-path');
  });

  it('should show error for empty username and password', async () => {
    render(<ConfigurationLoginPage />);

    const form = screen.getByRole('button', { name: /sign in/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('Username and password are required')).toBeInTheDocument();
    });
  });

  it('should show error for whitespace-only username', async () => {
    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: '   ' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('Username and password are required')).toBeInTheDocument();
    });
  });

  it('should show error for whitespace-only password', async () => {
    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'username' } });
    fireEvent.change(passwordInput, { target: { value: '   ' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('Username and password are required')).toBeInTheDocument();
    });
  });

  it('should handle successful login', async () => {
    (configLogin as jest.Mock).mockResolvedValueOnce({
      success: true,
      token: 'test-token',
      username: 'testuser'
    });

    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(configLogin).toHaveBeenCalledWith('testuser', 'testpass');
    });

    await waitFor(() => {
      expect(localStorageMock.getItem('configToken')).toBe('test-token');
      expect(localStorageMock.getItem('configUsername')).toBe('testuser');
    });

    expect(mockPush).toHaveBeenCalledWith('/configuration');
  });

  it('should redirect to custom path after successful login', async () => {
    mockGet.mockReturnValue('/custom-redirect');
    (configLogin as jest.Mock).mockResolvedValueOnce({
      success: true,
      token: 'test-token',
      username: 'testuser'
    });

    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-redirect');
    });
  });

  it('should display error on failed login', async () => {
    (configLogin as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Invalid credentials'
    });

    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should display generic error when API error is not provided', async () => {
    (configLogin as jest.Mock).mockResolvedValueOnce({
      success: false
    });

    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('should handle API exception', async () => {
    (configLogin as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should trim username and password before submission', async () => {
    (configLogin as jest.Mock).mockResolvedValueOnce({
      success: true,
      token: 'test-token',
      username: 'testuser'
    });

    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: '  testuser  ' } });
    fireEvent.change(passwordInput, { target: { value: '  testpass  ' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(configLogin).toHaveBeenCalledWith('testuser', 'testpass');
    });
  });

  it('should disable form inputs while loading', async () => {
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    (configLogin as jest.Mock).mockReturnValue(loginPromise);

    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    if (form) {
      fireEvent.submit(form);
    }

    // Should show loading state
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();

    // Resolve the promise
    resolveLogin!({
      success: true,
      token: 'test-token',
      username: 'testuser'
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should clear error on new submission', async () => {
    (configLogin as jest.Mock)
      .mockResolvedValueOnce({
        success: false,
        error: 'First error'
      })
      .mockResolvedValueOnce({
        success: true,
        token: 'test-token',
        username: 'testuser'
      });

    render(<ConfigurationLoginPage />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const form = usernameInput.closest('form');

    // First submission - error
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument();
    });

    // Second submission - success (error should be cleared)
    fireEvent.change(passwordInput, { target: { value: 'correctpass' } });
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });
});


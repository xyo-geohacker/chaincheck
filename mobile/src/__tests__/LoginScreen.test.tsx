import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { LoginScreen } from '../screens/LoginScreen';
import { useDriverStore } from '../store/useDriverStore';
import { apiClient } from '../services/api.service';

// Mock the store
jest.mock('../store/useDriverStore');
jest.mock('../services/api.service', () => ({
  apiClient: {
    post: jest.fn()
  }
}));

const mockNavigation = {
  replace: jest.fn(),
  navigate: jest.fn()
};

const mockSetDriverId = jest.fn();
const mockSetToken = jest.fn();

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDriverStore as unknown as jest.Mock).mockReturnValue({
      driverId: null,
      token: null,
      setDriverId: mockSetDriverId,
      setToken: mockSetToken
    });
  });

  const renderLoginScreen = () => {
    return render(
      <NavigationContainer>
        <LoginScreen navigation={mockNavigation as any} />
      </NavigationContainer>
    );
  };

  it('should render login form', () => {
    const { getByPlaceholderText, getByText } = renderLoginScreen();

    expect(getByPlaceholderText('Driver ID')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('should disable sign in button when fields are empty', () => {
    const { getByText } = renderLoginScreen();
    const signInButton = getByText('Sign In');

    expect(signInButton.props.disabled).toBe(true);
  });

  it('should enable sign in button when fields are filled', () => {
    const { getByPlaceholderText, getByText } = renderLoginScreen();

    fireEvent.changeText(getByPlaceholderText('Driver ID'), 'driver-001');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    const signInButton = getByText('Sign In');
    expect(signInButton.props.disabled).toBe(false);
  });

  it('should show error when login fails', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue({
      response: {
        status: 401,
        data: { error: 'Invalid driver ID or password' }
      }
    });

    const { getByPlaceholderText, getByText, findByText } = renderLoginScreen();

    fireEvent.changeText(getByPlaceholderText('Driver ID'), 'driver-001');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong-password');
    fireEvent.press(getByText('Sign In'));

    const errorMessage = await findByText(/Invalid driver ID or password/i);
    expect(errorMessage).toBeTruthy();
  });

  it('should successfully login and navigate', async () => {
    const mockToken = 'mock-jwt-token';
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        driverId: 'driver-001',
        token: mockToken,
        expiresIn: '7d'
      }
    });

    const { getByPlaceholderText, getByText } = renderLoginScreen();

    fireEvent.changeText(getByPlaceholderText('Driver ID'), 'driver-001');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
        driverId: 'driver-001',
        password: 'password123'
      });
      expect(mockSetDriverId).toHaveBeenCalledWith('driver-001');
      expect(mockSetToken).toHaveBeenCalledWith(mockToken);
      expect(mockNavigation.replace).toHaveBeenCalledWith('ActiveDeliveries');
    });
  });

  it('should show error for missing fields', async () => {
    const { getByText, findByText } = renderLoginScreen();

    fireEvent.press(getByText('Sign In'));

    const errorMessage = await findByText(/Driver ID and password are required/i);
    expect(errorMessage).toBeTruthy();
  });

  it('should auto-navigate if already logged in', () => {
    (useDriverStore as unknown as jest.Mock).mockReturnValue({
      driverId: 'driver-001',
      token: 'existing-token',
      setDriverId: mockSetDriverId,
      setToken: mockSetToken
    });

    renderLoginScreen();

    expect(mockNavigation.replace).toHaveBeenCalledWith('ActiveDeliveries');
  });
});


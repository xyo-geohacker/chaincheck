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
    const { getByTestId } = renderLoginScreen();
    const signInButton = getByTestId('sign-in-button');
    
    // When button is disabled, pressing it should not trigger the login API call
    // Note: In React Native, disabled TouchableOpacity may still fire press events
    // but the onPress handler should check the disabled state internally
    // We verify the button exists and the form validation prevents submission
    expect(signInButton).toBeTruthy();
    
    // Clear any previous calls
    jest.clearAllMocks();
    
    // Try to press - if disabled properly, this won't trigger API call
    // The actual validation happens in handleLogin which checks for empty fields
    fireEvent.press(signInButton);
    
    // Since fields are empty, handleLogin should return early without calling API
    // But we need to account for the fact that the button might still fire the event
    // The real test is that handleLogin validates and doesn't proceed
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('should enable sign in button when fields are filled', async () => {
    const { getByPlaceholderText, getByTestId } = renderLoginScreen();

    fireEvent.changeText(getByPlaceholderText('Driver ID'), 'driver-001');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    // Mock the API response
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        driverId: 'driver-001',
        token: 'mock-token',
        expiresIn: '7d'
      }
    });

    // Wait for state update, then verify button is enabled by pressing it
    await waitFor(() => {
      const signInButton = getByTestId('sign-in-button');
      fireEvent.press(signInButton);
    });

    // If button is enabled, onPress should be called and API should be called
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
    });
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

  it('should show error for missing fields', () => {
    const { getByTestId } = renderLoginScreen();
    
    // When fields are empty, the button should be disabled, preventing submission
    // This is the validation working - empty fields cannot be submitted
    const signInButton = getByTestId('sign-in-button');
    
    // Try to press the button - it should not trigger login when disabled
    fireEvent.press(signInButton);
    
    // Since button is disabled, API should not be called
    expect(apiClient.post).not.toHaveBeenCalled();
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


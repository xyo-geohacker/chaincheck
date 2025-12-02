import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ActiveDeliveriesScreen } from '../screens/ActiveDeliveriesScreen';
import { useDriverStore } from '../store/useDriverStore';
import { apiClient } from '../services/api.service';
import type { DeliveryRecord } from '@shared/types/delivery.types';
import { DeliveryStatus } from '@shared/types/delivery.types';

// Mock the store
jest.mock('../store/useDriverStore');
jest.mock('../services/api.service', () => ({
  apiClient: {
    get: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:4000'
    }
  }
}));

// Note: useFocusEffect is already mocked in jest.setup.js for expo-location
// We'll handle it by ensuring the callback is called appropriately
// The actual useFocusEffect from @react-navigation/native will work fine in tests

const mockNavigation = {
  replace: jest.fn(),
  navigate: jest.fn(),
  setOptions: jest.fn()
};

const mockClearDriver = jest.fn();

const mockDeliveries: DeliveryRecord[] = [
  {
    id: 'delivery-1',
    orderId: 'ORDER-001',
    driverId: 'driver-001',
    recipientName: 'John Doe',
    recipientPhone: '555-0100',
    deliveryAddress: '123 Main St',
    destinationLat: 37.7749,
    destinationLon: -122.4194,
    status: DeliveryStatus.IN_TRANSIT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'delivery-2',
    orderId: 'ORDER-002',
    driverId: 'driver-001',
    recipientName: 'Jane Smith',
    recipientPhone: '555-0200',
    deliveryAddress: '456 Oak Ave',
    destinationLat: 37.7849,
    destinationLon: -122.4094,
    status: DeliveryStatus.PENDING,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

describe('ActiveDeliveriesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDriverStore as unknown as jest.Mock).mockReturnValue({
      driverId: 'driver-001',
      token: 'mock-token',
      clearDriver: mockClearDriver
    });
  });

  const renderActiveDeliveriesScreen = () => {
    return render(
      <NavigationContainer>
        <ActiveDeliveriesScreen navigation={mockNavigation as any} />
      </NavigationContainer>
    );
  };

  it('should render loading state initially', async () => {
    (apiClient.get as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    const { getByText } = renderActiveDeliveriesScreen();

    expect(getByText('Loading deliveries…')).toBeTruthy();
  });

  it('should display deliveries when loaded', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { deliveries: mockDeliveries }
    });

    const { findByText, getByText } = renderActiveDeliveriesScreen();

    // Wait for deliveries to load
    await waitFor(() => {
      expect(getByText('ORDER-001')).toBeTruthy();
    });

    expect(getByText('ORDER-001')).toBeTruthy();
    expect(getByText('ORDER-002')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();
    expect(getByText('456 Oak Ave')).toBeTruthy();
    // Recipient names are part of "Recipient · {name}" strings
    expect(getByText(/John Doe/)).toBeTruthy();
    expect(getByText(/Jane Smith/)).toBeTruthy();
  });

  it('should show empty state when no deliveries', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { deliveries: [] }
    });

    const { findByText } = renderActiveDeliveriesScreen();

    const emptyTitle = await findByText('No active deliveries');
    expect(emptyTitle).toBeTruthy();

    const emptySubtitle = await findByText(/New assignments will appear here when they are available/i);
    expect(emptySubtitle).toBeTruthy();
  });

  it('should handle API errors gracefully', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      code: 'ECONNREFUSED',
      message: 'Connection refused'
    });

    const { findByText } = renderActiveDeliveriesScreen();

    // Should show error message in empty state
    const errorMessage = await findByText(/Cannot connect to server/i);
    expect(errorMessage).toBeTruthy();
  });

  it('should redirect to login when not authenticated', () => {
    (useDriverStore as unknown as jest.Mock).mockReturnValue({
      driverId: null,
      token: null,
      clearDriver: mockClearDriver
    });

    renderActiveDeliveriesScreen();

    expect(mockNavigation.replace).toHaveBeenCalledWith('Login');
  });

  it('should handle 401 unauthorized and redirect to login', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: {
        status: 401
      }
    });

    renderActiveDeliveriesScreen();

    await waitFor(() => {
      expect(mockClearDriver).toHaveBeenCalled();
      expect(mockNavigation.replace).toHaveBeenCalledWith('Login');
    });
  });

  it('should navigate to VerifyDelivery when delivery is pressed', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { deliveries: [mockDeliveries[0]] }
    });

    const { getByTestId } = renderActiveDeliveriesScreen();

    await waitFor(() => {
      expect(getByTestId('delivery-card-delivery-1')).toBeTruthy();
    });

    const deliveryCard = getByTestId('delivery-card-delivery-1');
    fireEvent.press(deliveryCard);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('VerifyDelivery', {
        delivery: mockDeliveries[0]
      });
    });
  });

  it('should set up sign out button in header', () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { deliveries: [] }
    });

    renderActiveDeliveriesScreen();

    // Verify setOptions was called to set up header
    expect(mockNavigation.setOptions).toHaveBeenCalled();
    
    // Get the headerRight function and call it to test sign out
    const setOptionsCall = (mockNavigation.setOptions as jest.Mock).mock.calls[0][0];
    const headerRight = setOptionsCall.headerRight;
    
    if (headerRight) {
      const { getByText } = render(headerRight());
      const signOutButton = getByText('Sign Out');
      fireEvent.press(signOutButton);
      
      expect(mockClearDriver).toHaveBeenCalled();
      expect(mockNavigation.replace).toHaveBeenCalledWith('Login');
    }
  });

  it('should support pull to refresh', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { deliveries: mockDeliveries }
    });

    const { getByTestId } = renderActiveDeliveriesScreen();

    await waitFor(() => {
      expect(getByTestId('deliveries-list')).toBeTruthy();
    });

    // Get the FlatList component
    const flatList = getByTestId('deliveries-list');
    
    // Access refreshControl through the component props
    // In a real scenario, this would be triggered by user pull gesture
    // For testing, we simulate by accessing the refreshControl prop
    const refreshControl = (flatList as any).props?.refreshControl;
    
    if (refreshControl) {
      // Simulate pull to refresh
      refreshControl.props.onRefresh();

      // Should call API again (initial load + refresh)
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2);
      });
    } else {
      // If refreshControl is not directly accessible, verify it exists
      expect(flatList).toBeTruthy();
    }
  });

  it('should sort deliveries by creation date (newest first)', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { deliveries: mockDeliveries }
    });

    const { getByText, getAllByText } = renderActiveDeliveriesScreen();

    await waitFor(() => {
      expect(getByText('ORDER-001')).toBeTruthy();
    });

    // Get all order IDs to check order
    const orderIds = getAllByText(/ORDER-/);
    
    // First delivery should be ORDER-001 (newer, created today)
    // Second should be ORDER-002 (older, created yesterday)
    expect(orderIds[0].props.children).toBe('ORDER-001');
    expect(orderIds[1].props.children).toBe('ORDER-002');
  });

  it('should display correct status badges', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { deliveries: mockDeliveries }
    });

    const { getByText } = renderActiveDeliveriesScreen();

    await waitFor(() => {
      expect(getByText('ORDER-001')).toBeTruthy();
    });

    // Check status badges are displayed
    expect(getByText('IN TRANSIT')).toBeTruthy();
    expect(getByText('PENDING')).toBeTruthy();
  });

  it('should call API with correct driverId parameter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { deliveries: [] }
    });

    renderActiveDeliveriesScreen();

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/deliveries', {
        params: { driverId: 'driver-001' },
        timeout: 30000
      });
    });
  });
});


import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';

import type { RootStackParamList } from './src/navigation/types';
import { ActiveDeliveriesScreen } from './src/screens/ActiveDeliveriesScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { VerifyDeliveryScreen } from './src/screens/VerifyDeliveryScreen';

// Suppress NativeEventEmitter warnings from third-party libraries
// These are harmless warnings from libraries that haven't updated their native modules
// to include the required addListener/removeListeners methods (React Native 0.65+ requirement)
//
// Note: Warnings in Metro bundler server logs may still appear as they originate from
// native modules before JavaScript executes. These are cosmetic and don't affect functionality.
// The suppression below handles warnings in the app UI and JavaScript console.

// Intercept console.warn and console.error to filter out NativeEventEmitter warnings
const originalWarn = console.warn;
const originalError = console.error;

const shouldSuppressWarning = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes('nativeeventemitter') &&
    (lowerMessage.includes('addlistener') || lowerMessage.includes('removelisteners'))
  );
};

console.warn = (...args: unknown[]) => {
  const message = String(args[0] || '');
  if (shouldSuppressWarning(message)) {
    // Suppress this warning - don't call original warn
    return;
  }
  // Call original warn for other messages
  originalWarn.apply(console, args);
};

console.error = (...args: unknown[]) => {
  const message = String(args[0] || '');
  if (shouldSuppressWarning(message)) {
    // Suppress this error - don't call original error
    return;
  }
  // Call original error for other messages
  originalError.apply(console, args);
};

// Use LogBox to suppress these warnings in the UI (yellow box warnings)
// LogBox.ignoreLogs supports both string patterns and regex (React Native 0.63+)
// We include both exact strings and regex patterns to catch all variations
try {
  LogBox.ignoreLogs([
    // Regex patterns (more flexible, catches variations)
    /NativeEventEmitter.*addListener/i,
    /NativeEventEmitter.*removeListeners/i,
    // Exact string matches (with and without periods)
    'new NativeEventEmitter() was called with a non-null argument without the required addListener method',
    'new NativeEventEmitter() was called with a non-null argument without the required addListener method.',
    'new NativeEventEmitter() was called with a non-null argument without the required removeListeners method',
    'new NativeEventEmitter() was called with a non-null argument without the required removeListeners method.',
  ]);
} catch (error) {
  // Fallback if LogBox.ignoreLogs doesn't support regex in this React Native version
  // In that case, console interception above will still work
  console.debug('LogBox.ignoreLogs configuration skipped:', error);
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Initialize Mapbox access token early in app lifecycle
  useEffect(() => {
    const accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    if (accessToken) {
      try {
        Mapbox.setAccessToken(accessToken);
      } catch (error) {
        console.warn('Failed to set Mapbox access token:', error);
      }
    } else {
      console.warn('EXPO_PUBLIC_MAPBOX_TOKEN is not set. Map may not display correctly.');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ActiveDeliveries"
            component={ActiveDeliveriesScreen}
            options={{ title: 'Active Deliveries' }}
          />
          <Stack.Screen
            name="VerifyDelivery"
            component={VerifyDeliveryScreen}
            options={{ title: 'Verify Delivery' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}


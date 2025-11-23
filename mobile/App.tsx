import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from './src/navigation/types';
import { ActiveDeliveriesScreen } from './src/screens/ActiveDeliveriesScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { VerifyDeliveryScreen } from './src/screens/VerifyDeliveryScreen';

// Suppress NativeEventEmitter warnings from third-party libraries
// These are harmless warnings from libraries that haven't updated their native modules
// to include the required addListener/removeListeners methods (React Native 0.65+ requirement)

// Intercept console.warn to filter out NativeEventEmitter warnings
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = String(args[0] || '');
  if (
    message.includes('NativeEventEmitter') &&
    (message.includes('addListener') || message.includes('removeListeners'))
  ) {
    // Suppress this warning - don't call original warn
    return;
  }
  // Call original warn for other messages
  originalWarn.apply(console, args);
};

// Also use LogBox to suppress these warnings (as a backup)
LogBox.ignoreLogs([
  'new NativeEventEmitter() was called with a non-null argument without the required addListener method',
  'new NativeEventEmitter() was called with a non-null argument without the required removeListeners method'
]);

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
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


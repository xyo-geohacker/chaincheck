import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    })
  ),
  watchPositionAsync: jest.fn(() => ({
    remove: jest.fn()
  }))
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [
    { granted: true },
    jest.fn(() => Promise.resolve({ granted: true }))
  ])
}));

// Mock @rnmapbox/maps
jest.mock('@rnmapbox/maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      MapView: (props) => React.createElement(View, { ...props, testID: 'mapbox-map' }),
      setAccessToken: jest.fn(),
      StyleURL: {
        Street: 'mapbox://styles/mapbox/streets-v11'
      }
    },
    Camera: (props) => React.createElement(View, props),
    PointAnnotation: (props) => React.createElement(View, props),
    ShapeSource: (props) => React.createElement(View, props),
    CircleLayer: (props) => React.createElement(View, props)
  };
});

// Mock react-native-view-shot
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('file://mock-image.png'))
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://mock-documents/',
  readAsStringAsync: jest.fn(() => Promise.resolve('mock-file-content')),
  writeAsStringAsync: jest.fn(() => Promise.resolve())
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};


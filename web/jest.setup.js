// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn()
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  }
}));

// Mock Mapbox
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(),
  Marker: jest.fn(),
  Popup: jest.fn(),
  GeolocateControl: jest.fn(),
  NavigationControl: jest.fn()
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};


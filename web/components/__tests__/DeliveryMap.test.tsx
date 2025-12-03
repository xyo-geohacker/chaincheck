import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeliveryMap } from '../DeliveryMap';

// Mock react-map-gl
jest.mock('react-map-gl', () => ({
  __esModule: true,
  default: ({ children, mapboxAccessToken, initialViewState }: any) => (
    <div data-testid="map" data-token={mapboxAccessToken}>
      <div data-testid="view-state" data-lat={initialViewState.latitude} data-lon={initialViewState.longitude}>
        {children}
      </div>
    </div>
  ),
  Source: ({ children, data }: any) => (
    <div data-testid="map-source" data-has-data={!!data}>{children}</div>
  ),
  Layer: ({ id }: any) => <div data-testid={`map-layer-${id}`} />,
  Marker: ({ latitude, longitude, children }: any) => (
    <div data-testid="map-marker" data-lat={latitude} data-lon={longitude}>
      {children}
    </div>
  )
}));

describe('DeliveryMap', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should render map with valid coordinates', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: 37.7749, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    expect(screen.getByTestId('map')).toBeTruthy();
    expect(screen.getByTestId('map')).toHaveAttribute('data-token', 'test-token');
  });

  it('should show error when Mapbox token is missing', () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const destination = { lat: 37.7749, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    expect(screen.getByText(/Map preview unavailable/)).toBeTruthy();
  });

  it('should show error for invalid destination coordinates (NaN)', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: NaN, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    expect(screen.getByText('Invalid destination coordinates')).toBeTruthy();
  });

  it('should show error for invalid destination coordinates (null)', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: null as any, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    expect(screen.getByText('Invalid destination coordinates')).toBeTruthy();
  });

  it('should show error for invalid destination coordinates (undefined)', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: undefined as any, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    expect(screen.getByText('Invalid destination coordinates')).toBeTruthy();
  });

  it('should render destination marker', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: 37.7749, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    const markers = screen.getAllByTestId('map-marker');
    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0]).toHaveAttribute('data-lat', '37.7749');
    expect(markers[0]).toHaveAttribute('data-lon', '-122.4194');
  });

  it('should render actual location marker when provided', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: 37.7749, lon: -122.4194 };
    const actualLocation = { lat: 37.7750, lon: -122.4195 };
    render(<DeliveryMap destination={destination} actualLocation={actualLocation} />);

    const markers = screen.getAllByTestId('map-marker');
    expect(markers.length).toBe(2);
    expect(markers[1]).toHaveAttribute('data-lat', '37.775');
    expect(markers[1]).toHaveAttribute('data-lon', '-122.4195');
  });

  it('should not render actual location marker when coordinates are invalid', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: 37.7749, lon: -122.4194 };
    const actualLocation = { lat: NaN, lon: -122.4194 };
    render(<DeliveryMap destination={destination} actualLocation={actualLocation} />);

    const markers = screen.getAllByTestId('map-marker');
    expect(markers.length).toBe(1); // Only destination marker
  });

  it('should not render actual location marker when null', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: 37.7749, lon: -122.4194 };
    render(<DeliveryMap destination={destination} actualLocation={null} />);

    const markers = screen.getAllByTestId('map-marker');
    expect(markers.length).toBe(1); // Only destination marker
  });

  it('should render map source with circle data', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: 37.7749, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    const source = screen.getByTestId('map-source');
    expect(source).toHaveAttribute('data-has-data', 'true');
  });

  it('should render map layer', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: 37.7749, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    expect(screen.getByTestId('map-layer-destination-fill')).toBeTruthy();
  });

  it('should set correct initial view state', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

    const destination = { lat: 37.7749, lon: -122.4194 };
    render(<DeliveryMap destination={destination} />);

    const viewState = screen.getByTestId('view-state');
    expect(viewState).toHaveAttribute('data-lat', '37.7749');
    expect(viewState).toHaveAttribute('data-lon', '-122.4194');
  });
});


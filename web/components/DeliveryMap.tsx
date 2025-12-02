"use client";

import 'mapbox-gl/dist/mapbox-gl.css';

import Map, { Layer, Marker, Source } from 'react-map-gl';
import { useMemo } from 'react';

type Props = {
  destination: {
    lat: number;
    lon: number;
  };
  actualLocation?: {
    lat: number;
    lon: number;
  } | null;
};

const circleGeoJson = (lat: number, lon: number, radiusMeters = 50) => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      }
    },
    {
      type: 'Feature',
      properties: {
        radius: radiusMeters
      },
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      }
    }
  ]
});

export function DeliveryMap({ destination, actualLocation }: Props) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Calculate circle data before any early returns (React hooks must be called unconditionally)
  const circleData = useMemo(
    () => {
      if (!destination || 
          typeof destination.lat !== 'number' || 
          isNaN(destination.lat) ||
          typeof destination.lon !== 'number' || 
          isNaN(destination.lon)) {
        return null;
      }
      return circleGeoJson(destination.lat, destination.lon);
    },
    [destination?.lat, destination?.lon]
  );

  // Validate destination coordinates
  if (!destination || 
      typeof destination.lat !== 'number' || 
      isNaN(destination.lat) ||
      typeof destination.lon !== 'number' || 
      isNaN(destination.lon)) {
    return (
      <div className="rounded-3xl border border-dashed border-[#3b2e6f] bg-[#100e1d]/70 p-6 text-center text-sm text-[#8ea8ff]">
        Invalid destination coordinates
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="rounded-3xl border border-dashed border-[#3b2e6f] bg-[#100e1d]/70 p-6 text-center text-sm text-[#8ea8ff]">
        Map preview unavailable. Set NEXT_PUBLIC_MAPBOX_TOKEN to enable Mapbox visualization.
      </div>
    );
  }

  // circleData should be valid at this point due to early return above
  if (!circleData) {
    return (
      <div className="rounded-3xl border border-dashed border-[#3b2e6f] bg-[#100e1d]/70 p-6 text-center text-sm text-[#8ea8ff]">
        Invalid destination coordinates
      </div>
    );
  }

  return (
    <div className="h-80 w-full overflow-hidden rounded-[28px] border border-[#2f2862]">
      <Map
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/light-v11"
        initialViewState={{
          latitude: destination.lat,
          longitude: destination.lon,
          zoom: 15
        }}
        reuseMaps
      >
        <Source id="destination" type="geojson" data={circleData}>
          <Layer
            id="destination-fill"
            type="circle"
            paint={{
              'circle-radius': 50,
              'circle-color': 'rgba(37, 99, 235, 0.2)'
            }}
          />
        </Source>

        <Marker latitude={destination.lat} longitude={destination.lon} anchor="bottom">
          <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-blue-600 shadow">
            Destination
          </span>
        </Marker>

        {actualLocation && 
         typeof actualLocation.lat === 'number' && 
         !isNaN(actualLocation.lat) &&
         typeof actualLocation.lon === 'number' && 
         !isNaN(actualLocation.lon) ? (
          <Marker latitude={actualLocation.lat} longitude={actualLocation.lon} anchor="bottom">
            <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-emerald-600 shadow">
              Verified
            </span>
          </Marker>
        ) : null}
      </Map>
    </div>
  );
}


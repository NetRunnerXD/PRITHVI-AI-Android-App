import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { Location } from '../types';
import { loadLocation, saveLocation } from '../api/persist';
import { getBootstrap, reverseGeo } from '../api/endpoints';

interface LocationContextType {
  location: Location;
  setLocation: (loc: Location) => void;
  usingGps: boolean;
  gpsError: string | null;
  requestGps: () => Promise<void>;
}

export const defaultLocation: Location = {
  id: 'in-wb-purba-medinipur-haldia',
  label: 'Haldia, West Bengal',
  country: 'IN',
  state: 'West Bengal',
  district: 'Purba Medinipur',
  lat: 22.0667,
  lon: 88.0698,
  timezone: 'Asia/Kolkata',
  place_kind: 'place',
  place_name: 'Haldia',
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<Location>(defaultLocation);
  const [usingGps, setUsingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const setLocation = useCallback((loc: Location) => {
    setLocationState(loc);
    void saveLocation(loc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadLocation();
      if (cancelled) return;
      if (saved?.lat != null && saved?.lon != null) {
        setLocationState(saved);
        return;
      }
      try {
        const boot = await getBootstrap();
        if (!cancelled && boot?.default_location) setLocation(boot.default_location);
      } catch {
        /* keep Haldia */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  const requestGps = useCallback(async () => {
    setGpsError(null);
    try {
      const LocationApi = require('expo-location');
      const perm = await LocationApi.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGpsError('Location permission denied');
        return;
      }
      const pos = await LocationApi.getCurrentPositionAsync({ accuracy: LocationApi.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      try {
        const resolved = await reverseGeo(lat, lon);
        setUsingGps(true);
        setLocation(resolved);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'reverse geocode failed';
        if (msg.includes('400') || msg.toLowerCase().includes('india')) {
          setGpsError('Pin is outside India — keeping last India location');
          return;
        }
        throw e;
      }
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : 'GPS unavailable');
    }
  }, [setLocation]);

  return (
    <LocationContext.Provider value={{ location, setLocation, usingGps, gpsError, requestGps }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

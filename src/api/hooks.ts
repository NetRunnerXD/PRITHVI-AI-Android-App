import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation } from '../context/LocationContext';
import type { DashboardSnapshot } from '../types';
import * as ep from './endpoints';
import { loadDashboardCache, saveDashboardCache } from './persist';

export function useReady() {
  return useQuery({
    queryKey: ['ready'],
    queryFn: ep.getReady,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: ep.getBootstrap,
    staleTime: 600_000,
    retry: 2,
  });
}

export function useDashboard() {
  const { location } = useLocation();
  const { i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const queryClient = useQueryClient();
  const lat = location.lat;
  const lon = location.lon;
  const [placeholder, setPlaceholder] = useState<DashboardSnapshot | undefined>();

  useEffect(() => {
    let cancelled = false;
    void loadDashboardCache(lat, lon, locale).then((hit) => {
      if (!cancelled && hit) setPlaceholder(hit);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, locale]);

  return useQuery({
    queryKey: ['dashboard', lat, lon, locale],
    queryFn: async () => {
      try {
        const snap = await ep.getDashboard(location, locale, { extras: false });
        void saveDashboardCache(snap, location, locale);
        void ep.enrichDashboard(location, locale).then((rich) => {
          if (!rich) return;
          void saveDashboardCache(rich, location, locale);
          queryClient.setQueryData(['dashboard', lat, lon, locale], rich);
        });
        return snap;
      } catch (err) {
        const isRateLimit = (err as { status?: number })?.status === 429 || /429|exhaust|rate limit/i.test(String(err));
        const hit = await loadDashboardCache(lat, lon, locale);
        if (hit) {
          return {
            ...hit,
            is_offline_cache: true,
            is_rate_limited: isRateLimit,
          };
        }
        throw err;
      }
    },
    placeholderData: placeholder,
    staleTime: 60_000,
    refetchInterval: 600_000,
    refetchOnReconnect: true,
    retry: 1,
  });
}

export function useAlerts(enabled = true) {
  const { location } = useLocation();
  const { i18n } = useTranslation();
  const locale = i18n.language || 'en';
  return useQuery({
    queryKey: ['alerts', location.lat, location.lon, locale],
    queryFn: () => ep.getAlerts(location, locale),
    enabled,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useNowcastLive(enabled = true) {
  const { location } = useLocation();
  const { i18n } = useTranslation();
  const locale = i18n.language || 'en';
  return useQuery({
    queryKey: ['nowcast-live', location.lat, location.lon, locale],
    queryFn: () => ep.getNowcastLive(location, locale),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}

export function useForecastData() {
  const { location } = useLocation();
  return useQuery({
    queryKey: ['forecast', location.lat, location.lon],
    queryFn: () => ep.getForecast(location),
    staleTime: 300_000,
    retry: 2,
  });
}

export function useRisks() {
  const { location } = useLocation();
  return useQuery({
    queryKey: ['risks', location.lat, location.lon],
    queryFn: () => ep.getRisks(location),
    staleTime: 300_000,
    retry: 2,
  });
}

export function useMarket() {
  const { location } = useLocation();
  return useQuery({
    queryKey: ['market', location.lat, location.lon],
    queryFn: () => ep.getMarket(location),
    staleTime: 300_000,
    retry: 2,
  });
}

export function useGeoSearch(query: string) {
  return useQuery({
    queryKey: ['geoSearch', query],
    queryFn: () => ep.searchGeo(query),
    enabled: query.length > 2,
    retry: 1,
  });
}

export function useChatMutation() {
  return useMutation({
    mutationFn: (body: Parameters<typeof ep.postChat>[0]) => ep.postChat(body),
  });
}

export function useMapLayers() {
  return useQuery({
    queryKey: ['mapLayers'],
    queryFn: ep.getMapLayers,
    staleTime: 3600_000,
    retry: 2,
  });
}

export function useMapRadar() {
  return useQuery({
    queryKey: ['mapRadar'],
    queryFn: ep.getMapRadar,
    staleTime: 300_000,
    retry: 2,
  });
}

export function useMapWeatherGrid(hour: number, enabled: boolean) {
  return useQuery({
    queryKey: ['mapWeatherGrid', hour],
    queryFn: () => ep.getMapWeatherGrid(hour),
    enabled,
    staleTime: 600_000,
    retry: 2,
  });
}

export function useStormMap(state: string, pastH = 6, enabled = true) {
  return useQuery({
    queryKey: ['stormMap', state, pastH],
    queryFn: () => ep.getStormMap(state, pastH),
    enabled,
    staleTime: 60_000,
    retry: 2,
  });
}

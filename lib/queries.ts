/**
 * TanStack Query hooks for OASA/OASTH Telematics APIs
 * City-aware hooks that automatically use the correct API based on selected city
 */

import { useCity, type City } from '@/contexts/CityContext';
import { useQuery } from '@tanstack/react-query';
import * as oasaApi from './api';
import * as oasthApi from './oasth-api';
import type { BusLocation, Line, Route, RoutePoint, Stop, StopArrival } from './types';

// Get the appropriate API module for the city
function getApi(city: City) {
  return city === 'athens' ? oasaApi : oasthApi;
}

// Query keys for cache management - now include city for proper cache separation
export const queryKeys = {
  lines: (city: City) => ['lines', city] as const,
  routes: (city: City, lineCode: string) => ['routes', city, lineCode] as const,
  routeDetails: (city: City, routeCode: string) => ['routeDetails', city, routeCode] as const,
  busLocations: (city: City, routeCode: string) => ['busLocations', city, routeCode] as const,
  stopArrivals: (city: City, stopCode: string) => ['stopArrivals', city, stopCode] as const,
  stops: (city: City, routeCode: string) => ['stops', city, routeCode] as const,
  closestStops: (city: City, lat: number, lng: number) => ['closestStops', city, lat, lng] as const,
};

/**
 * Get all bus lines
 * staleTime: Infinity - lines rarely change
 */
export function useLines() {
  const { city } = useCity();
  const api = getApi(city);
  
  return useQuery<Line[]>({
    queryKey: queryKeys.lines(city),
    queryFn: api.getLines,
    staleTime: Infinity, // Lines rarely change
  });
}

/**
 * Get routes for a line
 */
export function useRoutes(lineCode: string | null) {
  const { city } = useCity();
  const api = getApi(city);
  
  return useQuery<Route[]>({
    queryKey: queryKeys.routes(city, lineCode || ''),
    queryFn: () => api.getRoutesForLine(lineCode!),
    enabled: !!lineCode,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Get route polyline details
 */
export function useRouteDetails(routeCode: string | null) {
  const { city } = useCity();
  const api = getApi(city);
  
  return useQuery<RoutePoint[]>({
    queryKey: queryKeys.routeDetails(city, routeCode || ''),
    queryFn: () => api.getRouteDetails(routeCode!),
    enabled: !!routeCode,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Get live bus locations
 * refetchInterval: 10000 - poll every 10s when enabled
 */
export function useBusLocations(routeCode: string | null, options?: { enabled?: boolean }) {
  const { city } = useCity();
  const api = getApi(city);
  const enabled = options?.enabled !== false && !!routeCode;
  
  return useQuery<BusLocation[]>({
    queryKey: queryKeys.busLocations(city, routeCode || ''),
    queryFn: () => api.getBusLocations(routeCode!),
    enabled,
    refetchInterval: enabled ? 10000 : false, // Poll every 10s when map is open
    staleTime: 5000, // Consider stale after 5s
  });
}

/**
 * Get arrivals at a stop
 */
export function useStopArrivals(stopCode: string | null) {
  const { city } = useCity();
  const api = getApi(city);
  
  return useQuery<StopArrival[]>({
    queryKey: queryKeys.stopArrivals(city, stopCode || ''),
    queryFn: () => api.getStopArrivals(stopCode!),
    enabled: !!stopCode,
    refetchInterval: 30000, // Refresh every 30s
    staleTime: 10000,
  });
}

/**
 * Get stops for a route
 */
export function useStops(routeCode: string | null) {
  const { city } = useCity();
  
  return useQuery<Stop[]>({
    queryKey: queryKeys.stops(city, routeCode || ''),
    queryFn: () => {
      if (city === 'athens') {
        return oasaApi.getStops(routeCode!);
      }
      // OASTH doesn't have a direct route-stops endpoint
      return Promise.resolve([]);
    },
    enabled: !!routeCode,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Get closest stops to user location
 */
export function useClosestStops(lat: number | null, lng: number | null, options?: { enabled?: boolean }) {
  const { city } = useCity();
  const api = getApi(city);
  const hasLocation = lat !== null && lng !== null;
  const shouldFetch = options?.enabled !== false && hasLocation;
  
  return useQuery<Stop[]>({
    queryKey: queryKeys.closestStops(city, lat || 0, lng || 0),
    queryFn: () => api.getClosestStops(lat!, lng!),
    enabled: shouldFetch,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get all routes serving a stop
 */
export function useRoutesForStop(stopCode: string | null) {
  const { city } = useCity();
  const api = getApi(city);
  
  return useQuery<oasaApi.StopRoute[]>({
    queryKey: ['routesForStop', city, stopCode || ''],
    queryFn: () => api.getRoutesForStop(stopCode!),
    enabled: !!stopCode,
    staleTime: 1000 * 60 * 60, // 1 hour - routes rarely change
  });
}

/**
 * Get schedule/timetable for a line
 */
export function useSchedule(lineCode: string | null) {
  const { city } = useCity();
  const api = getApi(city);
  
  return useQuery<oasaApi.LineScheduleResult>({
    queryKey: ['schedule', city, lineCode || ''],
    queryFn: () => api.getLineSchedule('', lineCode!),
    enabled: !!lineCode,
    staleTime: 1000 * 60 * 60, // 1 hour - schedules don't change often
  });
}

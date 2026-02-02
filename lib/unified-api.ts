/**
 * Unified API Client
 * Automatically switches between OASA (Athens) and OASTH (Thessaloniki) APIs
 * based on the selected city context
 */

import type { LineScheduleResult, StopRoute } from './api';
import * as OasaApi from './api';
import * as OasthApi from './oasth-api';
import type { BusLocation, Line, Route, RoutePoint, Stop, StopArrival } from './types';

export type City = 'athens' | 'thessaloniki';

/**
 * Get the appropriate API based on city
 */
function getApi(city: City) {
  return city === 'athens' ? OasaApi : OasthApi;
}

/**
 * Get all bus lines
 */
export async function getLines(city: City): Promise<Line[]> {
  const api = getApi(city);
  return api.getLines();
}

/**
 * Get routes for a specific line
 */
export async function getRoutesForLine(city: City, lineCode: string): Promise<Route[]> {
  const api = getApi(city);
  return api.getRoutesForLine(lineCode);
}

/**
 * Get route details (polyline points)
 */
export async function getRouteDetails(city: City, routeCode: string): Promise<RoutePoint[]> {
  const api = getApi(city);
  return api.getRouteDetails(routeCode);
}

/**
 * Get live bus locations for a route
 */
export async function getBusLocations(city: City, routeCode: string): Promise<BusLocation[]> {
  const api = getApi(city);
  return api.getBusLocations(routeCode);
}

/**
 * Get arrivals at a stop
 */
export async function getStopArrivals(city: City, stopCode: string): Promise<StopArrival[]> {
  const api = getApi(city);
  return api.getStopArrivals(stopCode);
}

/**
 * Get stops for a route
 */
export async function getStops(city: City, routeCode: string): Promise<Stop[]> {
  if (city === 'athens') {
    return OasaApi.getStops(routeCode);
  }
  // OASTH doesn't have the same endpoint - would need route-stop mapping
  console.warn('getStops for route not fully implemented for OASTH');
  return [];
}

/**
 * Get closest stops to a location
 */
export async function getClosestStops(city: City, lat: number, lng: number): Promise<Stop[]> {
  const api = getApi(city);
  return api.getClosestStops(lat, lng);
}

/**
 * Get routes that serve a stop
 */
export async function getRoutesForStop(city: City, stopCode: string): Promise<StopRoute[]> {
  const api = getApi(city);
  return api.getRoutesForStop(stopCode);
}

/**
 * Get schedule for a line
 */
export async function getLineSchedule(city: City, mlCode: string, lineCode: string): Promise<LineScheduleResult> {
  const api = getApi(city);
  return api.getLineSchedule(mlCode, lineCode);
}

/**
 * Get route name by code (Athens only)
 */
export async function getRouteName(city: City, routeCode: string): Promise<{ route_descr: string; route_descr_eng: string }[]> {
  if (city === 'athens') {
    return OasaApi.getRouteName(routeCode);
  }
  return [];
}

import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useCity } from "@/contexts/CityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useBusLocations, useClosestStops, useStops } from "@/lib/queries";
import { getTransitNetwork, type TransitStation } from "@/lib/transit-lines";
import type { Stop } from "@/lib/types";

import { ArrivalsSheet } from "@/components/arrivals/ArrivalsSheet";
import { NearbyStopsCards } from "@/components/map/NearbyStopsCards";
import {
  MapMarker,
  OpenStreetMap,
  OpenStreetMapRef,
} from "@/components/map/OpenStreetMap";
import { SettingsModal } from "@/components/settings/SettingsModal";

export default function StopsScreen() {
  const { theme: colorScheme } = useTheme();
  const { t } = useLanguage();
  const { city, cityConfig, isAthens } = useCity(); // Added isAthens
  const colors = Colors[colorScheme];

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<OpenStreetMapRef>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationReady, setLocationReady] = useState(false);

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{
    latitude: number;
    longitude: number;
  }>({ latitude: cityConfig.center.lat, longitude: cityConfig.center.lng });
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedRouteCode] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shouldFetchStops, setShouldFetchStops] = useState(true); // Only fetch when zoomed in

  // Queries - use mapCenter for fetching stops (updates when map moves)
  // Only fetch when shouldFetchStops is true (zoomed in enough)
  const { data: nearbyStops } = useClosestStops(
    mapCenter.latitude,
    mapCenter.longitude,
    { enabled: shouldFetchStops }
  );

  const { data: busLocations } = useBusLocations(selectedRouteCode, {
    enabled: isMapReady,
  });
  const { data: routeStops } = useStops(selectedRouteCode);

  // Get transit stations
  const transitNetwork = useMemo(() => getTransitNetwork(isAthens ? "athens" : "thessaloniki"), [isAthens]);
  
  const stationMarkers: MapMarker[] = useMemo(() => {
    return transitNetwork.stations.map((station: TransitStation) => {
      const lineId = station.lineIds[0];
      const line = transitNetwork.lines.find((l) => l.id === lineId);
      
      const lines = station.lineIds.map((lid) => {
        const l = transitNetwork.lines.find((x) => x.id === lid);
        let code = lid.toUpperCase();
        if (lid.startsWith('line')) code = lid.replace('line', 'M').toUpperCase();
        if (lid === 'thessMetro') code = 'M1';
        if (lid === 'thessKalamaria') code = 'M2';
        if (lid === 'thessWest') code = 'M2'; // Future extension
        
        return {
          code: code,
          color: l?.color || "#555"
        };
      });

      return {
        id: station.id,
        latitude: station.latitude,
        longitude: station.longitude,
        type: "station",
        label: station.name,
        color: line?.color || "#555",
        lines: lines,
      };
    });
  }, [transitNetwork]);

  // Get user location on mount
  useEffect(() => {
    let isMounted = true;

    // Set a timeout to show map after 2 seconds even without location
    const timeout = setTimeout(() => {
      if (isMounted && !locationReady) {
        setLocationReady(true);
      }
    }, 2000);

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (isMounted) setLocationReady(true);
        return;
      }

      // First, try to get last known location for instant response
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown && isMounted) {
        const userLoc = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        setUserLocation(userLoc);
        setMapCenter(userLoc);
        setLocationReady(true);
        clearTimeout(timeout);
      }

      // Then get current location with balanced accuracy for speed
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted) {
          const userLoc = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(userLoc);
          if (!lastKnown) {
            setMapCenter(userLoc);
          }
          setLocationReady(true);
          clearTimeout(timeout);
        }
      } catch (error) {
        console.log("Error getting current position:", error);
        if (isMounted) setLocationReady(true);
      }
    })();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset map and data when city changes
  useEffect(() => {
    const newCenter = { latitude: cityConfig.center.lat, longitude: cityConfig.center.lng };
    setMapCenter(newCenter);
    setSelectedStop(null);
    // Fly to new city center
    if (mapRef.current) {
      mapRef.current.centerOnLocation(newCenter.latitude, newCenter.longitude);
    }
  }, [city, cityConfig.center.lat, cityConfig.center.lng]);

  // Handle stop press from nearby cards
  const handleStopPress = useCallback((stop: Stop) => {
    setSelectedStop(stop);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // Handle marker press from map
  const handleMarkerPress = useCallback(
    (markerId: string) => {
      // Check if it's a transit station
      const station = transitNetwork.stations.find((s: TransitStation) => s.id === markerId);
      if (station) {
         // Optionally show station info. For now, we do nothing or could alert.
         // We could implement a simple BottomSheet view for stations too?
         // Just return to avoid crash.
         return; 
      }

      const stops = routeStops || nearbyStops || [];
      const stop = stops.find((s) => s.StopCode === markerId);
      if (stop) {
        setSelectedStop(stop);
        bottomSheetRef.current?.snapToIndex(0);
      }
    },
    [routeStops, nearbyStops, transitNetwork]
  );

  // Handle sheet close
  const handleSheetClose = useCallback(() => {
    setSelectedStop(null);
  }, []);

  // Handle map region change - load stops for new area (only when zoomed in)
  const handleRegionChange = useCallback(
    (region: { latitude: number; longitude: number; zoom: number; shouldFetchStops: boolean }) => {
      setMapCenter({ latitude: region.latitude, longitude: region.longitude });
      setShouldFetchStops(region.shouldFetchStops);
    },
    [],
  );

  // Get stops to display (nearby or route stops) - only when zoomed in
  const stopsToDisplay = shouldFetchStops ? (routeStops || nearbyStops || []) : [];

  // Convert stops to map markers
  const mapMarkers: MapMarker[] = stopsToDisplay.slice(0, 30).map((stop) => ({
    id: stop.StopCode,
    latitude: parseFloat(stop.StopLat),
    longitude: parseFloat(stop.StopLng),
    type: "stop" as const,
    label: stop.StopDescrEng || stop.StopDescr,
    selected: selectedStop?.StopCode === stop.StopCode,
  }));

  // Add bus markers
  const busMarkers: MapMarker[] = (busLocations || []).map((bus) => ({
    id: bus.VEH_NO,
    latitude: parseFloat(bus.CS_LAT),
    longitude: parseFloat(bus.CS_LNG),
    type: "bus" as const,
    label: bus.VEH_NO,
  }));

  const allMarkers = [...stationMarkers, ...mapMarkers, ...busMarkers];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t.athensBuses}
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* OpenStreetMap */}
      <OpenStreetMap
        ref={mapRef}
        center={mapCenter}
        zoom={15}
        markers={allMarkers}
        userLocation={userLocation}
        onMarkerPress={handleMarkerPress}
        onMapReady={() => setIsMapReady(true)}
        onRegionChange={handleRegionChange}
        darkMode={colorScheme === "dark"}
      />

      {/* Current location button */}
      <TouchableOpacity
        style={[
          styles.locationButton,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        disabled={isLocating}
        onPress={async () => {
          if (isLocating) return;
          setIsLocating(true);
          try {
            if (userLocation) {
              // Already have location, just center
              mapRef.current?.centerOnLocation(
                userLocation.latitude,
                userLocation.longitude,
              );
              setMapCenter(userLocation);
            } else {
              // Try last known first for speed
              const lastKnown = await Location.getLastKnownPositionAsync({});
              if (lastKnown) {
                const newLoc = {
                  latitude: lastKnown.coords.latitude,
                  longitude: lastKnown.coords.longitude,
                };
                setUserLocation(newLoc);
                mapRef.current?.centerOnLocation(
                  newLoc.latitude,
                  newLoc.longitude,
                );
                setMapCenter(newLoc);
              }
              // Then get current with balanced accuracy
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              const newLoc = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };
              setUserLocation(newLoc);
              mapRef.current?.centerOnLocation(
                newLoc.latitude,
                newLoc.longitude,
              );
              setMapCenter(newLoc);
            }
          } catch (error) {
            console.log("Error getting location:", error);
          } finally {
            setTimeout(() => setIsLocating(false), 300);
          }
        }}
      >
        <Ionicons
          name={isLocating ? "locate-outline" : "locate"}
          size={22}
          color={colors.accent}
        />
      </TouchableOpacity>

      {/* Nearby stops cards */}
      <NearbyStopsCards
        userLocation={userLocation}
        onStopPress={handleStopPress}
      />

      {/* Arrivals bottom sheet */}
      <ArrivalsSheet
        ref={bottomSheetRef}
        stop={selectedStop}
        onClose={handleSheetClose}
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 12,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
  },
  locationButton: {
    position: "absolute",
    right: 16,
    bottom: 140,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

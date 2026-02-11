/**
 * Network Map Screen
 * Displays the transit network either as an interactive map
 * with metro lines and station markers, or as a static image map.
 * Toggle between the two modes using the header switch.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    PanGestureHandler,
    PinchGestureHandler,
    State,
    type PanGestureHandlerStateChangeEvent,
    type PinchGestureHandlerStateChangeEvent
} from "react-native-gesture-handler";
import { WebView } from "react-native-webview";

import { Colors } from "@/constants/theme";
import { useCity } from "@/contexts/CityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getTransitNetwork, type TransitLine, type TransitStation } from "@/lib/transit-lines";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY || "";

// Map images
const athensMap = require("@/assets/images/athens_map.jpg");
const thessalonikiMap = require("@/assets/images/thessaloniki_map.jpg");

type MapMode = "interactive" | "image";

export default function NetworkMapScreen() {
  const { theme: colorScheme } = useTheme();
  const { t, language } = useLanguage();
  const { isAthens } = useCity();
  const colors = Colors[colorScheme];
  const darkMode = colorScheme === "dark";

  const [mapMode, setMapMode] = useState<MapMode>("interactive");

  const cityName = isAthens ? t.athens : t.thessaloniki;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {cityName} — {t.networkMap}
        </Text>
        {/* Mode Toggle */}
        <View style={[styles.modeToggle, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mapMode === "interactive" && { backgroundColor: colors.accent },
            ]}
            onPress={() => setMapMode("interactive")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="map-outline"
              size={16}
              color={mapMode === "interactive" ? "#fff" : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: mapMode === "interactive" ? "#fff" : colors.textSecondary },
              ]}
            >
              {language === "el" ? "Χάρτης" : "Map"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mapMode === "image" && { backgroundColor: colors.accent },
            ]}
            onPress={() => setMapMode("image")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="image-outline"
              size={16}
              color={mapMode === "image" ? "#fff" : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: mapMode === "image" ? "#fff" : colors.textSecondary },
              ]}
            >
              {language === "el" ? "Εικόνα" : "Image"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mapMode === "interactive" ? (
        <InteractiveMap
          isAthens={isAthens}
          colors={colors}
          darkMode={darkMode}
          language={language}
        />
      ) : (
        <ImageMap
          isAthens={isAthens}
          colors={colors}
        />
      )}
    </View>
  );
}

// =============================================================================
// INTERACTIVE MAP COMPONENT
// =============================================================================

interface InteractiveMapProps {
  isAthens: boolean;
  colors: any;
  darkMode: boolean;
  language: string;
}

function InteractiveMap({ isAthens, colors, darkMode, language }: InteractiveMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(null);
  const [enabledLines, setEnabledLines] = useState<Record<string, boolean>>({});

  const network = useMemo(() => getTransitNetwork(isAthens ? "athens" : "thessaloniki"), [isAthens]);

  // Initialize all lines as enabled
  useMemo(() => {
    const initial: Record<string, boolean> = {};
    network.lines.forEach((line) => {
      initial[line.id] = true;
    });
    setEnabledLines(initial);
  }, [network]);

  const center = isAthens
    ? { lat: 37.975, lng: 23.735 }
    : { lat: 40.6200, lng: 22.955 };
  const defaultZoom = isAthens ? 11.5 : 12.5;

  const mapStyle = darkMode
    ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_API_KEY}`
    : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`;

  const buildLinesGeoJSON = useCallback(
    (lines: TransitLine[], enabled: Record<string, boolean>) => ({
      type: "FeatureCollection",
      features: lines
        .filter((line) => enabled[line.id] !== false)
        .map((line) => ({
          type: "Feature",
          properties: { id: line.id, name: line.name, color: line.color, type: line.type },
          geometry: { type: "LineString", coordinates: line.coordinates },
        })),
    }),
    []
  );

  const buildStationsGeoJSON = useCallback(
    (stations: TransitStation[], enabled: Record<string, boolean>) => ({
      type: "FeatureCollection",
      features: stations
        .filter((s) => s.lineIds.some((lid) => enabled[lid] !== false))
        .map((s) => ({
          type: "Feature",
          properties: {
            id: s.id,
            name: language === "el" ? s.nameEl : s.name,
            isInterchange: s.isInterchange || false,
            lineIds: s.lineIds.join(","),
          },
          geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
        })),
    }),
    [language]
  );

  const mapHtml = useMemo(() => {
    const linesJSON = JSON.stringify(buildLinesGeoJSON(network.lines, enabledLines));
    const stationsJSON = JSON.stringify(buildStationsGeoJSON(network.stations, enabledLines));
    const lineColors = JSON.stringify(Object.fromEntries(network.lines.map((l) => [l.id, l.color])));

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link href="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; background: ${darkMode ? "#1a1a2e" : "#f0f0f0"}; }
    .maplibregl-ctrl-attrib { display: none !important; }
    .maplibregl-ctrl-logo { display: none !important; }
    .station-popup .name { font-family: -apple-system, sans-serif; font-size: 14px; font-weight: 600; color: ${darkMode ? "#fff" : "#1a1a2e"}; margin-bottom: 4px; }
    .station-popup .lines { display: flex; gap: 4px; flex-wrap: wrap; }
    .station-popup .line-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; color: #fff; font-size: 11px; font-weight: 600; }
    .maplibregl-popup-content { background: ${darkMode ? "#2a2a3e" : "#fff"} !important; border-radius: 12px !important; padding: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; }
    .maplibregl-popup-tip { border-top-color: ${darkMode ? "#2a2a3e" : "#fff"} !important; }
    .maplibregl-popup-close-button { color: ${darkMode ? "#aaa" : "#666"} !important; font-size: 18px !important; right: 6px !important; top: 4px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var lineColors = ${lineColors};
    var map = new maplibregl.Map({
      container: 'map',
      style: '${mapStyle}',
      center: [${center.lng}, ${center.lat}],
      zoom: ${defaultZoom},
      attributionControl: false
    });

    map.on('load', function() {
      map.addSource('transit-lines', { type: 'geojson', data: ${linesJSON} });
      map.addLayer({
        id: 'transit-lines-casing', type: 'line', source: 'transit-lines',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.5 }
      });
      map.addLayer({
        id: 'transit-lines-layer', type: 'line', source: 'transit-lines',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.9 }
      });

      map.addSource('transit-stations', { type: 'geojson', data: ${stationsJSON} });
      map.addLayer({
        id: 'transit-stations-outer', type: 'circle', source: 'transit-stations',
        paint: { 'circle-radius': ['case', ['get', 'isInterchange'], 9, 6], 'circle-color': '#ffffff', 'circle-stroke-width': 0 }
      });
      map.addLayer({
        id: 'transit-stations-inner', type: 'circle', source: 'transit-stations',
        paint: { 'circle-radius': ['case', ['get', 'isInterchange'], 6, 4], 'circle-color': ${darkMode ? "'#2a2a3e'" : "'#ffffff'"}, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
      });
      map.addLayer({
        id: 'transit-stations-labels', type: 'symbol', source: 'transit-stations',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 0, 12, 10, 14, 13],
          'text-offset': [0, 1.5], 'text-anchor': 'top',
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': false, 'text-optional': true
        },
        paint: { 'text-color': ${darkMode ? "'#e0e0e0'" : "'#333333'"}, 'text-halo-color': ${darkMode ? "'#1a1a2e'" : "'#ffffff'"}, 'text-halo-width': 2 }
      });

      map.on('click', 'transit-stations-outer', function(e) {
        if (!e.features || !e.features[0]) return;
        var props = e.features[0].properties;
        var coords = e.features[0].geometry.coordinates;
        var lineIds = props.lineIds.split(',');
        var badges = lineIds.map(function(lid) {
          var c = lineColors[lid] || '#888';
          return '<span class="line-badge" style="background:' + c + '">' + lid.replace('line', 'M').replace('thessMetro', 'M1').replace('tram-coast', 'Tram').replace('tram', 'Tram').replace('suburban', 'Sub.') + '</span>';
        }).join('');
        new maplibregl.Popup({ closeButton: true, maxWidth: '220px' })
          .setLngLat(coords)
          .setHTML('<div class="station-popup"><div class="name">' + props.name + '</div><div class="lines">' + badges + '</div></div>')
          .addTo(map);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stationPress', id: props.id, name: props.name }));
      });
      map.on('mouseenter', 'transit-stations-outer', function() { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'transit-stations-outer', function() { map.getCanvas().style.cursor = ''; });
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    });

    function updateTransitData(linesData, stationsData) {
      if (map.getSource('transit-lines')) map.getSource('transit-lines').setData(linesData);
      if (map.getSource('transit-stations')) map.getSource('transit-stations').setData(stationsData);
    }
  </script>
</body>
</html>`;
  }, [darkMode, mapStyle, network, enabledLines, language, center, defaultZoom, buildLinesGeoJSON, buildStationsGeoJSON]);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "stationPress") {
          const station = network.stations.find((s) => s.id === data.id);
          if (station) setSelectedStation(station);
        }
      } catch { /* ignore */ }
    },
    [network.stations]
  );

  const toggleLine = useCallback(
    (lineId: string) => {
      const newEnabled = { ...enabledLines, [lineId]: !enabledLines[lineId] };
      setEnabledLines(newEnabled);
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          updateTransitData(${JSON.stringify(buildLinesGeoJSON(network.lines, newEnabled))}, ${JSON.stringify(buildStationsGeoJSON(network.stations, newEnabled))});
          true;
        `);
      }
    },
    [enabledLines, network, buildLinesGeoJSON, buildStationsGeoJSON]
  );

  const displayLines = useMemo(() => {
    const seen = new Set<string>();
    return network.lines.filter((line) => {
      const displayId = line.id.startsWith("tram") ? "tram-group" : line.id;
      if (seen.has(displayId)) return false;
      seen.add(displayId);
      return true;
    });
  }, [network.lines]);

  return (
    <>
      {/* Line Toggles */}
      <View style={styles.toggleContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toggleScroll}
        >
          {displayLines.map((line) => {
            const isTramGroup = line.id.startsWith("tram");
            const isEnabled = isTramGroup
              ? network.lines.filter((l) => l.id.startsWith("tram")).some((l) => enabledLines[l.id] !== false)
              : enabledLines[line.id] !== false;

            return (
              <TouchableOpacity
                key={line.id}
                style={[styles.toggleButton, { backgroundColor: isEnabled ? line.color : colors.card, borderColor: line.color }]}
                onPress={() => {
                  if (isTramGroup) {
                    const tramLines = network.lines.filter((l) => l.id.startsWith("tram"));
                    const newEnabled = { ...enabledLines };
                    tramLines.forEach((l) => { newEnabled[l.id] = !isEnabled; });
                    setEnabledLines(newEnabled);
                    if (webViewRef.current) {
                      webViewRef.current.injectJavaScript(`
                        updateTransitData(${JSON.stringify(buildLinesGeoJSON(network.lines, newEnabled))}, ${JSON.stringify(buildStationsGeoJSON(network.stations, newEnabled))});
                        true;
                      `);
                    }
                  } else {
                    toggleLine(line.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={line.type === "metro" ? "subway-outline" : "train-outline"}
                  size={16}
                  color={isEnabled ? "#fff" : line.color}
                />
                <Text style={[styles.toggleText, { color: isEnabled ? "#fff" : colors.text }]}>
                  {language === "el" ? line.nameEl : line.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
        />
      </View>

      {/* Selected Station Info */}
      {selectedStation && (
        <View style={[styles.stationInfo, { backgroundColor: colors.card }]}>
          <View style={styles.stationInfoContent}>
            <View style={styles.stationInfoHeader}>
              <Ionicons
                name={selectedStation.isInterchange ? "git-compare-outline" : "location-outline"}
                size={22}
                color={colors.accent}
              />
              <Text style={[styles.stationName, { color: colors.text }]}>
                {language === "el" ? selectedStation.nameEl : selectedStation.name}
              </Text>
            </View>
            <View style={styles.stationLines}>
              {selectedStation.lineIds.map((lid) => {
                const line = network.lines.find((l) => l.id === lid);
                if (!line) return null;
                return (
                  <View key={lid} style={[styles.lineBadge, { backgroundColor: line.color }]}>
                    <Text style={styles.lineBadgeText}>
                      {language === "el" ? line.nameEl : line.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedStation(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

// =============================================================================
// IMAGE MAP COMPONENT (Static image with pinch-to-zoom & pan)
// =============================================================================

interface ImageMapProps {
  isAthens: boolean;
  colors: any;
}

function ImageMap({ isAthens, colors }: ImageMapProps) {
  const scaleVal = useRef(new Animated.Value(1));
  const pinchScaleVal = useRef(new Animated.Value(1));
  const translateXVal = useRef(new Animated.Value(0));
  const translateYVal = useRef(new Animated.Value(0));
  const baseScale = useRef(1);
  const lastOffset = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const [currentScale, setCurrentScale] = useState(1);

  const scale = scaleVal.current;
  const pinchScale = pinchScaleVal.current;
  const translateX = translateXVal.current;
  const translateY = translateYVal.current;

  const imageWidth = SCREEN_WIDTH;
  const imageHeight = SCREEN_HEIGHT * 0.75;

  const getMaxTranslation = (s: number) => ({
    maxX: Math.max(0, (imageWidth * s - imageWidth) / 2),
    maxY: Math.max(0, (imageHeight * s - imageHeight) / 2),
  });

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true }
  );

  const onPinchHandlerStateChange = (event: PinchGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const newScale = Math.min(Math.max(baseScale.current * event.nativeEvent.scale, 1), 4);
      baseScale.current = newScale;
      setCurrentScale(newScale);
      scale.setValue(newScale);
      pinchScale.setValue(1);
      const { maxX, maxY } = getMaxTranslation(newScale);
      lastOffset.current.x = clamp(lastOffset.current.x, -maxX, maxX);
      lastOffset.current.y = clamp(lastOffset.current.y, -maxY, maxY);
      translateX.setOffset(lastOffset.current.x);
      translateX.setValue(0);
      translateY.setOffset(lastOffset.current.y);
      translateY.setValue(0);
    }
  };

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { maxX, maxY } = getMaxTranslation(baseScale.current);
      const newX = clamp(lastOffset.current.x + event.nativeEvent.translationX, -maxX, maxX);
      const newY = clamp(lastOffset.current.y + event.nativeEvent.translationY, -maxY, maxY);
      lastOffset.current.x = newX;
      lastOffset.current.y = newY;
      translateX.setOffset(newX);
      translateX.setValue(0);
      translateY.setOffset(newY);
      translateY.setValue(0);
    }
  };

  const handleReset = () => {
    baseScale.current = 1;
    setCurrentScale(1);
    scale.setValue(1);
    pinchScale.setValue(1);
    lastOffset.current = { x: 0, y: 0 };
    translateX.setOffset(0);
    translateX.setValue(0);
    translateY.setOffset(0);
    translateY.setValue(0);
  };

  const mapImage = isAthens ? athensMap : thessalonikiMap;
  const animatedScale = Animated.multiply(scale, pinchScale);

  return (
    <>
      {/* Zoom indicator */}
      <View style={styles.zoomIndicator}>
        <Text style={[styles.zoomText, { color: colors.textSecondary }]}>
          {currentScale > 1 ? `${Math.round(currentScale * 100)}%` : "Pinch to zoom"}
        </Text>
      </View>

      {/* Image Container */}
      <View style={styles.mapContainer}>
        <PanGestureHandler
          ref={panRef}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanHandlerStateChange}
          simultaneousHandlers={pinchRef}
          minPointers={1}
          maxPointers={2}
        >
          <Animated.View style={{ flex: 1 }}>
            <PinchGestureHandler
              ref={pinchRef}
              onGestureEvent={onPinchGestureEvent}
              onHandlerStateChange={onPinchHandlerStateChange}
              simultaneousHandlers={panRef}
            >
              <Animated.View
                style={[
                  styles.imageContainer,
                  {
                    transform: [
                      { translateX },
                      { translateY },
                      { scale: animatedScale },
                    ],
                  },
                ]}
              >
                <Image
                  source={mapImage}
                  style={{ width: imageWidth, height: imageHeight }}
                  resizeMode="contain"
                />
              </Animated.View>
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* Reset Button */}
      {currentScale > 1 && (
        <View style={styles.resetButtonContainer}>
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.accent }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      <View style={[styles.instructions, { backgroundColor: colors.card }]}>
        <Ionicons name="hand-left-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
          Pinch to zoom • Drag to pan
        </Text>
      </View>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 17,
    gap: 4,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleContainer: {
    paddingBottom: 10,
  },
  toggleScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stationInfo: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  stationInfoContent: {
    flex: 1,
    marginRight: 12,
  },
  stationInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  stationName: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  stationLines: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  lineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lineBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  zoomIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  zoomText: {
    fontSize: 13,
    textAlign: "center",
  },
  resetButtonContainer: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },
  resetButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  instructions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  instructionsText: {
    fontSize: 14,
  },
});

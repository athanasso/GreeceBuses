import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

// MapTiler API Key from environment variable
const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY || "";

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: "stop" | "bus" | "station";
  label?: string;
  selected?: boolean;
  color?: string;
  lines?: { code: string; color: string }[];
}

export interface OpenStreetMapProps {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers?: MapMarker[];
  userLocation?: { latitude: number; longitude: number } | null;
  onMarkerPress?: (markerId: string) => void;
  onMapReady?: () => void;
  onRegionChange?: (region: { latitude: number; longitude: number; zoom: number; shouldFetchStops: boolean }) => void;
  darkMode?: boolean;
}

export interface OpenStreetMapRef {
  centerOnLocation: (lat: number, lng: number) => void;
}

function OpenStreetMapComponent(
  {
    center,
    zoom = 15,
    markers = [],
    userLocation,
    onMarkerPress,
    onMapReady,
    onRegionChange,
    darkMode = true,
  }: OpenStreetMapProps,
  ref: React.Ref<OpenStreetMapRef>
) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  
  // Store initial center to prevent map reload on center prop changes
  const initialCenterRef = useRef({ latitude: center.latitude, longitude: center.longitude });
  const initialZoomRef = useRef(zoom);

  // Expose centerOnLocation method to parent
  useImperativeHandle(
    ref,
    () => ({
      centerOnLocation: (lat: number, lng: number) => {
        if (mapReady && webViewRef.current) {
          webViewRef.current.injectJavaScript(`
          map.flyTo({ center: [${lng}, ${lat}], zoom: 15 });
          true;
        `);
        }
      },
    }),
    [mapReady]
  );

  // MapTiler style - streets for light mode, streets-dark for dark mode (Google Maps-like appearance)
  const mapStyle = darkMode
    ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_API_KEY}`
    : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`;

  // Memoize the initial HTML - only recreate when darkMode changes (not on center/zoom changes)
  const mapHtml = useMemo(() => {
    const initLat = initialCenterRef.current.latitude;
    const initLng = initialCenterRef.current.longitude;
    const initZoom = initialZoomRef.current;
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link href="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; background: ${
      darkMode ? "#1a1a2e" : "#f0f0f0"
    }; }
    .maplibregl-ctrl-attrib { display: none !important; }
    .maplibregl-ctrl-logo { display: none !important; }
    
    /* Custom marker styles */
    .marker-stop { cursor: pointer; }
    .marker-bus { cursor: pointer; }
    .marker-station { cursor: pointer; box-shadow: 0 0 4px rgba(0,0,0,0.5); }
    .marker-user {
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border: 3px solid #fff;
      border-radius: 50%;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    
    /* Popup styling */
    .station-popup .name { font-family: -apple-system, sans-serif; font-size: 14px; font-weight: 600; color: ${
      darkMode ? "#fff" : "#1a1a2e"
    }; margin-bottom: 4px; }
    .station-popup .lines { display: flex; gap: 4px; flex-wrap: wrap; }
    .station-popup .line-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; color: #fff; font-size: 11px; font-weight: 600; }
    .maplibregl-popup-content { background: ${
      darkMode ? "#2a2a3e" : "#fff"
    } !important; border-radius: 12px !important; padding: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; }
    .maplibregl-popup-tip { border-top-color: ${
      darkMode ? "#2a2a3e" : "#fff"
    } !important; }
    .maplibregl-popup-close-button { color: ${
      darkMode ? "#aaa" : "#666"
    } !important; font-size: 18px !important; right: 6px !important; top: 4px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = new maplibregl.Map({
      container: 'map',
      style: '${mapStyle}',
      center: [${initLng}, ${initLat}],
      zoom: ${initZoom},
      attributionControl: false,
      logoPosition: 'bottom-left'
    });
    
    var currentMarkers = [];
    
    // Create SVG for stop pin marker
    function createStopPinSVG(color, selected) {
      var size = selected ? 36 : 28;
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24">' +
        '<path fill="' + color + '" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>' +
        '<circle cx="12" cy="9" r="3" fill="#fff"/>' +
        '</svg>';
    }
    
    function clearMarkers() {
      currentMarkers.forEach(function(marker) {
        marker.remove();
      });
      currentMarkers = [];
    }
    
    function updateMarkers(markersData, userLoc) {
      clearMarkers();
      
      if (markersData && markersData.length > 0) {
        markersData.forEach(function(m) {
          var el = document.createElement('div');
          var marker;
          
          if (m.type === 'stop') {
            var color = '#8B5CF6';
            el.className = 'marker-stop';
            el.innerHTML = createStopPinSVG(color, m.selected);
            marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([m.longitude, m.latitude])
              .addTo(map);
          } else if (m.type === 'station') {
            // Station marker - colored circle
            el.className = 'marker-station';
            el.style.width = '14px';
            el.style.height = '14px';
            el.style.background = m.color || '#333';
            el.style.border = '2px solid #fff';
            el.style.borderRadius = '50%';
            
            marker = new maplibregl.Marker({ element: el })
              .setLngLat([m.longitude, m.latitude])
              .addTo(map);
          } else {
            // Bus marker - circle style
            el.className = 'marker-bus';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.background = '#22c55e';
            el.style.border = '2px solid #fff';
            el.style.borderRadius = '50%';
            el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            
            el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
              '<text x="12" y="16" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">🚌</text>' +
              '</svg>';
            
            marker = new maplibregl.Marker({ element: el })
              .setLngLat([m.longitude, m.latitude])
              .addTo(map);
          }
          
          
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            if (m.type === 'station') {
               var badges = '';
               if (m.lines && m.lines.length) {
                 badges = m.lines.map(function(l) {
                   return '<span class="line-badge" style="background:' + l.color + '">' + l.code + '</span>';
                 }).join('');
               }
               new maplibregl.Popup({ closeButton: true, maxWidth: '220px' })
                 .setLngLat([m.longitude, m.latitude])
                 .setHTML('<div class="station-popup"><div class="name">' + (m.label || 'Station') + '</div><div class="lines">' + badges + '</div></div>')
                 .addTo(map);
            }
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'markerPress', id: m.id}));
          });
          
          currentMarkers.push(marker);
        });
      }
      
      // Add user location marker
      if (userLoc) {
        var userEl = document.createElement('div');
        userEl.className = 'marker-user';
        
        var userMarker = new maplibregl.Marker({ element: userEl })
          .setLngLat([userLoc.longitude, userLoc.latitude])
          .addTo(map);
        
        currentMarkers.push(userMarker);
      }
    }
    
    map.on('load', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'mapReady'}));
    });
    
    // Track last reported center to avoid unnecessary updates
    var lastReportedCenter = { lat: ${initLat}, lng: ${initLng} };
    var lastReportedZoom = ${initZoom};
    var MIN_ZOOM_FOR_STOPS = 14; // Only fetch stops when zoom >= 14
    
    // Calculate distance between two points in meters (Haversine formula)
    function getDistance(lat1, lng1, lat2, lng2) {
      var R = 6371000; // Earth's radius in meters
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLng = (lng2 - lng1) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
    
    // Notify on map move/zoom - only fetch stops when zoomed in enough
    map.on('moveend', function() {
      var center = map.getCenter();
      var currentZoom = map.getZoom();
      var distance = getDistance(lastReportedCenter.lat, lastReportedCenter.lng, center.lat, center.lng);
      
      // Check if we crossed the zoom threshold
      var wasZoomedIn = lastReportedZoom >= MIN_ZOOM_FOR_STOPS;
      var isZoomedIn = currentZoom >= MIN_ZOOM_FOR_STOPS;
      var crossedZoomThreshold = wasZoomedIn !== isZoomedIn;
      
      // Trigger update if:
      // 1. Zoomed in enough AND (moved more than 500m OR just zoomed in past threshold)
      // 2. Just zoomed out past threshold (to clear markers)
      if (isZoomedIn && (distance > 500 || crossedZoomThreshold)) {
        lastReportedCenter = { lat: center.lat, lng: center.lng };
        lastReportedZoom = currentZoom;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'regionChange',
          latitude: center.lat,
          longitude: center.lng,
          zoom: currentZoom,
          shouldFetchStops: true
        }));
      } else if (crossedZoomThreshold && !isZoomedIn) {
        // Zoomed out past threshold - notify to clear stops
        lastReportedZoom = currentZoom;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'regionChange',
          latitude: center.lat,
          longitude: center.lng,
          zoom: currentZoom,
          shouldFetchStops: false
        }));
      }
    });
  </script>
</body>
</html>`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode, mapStyle]); // Only recreate HTML when theme changes, not on center/zoom changes

  // Update markers when they change
  useEffect(() => {
    if (mapReady && webViewRef.current) {
      const markersJson = JSON.stringify(markers);
      const userLocJson = userLocation ? JSON.stringify(userLocation) : "null";

      webViewRef.current.injectJavaScript(`
        updateMarkers(${markersJson}, ${userLocJson});
        true;
      `);
    }
  }, [markers, userLocation, mapReady]);

  // Center map on user location when it first becomes available
  const hasInitialCentered = useRef(false);
  useEffect(() => {
    if (
      mapReady &&
      userLocation &&
      webViewRef.current &&
      !hasInitialCentered.current
    ) {
      hasInitialCentered.current = true;
      webViewRef.current.injectJavaScript(`
        map.flyTo({ center: [${userLocation.longitude}, ${userLocation.latitude}], zoom: 15 });
        true;
      `);
    }
  }, [mapReady, userLocation]);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "markerPress" && onMarkerPress) {
          onMarkerPress(data.id);
        } else if (data.type === "mapReady") {
          setIsLoading(false);
          setMapReady(true);
          onMapReady?.();
        } else if (data.type === "regionChange" && onRegionChange) {
          onRegionChange({
            latitude: data.latitude,
            longitude: data.longitude,
            zoom: data.zoom || 15,
            shouldFetchStops: data.shouldFetchStops ?? true,
          });
        }
      } catch {
        // Silently ignore parse errors
      }
    },
    [onMarkerPress, onMapReady, onRegionChange]
  );

  return (
    <View style={styles.container}>
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
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      )}
    </View>
  );
}

export const OpenStreetMap = forwardRef<OpenStreetMapRef, OpenStreetMapProps>(
  OpenStreetMapComponent
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
});

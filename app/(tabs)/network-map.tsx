/**
 * Network Map Screen
 * Displays the transit network map for Athens or Thessaloniki
 * with pinch-to-zoom and pan functionality
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    GestureHandlerRootView,
    PanGestureHandler,
    PinchGestureHandler,
    State,
    type PanGestureHandlerStateChangeEvent,
    type PinchGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";

import { Colors } from "@/constants/theme";
import { useCity } from "@/contexts/CityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Map images
const athensMap = require("@/assets/images/athens_map.jpg");
const thessalonikiMap = require("@/assets/images/thessaloniki_map.jpg");

export default function NetworkMapScreen() {
  const { theme: colorScheme } = useTheme();
  const { t } = useLanguage();
  const { isAthens } = useCity();
  const colors = Colors[colorScheme];

  // Animation values for pinch-to-zoom
  const scale = useRef(new Animated.Value(1)).current;
  const baseScale = useRef(1);
  const pinchScale = useRef(new Animated.Value(1)).current;

  // Animation values for pan
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const [currentScale, setCurrentScale] = useState(1);

  // Image dimensions
  const imageWidth = SCREEN_WIDTH;
  const imageHeight = SCREEN_HEIGHT * 0.7;

  // Calculate max pan bounds based on current scale
  const getMaxTranslation = (scale: number) => {
    // When scale is 1, no panning allowed (image fits exactly)
    // When scale > 1, allow panning up to the extra scaled area
    const maxX = Math.max(0, (imageWidth * scale - imageWidth) / 2);
    const maxY = Math.max(0, (imageHeight * scale - imageHeight) / 2);
    return { maxX, maxY };
  };

  // Clamp a value within bounds
  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  // Handle pinch gesture
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

      // Clamp current position to new bounds after scale change
      const { maxX, maxY } = getMaxTranslation(newScale);
      lastOffset.current.x = clamp(lastOffset.current.x, -maxX, maxX);
      lastOffset.current.y = clamp(lastOffset.current.y, -maxY, maxY);
      translateX.setOffset(lastOffset.current.x);
      translateX.setValue(0);
      translateY.setOffset(lastOffset.current.y);
      translateY.setValue(0);
    }
  };

  // Handle pan gesture - only allow when zoomed in
  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { maxX, maxY } = getMaxTranslation(baseScale.current);
      
      // Calculate new position and clamp to bounds
      const newX = clamp(
        lastOffset.current.x + event.nativeEvent.translationX,
        -maxX,
        maxX
      );
      const newY = clamp(
        lastOffset.current.y + event.nativeEvent.translationY,
        -maxY,
        maxY
      );
      
      lastOffset.current.x = newX;
      lastOffset.current.y = newY;
      translateX.setOffset(newX);
      translateX.setValue(0);
      translateY.setOffset(newY);
      translateY.setValue(0);
    }
  };

  // Reset zoom and position
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
  const cityName = isAthens ? t.athens : t.thessaloniki;

  const animatedScale = Animated.multiply(scale, pinchScale);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {cityName} - {t.networkMap}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {currentScale > 1 ? `${Math.round(currentScale * 100)}%` : "Pinch to zoom"}
          </Text>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <PanGestureHandler
            onGestureEvent={onPanGestureEvent}
            onHandlerStateChange={onPanHandlerStateChange}
            minPointers={1}
            maxPointers={2}
          >
            <Animated.View style={{ flex: 1 }}>
              <PinchGestureHandler
                onGestureEvent={onPinchGestureEvent}
                onHandlerStateChange={onPinchHandlerStateChange}
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
                    style={styles.mapImage}
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
            <Animated.View
              style={[
                styles.resetButton,
                { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="refresh"
                size={24}
                color="#fff"
                onPress={handleReset}
              />
            </Animated.View>
          </View>
        )}

        {/* Zoom Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.card }]}>
          <Ionicons name="hand-left-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            Pinch to zoom • Drag to pan
          </Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    overflow: "hidden",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
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

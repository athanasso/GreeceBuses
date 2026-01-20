import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { StopRoute } from "@/lib/api";
import { useRoutesForStop, useStopArrivals } from "@/lib/queries";
import type { StopArrival } from "@/lib/types";

export default function StopDetailsScreen() {
  const { stopCode, stopName, stopNameEng, stopLat, stopLng } =
    useLocalSearchParams<{
      stopCode: string;
      stopName: string;
      stopNameEng?: string;
      stopLat?: string;
      stopLng?: string;
    }>();
  const router = useRouter();
  const { theme: colorScheme } = useTheme();
  const { localize, t } = useLanguage();
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();
  const colors = Colors[colorScheme];

  // Check if current stop is favorite
  const isFavorite = checkIsFavorite("stop", stopCode);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite({
      type: "stop",
      stopCode,
      stopName: stopName || `Stop ${stopCode}`,
      stopNameEng,
      stopLat,
      stopLng,
    });
  }, [stopCode, stopName, stopNameEng, stopLat, stopLng, toggleFavorite]);

  // Open Google Maps for directions
  const openDirections = useCallback(() => {
    if (!stopLat || !stopLng) {
      Alert.alert(
        "Location unavailable",
        "Stop coordinates are not available."
      );
      return;
    }

    const lat = parseFloat(stopLat);
    const lng = parseFloat(stopLng);

    // Google Maps URL that works on both platforms
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=walking`,
      android: `google.navigation:q=${lat},${lng}&mode=w`,
    });

    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

    // Try to open native Google Maps first, fall back to web
    Linking.canOpenURL(url!)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url!);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  }, [stopLat, stopLng]);

  // Share stop location
  const shareStop = useCallback(async () => {
    if (!stopLat || !stopLng) {
      Alert.alert(
        "Location unavailable",
        "Stop coordinates are not available."
      );
      return;
    }

    const lat = parseFloat(stopLat);
    const lng = parseFloat(stopLng);
    const displayName = stopName || `Stop ${stopCode}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    try {
      await Share.share({
        message: `${displayName}\n${mapsUrl}`,
        title: displayName,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, [stopLat, stopLng, stopName, stopCode]);

  // Fetch data
  const { data: arrivals } = useStopArrivals(stopCode);
  const { data: routes, isLoading: routesLoading } = useRoutesForStop(stopCode);

  // Group arrivals by line
  const arrivalsByLine = useMemo(() => {
    const map = new Map<string, StopArrival[]>();
    if (arrivals) {
      arrivals.forEach((arr) => {
        const existing = map.get(arr.route_code) || [];
        existing.push(arr);
        map.set(arr.route_code, existing);
      });
      // Sort each group by time
      map.forEach((arrs) => {
        arrs.sort(
          (a, b) => (parseInt(a.btime2) || 999) - (parseInt(b.btime2) || 999)
        );
      });
    }
    return map;
  }, [arrivals]);

  // Merge routes with unique lines
  const uniqueLines = useMemo(() => {
    if (!routes) return [];

    // Filter duplicates based on LineCode
    const seen = new Set();
    return routes.filter((route) => {
      if (seen.has(route.LineCode)) return false;
      seen.add(route.LineCode);
      return true;
    });
  }, [routes]);

  const renderLineItem = ({ item }: { item: StopRoute }) => {
    const lineArrivals = arrivalsByLine.get(item.RouteCode) || [];
    const nextArrival = lineArrivals[0];
    const secondArrival = lineArrivals[1];
    const nextMinutes = nextArrival ? parseInt(nextArrival.btime2) || 0 : null;
    const secondMinutes = secondArrival
      ? parseInt(secondArrival.btime2) || 0
      : null;

    return (
      <TouchableOpacity
        style={[styles.lineCard, { borderColor: colors.border }]}
        onPress={() => {
          // Navigate to line details
          router.push({
            pathname: "/line/[lineCode]",
            params: {
              lineCode: item.LineCode,
              lineId: item.LineID,
              lineName: item.RouteDescr,
            },
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.lineLeft}>
          <View style={[styles.lineBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.lineBadgeText}>{item.LineID}</Text>
          </View>
          <View style={styles.lineInfo}>
            <Text
              style={[styles.lineName, { color: colors.text }]}
              numberOfLines={1}
            >
              {localize(item.RouteDescrEng, item.RouteDescr)}
            </Text>
            {lineArrivals.length > 0 && (
              <Text
                style={[styles.lineSubtitle, { color: colors.textSecondary }]}
              >
                {lineArrivals.length} {t.arriving.toLowerCase()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.arrivalContainer}>
          {nextMinutes !== null ? (
            nextMinutes < 2 ? (
              <MotiView
                from={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ type: "timing", duration: 800, loop: true }}
              >
                <Text style={styles.arrivingNow}>Now</Text>
              </MotiView>
            ) : (
              <View style={styles.arrivalTimes}>
                <Text style={[styles.arrivalTime, { color: colors.accent }]}>
                  {nextMinutes}&apos;
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={colors.accent}
                    style={{ marginLeft: 2 }}
                  />
                </Text>
                {secondMinutes !== null && (
                  <Text style={[styles.alsoIn, { color: "#22c55e" }]}>
                    also in {secondMinutes}&apos;
                  </Text>
                )}
              </View>
            )
          ) : (
            <Text style={[styles.noData, { color: colors.textSecondary }]}>
              --
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t.stopDetails}
        </Text>
        <TouchableOpacity
          onPress={handleToggleFavorite}
          style={styles.favoriteButton}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? colors.accent : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Stop info header */}
      <View style={styles.stopHeader}>
        <View style={styles.stopHeaderTop}>
          <View style={styles.calendarBadge}>
            <Ionicons name="calendar-outline" size={18} color={colors.text} />
            <Text style={[styles.stopCodeText, { color: colors.text }]}>
              {stopCode}
            </Text>
          </View>
          {stopLat && stopLng && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={shareStop}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="share-outline"
                  size={18}
                  color={colors.accent}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openDirections}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={[styles.stopName, { color: colors.text }]}>
          {stopName || `Stop ${stopCode}`}
        </Text>
      </View>

      {routesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : uniqueLines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t.noRoutesFound}
          </Text>
        </View>
      ) : (
        <FlatList
          data={uniqueLines}
          renderItem={renderLineItem}
          keyExtractor={(item) => item.RouteCode}
          contentContainerStyle={styles.listContent}
          style={styles.list}
        />
      )}
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
    paddingTop: 50, // Status bar path
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  favoriteButton: {
    padding: 8,
    marginRight: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  stopHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  stopHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  calendarBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  stopCodeText: {
    fontWeight: "700",
    fontSize: 14,
  },
  stopName: {
    fontSize: 22,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  lineCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  lineBadge: {
    minWidth: 50,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  lineBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  lineSubtitle: {
    fontSize: 12,
  },
  arrivalContainer: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  arrivalTimes: {
    alignItems: "flex-end",
  },
  arrivalTime: {
    fontSize: 24,
    fontWeight: "600",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  alsoIn: {
    fontSize: 12,
    marginTop: 2,
  },
  arrivingNow: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ef4444",
  },
  noData: {
    fontSize: 20,
    fontWeight: "700",
  },
});

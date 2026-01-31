/**
 * Scan Prompt Component
 * UI for prompting user to scan their ticket
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Colors } from "@/constants/theme";
import type { Translations } from "@/contexts/LanguageContext";

interface ScanPromptProps {
  colors: (typeof Colors)["light"] | (typeof Colors)["dark"];
  t: Translations;
  isScanning: boolean;
  isReading: boolean;
  error: string | null;
}

export function ScanPrompt({
  colors,
  t,
  isScanning,
  isReading,
  error,
}: ScanPromptProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.centerContent}>
        <View style={[styles.scanAnimation, { borderColor: colors.accent }]}>
          <Ionicons name="card-outline" size={80} color={colors.accent} />
          {isScanning && (
            <View style={styles.pulseRing}>
              <View style={[styles.pulse, { borderColor: colors.accent }]} />
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {t.scanTicket}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.scanTicketDesc}
        </Text>
        {error && (
          <View
            style={[styles.errorContainer, { backgroundColor: "#EF444420" }]}
          >
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Reading Overlay */}
      {isReading && (
        <View style={styles.readingOverlay}>
          <View style={[styles.readingModal, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.readingTitle, { color: colors.text }]}>
              {t.readingCard || "Reading card..."}
            </Text>
            <Text style={[styles.readingSubtitle, { color: colors.textSecondary }]}>
              {t.keepCardClose || "Keep card close to the device"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  scanAnimation: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  pulseRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  pulse: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    opacity: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  readingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  readingModal: {
    width: "80%",
    maxWidth: 300,
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  readingTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
  },
  readingSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});

/**
 * NFC Status Components
 * UI components for displaying NFC status (not supported, disabled, loading)
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Colors } from "@/constants/theme";
import type { Translations } from "@/contexts/LanguageContext";

interface NfcStatusProps {
  colors: (typeof Colors)["light"] | (typeof Colors)["dark"];
  t: Translations;
}

/**
 * NFC Not Supported Screen
 */
export function NfcNotSupported({ colors, t }: NfcStatusProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.centerContent}>
        <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {t.nfcNotSupported}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.nfcNotSupportedDesc}
        </Text>
      </View>
    </View>
  );
}

/**
 * NFC Disabled Screen
 */
export function NfcDisabled({ colors, t }: NfcStatusProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.centerContent}>
        <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
          <Ionicons
            name="wifi-outline"
            size={64}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {t.nfcDisabled}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.nfcDisabledDesc}
        </Text>
      </View>
    </View>
  );
}

/**
 * NFC Loading Screen
 */
export function NfcLoading({ colors }: { colors: NfcStatusProps["colors"] }) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
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
});

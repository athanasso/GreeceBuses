/**
 * Ticket Display Component
 * UI for displaying scanned ticket information
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Colors } from "@/constants/theme";
import type { Translations } from "@/contexts/LanguageContext";
import type { TicketInfo } from "@/lib/ticket";
import { formatRemainingTime } from "@/lib/ticket";

interface TicketDisplayProps {
  ticketInfo: TicketInfo;
  remainingTime: number;
  isReading: boolean;
  colors: (typeof Colors)["light"] | (typeof Colors)["dark"];
  t: Translations;
}

export function TicketDisplay({
  ticketInfo,
  remainingTime,
  isReading,
  colors,
  t,
}: TicketDisplayProps) {
  const statusColor = ticketInfo.isActive ? "#22C55E" : "#EF4444";
  const statusBgColor = ticketInfo.isActive ? "#22C55E20" : "#EF444420";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={[styles.container]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t.ticketInfo}
          </Text>
        </View>

        <View style={styles.ticketContainer}>
          {/* Encryption Notice */}
          {ticketInfo.isEncrypted && (
            <View
              style={[styles.statusBadge, { backgroundColor: "#F59E0B20" }]}
            >
              <Ionicons name="lock-closed" size={20} color="#F59E0B" />
              <Text style={[styles.statusText, { color: "#F59E0B" }]}>
                {t.encryptedData}
              </Text>
            </View>
          )}

          {/* Status Badge */}
          {!ticketInfo.isEncrypted && (
            <View
              style={[styles.statusBadge, { backgroundColor: statusBgColor }]}
            >
              <Ionicons
                name={ticketInfo.isActive ? "checkmark-circle" : "close-circle"}
                size={20}
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {ticketInfo.isActive ? t.ticketActive : t.ticketExpired}
              </Text>
            </View>
          )}

          {/* Timer (if active) */}
          {ticketInfo.isActive && remainingTime > 0 && (
            <View
              style={[styles.timerContainer, { backgroundColor: "#22C55E20" }]}
            >
              <Ionicons name="time-outline" size={24} color="#22C55E" />
              <Text style={[styles.timerText, { color: "#22C55E" }]}>
                {formatRemainingTime(remainingTime)}
              </Text>
              <Text
                style={[styles.timerLabel, { color: colors.textSecondary }]}
              >
                {t.timeRemaining}
              </Text>
            </View>
          )}

          {/* Validity Period Card */}
          {ticketInfo.expiryDate && (
            <View
              style={[
                styles.validityCard,
                {
                  backgroundColor: ticketInfo.isActive ? "#22C55E15" : "#EF444415",
                  borderColor: ticketInfo.isActive ? "#22C55E40" : "#EF444440",
                },
              ]}
            >
              <View style={styles.validityHeader}>
                <Ionicons
                  name={ticketInfo.isActive ? "checkmark-circle" : "close-circle"}
                  size={28}
                  color={ticketInfo.isActive ? "#22C55E" : "#EF4444"}
                />
                <Text
                  style={[
                    styles.validityTitle,
                    { color: ticketInfo.isActive ? "#22C55E" : "#EF4444" },
                  ]}
                >
                  {ticketInfo.isActive ? (t.validUntil || "Valid until") : (t.expiredAt || "Expired at")}
                </Text>
              </View>
              <Text
                style={[
                  styles.validityDate,
                  { color: ticketInfo.isActive ? "#22C55E" : "#EF4444" },
                ]}
              >
                {ticketInfo.expiryDate}
              </Text>
            </View>
          )}

          {/* Trips Remaining */}
          <View
            style={[
              styles.tripsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="ticket-outline" size={32} color={colors.accent} />
            <Text style={[styles.tripsLabel, { color: colors.textSecondary }]}>
              {t.tripsRemaining}
            </Text>
            <Text style={[styles.tripsValue, { color: colors.text }]}>
              {ticketInfo.tripsRemaining === "unlimited"
                ? t.unlimited
                : ticketInfo.tripsRemaining === "encrypted"
                  ? "🔒"
                  : ticketInfo.tripsRemaining}
            </Text>
          </View>

          {/* Card ID */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={24} color={colors.accent} />
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  {t.cardId}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {ticketInfo.cardId}
                </Text>
              </View>
            </View>
            {/* Card Kind */}
            {ticketInfo.cardKind && ticketInfo.cardKind !== "Unknown" && (
              <View style={[styles.infoRow, { marginTop: 12 }]}>
                <Ionicons
                  name="pricetag-outline"
                  size={24}
                  color={colors.accent}
                />
                <View style={styles.infoContent}>
                  <Text
                    style={[styles.infoLabel, { color: colors.textSecondary }]}
                  >
                    Kind
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {ticketInfo.cardKind}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* User Category */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={24} color={colors.accent} />
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  {t.userCategory}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {ticketInfo.userCategory}
                </Text>
              </View>
            </View>
          </View>

          {/* Load Date */}
          {ticketInfo.loadDate && (
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.infoRow}>
                <Ionicons
                  name="download-outline"
                  size={24}
                  color={colors.accent}
                />
                <View style={styles.infoContent}>
                  <Text
                    style={[styles.infoLabel, { color: colors.textSecondary }]}
                  >
                    {t.loadDate}
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {ticketInfo.loadDate}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Products Section */}
          {(ticketInfo.activeProducts?.length > 0 ||
            ticketInfo.expiredProducts?.length > 0 ||
            ticketInfo.unusedProducts?.length > 0 ||
            ticketInfo.activeProduct ||
            ticketInfo.expiredProduct) && (
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginTop: 16 },
              ]}
            >
              {t.ticketData}
            </Text>
          )}

          {/* Active Products */}
          {ticketInfo.activeProducts?.map((product, index) => (
            <View
              key={`active-${index}`}
              style={[
                styles.productCard,
                { backgroundColor: "#22C55E20", borderColor: "#22C55E" },
              ]}
            >
              <View style={styles.productHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                <Text style={[styles.productTitle, { color: "#22C55E" }]}>
                  {t.activeProduct}
                </Text>
              </View>
              <Text style={[styles.productName, { color: colors.text }]}>
                {product.name}
                {product.fareType ? ` (${product.fareType})` : ""}
              </Text>
            </View>
          ))}

          {/* Unused Products */}
          {ticketInfo.unusedProducts?.map((product, index) => (
            <View
              key={`unused-${index}`}
              style={[
                styles.productCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.productHeader}>
                <Ionicons
                  name="pause-circle"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.productTitle, { color: colors.textSecondary }]}
                >
                  Unused
                </Text>
              </View>
              <Text
                style={[styles.productName, { color: colors.textSecondary }]}
              >
                {product.name}
                {product.fareType ? ` (${product.fareType})` : ""}
              </Text>
            </View>
          ))}

          {/* Expired Products */}
          {ticketInfo.expiredProducts?.map((product, index) => (
            <View
              key={`expired-${index}`}
              style={[
                styles.productCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.productHeader}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.productTitle, { color: colors.textSecondary }]}
                >
                  {t.expiredProduct}
                </Text>
              </View>
              <Text
                style={[styles.productName, { color: colors.textSecondary }]}
              >
                {product.name}
                {product.fareType ? ` (${product.fareType})` : ""}
              </Text>
            </View>
          ))}

          {/* Legacy Active Product (fallback) */}
          {!ticketInfo.activeProducts?.length && ticketInfo.activeProduct && (
            <View
              style={[
                styles.productCard,
                { backgroundColor: "#22C55E20", borderColor: "#22C55E" },
              ]}
            >
              <View style={styles.productHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                <Text style={[styles.productTitle, { color: "#22C55E" }]}>
                  {t.activeProduct}
                </Text>
              </View>
              <Text style={[styles.productName, { color: colors.text }]}>
                {ticketInfo.activeProduct.name}
              </Text>
            </View>
          )}

          {/* Legacy Expired Product (fallback) */}
          {!ticketInfo.expiredProducts?.length && ticketInfo.expiredProduct && (
            <View
              style={[
                styles.productCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.productHeader}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.productTitle, { color: colors.textSecondary }]}
                >
                  {t.expiredProduct}
                </Text>
              </View>
              <Text
                style={[styles.productName, { color: colors.textSecondary }]}
              >
                {ticketInfo.expiredProduct.name}
              </Text>
            </View>
          )}

          {/* Cash Balance */}
          {ticketInfo.cashBalance !== undefined && (
            <View style={[styles.infoRow, { marginTop: 12 }]}>
              <Ionicons name="cash-outline" size={20} color={colors.accent} />
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Cash
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {ticketInfo.cashBalance.toFixed(1)}€
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Scan Again Hint */}
        <View style={styles.scanHint}>
          <Ionicons
            name="scan-outline"
            size={20}
            color={colors.textSecondary}
          />
          <Text style={[styles.scanHintText, { color: colors.textSecondary }]}>
            {t.tapToScanAgain}
          </Text>
        </View>
      </ScrollView>

      {/* Reading Overlay */}
      {isReading && (
        <View style={styles.readingOverlay}>
          <View style={[styles.readingModal, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.readingTitle, { color: colors.text }]}>
              {t.readingCard}
            </Text>
            <Text style={[styles.readingSubtitle, { color: colors.textSecondary }]}>
              {t.keepCardClose}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  ticketContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    fontSize: 14,
    position: "absolute",
    bottom: 8,
  },
  validityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  validityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  validityTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  validityDate: {
    fontSize: 22,
    fontWeight: "700",
  },
  tripsCard: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginVertical: 8,
  },
  tripsLabel: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  tripsValue: {
    fontSize: 48,
    fontWeight: "700",
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  productCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
  },
  scanHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  scanHintText: {
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

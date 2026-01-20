import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import {
  FavoriteItem,
  FavoriteLine,
  FavoriteStop,
  useFavorites,
} from "@/contexts/FavoritesContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function FavoritesScreen() {
  const router = useRouter();
  const { theme: colorScheme } = useTheme();
  const { t, localize } = useLanguage();
  const { favorites, isLoading, removeFavorite } = useFavorites();
  const colors = Colors[colorScheme];

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t.noFavoritesYet}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {t.noFavoritesDescription}
      </Text>
    </View>
  );

  const handleFavoritePress = (item: FavoriteItem) => {
    if (item.type === "stop") {
      const stopItem = item as FavoriteStop;
      router.push({
        pathname: "/stop/[stopCode]",
        params: {
          stopCode: stopItem.stopCode,
          stopName: stopItem.stopName,
          stopNameEng: stopItem.stopNameEng,
          stopLat: stopItem.stopLat,
          stopLng: stopItem.stopLng,
        },
      });
    } else {
      const lineItem = item as FavoriteLine;
      router.push({
        pathname: "/line/[lineCode]",
        params: {
          lineCode: lineItem.lineCode,
          lineId: lineItem.lineId,
          lineName: lineItem.lineName,
        },
      });
    }
  };

  const renderFavorite = ({ item }: { item: FavoriteItem }) => {
    const name =
      item.type === "stop"
        ? localize(
            (item as FavoriteStop).stopNameEng,
            (item as FavoriteStop).stopName
          )
        : localize(
            (item as FavoriteLine).lineNameEng,
            (item as FavoriteLine).lineName
          );
    const code =
      item.type === "stop"
        ? (item as FavoriteStop).stopCode
        : (item as FavoriteLine).lineId;

    return (
      <TouchableOpacity
        style={[
          styles.favoriteItem,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => handleFavoritePress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.accent + "20" },
          ]}
        >
          <Ionicons
            name={item.type === "line" ? "bus" : "location"}
            size={20}
            color={colors.accent}
          />
        </View>
        <View style={styles.favoriteInfo}>
          <Text
            style={[styles.favoriteName, { color: colors.text }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.favoriteCode, { color: colors.textSecondary }]}>
            {item.type === "line" ? t.line : t.stop} {code}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => removeFavorite(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="heart" size={20} color={colors.accent} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t.favorites}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t.favorites}
        </Text>
      </View>

      {/* Content */}
      {favorites.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderFavorite}
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  favoriteItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 15,
    fontWeight: "600",
  },
  favoriteCode: {
    fontSize: 13,
    marginTop: 2,
  },
});

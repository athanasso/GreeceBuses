import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const FAVORITES_STORAGE_KEY = "@greece_transit_favorites";

export interface FavoriteStop {
  id: string;
  type: "stop";
  stopCode: string;
  stopName: string;
  stopNameEng?: string;
  stopLat?: string;
  stopLng?: string;
}

export interface FavoriteLine {
  id: string;
  type: "line";
  lineCode: string;
  lineId: string;
  lineName: string;
  lineNameEng?: string;
}

export type FavoriteItem = FavoriteStop | FavoriteLine;

export type NewFavoriteStop = Omit<FavoriteStop, "id">;
export type NewFavoriteLine = Omit<FavoriteLine, "id">;
export type NewFavoriteItem = NewFavoriteStop | NewFavoriteLine;

interface FavoritesContextType {
  favorites: FavoriteItem[];
  isLoading: boolean;
  addFavorite: (item: NewFavoriteItem) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (type: "stop" | "line", code: string) => boolean;
  toggleFavorite: (item: NewFavoriteItem) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: FavoriteItem[]) => {
    try {
      await AsyncStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(newFavorites)
      );
    } catch (error) {
      console.error("Failed to save favorites:", error);
    }
  };

  const generateId = (type: "stop" | "line", code: string) => `${type}_${code}`;

  const addFavorite = useCallback(async (item: NewFavoriteItem) => {
    const code = item.type === "stop" ? item.stopCode : item.lineCode;
    const id = generateId(item.type, code);

    const newItem = { ...item, id } as FavoriteItem;

    setFavorites((prev) => {
      // Check if already exists
      if (prev.some((f) => f.id === id)) {
        return prev;
      }
      const updated = [...prev, newItem];
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const removeFavorite = useCallback(async (id: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const isFavorite = useCallback(
    (type: "stop" | "line", code: string) => {
      const id = generateId(type, code);
      return favorites.some((f) => f.id === id);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (item: NewFavoriteItem) => {
      const code = item.type === "stop" ? item.stopCode : item.lineCode;
      const id = generateId(item.type, code);

      if (favorites.some((f) => f.id === id)) {
        await removeFavorite(id);
      } else {
        await addFavorite(item);
      }
    },
    [favorites, addFavorite, removeFavorite]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isLoading,
        addFavorite,
        removeFavorite,
        isFavorite,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

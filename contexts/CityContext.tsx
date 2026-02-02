import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type City = "athens" | "thessaloniki";

export interface CityConfig {
  id: City;
  nameEn: string;
  nameEl: string;
  center: { lat: number; lng: number };
  hasTicketScanner: boolean;  // Only Athens has NFC ticket scanning
}

export const CITY_CONFIGS: Record<City, CityConfig> = {
  athens: {
    id: "athens",
    nameEn: "Athens",
    nameEl: "Αθήνα",
    center: { lat: 37.9838, lng: 23.7275 },
    hasTicketScanner: true,
  },
  thessaloniki: {
    id: "thessaloniki",
    nameEn: "Thessaloniki",
    nameEl: "Θεσσαλονίκη",
    center: { lat: 40.6401, lng: 22.9444 },
    hasTicketScanner: false,  // OASTH uses different ticket system
  },
};

interface CityContextType {
  city: City;
  setCity: (city: City) => void;
  cityConfig: CityConfig;
  isAthens: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

const CITY_STORAGE_KEY = "@app_city";

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<City>("athens");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved city preference
  useEffect(() => {
    const loadCity = async () => {
      try {
        const saved = await AsyncStorage.getItem(CITY_STORAGE_KEY);
        if (saved && ["athens", "thessaloniki"].includes(saved)) {
          setCityState(saved as City);
        }
      } catch (e) {
        console.warn("Failed to load city preference:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCity();
  }, []);

  // Save city preference
  const setCity = async (newCity: City) => {
    setCityState(newCity);
    try {
      await AsyncStorage.setItem(CITY_STORAGE_KEY, newCity);
    } catch (e) {
      console.warn("Failed to save city preference:", e);
    }
  };

  const value: CityContextType = {
    city,
    setCity,
    cityConfig: CITY_CONFIGS[city],
    isAthens: city === "athens",
  };

  // Don't render until city is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <CityContext.Provider value={value}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
}

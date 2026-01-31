/**
 * Ticket Screen
 * NFC ticket scanning and display for ATH.ENA cards
 */

import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import { NfcDisabled, NfcLoading, NfcNotSupported } from "@/components/ticket/NfcStatus";
import { ScanPrompt } from "@/components/ticket/ScanPrompt";
import { TicketDisplay } from "@/components/ticket/TicketDisplay";
import { Colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
    parseAthenaTicketData,
    parseDESFireVersion,
    type FileData,
    type TicketInfo,
} from "@/lib/ticket";

// NFC imports - conditionally loaded for native platforms
let NfcManager: any = null;
let NfcTech: any = null;
let NfcEvents: any = null;

if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nfcModule = require("react-native-nfc-manager");
    NfcManager = nfcModule.default;
    NfcTech = nfcModule.NfcTech;
    NfcEvents = nfcModule.NfcEvents;
  } catch {
    // NFC module not available
  }
}

export default function TicketScreen() {
  const { theme: colorScheme } = useTheme();
  const { t } = useLanguage();
  const colors = Colors[colorScheme];

  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  const checkNfcStatus = useCallback(async () => {
    if (Platform.OS === "web") {
      setNfcSupported(false);
      return;
    }

    if (!NfcManager) {
      setNfcSupported(false);
      return;
    }

    try {
      const supported = await NfcManager.isSupported();
      setNfcSupported(supported);

      if (supported) {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();
        setNfcEnabled(enabled);
      }
    } catch {
      setNfcSupported(false);
    }
  }, []);

  // Check NFC support on mount and whenever app state changes
  useEffect(() => {
    checkNfcStatus();

    // Listener for NFC State changes (on/off)
    if (NfcManager && NfcEvents) {
      NfcManager.setEventListener(NfcEvents.StateChanged, () => {
        checkNfcStatus();
      });
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkNfcStatus();
      }
    });

    // Cleanup subscription
    return () => {
      subscription.remove();
      if (NfcManager) {
        if (NfcEvents) {
          NfcManager.setEventListener(NfcEvents.StateChanged, null);
        }
        NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    };
  }, [checkNfcStatus]);

  // Also check when the screen gains focus
  useFocusEffect(
    useCallback(() => {
      checkNfcStatus();
    }, [checkNfcStatus])
  );

  // Countdown timer for active tickets
  useEffect(() => {
    if (ticketInfo?.isActive && ticketInfo.remainingTimeSeconds > 0) {
      setRemainingTime(ticketInfo.remainingTimeSeconds);

      const interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [ticketInfo]);

  // Start NFC scanning
  useEffect(() => {
    if (!nfcSupported || !nfcEnabled || Platform.OS === "web") return;

    let isMounted = true;
    let scanTimeout: ReturnType<typeof setTimeout> | null = null;

    const readWithIsoDep = async (
      tag: any,
      alreadyConnected: boolean = false
    ): Promise<{
      versionData: number[];
      applicationId: string;
      isEncrypted: boolean;
      fileData: FileData;
    }> => {
      let versionData: number[] = [];
      let applicationId = "";
      let isEncrypted = false;
      const fileData: FileData = {};

      // Only request IsoDep if not already connected
      if (!alreadyConnected) {
        await NfcManager.cancelTechnologyRequest().catch(() => {});
        await NfcManager.requestTechnology(NfcTech.IsoDep);
      }

      const tryCommand = async (apdu: number[]) => {
        try {
          const resp = await NfcManager.isoDepHandler.transceive(apdu);
          if (resp && resp.length > 0) {
            const sw1 = resp[resp.length - 2];
            const sw2 = resp[resp.length - 1];
            if (sw1 === 0x91 && sw2 === 0x00) {
              return resp.slice(0, -2);
            } else if (sw1 === 0x91 && sw2 === 0xae) {
              isEncrypted = true;
              return null;
            }
          }
          return null;
        } catch {
          return null;
        }
      };

      // Get DESFire version
      const version1 = await tryCommand([0x90, 0x60, 0x00, 0x00, 0x00]);
      if (version1) {
        versionData.push(...version1);
        const version2 = await tryCommand([0x90, 0xaf, 0x00, 0x00, 0x00]);
        if (version2) {
          versionData.push(...version2);
          const version3 = await tryCommand([0x90, 0xaf, 0x00, 0x00, 0x00]);
          if (version3) {
            versionData.push(...version3);
          }
        }
      }

      // Get application IDs
      const appIds = await tryCommand([0x90, 0x6a, 0x00, 0x00, 0x00]);
      if (appIds && appIds.length >= 3) {
        const aid = appIds.slice(0, 3).reverse();
        applicationId = aid.map((b: number) => b.toString(16).padStart(2, "0")).join("");

        // Select the ATH.ENA application
        const selectCmd = [0x90, 0x5a, 0x00, 0x00, 0x03, ...appIds.slice(0, 3), 0x00];
        await tryCommand(selectCmd);

        // Read files - try standard read for each file
        const filesToRead = [2, 4, 5, 6, 12, 16];
        for (const fileId of filesToRead) {
          // Standard read command
          const readCmd = [0x90, 0xbd, 0x00, 0x00, 0x07, fileId, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
          const data = await tryCommand(readCmd);
          if (data && data.length > 0) {
            fileData[fileId] = Array.from(data);
          } else {
            // Try reading as value file for files 5 and 12
            if (fileId === 5 || fileId === 12) {
              const valueCmd = [0x90, 0x6c, 0x00, 0x00, 0x01, fileId, 0x00];
              const valueData = await tryCommand(valueCmd);
              if (valueData && valueData.length >= 4) {
                fileData[fileId] = Array.from(valueData);
              }
            }
          }
        }
      }

      return { versionData, applicationId, isEncrypted, fileData };
    };

    const startScan = async () => {
      if (!isMounted) return;

      setIsScanning(true);
      setError(null);

      try {
        await NfcManager.requestTechnology(NfcTech.IsoDep);

        if (!isMounted) return;

        const tag = await NfcManager.getTag();

        if (tag && isMounted) {
          setIsReading(true);

          const pages: number[] = [];

          // Get tag UID
          if (tag.id) {
            let idBytes: number[] = [];
            if (typeof tag.id === "string") {
              const hexStr = tag.id.replace(/[^0-9A-Fa-f]/g, "");
              for (let i = 0; i < hexStr.length; i += 2) {
                idBytes.push(parseInt(hexStr.substr(i, 2), 16));
              }
            } else {
              idBytes = Array.from(tag.id);
            }
            pages.push(...idBytes);
          }

          // Read DESFire card data
          const result = await readWithIsoDep(tag, true);

          if (isMounted) {
            const desfireInfo = parseDESFireVersion(result.versionData);

            const parsed = parseAthenaTicketData(
              pages,
              tag.id,
              desfireInfo,
              result.applicationId,
              result.isEncrypted,
              result.fileData
            );

            if (parsed) {
              setTicketInfo(parsed);
              setError(null);
            } else if (tag.id) {
              setTicketInfo({
                cardId: tag.id,
                uid: tag.id,
                cardType: desfireInfo?.cardType || "Unknown",
                cardKind: "Unknown",
                manufacturer: desfireInfo?.manufacturer || "Unknown",
                capacity: desfireInfo?.capacity || "Unknown",
                productionDate: desfireInfo?.productionDate || "Unknown",
                isEncrypted: result.isEncrypted,
                applicationId: result.applicationId,
                tripsRemaining: 0,
                activeProducts: [],
                expiredProducts: [],
                unusedProducts: [],
                activeProduct: null,
                expiredProduct: null,
                userCategory: "Unknown",
                isActive: false,
                remainingTimeSeconds: 0,
                expiryDate: null,
                loadDate: null,
                cashBalance: 0,
              });
              setError(null);
            } else {
              setError(t.ticketReadError);
            }
          }
        }
      } catch (e: any) {
        const isUserCancel =
          e?.constructor?.name === "UserCancel" ||
          e?.message?.includes("cancelled") ||
          e?.message?.includes("UserCancel");

        if (!isUserCancel && isMounted) {
          setError(t.ticketReadError);
        }
      } finally {
        await NfcManager.cancelTechnologyRequest().catch(() => {});

        if (isMounted) {
          setIsScanning(false);
          setIsReading(false);

          // Restart scanning after a short delay
          scanTimeout = setTimeout(() => {
            if (isMounted && nfcEnabled) {
              startScan();
            }
          }, 1000);
        }
      }
    };

    startScan();

    return () => {
      isMounted = false;
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, [nfcSupported, nfcEnabled, t]);

  // Render NFC not supported state
  if (nfcSupported === false || Platform.OS === "web") {
    return <NfcNotSupported colors={colors} t={t} />;
  }

  // Render NFC disabled state
  if (nfcEnabled === false) {
    return <NfcDisabled colors={colors} t={t} />;
  }

  // Render loading state
  if (nfcSupported === null) {
    return <NfcLoading colors={colors} />;
  }

  // Render ticket info if scanned
  if (ticketInfo) {
    return (
      <TicketDisplay
        ticketInfo={ticketInfo}
        remainingTime={remainingTime}
        isReading={isReading}
        colors={colors}
        t={t}
      />
    );
  }

  // Render scan prompt
  return (
    <ScanPrompt
      colors={colors}
      t={t}
      isScanning={isScanning}
      isReading={isReading}
      error={error}
    />
  );
}

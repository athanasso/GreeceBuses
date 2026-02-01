/**
 * Ticket Screen
 * NFC ticket scanning and display for ATH.ENA cards
 * Supports both DESFire (plastic) and MifareUltralight (paper) tickets
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
  MIFARE_ULTRALIGHT_PAGES,
  paperTicketToTicketInfo,
  parseAthenaTicketData,
  parseDESFireVersion,
  parsePaperTicketPages,
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

    // =========================================================================
    // DESFIRE (PLASTIC CARD) READER
    // =========================================================================
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

      // Debug log for NFC commands
      const nfcDebugLog: string[] = [];

      const tryCommand = async (apdu: number[], description: string = ""): Promise<number[] | null> => {
        try {
          const resp = await NfcManager.isoDepHandler.transceive(apdu);
          nfcDebugLog.push(`${description}: resp=${resp?.length || 0} bytes`);
          
          if (!resp || resp.length < 2) {
            nfcDebugLog.push(`  -> Too short or null`);
            return null;
          }
          
          const sw1 = resp[resp.length - 2];
          const sw2 = resp[resp.length - 1];
          nfcDebugLog.push(`  -> SW: ${sw1.toString(16)}${sw2.toString(16)}`);
          
          // 0x91 0x00 = Success
          if (sw1 === 0x91 && sw2 === 0x00) {
            return resp.slice(0, -2);
          }
          // 0x91 0xAF = Additional frame (more data)
          if (sw1 === 0x91 && sw2 === 0xaf) {
            return resp.slice(0, -2);
          }
          // 0x91 0xAE = Authentication error
          if (sw1 === 0x91 && sw2 === 0xae) {
            isEncrypted = true;
            return null;
          }
          // 0x90 0x00 = ISO success (some cards return this)
          if (sw1 === 0x90 && sw2 === 0x00) {
            return resp.slice(0, -2);
          }
          
          nfcDebugLog.push(`  -> Unhandled status`);
          return null;
        } catch (err: any) {
          nfcDebugLog.push(`${description}: ERROR - ${err?.message || err}`);
          return null;
        }
      };

      // Get DESFire version
      const version1 = await tryCommand([0x90, 0x60, 0x00, 0x00, 0x00], "GetVersion1");
      if (version1 && version1.length > 0) {
        versionData.push(...version1);
        const version2 = await tryCommand([0x90, 0xaf, 0x00, 0x00, 0x00], "GetVersion2");
        if (version2 && version2.length > 0) {
          versionData.push(...version2);
          const version3 = await tryCommand([0x90, 0xaf, 0x00, 0x00, 0x00], "GetVersion3");
          if (version3 && version3.length > 0) {
            versionData.push(...version3);
          }
        }
      }

      // Get application IDs
      const appIds = await tryCommand([0x90, 0x6a, 0x00, 0x00, 0x00], "GetAppIDs");
      nfcDebugLog.push(`AppIDs data: ${appIds ? appIds.map(b => b.toString(16).padStart(2, '0')).join(' ') : 'null'}`);
      
      if (appIds && appIds.length >= 3) {
        // Find ATH.ENA application (AID: 0x314541 = "1EA" in little-endian)
        // The app IDs list contains multiple AIDs, each 3 bytes
        let athenaAid: number[] | null = null;
        for (let i = 0; i <= appIds.length - 3; i += 3) {
          const aid = appIds.slice(i, i + 3);
          // Check for ATH.ENA AID: 0x41, 0x45, 0x31 (little-endian for 0x314541)
          if (aid[0] === 0x41 && aid[1] === 0x45 && aid[2] === 0x31) {
            athenaAid = aid;
            break;
          }
          // Also check if it's the first app (common case)
          if (i === 0) {
            athenaAid = aid;
          }
        }
        
        if (athenaAid) {
          const aid = [...athenaAid].reverse();
          applicationId = aid.map((b: number) => b.toString(16).padStart(2, "0")).join("");
          nfcDebugLog.push(`Selecting AID: ${applicationId}`);

          // Select the ATH.ENA application
          const selectCmd = [0x90, 0x5a, 0x00, 0x00, 0x03, ...athenaAid, 0x00];
          const selectResp = await tryCommand(selectCmd, "SelectApp");
          
          if (selectResp !== null) {
            // Read files - try standard read for each file
            const filesToRead = [2, 4, 5, 6, 12, 13, 14, 15, 16, 20, 96];
            for (const fileId of filesToRead) {
              // Standard read command: Read Data from offset 0, length 0 (all data)
              const readCmd = [0x90, 0xbd, 0x00, 0x00, 0x07, fileId, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
              const data = await tryCommand(readCmd, `ReadFile${fileId}`);
              if (data && data.length > 0) {
                fileData[fileId] = Array.from(data);
              } else {
                // Try reading as value file for files 5 and 12
                if (fileId === 5 || fileId === 12) {
                  const valueCmd = [0x90, 0x6c, 0x00, 0x00, 0x01, fileId, 0x00];
                  const valueData = await tryCommand(valueCmd, `ReadValue${fileId}`);
                  if (valueData && valueData.length >= 4) {
                    fileData[fileId] = Array.from(valueData);
                  }
                }
              }
            }
          } else {
            nfcDebugLog.push("SelectApp failed!");
          }
        } else {
          nfcDebugLog.push("ATH.ENA AID not found");
        }
      } else {
        nfcDebugLog.push("No AppIDs returned or too short");
      }

      // Store debug log for display
      (fileData as any)._nfcDebug = nfcDebugLog.join('\n');

      return { versionData, applicationId, isEncrypted, fileData };
    };

    // =========================================================================
    // MIFARE ULTRALIGHT (PAPER TICKET) READER
    // Supports both Android and iOS
    // =========================================================================
    const readMifareUltralight = async (
      tag: any
    ): Promise<{
      pages: number[][];
      mifareType: string;
    }> => {
      const pages: number[][] = [];
      let mifareType = "MifareUltralight";

      try {
        // Read all pages (41 pages for paper tickets, 4 bytes each)
        // MifareUltralight.readPages reads 4 pages (16 bytes) at a time
        for (let pageIndex = 0; pageIndex < MIFARE_ULTRALIGHT_PAGES; pageIndex += 4) {
          try {
            let data: number[] | null = null;

            if (Platform.OS === "android") {
              // Android: Use MifareUltralight handler
              data = await NfcManager.mifareUltralightHandlerAndroid.mifareUltralightReadPages(pageIndex);
            } else if (Platform.OS === "ios") {
              // iOS: Use NfcA transceive with READ command (0x30)
              // READ command: 0x30 followed by page address
              // Returns 16 bytes (4 pages)
              try {
                const readCmd = [0x30, pageIndex];
                data = await NfcManager.nfcAHandler.transceive(readCmd);
              } catch {
                // iOS might not support direct NfcA - try ISO7816 if available
                // For paper tickets on iOS, this may have limited support
                console.log("iOS NfcA not available for page", pageIndex);
              }
            }

            if (data && data.length >= 16) {
              // Split 16 bytes into 4 pages of 4 bytes each
              for (let i = 0; i < 4 && (pageIndex + i) < MIFARE_ULTRALIGHT_PAGES; i++) {
                const pageData = data.slice(i * 4, (i + 1) * 4);
                pages[pageIndex + i] = Array.from(pageData);
              }
            } else if (data && data.length >= 4) {
              // Some implementations return only 4 bytes at a time
              pages[pageIndex] = Array.from(data.slice(0, 4));
            }
          } catch (pageError) {
            // Some pages may be protected/unreadable - continue with what we have
            console.log(`Could not read page ${pageIndex}:`, pageError);
            // Fill with -1 to indicate unreadable (matches decompiled behavior)
            for (let i = 0; i < 4 && (pageIndex + i) < MIFARE_ULTRALIGHT_PAGES; i++) {
              if (!pages[pageIndex + i]) {
                pages[pageIndex + i] = [-1, -1, -1, -1];
              }
            }
          }
        }

        // Determine Mifare type based on tag info
        if (Platform.OS === "android" && tag.techTypes) {
          if (tag.techTypes.includes("android.nfc.tech.MifareUltralight")) {
            // Check for specific type if available
            if (tag.mifareUltralight?.type === 2) {
              mifareType = "MifareUltralight C";
            } else {
              mifareType = "MifareUltralight";
            }
          }
        } else if (Platform.OS === "ios") {
          // iOS detection based on tag properties
          mifareType = "MifareUltralight";
        }
      } catch (error) {
        console.error("Error reading MifareUltralight:", error);
      }

      return { pages, mifareType };
    };

    // =========================================================================
    // MAIN SCAN FUNCTION - Tries IsoDep first, then MifareUltralight
    // =========================================================================
    const startScan = async () => {
      if (!isMounted) return;

      setIsScanning(true);
      setError(null);

      // Try DESFire (IsoDep) first - most common for plastic cards
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
                isReducedFare: false,
                isAirportTicket: false,
                isNewCard: true,
                isBlankCard: true,
                technology: "desfire",
              });
              setError(null);
            } else {
              setError(t.ticketReadError);
            }
          }

          // Success - handled DESFire card
          await NfcManager.cancelTechnologyRequest().catch(() => {});
          if (isMounted) {
            setIsScanning(false);
            setIsReading(false);
            scanTimeout = setTimeout(() => {
              if (isMounted && nfcEnabled) {
                startScan();
              }
            }, 1000);
          }
          return;
        }
      } catch (isoDepError: any) {
        // IsoDep failed - might be a paper ticket or user cancelled
        await NfcManager.cancelTechnologyRequest().catch(() => {});

        const isUserCancel =
          isoDepError?.constructor?.name === "UserCancel" ||
          isoDepError?.message?.includes("cancelled") ||
          isoDepError?.message?.includes("UserCancel");

        if (isUserCancel) {
          // User cancelled - restart scanning
          if (isMounted) {
            setIsScanning(false);
            setIsReading(false);
            scanTimeout = setTimeout(() => {
              if (isMounted && nfcEnabled) {
                startScan();
              }
            }, 1000);
          }
          return;
        }
      }

      // Try MifareUltralight (paper ticket) if IsoDep failed
      try {
        if (!isMounted) return;

        await NfcManager.requestTechnology(NfcTech.MifareUltralight);

        const tag = await NfcManager.getTag();

        if (tag && isMounted) {
          setIsReading(true);

          // Read paper ticket pages
          const { pages, mifareType } = await readMifareUltralight(tag);

          if (isMounted && pages.length > 0) {
            // Parse paper ticket
            const paperInfo = parsePaperTicketPages(pages);
            const parsed = paperTicketToTicketInfo(paperInfo, tag.id || "", mifareType);

            setTicketInfo(parsed);
            setError(null);
          } else if (tag.id) {
            // Fallback for unreadable paper ticket
            setTicketInfo({
              cardId: tag.id,
              uid: tag.id,
              cardType: "MifareUltralight",
              cardKind: "Paper ticket",
              manufacturer: "NXP Semiconductors",
              capacity: "144 bytes",
              productionDate: "",
              isEncrypted: false,
              applicationId: "",
              tripsRemaining: 0,
              activeProducts: [],
              expiredProducts: [],
              unusedProducts: [],
              activeProduct: null,
              expiredProduct: null,
              userCategory: "Standard",
              isActive: false,
              remainingTimeSeconds: 0,
              expiryDate: null,
              loadDate: null,
              cashBalance: 0,
              isReducedFare: false,
              isAirportTicket: false,
              isNewCard: true,
              isBlankCard: true,
              technology: "mifare_ultralight",
            });
            setError(null);
          }
        }
      } catch (mifareError: any) {
        const isUserCancel =
          mifareError?.constructor?.name === "UserCancel" ||
          mifareError?.message?.includes("cancelled") ||
          mifareError?.message?.includes("UserCancel");

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

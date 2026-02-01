/**
 * Ticket Parsers
 * Functions for parsing ATH.ENA DESFire and MifareUltralight ticket data
 * Based on protocol specification and decompiled reference app analysis
 */

import {
  DESFIRE_FILES,
  MIFARE_ULTRALIGHT_PAGES,
  PERIOD_BASED_PRODUCTS,
  PRODUCT_CODES,
  PRODUCT_VALIDITY_DAYS,
  USER_CATEGORIES,
  VALIDITY_COUNT_BASED,
} from "./constants";
import type {
  DESFireInfo,
  FileData,
  NfcScanResult,
  PaperTicketInfo,
  ProductInfo,
  TicketInfo,
} from "./types";
import {
  bytesToHex,
  formatCardId,
  formatTimestamp,
  isAllFF,
  isAllZeros,
  parsePackedBinaryDate,
  parsePaperTicketDate,
  readUint16LE,
  readUint32LE,
} from "./utils";

/**
 * Parse DESFire version data to extract card info
 */
export function parseDESFireVersion(versionData: number[]): DESFireInfo {
  let cardType = "DESFire";
  let manufacturer = "Unknown";
  let capacity = "Unknown";
  let productionDate = "";

  if (versionData.length >= 7) {
    // Hardware info
    const hwVendor = versionData[0];
    const hwType = versionData[1];
    const hwSubType = versionData[2];
    const hwMajor = versionData[3];
    const hwMinor = versionData[4];
    const hwStorageSize = versionData[5];

    // Manufacturer
    if (hwVendor === 0x04) {
      manufacturer = "NXP Semiconductors";
    }

    // Card type based on hw type and subtype
    if (hwType === 0x01) {
      if (hwSubType === 0x01) {
        cardType = `DESFire EV1`;
      } else if (hwSubType === 0x02) {
        cardType = `DESFire EV2`;
      } else if (hwSubType === 0x03) {
        cardType = `DESFire EV3`;
      } else {
        cardType = `DESFire (${hwMajor}.${hwMinor})`;
      }
    }

    // Storage size: 2^(storageSize/2) bytes
    const storagePower = hwStorageSize >> 1;
    const storageBytes = 1 << storagePower;
    if (storageBytes >= 1024) {
      capacity = `${storageBytes / 1024} KB`;
    } else {
      capacity = `${storageBytes} bytes`;
    }
  }

  // Production date (if we have full version data)
  if (versionData.length >= 28) {
    const prodWeek = versionData[26];
    const prodYear = versionData[27];
    if (prodWeek > 0 && prodWeek <= 53 && prodYear > 0) {
      const year = prodYear < 50 ? 2000 + prodYear : 1900 + prodYear;
      productionDate = `Week ${prodWeek}, ${year}`;
    }
  }

  return { cardType, manufacturer, capacity, productionDate };
}

/**
 * Get product info from product code
 */
export function getProductInfo(
  productCode: number,
  productType: number,
  tripCount: number
): { name: string; fareType: string; isReduced: boolean; isAirport: boolean } {
  const known = PRODUCT_CODES[productCode];
  if (known) {
    // For count-based products, prepend the trip count
    if (productType === 0x32 && tripCount > 0) {
      return {
        name: `${tripCount} ${known.name}`,
        fareType: known.fareType,
        isReduced: known.isReduced || false,
        isAirport: known.isAirport || false,
      };
    }
    return {
      ...known,
      isReduced: known.isReduced || false,
      isAirport: known.isAirport || false,
    };
  }

  // Fallback based on product type
  if (productType === 0x31) {
    return { name: "MONTHLY", fareType: "", isReduced: false, isAirport: false };
  } else if (productType === 0x32) {
    return { name: `${tripCount} trips`, fareType: "", isReduced: false, isAirport: false };
  }
  return { name: "Unknown", fareType: "", isReduced: false, isAirport: false };
}

/**
 * Check if a product type is period-based (has duration validity)
 * From decompiled reference: d.a() method
 */
export function isPeriodBasedProduct(productTypeId: number): boolean {
  return PERIOD_BASED_PRODUCTS.includes(productTypeId);
}

/**
 * Get validity days for a product type
 * Returns -1 for count-based (90-minute) products
 * From decompiled reference: i() method
 */
export function getProductValidityDays(productTypeId: number): number {
  return PRODUCT_VALIDITY_DAYS[productTypeId] ?? -1;
}

/**
 * Parse File 96 (0x60): Master card info
 * Contains the 7-byte UID and card metadata
 */
export function parseMasterInfo(file96: number[]): {
  uid: string;
  vendor: string;
  size: string;
  model: string;
} {
  const result = {
    uid: "",
    vendor: "Unknown",
    size: "Unknown",
    model: "Unknown",
  };

  if (!file96 || file96.length < 21) {
    return result;
  }

  // UID is at bytes 14-20 (7 bytes)
  const uidBytes = file96.slice(14, 21);
  result.uid = bytesToHex(uidBytes).toUpperCase();

  return result;
}

/**
 * Parse additional product data from backup files (13, 14, 15)
 * These contain copies of product slot data for redundancy
 */
export function parseProductBackupFiles(
  file13: number[] | undefined,
  file14: number[] | undefined,
  file15: number[] | undefined
): ProductInfo[] {
  const backupProducts: ProductInfo[] = [];

  // These files typically mirror file 16 data
  // Parse them if main file 16 is corrupted or missing
  const backupFiles = [file13, file14, file15];

  for (const file of backupFiles) {
    if (!file || file.length < 8) continue;

    // Check if file has valid product data
    if (isAllZeros(file) || isAllFF(file)) continue;

    // Basic product parsing from backup
    const productType = file[1];
    const productCode = readUint16LE(file, 4);
    const tripCount = file.length >= 17 ? file[16] : 0;

    if (productCode === 0 || productCode === 0xffff) continue;

    const prodInfo = getProductInfo(productCode, productType, tripCount);
    backupProducts.push({
      name: prodInfo.name + " (backup)",
      fareType: prodInfo.fareType,
      status: "unused",
      productCode,
      isReducedFare: prodInfo.isReduced,
      isAirportTicket: prodInfo.isAirport,
    });
  }

  return backupProducts;
}

/**
 * ATH.ENA Ticket data parser
 * Main function to parse all ticket data from DESFire files
 */
export function parseAthenaTicketData(
  data: number[],
  tagId?: string,
  desfireInfo?: DESFireInfo,
  applicationId?: string,
  isEncrypted?: boolean,
  fileData?: FileData
): TicketInfo {
  // Use provided DESFire info or defaults
  const versionInfo = desfireInfo || {
    cardType: "Unknown",
    manufacturer: "Unknown",
    capacity: "Unknown",
    productionDate: "",
  };

  const uid = tagId || "";
  let cardId = uid;
  let cardKind = "Unknown";
  let tripsRemaining: number | "unlimited" | "encrypted" = isEncrypted
    ? "encrypted"
    : 0;
  let userCategory = "Unknown";
  const activeProducts: ProductInfo[] = [];
  const expiredProducts: ProductInfo[] = [];
  const unusedProducts: ProductInfo[] = [];
  let isActive = false;
  let remainingTimeSeconds = 0;
  let expiryDate: string | null = null;
  let loadDate: string | null = null;
  let cashBalance = 0;
  let lastValidationTimestamp: number | null = null;

  // Additional flags
  let isReducedFare = false;
  let isAirportTicket = false;
  let isNewCard = true;
  let isBlankCard = true;

  // Debug info for troubleshooting
  const debugLines: string[] = [];
  debugLines.push(`UID: ${uid}`);
  debugLines.push(`AppID: ${applicationId || 'N/A'}`)
  debugLines.push(`isEncrypted: ${isEncrypted}`);
  
  // Extract NFC debug log if present
  const nfcDebug = fileData ? (fileData as any)._nfcDebug : undefined;
  if (nfcDebug) {
    debugLines.push('--- NFC Log ---');
    debugLines.push(nfcDebug);
  }
  
  // Get actual file keys (excluding debug key)
  const fileKeys = fileData ? Object.keys(fileData).filter(k => k !== '_nfcDebug') : [];
  debugLines.push(`fileData keys: ${fileKeys.length > 0 ? fileKeys.join(',') : 'none'}`);

  // Parse any files that were successfully read
  // Note: isEncrypted flag indicates some files may need authentication,
  // but we can still parse files that were read successfully
  if (fileData && fileKeys.length > 0) {
    debugLines.push(`Files read: ${fileKeys.map(k => `0x${parseInt(k).toString(16).padStart(2, '0')}`).join(', ')}`);

    // === PARSE FILE 96 (0x60): Master Info ===
    const file96 = fileData[DESFIRE_FILES.MASTER_INFO];
    if (file96 && file96.length >= 21) {
      const masterInfo = parseMasterInfo(file96);
      if (masterInfo.uid) {
        debugLines.push(`File96 UID: ${masterInfo.uid}`);
      }
    }

    // === PARSE FILE 02: Card Identity ===
    const file2 = fileData[DESFIRE_FILES.CARD_IDENTITY];
    debugLines.push(`File02: ${file2?.length || 0} bytes`);
    if (file2 && file2.length >= 17) {
      const cardSuffix = file2.slice(13, 17);
      const suffixHex = bytesToHex(cardSuffix);
      const fullCardNum = "30010100" + suffixHex;
      cardId = formatCardId(fullCardNum);
      debugLines.push(`CardID parsed: ${cardId}`);

      const baseCategoryByte = file2[9];
      debugLines.push(`Cat byte[9]: 0x${baseCategoryByte.toString(16)}`);
      userCategory = USER_CATEGORIES[baseCategoryByte] || "Unknown";

      // Check if card has been used
      isBlankCard = isAllZeros(file2.slice(0, 13));
    } else {
      debugLines.push(`File02 too short or missing`);
    }

    // === PARSE FILE 04: Personalization ===
    const file4 = fileData[DESFIRE_FILES.PERSONALIZATION];
    debugLines.push(`File04: ${file4?.length || 0} bytes`);
    if (file4 && file4.length >= 10) {
      const typeCode = String.fromCharCode(file4[4], file4[5], file4[6]);
      debugLines.push(`Kind code: ${typeCode}`);

      if (typeCode === "PKP") {
        cardKind = "Plastic personalised";
        const overrideCategory = file4[9];
        debugLines.push(`Override cat[9]: 0x${overrideCategory.toString(16)}`);
        if (overrideCategory !== 0) {
          const overrideCat = USER_CATEGORIES[overrideCategory];
          if (overrideCat) {
            userCategory = overrideCat;
          }
        }
      } else if (typeCode === "ZLZ") {
        cardKind = "Plastic anonymous";
      } else {
        cardKind = "Plastic personalised";
      }
    }

    // === PARSE FILE 12: Remaining trips ===
    const file12 = fileData[DESFIRE_FILES.TRIPS_REMAINING];
    debugLines.push(`File12: ${file12?.length || 0} bytes, hex: ${file12 ? bytesToHex(file12) : 'N/A'}`);
    if (file12 && file12.length >= 4) {
      const trips = readUint32LE(file12);
      debugLines.push(`Trips parsed: ${trips}`);
      tripsRemaining = trips;
      if (trips > 0) {
        isBlankCard = false;
        isNewCard = false;
      }
    }

    // === PARSE FILE 5: Cash balance ===
    const file5 = fileData[DESFIRE_FILES.CASH_BALANCE];
    debugLines.push(`File05: ${file5?.length || 0} bytes`);
    if (file5 && file5.length >= 4) {
      const balanceRaw = readUint32LE(file5);
      debugLines.push(`Cash: ${balanceRaw} => €${balanceRaw / 100}`);
      cashBalance = balanceRaw / 100;
      if (balanceRaw > 0) {
        isBlankCard = false;
      }
    }

    // === PARSE FILE 06: Event Log - Find Last Validation ===
    // Dates in event log are stored as packed binary format (4 bytes each)
    const file6 = fileData[DESFIRE_FILES.EVENT_LOG];
    let lastValidationDate: Date | null = null;
    if (file6 && file6.length >= 4) {
      // Event log contains multiple 4-byte date entries
      // Each entry is a packed binary date
      for (let pos = 0; pos <= file6.length - 4; pos += 4) {
        const dateBytes = file6.slice(pos, pos + 4);
        
        // Skip empty entries
        if (isAllZeros(dateBytes) || isAllFF(dateBytes)) {
          continue;
        }
        
        const parsedDate = parsePackedBinaryDate(dateBytes);
        if (parsedDate) {
          // Track the most recent validation date
          if (!lastValidationDate || parsedDate > lastValidationDate) {
            lastValidationDate = parsedDate;
            lastValidationTimestamp = Math.floor(parsedDate.getTime() / 1000);
          }
          isNewCard = false;
          isBlankCard = false;
        }
      }
    }

    // === PARSE FILES 13, 14, 15: Product Backups ===
    const backupProducts = parseProductBackupFiles(
      fileData[DESFIRE_FILES.PRODUCT_BACKUP_1],
      fileData[DESFIRE_FILES.PRODUCT_BACKUP_2],
      fileData[DESFIRE_FILES.PRODUCT_BACKUP_3]
    );
    // Keep backup products for reference but don't add to main lists
    // They can be used for data recovery if file 16 is corrupted

    // === PARSE FILE 20: Additional Data ===
    const file20 = fileData[DESFIRE_FILES.ADDITIONAL_DATA];
    if (file20 && file20.length > 0 && !isAllZeros(file20)) {
      // This file may contain additional transaction history
      isBlankCard = false;
    }

    // === PARSE FILE 16: Product Slots ===
    const file16 = fileData[DESFIRE_FILES.PRODUCT_SLOTS];
    if (file16 && file16.length >= 32) {
      const now = Math.floor(Date.now() / 1000);
      const numProducts = Math.min(Math.floor(file16.length / 32), 4);

      for (let slotIndex = 0; slotIndex < numProducts; slotIndex++) {
        const offset = slotIndex * 32;
        const productBytes = file16.slice(offset, offset + 32);

        // Skip empty product slots
        if (productBytes[0] === 0xff || isAllZeros(productBytes)) {
          continue;
        }

        isBlankCard = false;
        isNewCard = false;

        const productType = productBytes[1];
        const productCode = readUint16LE(productBytes, 4);
        const tripCount = productBytes[16];

        const prodInfo = getProductInfo(productCode, productType, tripCount);
        const isMonthlyPass = productType === 0x31;
        const isCountBased = productType === 0x32;

        // Track reduced/airport status
        if (prodInfo.isReduced) isReducedFare = true;
        if (prodInfo.isAirport) isAirportTicket = true;

        let productLoadDate: string | null = null;
        let productExpiryDate: string | null = null;
        let productValidUntil: Date | undefined = undefined;
        let calculatedExpiry: number | null = null;
        let validityDays: number | undefined = undefined;

        // Parse the start date from bytes 6-9 (packed binary date format)
        const startDateBytes = productBytes.slice(6, 10);
        debugLines.push(`Slot${slotIndex} date bytes: ${bytesToHex(startDateBytes)}`);
        const startDate = parsePackedBinaryDate(startDateBytes);
        debugLines.push(`Slot${slotIndex} parsed date: ${startDate?.toString() || 'null'}`);

        if (isMonthlyPass) {
          validityDays = productBytes[14] || 30;
          debugLines.push(`Slot${slotIndex} validityDays: ${validityDays}`);

          if (startDate) {
            productLoadDate = formatTimestamp(Math.floor(startDate.getTime() / 1000));
            debugLines.push(`Slot${slotIndex} loadDate: ${productLoadDate}`);

            // Calculate expiry: start date + validity days
            const expiryDateObj = new Date(startDate);
            expiryDateObj.setDate(expiryDateObj.getDate() + validityDays);
            expiryDateObj.setHours(23, 59, 59, 0);
            calculatedExpiry = Math.floor(expiryDateObj.getTime() / 1000);

            productExpiryDate = formatTimestamp(calculatedExpiry);
            productValidUntil = expiryDateObj;
            debugLines.push(`Slot${slotIndex} expiryDate: ${productExpiryDate}`);
          }

          if (slotIndex === 0) {
            tripsRemaining = "unlimited";
            loadDate = productLoadDate;
          }
        } else if (isCountBased) {
          // For count-based products, use last validation timestamp + 90 minutes
          if (lastValidationTimestamp) {
            calculatedExpiry = lastValidationTimestamp + VALIDITY_COUNT_BASED;
            productExpiryDate = formatTimestamp(calculatedExpiry);
            productValidUntil = new Date(calculatedExpiry * 1000);
          } else if (startDate) {
            // If no validation yet but start date exists, product is unused
            productLoadDate = formatTimestamp(Math.floor(startDate.getTime() / 1000));
          }
        }

        const product: ProductInfo = {
          name: prodInfo.name,
          fareType: prodInfo.fareType,
          status: "unused",
          validUntil: productValidUntil,
          trips: isMonthlyPass ? undefined : tripCount,
          productCode: productCode,
          isReducedFare: prodInfo.isReduced,
          isAirportTicket: prodInfo.isAirport,
          validityDays,
        };

        // Determine product status
        if (slotIndex === 0) {
          if (calculatedExpiry && now < calculatedExpiry) {
            product.status = "active";
            activeProducts.push(product);
            isActive = true;
            remainingTimeSeconds = calculatedExpiry - now;
            expiryDate = productExpiryDate;
            loadDate = productLoadDate;
          } else if (calculatedExpiry) {
            product.status = "expired";
            expiredProducts.push(product);
            expiryDate = productExpiryDate;
            loadDate = productLoadDate;
          } else if (isCountBased && tripCount > 0 && !lastValidationTimestamp) {
            product.status = "unused";
            unusedProducts.push(product);
          } else {
            product.status = "active";
            activeProducts.push(product);
          }
        } else {
          if (calculatedExpiry && now < calculatedExpiry) {
            product.status = "active";
            activeProducts.push(product);
          } else if (calculatedExpiry) {
            product.status = "expired";
            expiredProducts.push(product);
          } else if (isCountBased && tripCount > 0) {
            product.status = "unused";
            unusedProducts.push(product);
          } else if (isMonthlyPass) {
            // Check if the start date indicates an active/expired product
            const bytes6to9 = productBytes.slice(6, 10);
            const parsedStartDate = parsePackedBinaryDate(bytes6to9);
            if (parsedStartDate) {
              // Has a valid start date - mark as expired (backlog)
              product.status = "expired";
              expiredProducts.push(product);
            } else {
              product.status = "unused";
              unusedProducts.push(product);
            }
          }
        }
      }
    }
  } else {
    debugLines.push('NO FILES WERE READ FROM CARD');
  }

  // Legacy: Set activeProduct and expiredProduct for backward compatibility
  const activeProduct = activeProducts.length > 0 ? activeProducts[0] : null;
  const expiredProduct = expiredProducts.length > 0 ? expiredProducts[0] : null;

  return {
    cardId,
    uid,
    cardType: versionInfo.cardType,
    cardKind,
    manufacturer: versionInfo.manufacturer,
    capacity: versionInfo.capacity,
    productionDate: versionInfo.productionDate,
    tripsRemaining,
    activeProducts,
    expiredProducts,
    unusedProducts,
    activeProduct,
    expiredProduct,
    userCategory,
    isActive,
    remainingTimeSeconds,
    expiryDate,
    loadDate,
    cashBalance,
    isEncrypted: isEncrypted || false,
    applicationId: applicationId || "",
    isReducedFare,
    isAirportTicket,
    isNewCard,
    isBlankCard,
    technology: "desfire",
    debugInfo: debugLines.join('\n'),
  };
}

// ============================================================================
// PAPER TICKET (MifareUltralight) PARSING
// Based on decompiled reference app analysis
// ============================================================================

/**
 * Parse MifareUltralight (paper ticket) page data
 */
export function parsePaperTicketPages(pages: number[][]): PaperTicketInfo {
  const result: PaperTicketInfo = {
    pages,
    validationDate: null,
    expiryDate: null,
    isValid: false,
    tripsRemaining: 0,
    productType: 0,
    productName: "Unknown",
  };

  if (!pages || pages.length < MIFARE_ULTRALIGHT_PAGES) {
    return result;
  }

  try {
    // Page 19 contains validity check bytes
    const page19 = pages[19];
    if (page19) {
      const page19Hex = bytesToHex(page19).toUpperCase();
      // Valid states: "00000000" or "60428EFB"
      const isValidChecksum = page19Hex === "00000000" || page19Hex === "60428EFB";
      result.isValid = isValidChecksum;
    }

    // Parse validation/start date from specific pages
    // The exact page depends on ticket type, but commonly:
    // - Page 4-7: Often contain timestamp data
    // - Page 8-11: Product info
    // - Page 12-15: Trip counter / validation data

    // Try to extract date from pages 4-7 (common location)
    if (pages[4] && pages[5] && pages[6] && pages[7]) {
      // Combine 4 bytes for date parsing
      const dateBytes = pages[4].slice(0, 4);
      const validationDate = parsePaperTicketDate(dateBytes);
      if (validationDate) {
        result.validationDate = validationDate;
        // Paper tickets typically valid for 90 minutes
        result.expiryDate = new Date(validationDate.getTime() + VALIDITY_COUNT_BASED * 1000);
      }
    }

    // Parse trip counter (commonly in page 12)
    if (pages[12]) {
      const tripByte = pages[12][0];
      if (tripByte >= 0 && tripByte <= 10) {
        result.tripsRemaining = tripByte;
      }
    }

    // Parse product type (commonly in page 8)
    if (pages[8]) {
      result.productType = pages[8][0];
      result.productName = getPaperTicketProductName(result.productType);
    }

  } catch (error) {
    console.error("Error parsing paper ticket:", error);
  }

  return result;
}

/**
 * Get product name for paper ticket type
 */
function getPaperTicketProductName(productType: number): string {
  const names: { [key: number]: string } = {
    1: "Single Trip",
    2: "Double Trip",
    5: "5-Trip Carnet",
    10: "10-Trip Carnet",
    11: "Daily Pass",
    15: "5-Day Pass",
    30: "Weekly Pass",
  };
  return names[productType] || `Type ${productType}`;
}

/**
 * Convert paper ticket info to unified TicketInfo format
 */
export function paperTicketToTicketInfo(
  paperInfo: PaperTicketInfo,
  tagId: string,
  mifareType?: string
): TicketInfo {
  const now = new Date();
  const isActive = !!(paperInfo.expiryDate && paperInfo.expiryDate > now && paperInfo.isValid);
  const remainingTimeSeconds = paperInfo.expiryDate
    ? Math.max(0, Math.floor((paperInfo.expiryDate.getTime() - now.getTime()) / 1000))
    : 0;

  const product: ProductInfo = {
    name: paperInfo.productName,
    fareType: "",
    status: isActive ? "active" : paperInfo.validationDate ? "expired" : "unused",
    validUntil: paperInfo.expiryDate || undefined,
    trips: paperInfo.tripsRemaining,
  };

  return {
    cardId: tagId,
    uid: tagId,
    cardType: mifareType || "MifareUltralight",
    cardKind: "Paper ticket",
    manufacturer: "NXP Semiconductors",
    capacity: "144 bytes",
    productionDate: "",
    tripsRemaining: paperInfo.tripsRemaining,
    activeProducts: isActive ? [product] : [],
    expiredProducts: !isActive && paperInfo.validationDate ? [product] : [],
    unusedProducts: !paperInfo.validationDate ? [product] : [],
    activeProduct: isActive ? product : null,
    expiredProduct: !isActive && paperInfo.validationDate ? product : null,
    userCategory: "Standard",
    isActive,
    remainingTimeSeconds,
    expiryDate: paperInfo.expiryDate ? formatTimestamp(Math.floor(paperInfo.expiryDate.getTime() / 1000)) : null,
    loadDate: paperInfo.validationDate ? formatTimestamp(Math.floor(paperInfo.validationDate.getTime() / 1000)) : null,
    cashBalance: 0,
    isEncrypted: false,
    applicationId: "",
    isReducedFare: false,
    isAirportTicket: false,
    isNewCard: !paperInfo.validationDate,
    isBlankCard: !paperInfo.validationDate && paperInfo.tripsRemaining === 0,
    technology: "mifare_ultralight",
  };
}

/**
 * Parse any NFC scan result (unified entry point)
 * Handles both DESFire and MifareUltralight cards
 */
export function parseNfcScanResult(scanResult: NfcScanResult): TicketInfo {
  if (scanResult.technology === "mifare_ultralight" && scanResult.pages) {
    // Paper ticket
    const paperInfo = parsePaperTicketPages(scanResult.pages);
    return paperTicketToTicketInfo(paperInfo, scanResult.tagId, scanResult.mifareType);
  } else if (scanResult.technology === "desfire") {
    // Plastic card
    const desfireInfo = scanResult.versionData
      ? parseDESFireVersion(scanResult.versionData)
      : undefined;
    return parseAthenaTicketData(
      [],
      scanResult.tagId,
      desfireInfo,
      scanResult.applicationId,
      scanResult.isEncrypted,
      scanResult.fileData
    );
  }

  // Unknown technology - return minimal info
  return {
    cardId: scanResult.tagId,
    uid: scanResult.tagId,
    cardType: "Unknown",
    cardKind: "Unknown",
    manufacturer: "Unknown",
    capacity: "Unknown",
    productionDate: "",
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
    isEncrypted: false,
    applicationId: "",
    isReducedFare: false,
    isAirportTicket: false,
    isNewCard: true,
    isBlankCard: true,
    technology: "unknown",
  };
}

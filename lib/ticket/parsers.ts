/**
 * Ticket Parsers
 * Functions for parsing ATH.ENA DESFire ticket data
 */

import {
    ATHENA_EPOCH,
    PRODUCT_CODES,
    TIMESTAMP_MAX,
    TIMESTAMP_MIN,
    USER_CATEGORIES,
    VALIDITY_COUNT_BASED,
} from "./constants";
import type { DESFireInfo, FileData, ProductInfo, TicketInfo } from "./types";
import { formatTimestamp } from "./utils";

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
): { name: string; fareType: string } {
  const known = PRODUCT_CODES[productCode];
  if (known) {
    // For count-based products, prepend the trip count
    if (productType === 0x32 && tripCount > 0) {
      return {
        name: `${tripCount} ${known.name}`,
        fareType: known.fareType,
      };
    }
    return known;
  }

  // Fallback based on product type
  if (productType === 0x31) {
    return { name: "MONTHLY", fareType: "" };
  } else if (productType === 0x32) {
    return { name: `${tripCount} trips`, fareType: "" };
  }
  return { name: "Unknown", fareType: "" };
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

  if (fileData && !isEncrypted) {
    // === PARSE FILE 02: Card Identity ===
    const file2 = fileData[2];
    if (file2 && file2.length >= 17) {
      const cardSuffix = file2.slice(13, 17);
      const suffixHex = cardSuffix
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const fullCardNum = "30010100" + suffixHex;
      cardId = fullCardNum
        .toUpperCase()
        .replace(/(.{4})/g, "$1 ")
        .trim();

      const baseCategoryByte = file2[9];
      userCategory = USER_CATEGORIES[baseCategoryByte] || "Unknown";
    }

    // === PARSE FILE 04: Personalization ===
    const file4 = fileData[4];
    if (file4 && file4.length >= 10) {
      const typeCode = String.fromCharCode(file4[4], file4[5], file4[6]);

      if (typeCode === "PKP") {
        cardKind = "Plastic personalised";
        const overrideCategory = file4[9];
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
    const file12 = fileData[12];
    if (file12 && file12.length >= 4) {
      const trips =
        (file12[0] & 0xff) |
        ((file12[1] & 0xff) << 8) |
        ((file12[2] & 0xff) << 16) |
        ((file12[3] & 0xff) << 24);
      tripsRemaining = trips >>> 0;
    }

    // === PARSE FILE 5: Cash balance ===
    const file5 = fileData[5];
    if (file5 && file5.length >= 4) {
      const balanceRaw =
        (file5[0] & 0xff) |
        ((file5[1] & 0xff) << 8) |
        ((file5[2] & 0xff) << 16) |
        ((file5[3] & 0xff) << 24);
      cashBalance = (balanceRaw >>> 0) / 100;
    }

    // === PARSE FILE 06: Event Log - Find Last Validation ===
    const file6 = fileData[6];
    if (file6 && file6.length >= 4) {
      for (let pos = 0; pos <= file6.length - 4; pos++) {
        const bytes = file6.slice(pos, pos + 4);
        const valLE =
          (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>>
          0;

        if (valLE >= TIMESTAMP_MIN && valLE < TIMESTAMP_MAX) {
          if (!lastValidationTimestamp || valLE > lastValidationTimestamp) {
            lastValidationTimestamp = valLE;
          }
        }
      }
    }

    // === PARSE FILE 16: Product Slots ===
    const file16 = fileData[16];
    if (file16 && file16.length >= 32) {
      const now = Math.floor(Date.now() / 1000);
      const numProducts = Math.min(Math.floor(file16.length / 32), 4);

      for (let slotIndex = 0; slotIndex < numProducts; slotIndex++) {
        const offset = slotIndex * 32;
        const productBytes = file16.slice(offset, offset + 32);

        // Skip empty product slots
        if (productBytes[0] === 0xff || productBytes.every((b) => b === 0)) {
          continue;
        }

        const productType = productBytes[1];
        const productCode = (productBytes[4] | (productBytes[5] << 8)) >>> 0;
        const tripCount = productBytes[16];

        const prodInfo = getProductInfo(productCode, productType, tripCount);
        const isMonthlyPass = productType === 0x31;
        const isCountBased = productType === 0x32;

        let productLoadDate: string | null = null;
        let productExpiryDate: string | null = null;
        let productValidUntil: Date | undefined = undefined;
        let calculatedExpiry: number | null = null;

        if (isMonthlyPass) {
          const startDays = (productBytes[6] | (productBytes[7] << 8)) >>> 0;
          const validityDays = productBytes[14] || 30;

          const startTimestamp = ATHENA_EPOCH + startDays * 24 * 60 * 60;
          productLoadDate = formatTimestamp(startTimestamp);

          const expiryTimestamp =
            startTimestamp + (validityDays + 1) * 24 * 60 * 60;
          const expiryDateObj = new Date(expiryTimestamp * 1000);
          expiryDateObj.setHours(23, 59, 59, 0);
          calculatedExpiry = Math.floor(expiryDateObj.getTime() / 1000);

          if (calculatedExpiry) {
            productExpiryDate = formatTimestamp(calculatedExpiry);
            productValidUntil = new Date(calculatedExpiry * 1000);
          }

          if (slotIndex === 0) {
            tripsRemaining = "unlimited";
            loadDate = productLoadDate;
          }
        } else if (isCountBased) {
          if (lastValidationTimestamp) {
            calculatedExpiry = lastValidationTimestamp + VALIDITY_COUNT_BASED;
            productExpiryDate = formatTimestamp(calculatedExpiry);
            productValidUntil = new Date(calculatedExpiry * 1000);
          }
        }

        const product: ProductInfo = {
          name: prodInfo.name,
          fareType: prodInfo.fareType,
          status: "unused",
          validUntil: productValidUntil,
          trips: isMonthlyPass ? undefined : tripCount,
          productCode: productCode,
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
            const bytes6to9 = productBytes.slice(6, 10);
            const val6_9_LE =
              (bytes6to9[0] |
                (bytes6to9[1] << 8) |
                (bytes6to9[2] << 16) |
                (bytes6to9[3] << 24)) >>>
              0;
            if (val6_9_LE >= TIMESTAMP_MIN && val6_9_LE < TIMESTAMP_MAX) {
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
  };
}

/**
 * Ticket Types
 * TypeScript interfaces for ATH.ENA ticket data
 * Supports both DESFire (plastic) and MifareUltralight (paper) tickets
 */

export interface TicketInfo {
  // Basic card info
  cardId: string;
  uid: string;

  // Card technical info
  cardType: string;
  cardKind: string; // "Plastic personalised", "Plastic anonymous", or "Paper ticket"
  manufacturer: string;
  capacity: string;
  productionDate: string;

  // Ticket info (may be unavailable if encrypted)
  tripsRemaining: number | "unlimited" | "encrypted";
  activeProducts: ProductInfo[];
  expiredProducts: ProductInfo[];
  unusedProducts: ProductInfo[];
  userCategory: string;
  isActive: boolean;
  remainingTimeSeconds: number;
  expiryDate: string | null;
  loadDate: string | null;
  cashBalance: number; // in euros

  // Legacy fields for compatibility
  activeProduct: ProductInfo | null;
  expiredProduct: ProductInfo | null;

  // Status flags
  isEncrypted: boolean;
  applicationId: string;

  // Additional flags from decompiled reference
  isReducedFare: boolean;
  isAirportTicket: boolean;
  isNewCard: boolean;
  isBlankCard: boolean;

  // Card technology type
  technology: "desfire" | "mifare_ultralight" | "unknown";

  // Debug info (for troubleshooting)
  debugInfo?: string;
}

export interface ProductInfo {
  name: string;
  fareType: string;
  status: "active" | "expired" | "unused";
  validUntil?: Date;
  trips?: number;
  productCode?: number;
  isReducedFare?: boolean;
  isAirportTicket?: boolean;
  validityDays?: number;
}

export interface DESFireInfo {
  cardType: string;
  manufacturer: string;
  capacity: string;
  productionDate: string;
}

export interface FileData {
  [fileId: number]: number[];
}

/**
 * Paper ticket (MifareUltralight) specific info
 */
export interface PaperTicketInfo {
  // Raw page data (41 pages of 4 bytes each)
  pages: number[][];

  // Parsed info
  validationDate: Date | null;
  expiryDate: Date | null;
  isValid: boolean;
  tripsRemaining: number;
  productType: number;
  productName: string;
}

/**
 * Raw NFC scan result before parsing
 */
export interface NfcScanResult {
  technology: "desfire" | "mifare_ultralight" | "unknown";
  tagId: string;

  // DESFire specific
  versionData?: number[];
  applicationId?: string;
  fileData?: FileData;
  isEncrypted?: boolean;

  // MifareUltralight specific
  pages?: number[][];
  mifareType?: string;
}

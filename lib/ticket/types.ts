/**
 * Ticket Types
 * TypeScript interfaces for ATH.ENA ticket data
 */

export interface TicketInfo {
  // Basic card info
  cardId: string;
  uid: string;

  // Card technical info
  cardType: string;
  cardKind: string; // "Plastic personalised" or "Plastic anonymous"
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
}

export interface ProductInfo {
  name: string;
  fareType: string;
  status: "active" | "expired" | "unused";
  validUntil?: Date;
  trips?: number;
  productCode?: number;
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

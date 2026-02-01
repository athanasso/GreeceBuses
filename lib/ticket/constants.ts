/**
 * Ticket Constants
 * ATH.ENA card constants for parsing ticket data
 * Based on protocol specification and decompiled reference app
 */

// ATH.ENA User category codes (per protocol specification)
// 0x00, 0x01, 0x30: Adult (Standard)
// 0x10: Student
// 0x20: Senior (65+)
// 0x40: Child
// 0x50: Disabled
// 0x60: Military
// 0x70: Unemployed
// 0x80: University Student
export const USER_CATEGORIES: { [key: number]: string } = {
  0x00: "Adult",
  0x01: "Adult",
  0x10: "Student",
  0x20: "Senior (65+)",
  0x30: "Adult",
  0x40: "Child",
  0x50: "Disabled",
  0x60: "Military",
  0x70: "Unemployed",
  0x80: "University Student",
};

// ATH.ENA Product/Fare type codes (bytes 4-5 of product record)
// These determine the product name and fare type shown
export const PRODUCT_CODES: {
  [key: number]: { name: string; fareType: string; isReduced?: boolean; isAirport?: boolean };
} = {
  // Count-based products
  0x0134: { name: "trips", fareType: "REDUCED FARE", isReduced: true }, // 308 - Student/reduced trips
  0x013c: { name: "trips", fareType: "REDUCED FARE", isReduced: true }, // 316 - Student/reduced trips (variant)
  0x0140: { name: "trips", fareType: "" }, // 320 - Standard trips
  0x0148: { name: "trips", fareType: "" }, // 328 - Standard trips

  // Monthly/period passes (validity from byte 14 of product slot)
  0x025a: { name: "MONTHLY", fareType: "AIRPORT", isAirport: true }, // 602 - Airport monthly
  0x0258: { name: "MONTHLY", fareType: "" }, // 600 - Standard monthly
  0x0260: { name: "MONTHLY", fareType: "" }, // 608 - Monthly variant
  0x0268: { name: "MONTHLY", fareType: "REDUCED FARE", isReduced: true }, // 616 - Reduced monthly
  0x0270: { name: "WEEKLY", fareType: "" }, // 624 - Weekly pass
  0x0278: { name: "WEEKLY", fareType: "REDUCED FARE", isReduced: true }, // 632 - Reduced weekly
  0x0280: { name: "DAILY", fareType: "" }, // 640 - Daily pass
  0x0288: { name: "DAILY", fareType: "REDUCED FARE", isReduced: true }, // 648 - Reduced daily

  // Airport products
  0x029a: { name: "AIRPORT SINGLE", fareType: "AIRPORT", isAirport: true }, // 666 - Airport single
  0x02a0: { name: "AIRPORT RETURN", fareType: "AIRPORT", isAirport: true }, // 672 - Airport return
};

// Product type IDs that are period-based (monthly/time-based validity)
// From decompiled reference: d.a() method
export const PERIOD_BASED_PRODUCTS: number[] = [
  11, // 1 day
  15, // 5 days
  31, // 30 days (monthly)
  36, // 180 days (6 months)
  42, // 365 days (annual)
  90, // 30 days (monthly variant)
  92, // 90 days (quarterly)
  110, // 30 days (monthly variant)
  555, // 90 days (quarterly variant)
];

// Validity duration mapping for product types (from decompiled reference: i() method)
// Maps product type ID to validity in days (or -1 for 90 minutes count-based)
export const PRODUCT_VALIDITY_DAYS: { [key: number]: number } = {
  11: 1, // 1 day
  15: 5, // 5 days
  31: 30, // 30 days
  36: 180, // 6 months
  42: 365, // 1 year
  52: -1, // 90 minutes (count-based)
  55: -1, // 90 minutes (count-based)
  60: -1, // 90 minutes (count-based)
  70: -1, // 90 minutes (count-based)
  90: 30, // 30 days
  92: 90, // 90 days
  110: 30, // 30 days
  555: 90, // 90 days
};

// Validity duration constants (in seconds)
export const VALIDITY_COUNT_BASED = 5400; // 90 minutes per protocol spec
export const VALIDITY_AIRPORT_DAYS = 10; // 10 days for airport monthly

// Timestamp range constants per protocol spec
export const TIMESTAMP_MIN = 1704067200; // Jan 1, 2024 00:00:00 UTC
export const TIMESTAMP_MAX = 1798761600; // Jan 1, 2027 00:00:00 UTC

// ATH.ENA epoch for date calculations
export const ATHENA_EPOCH = new Date(Date.UTC(2016, 0, 1)).getTime() / 1000; // Jan 1, 2016 00:00 UTC

// Paper ticket (MifareUltralight) epoch - dates stored as offset from 2010
export const PAPER_TICKET_EPOCH_YEAR = 2010;

// DESFire file IDs for ATH.ENA application
export const DESFIRE_FILES = {
  CARD_IDENTITY: 0x02, // File 02: Card serial/identity
  PERSONALIZATION: 0x04, // File 04: Card type (PKP/ZLZ)
  CASH_BALANCE: 0x05, // File 05: Cash balance
  EVENT_LOG: 0x06, // File 06: Validation event log
  TRIPS_REMAINING: 0x0c, // File 12: Trip counter
  PRODUCT_BACKUP_1: 0x0d, // File 13: Product slot backup
  PRODUCT_BACKUP_2: 0x0e, // File 14: Product slot backup
  PRODUCT_BACKUP_3: 0x0f, // File 15: Product slot backup
  PRODUCT_SLOTS: 0x10, // File 16: Main product slots
  ADDITIONAL_DATA: 0x14, // File 20: Additional data
  MASTER_INFO: 0x60, // File 96: Master card info / UID
} as const;

// MifareUltralight page count for paper tickets
export const MIFARE_ULTRALIGHT_PAGES = 41;
export const MIFARE_ULTRALIGHT_PAGE_SIZE = 4;

// ATH.ENA application ID
export const ATHENA_APPLICATION_ID = "314541"; // "1EA" in ASCII hex (ATH.ENA backward)

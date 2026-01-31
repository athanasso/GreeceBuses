/**
 * Ticket Constants
 * ATH.ENA card constants for parsing ticket data
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
export const PRODUCT_CODES: { [key: number]: { name: string; fareType: string } } = {
  // Count-based products
  0x0134: { name: "trips", fareType: "REDUCED FARE" }, // 308 - Student/reduced trips
  0x013c: { name: "trips", fareType: "REDUCED FARE" }, // 316 - Student/reduced trips (variant)
  0x0140: { name: "trips", fareType: "" }, // 320 - Standard trips
  0x0148: { name: "trips", fareType: "" }, // 328 - Standard trips

  // Monthly/period passes (validity from byte 14 of product slot)
  0x025a: { name: "MONTHLY", fareType: "AIRPORT" }, // 602 - Airport monthly
  0x0258: { name: "MONTHLY", fareType: "" }, // 600 - Standard monthly
  0x0260: { name: "MONTHLY", fareType: "" }, // 608 - Monthly variant
  0x0270: { name: "WEEKLY", fareType: "" }, // 624 - Weekly pass
  0x0280: { name: "DAILY", fareType: "" }, // 640 - Daily pass
};

// Validity duration constants (in seconds)
export const VALIDITY_COUNT_BASED = 5400; // 90 minutes per protocol spec
export const VALIDITY_AIRPORT_DAYS = 10; // 10 days for airport monthly

// Timestamp range constants per protocol spec
export const TIMESTAMP_MIN = 1704067200; // Jan 1, 2024 00:00:00 UTC
export const TIMESTAMP_MAX = 1798761600; // Jan 1, 2027 00:00:00 UTC

// ATH.ENA epoch for date calculations
export const ATHENA_EPOCH = new Date(Date.UTC(2016, 0, 1)).getTime() / 1000; // Jan 1, 2016 00:00 UTC

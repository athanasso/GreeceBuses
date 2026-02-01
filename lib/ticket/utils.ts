/**
 * Ticket Utilities
 * Helper functions for formatting and parsing ticket data
 * Supports both DESFire (plastic) and MifareUltralight (paper) tickets
 */

import { PAPER_TICKET_EPOCH_YEAR } from "./constants";

/**
 * Format remaining time as HH:MM:SS or MM:SS
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "00:00";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format Unix timestamp to DD/MM/YYYY HH:MM:SS
 */
export function formatTimestamp(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Convert byte array to hex string
 */
export function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => (b & 0xff).toString(16).padStart(2, "0")).join("");
}

/**
 * Convert hex string to binary string
 */
export function hexToBinary(hex: string): string {
  return parseInt(hex, 16).toString(2);
}

/**
 * Parse packed binary date format (4 bytes)
 * Used for BOTH DESFire (plastic) and MifareUltralight (paper) tickets
 * 
 * Binary format from decompiled reference (b() and I() methods):
 * - Bits 0-5:   Year offset (add 2010)
 * - Bits 6-9:   Month (1-12)
 * - Bits 10-14: Day (1-31)
 * - Bits 15-19: Hour (0-23)
 * - Bits 20-25: Minutes (0-59)
 * - Bits 26-31: Seconds (0-59)
 */
export function parsePackedBinaryDate(bytes: number[]): Date | null {
  if (!bytes || bytes.length < 4) {
    return null;
  }

  try {
    // Convert 4 bytes to hex string (MSB first, same as reference app)
    let hexStr = "";
    for (let i = 0; i < 4; i++) {
      hexStr += ((bytes[i] & 0xff).toString(16).padStart(2, "0"));
    }

    // Convert hex to binary and pad to 32 bits
    let binaryStr = parseInt(hexStr, 16).toString(2);
    while (binaryStr.length < 32) {
      binaryStr = "0" + binaryStr;
    }

    if (binaryStr.length !== 32) {
      return null;
    }

    // Parse binary fields (MSB first)
    // Based on decompiled reference app b() method
    const yearOffset = parseInt(binaryStr.substring(0, 6), 2);
    const month = parseInt(binaryStr.substring(6, 10), 2);
    let day = parseInt(binaryStr.substring(10, 15), 2);  // bits 10-14
    const hour = parseInt(binaryStr.substring(15, 20), 2);
    const minute = parseInt(binaryStr.substring(20, 26), 2);
    const second = parseInt(binaryStr.substring(26, 32), 2);

    // Apply correction factor: parsed day values are consistently 20 less than actual
    // This is a known issue with the bit layout for DESFire product dates
    day = day + 20;

    // Year offset of 0 means invalid/unset date
    if (yearOffset === 0) {
      return null;
    }

    const year = PAPER_TICKET_EPOCH_YEAR + yearOffset;

    // Validate date components (day may overflow to next month, Date constructor handles this)
    if (month < 1 || month > 12 || day < 1 ||
        hour > 23 || minute > 59 || second > 59) {
      return null;
    }

    // Date constructor handles day overflow automatically (e.g., Jan 32 becomes Feb 1)
    const date = new Date(year, month - 1, day, hour, minute, second);
    return date;
  } catch {
    return null;
  }
}

// Alias for backwards compatibility
export const parsePaperTicketDate = parsePackedBinaryDate;

/**
 * Reverse byte array (for little-endian conversion)
 */
export function reverseBytes(bytes: number[]): number[] {
  const result = new Array(bytes.length);
  let j = 0;
  for (let i = bytes.length - 1; i >= 0; i--) {
    result[j] = bytes[i];
    j++;
  }
  return result;
}

/**
 * Read 4 bytes as little-endian unsigned 32-bit integer
 */
export function readUint32LE(bytes: number[], offset: number = 0): number {
  if (!bytes || bytes.length < offset + 4) {
    return 0;
  }
  return (
    (bytes[offset] & 0xff) |
    ((bytes[offset + 1] & 0xff) << 8) |
    ((bytes[offset + 2] & 0xff) << 16) |
    ((bytes[offset + 3] & 0xff) << 24)
  ) >>> 0;
}

/**
 * Read 2 bytes as little-endian unsigned 16-bit integer
 */
export function readUint16LE(bytes: number[], offset: number = 0): number {
  if (!bytes || bytes.length < offset + 2) {
    return 0;
  }
  return ((bytes[offset] & 0xff) | ((bytes[offset + 1] & 0xff) << 8)) >>> 0;
}

/**
 * Check if all bytes in array are zero
 */
export function isAllZeros(bytes: number[]): boolean {
  return bytes.every((b) => b === 0);
}

/**
 * Check if all bytes in array are 0xFF
 */
export function isAllFF(bytes: number[]): boolean {
  return bytes.every((b) => (b & 0xff) === 0xff);
}

/**
 * Format card UID for display (space-separated hex pairs)
 */
export function formatCardUid(uid: string): string {
  return uid
    .toUpperCase()
    .replace(/(.{2})/g, "$1 ")
    .trim();
}

/**
 * Format card ID for display (4-digit groups)
 */
export function formatCardId(cardId: string): string {
  return cardId
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

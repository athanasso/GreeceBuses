/**
 * Ticket Module Index
 * Re-exports all ticket-related types, constants, parsers, and utilities
 * 
 * Supports:
 * - DESFire (plastic) ATH.ENA cards
 * - MifareUltralight (paper) tickets
 */

// Types
export type {
    DESFireInfo,
    FileData,
    NfcScanResult,
    PaperTicketInfo,
    ProductInfo,
    TicketInfo
} from "./types";

// Constants
export {
    ATHENA_APPLICATION_ID,
    ATHENA_EPOCH,
    DESFIRE_FILES, MIFARE_ULTRALIGHT_PAGES, MIFARE_ULTRALIGHT_PAGE_SIZE, PAPER_TICKET_EPOCH_YEAR,
    PERIOD_BASED_PRODUCTS,
    PRODUCT_CODES,
    PRODUCT_VALIDITY_DAYS,
    TIMESTAMP_MAX,
    TIMESTAMP_MIN,
    USER_CATEGORIES,
    VALIDITY_AIRPORT_DAYS,
    VALIDITY_COUNT_BASED
} from "./constants";

// Parsers
export {
    getProductInfo,
    getProductValidityDays,
    isPeriodBasedProduct,
    paperTicketToTicketInfo,
    parseAthenaTicketData,
    parseDESFireVersion,
    parseMasterInfo,
    parseNfcScanResult,
    parsePaperTicketPages,
    parseProductBackupFiles
} from "./parsers";

// Utilities
export {
    bytesToHex,
    formatCardId,
    formatCardUid,
    formatRemainingTime,
    formatTimestamp,
    hexToBinary,
    isAllFF,
    isAllZeros,
    parsePackedBinaryDate,
    parsePaperTicketDate,
    readUint16LE,
    readUint32LE,
    reverseBytes
} from "./utils";


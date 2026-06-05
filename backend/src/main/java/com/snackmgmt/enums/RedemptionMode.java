package com.snackmgmt.enums;

public enum RedemptionMode {
    DYNAMIC_QR,
    STATIC_QR,   // Future: plant workers with static QR cards
    RFID,        // Future: RFID card readers
    MANUAL       // Forgot-ID fallback flow
}
